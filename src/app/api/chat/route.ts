import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { checkApiRateLimit } from '@/lib/auth/rate-limit-redis';

const SESSION_COOKIE = 'sciencehub_session';
const SESSION_SECRET = new TextEncoder().encode(
    process.env.SESSION_SECRET || 'dev-only-secret-do-not-use-in-production-32!'
);

// Gemini API key rotation
function getApiKeys(): string[] {
    const keys = process.env.GEMINI_API_KEYS;
    if (!keys) return [];
    return keys.split(',').map(k => k.trim()).filter(Boolean);
}

let currentKeyIndex = 0;

function getNextApiKey(): string | null {
    const keys = getApiKeys();
    if (keys.length === 0) return null;
    const key = keys[currentKeyIndex % keys.length];
    currentKeyIndex++;
    return key;
}

// System prompt for DaVinci AI assistant
const SYSTEM_PROMPT = `You are DaVinci, a friendly and knowledgeable AI science tutor for Science Hub — a learning platform for first-year science students.

Your specialties include:
- Mathematics (Calculus, Algebra, Analytical Geometry)
- Physics (Mechanics, Properties of Matter, Heat)
- Chemistry (Atomic Structure, Equilibrium, Organic Chemistry)
- Biology and Zoology

Guidelines:
- Be encouraging and supportive
- Explain concepts clearly with examples
- Use LaTeX notation for math when needed (wrap in $ or $$)
- If you don't know something, say so honestly
- Keep responses focused and concise
- Answer in the same language the student uses (Arabic or English)`;

interface SessionPayload {
    username: string;
    role: string;
}

async function getSessionFromCookie(): Promise<SessionPayload | null> {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE);
    if (!sessionCookie) return null;

    try {
        const { payload } = await jwtVerify(sessionCookie.value, SESSION_SECRET);
        return payload as unknown as SessionPayload;
    } catch {
        return null;
    }
}

export async function POST(request: Request) {
    try {
        // 1. Authentication check
        const session = await getSessionFromCookie();
        if (!session) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        // 2. Rate limiting
        const rateLimit = await checkApiRateLimit(session.username);
        if (rateLimit.limited) {
            return NextResponse.json(
                { error: 'Too many requests. Please slow down.' },
                { status: 429 }
            );
        }

        // 3. Parse and validate request body
        let body: { message?: string; history?: Array<{ role: string; content: string }> };
        try {
            body = await request.json();
        } catch {
            return NextResponse.json(
                { error: 'Invalid JSON body' },
                { status: 400 }
            );
        }

        const { message, history } = body;

        if (!message || typeof message !== 'string' || message.trim().length === 0) {
            return NextResponse.json(
                { error: 'Message is required and must be a non-empty string' },
                { status: 400 }
            );
        }

        // 4. Limit message length to prevent abuse
        if (message.length > 4000) {
            return NextResponse.json(
                { error: 'Message too long. Maximum 4000 characters.' },
                { status: 400 }
            );
        }

        // 5. Get API key
        const apiKey = getNextApiKey();
        if (!apiKey) {
            console.error('[Chat] No Gemini API keys configured');
            return NextResponse.json(
                { error: 'AI service is not configured' },
                { status: 500 }
            );
        }

        // 6. Call Gemini API
        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({
                model: 'gemini-2.0-flash',
                systemInstruction: SYSTEM_PROMPT,
            });

            // Build chat history if provided
            const chatHistory = (history || [])
                .filter(h => h.role && h.content)
                .map(h => ({
                    role: h.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: h.content }],
                }));

            const chat = model.startChat({
                history: chatHistory,
            });

            const result = await chat.sendMessage(message);
            const response = result.response;
            const content = response.text();

            return NextResponse.json({ content });
        } catch (aiError: unknown) {
            const errorMessage = aiError instanceof Error ? aiError.message : String(aiError);
            console.error('[Chat] Gemini API error:', errorMessage);

            // Check for specific error types
            if (errorMessage.includes('API_KEY') || errorMessage.includes('API key')) {
                return NextResponse.json(
                    { error: 'AI service configuration error' },
                    { status: 500 }
                );
            }

            if (errorMessage.includes('RESOURCE_EXHAUSTED') || errorMessage.includes('quota')) {
                // Try next API key on quota exhaustion
                const nextKey = getNextApiKey();
                if (nextKey && nextKey !== apiKey) {
                    try {
                        const genAI2 = new GoogleGenerativeAI(nextKey);
                        const model2 = genAI2.getGenerativeModel({
                            model: 'gemini-2.0-flash',
                            systemInstruction: SYSTEM_PROMPT,
                        });
                        const result2 = await model2.generateContent(message);
                        const content2 = result2.response.text();
                        return NextResponse.json({ content: content2 });
                    } catch {
                        // All keys exhausted
                    }
                }
                return NextResponse.json(
                    { error: 'AI service is temporarily unavailable. Please try again later.' },
                    { status: 503 }
                );
            }

            if (errorMessage.includes('UNAVAILABLE') || errorMessage.includes('503')) {
                return NextResponse.json(
                    { error: 'AI service is temporarily unavailable' },
                    { status: 503 }
                );
            }

            return NextResponse.json(
                { error: 'Failed to get AI response. Please try again.' },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error('[Chat] Unexpected error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
