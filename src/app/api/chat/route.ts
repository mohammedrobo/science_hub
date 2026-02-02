import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { getSession } from '@/app/login/actions';
import { getStudentContext } from '@/lib/student-data';

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

    const apiKeys = getApiKeys();

    if (apiKeys.length === 0) {
        return NextResponse.json(
            { error: 'Gemini API Keys are missing. Please configure GEMINI_API_KEYS in .env.local' },
            { status: 500 }
        );
    }

    try {
        const { message } = await req.json();

        if (!message) {
            return NextResponse.json(
                { error: 'Message is required' },
                { status: 400 }
            );
        }

        // Fetch User Context (session already verified above)
        let studentContext = "";

        try {
            studentContext = await getStudentContext(session.username);
        } catch (err) {
            console.error("Error fetching student context:", err);
        }

        const systemInstruction = `
            You are "Da Vinci", a Smart University Assistant for Science Hub.
            Your traits:
            - Helpful, concise, and scientific.
            - You use emojis occasionally but keep it professional (🧪, 🔭, 🧬).
            - You encourage curiosity and critical thinking.
            - If asked about courses, you refer to standard science topics generally.
            - Response max length: around 100 words unless asked for a detailed explanation.
            ${studentContext ? `\n\n[ACADEMIC RECORDS ACCESS GRANTED]\n${studentContext}\n[INSTRUCTION]: The user is asking about their studies. YOU KNOW THEIR GRADES. Refer to them specifically if asked.` : ''}
        `;
        const prompt = `${systemInstruction}\n\nUser: ${message}\nDa Vinci:`;

        // Key Rotation & Rate Limit Handling
        // We try a random key first. If it fails, we can try others.
        // Implements "Hydra Strategy": Try ALL available keys if needed.

        const maxKeyRetries = apiKeys.length;

        // Shuffle keys to pick random ones to try
        const keyPool = [...apiKeys].sort(() => 0.5 - Math.random());

        for (let i = 0; i < maxKeyRetries; i++) {
            const currentKey = keyPool[i];
            // Removed key logging for security

            try {
                const genAI = new GoogleGenerativeAI(currentKey);

                // === SMART MODEL SELECTION LOGIC ===
                // 1. Try Primary: gemini-3-pro-preview (most intelligent)
                // 2. Fallback: gemini-2.5-flash (fast, reliable backup)

                let textResponse = null;

                try {
                    // PRIMARY ATTEMPT: gemini-3-pro-preview (most intelligent)
                    const model = genAI.getGenerativeModel({ model: 'gemini-3-pro-preview' });
                    const result = await model.generateContent(prompt);
                    const response = result.response;
                    textResponse = response.text();
                } catch (primaryError: any) {
                    console.warn(`[Da Vinci] Primary model (3-pro-preview) failed: ${primaryError.message}`);

                    // FALLBACK ATTEMPT
                    try {
                        console.log(`[Da Vinci] Switching to fallback model: gemini-2.5-flash`);
                        const fallbackModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
                        const fallbackResult = await fallbackModel.generateContent(prompt);
                        const fallbackResponse = fallbackResult.response;
                        textResponse = fallbackResponse.text();
                    } catch (fallbackError: any) {
                        console.error(`[Da Vinci] Fallback model (2.5-flash) also failed: ${fallbackError.message}`);
                        // Throw to outer loop to try next key
                        throw fallbackError;
                    }
                }

                // If we got here, we have a response
                return NextResponse.json({ content: textResponse });

            } catch (keyError: any) {
                // If specific key failed (rate limit, quota, etc), loop continues to next key
                console.warn(`[Da Vinci] Key failed completely. Reason: ${keyError.message}`);

                // If it's the last attempt, we let the loop finish and return generic error
                if (i === maxKeyRetries - 1) {
                    console.error('[Da Vinci] All attempts exhausted.');
                }
            }
        }

        // If we exit loop without returning, all keys failed
        return NextResponse.json(
            { error: "Da Vinci is currently sleeping. Please try again later." },
            { status: 503 }
        );

    } catch (fatalError) {
        console.error('[Da Vinci] Fatal Error:', fatalError);
        return NextResponse.json(
            { error: "Da Vinci is currently sleeping. Please try again later." },
            { status: 500 }
        );
    }
}
