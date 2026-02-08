import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { getSession } from '@/app/login/actions';
import { getStudentContext } from '@/lib/student-data';
import { createClient } from '@/lib/supabase/server';

// Helper to parse keys from env
const getApiKeys = (): string[] => {
    // Support both single key and comma-separated list
    const keys = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || '';
    return keys.split(',').map(k => k.trim()).filter(k => k.length > 0);
};

export async function POST(req: Request) {
    // SECURITY: Require authentication
    const session = await getSession();
    if (!session?.username) {
        return NextResponse.json(
            { error: 'Authentication required' },
            { status: 401 }
        );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const apiKeys = getApiKeys();

    if (apiKeys.length === 0) {
        return NextResponse.json(
            { error: 'Gemini API Keys are missing.' },
            { status: 500 }
        );
    }

    try {
        const { message, sessionId, images, lessonContext } = await req.json();

        if (!message && (!images || images.length === 0)) {
            return NextResponse.json(
                { error: 'Message or image is required' },
                { status: 400 }
            );
        }

        // 1. Fetch Student Data (Grades, etc.)
        let studentContext = "";
        try {
            studentContext = await getStudentContext(session.username);
        } catch (err) {
            console.error("Error fetching student context:", err);
        }

        // 2. Build System Prompt & Lesson Context
        let systemInstruction = `
            You are "Da Vinci", a Smart University Assistant for Science Hub.
            Your traits:
            - Helpful, concise, and scientific.
            - You use emojis occasionally but keep it professional (🧪, 🔭, 🧬).
            - You encourage curiosity and critical thinking.
            ${studentContext ? `\n\n[ACADEMIC RECORDS ACCESS GRANTED]\n${studentContext}\n[INSTRUCTION]: The user is asking about their studies. YOU KNOW THEIR GRADES. Refer to them specifically if asked.` : ''}
        `;

        if (lessonContext) {
            systemInstruction += `
            \n[CURRENT LESSON CONTEXT]
            You are currently helping the student with the lesson: "${lessonContext.lessonTitle || 'Unknown'}".
            Course: ${lessonContext.courseId || 'Unknown'}.
            ${lessonContext.description ? `Description: ${lessonContext.description}` : ''}
            
            [INSTRUCTION]: The user is viewing this specific lesson/PDF. if they ask "explain this" or "what is this", referring to the current lesson content.
            `;
        }

        // 3. Retrieve Session History (if sessionId provided)
        let history: { role: string; parts: { text: string }[] }[] = [];
        let dbSessionId = sessionId;

        if (dbSessionId) {
            const { data: messages } = await supabase
                .from('chat_messages')
                .select('role, content, image_urls')
                .eq('session_id', dbSessionId)
                .order('created_at', { ascending: true })
                .limit(20); // Last 20 messages for context

            if (messages) {
                history = messages.map(msg => ({
                    role: msg.role === 'assistant' ? 'model' : 'user',
                    parts: [
                        { text: msg.content },
                        ...(msg.image_urls || []).map((url: string) => ({ text: `[Image Attachment: ${url}]` })) // We don't re-send old images bytes, just reference
                    ],
                }));
            }
        } else {
            // Create new session if none provided
            const { data: newSession } = await supabase
                .from('chat_sessions')
                .insert({ user_id: user?.id, title: message.substring(0, 50) || 'New Chat' })
                .select()
                .single();

            if (newSession) {
                dbSessionId = newSession.id;
            }
        }

        // 4. Prepare Generation Parts (Message + Images)
        const parts: any[] = [{ text: message }];

        // Handle Image Inputs (Base64 or URL - frontend sends base64 for immediate analysis usually)
        if (images && images.length > 0) {
            for (const img of images) {
                // Assuming frontend sends base64 data:image/png;base64,...
                // We need to strip the prefix
                const base64Data = img.split(',')[1];
                const mimeType = img.split(';')[0].split(':')[1];

                parts.push({
                    inlineData: {
                        data: base64Data,
                        mimeType: mimeType
                    }
                });
            }
        }

        // 5. Model Execution (Hydra Strategy)
        const maxKeyRetries = apiKeys.length;
        const keyPool = [...apiKeys].sort(() => 0.5 - Math.random());
        let textResponse = null;

        for (let i = 0; i < maxKeyRetries; i++) {
            const currentKey = keyPool[i];
            try {
                const genAI = new GoogleGenerativeAI(currentKey);

                // SELECT MODEL
                // Primary: gemini-3-pro-preview (USER REQUIRED)
                // Fallback: gemini-3-flash-preview (fast, reliable)

                const modelName = 'gemini-3-pro-preview';

                if (images && images.length > 0) {
                    console.log(`[Da Vinci] Processing images with ${modelName}`);
                }

                console.log(`[Da Vinci] Using model: ${modelName} with Key ending in ...${currentKey.slice(-4)}`);

                const model = genAI.getGenerativeModel({
                    model: modelName,
                    systemInstruction: systemInstruction
                });



                const chat = model.startChat({
                    history: history,
                    generationConfig: {
                        maxOutputTokens: 1000,
                    },
                });

                const result = await chat.sendMessage(parts);
                const response = result.response;
                textResponse = response.text();

                // Success!
                break;

            } catch (err: any) {
                const errorMessage = err.message || '';
                console.warn(`[Da Vinci] Key ${i + 1}/${maxKeyRetries} failed: ${errorMessage.substring(0, 80)}`);

                // If quota exceeded (429), don't retry same key - move to next key immediately
                if (errorMessage.includes('429') || errorMessage.includes('quota') || errorMessage.includes('Too Many')) {
                    console.warn(`[Da Vinci] Quota exceeded on key ${i + 1}. Moving to next key...`);
                    continue; // Skip to next key in pool instead of retrying same key
                }

                // For 404 errors, try fallback model with same key
                if (errorMessage.includes('404') || errorMessage.includes('not found')) {
                    console.warn(`[Da Vinci] Model not found. Trying fallback 'gemini-3-flash-preview'...`);
                    try {
                        const fallbackModel = new GoogleGenerativeAI(currentKey).getGenerativeModel({
                            model: 'gemini-3-flash-preview',
                            systemInstruction: systemInstruction
                        });
                        const fallbackChat = fallbackModel.startChat({ history, generationConfig: { maxOutputTokens: 1000 } });
                        const fallbackResult = await fallbackChat.sendMessage(parts);
                        textResponse = fallbackResult.response.text();
                        break; // Success with fallback
                    } catch (fallbackErr: any) {
                        console.error(`[Da Vinci] Fallback also failed: ${fallbackErr.message}`);
                    }
                }

                if (i === maxKeyRetries - 1) throw err; // Re-throw if last key failed
            }
        }

        // 6. Save to Database
        if (dbSessionId && user) {
            // Save User Message
            await supabase.from('chat_messages').insert({
                session_id: dbSessionId,
                role: 'user',
                content: message,
                image_urls: images ? JSON.stringify(images.map((_: any) => "base64_image_uploaded")) : [], // Don't save full base64 to DB usually, just placeholder or uploaded URL if available
                context_data: lessonContext
            });

            // Save Bot Response
            await supabase.from('chat_messages').insert({
                session_id: dbSessionId,
                role: 'assistant',
                content: textResponse
            });

            // Update session timestamp
            await supabase.from('chat_sessions').update({ updated_at: new Date() }).eq('id', dbSessionId);
        }

        return NextResponse.json({
            content: textResponse || 'Sorry, I could not generate a response. All API keys may have exceeded their quota.',
            sessionId: dbSessionId
        });

    } catch (fatalError: any) {
        console.error('[Da Vinci] Fatal Error:', fatalError);
        return NextResponse.json(
            { error: `Da Vinci encountered an error: ${fatalError.message || 'Unknown error'}` },
            { status: 500 }
        );
    }
}
