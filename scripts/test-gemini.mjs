import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const keys = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || '';
const keyList = keys.split(',').map(k => k.trim()).filter(k => k.length > 0);

console.log('=== GEMINI API TEST ===');
console.log('Keys found:', keyList.length);
if (keyList.length === 0) {
    console.error('NO API KEYS FOUND! Check .env.local');
    process.exit(1);
}

const sampleMarkdown = `Sure! Here are 3 questions for your Physics exam:

1. What is Newton's first law of motion?
   a) F = ma
   b) Every action has an equal and opposite reaction
   c) An object at rest stays at rest unless acted upon by an external force
   d) Energy cannot be created or destroyed

2. What is the SI unit of force?
   a) Joule
   b) Newton
   c) Pascal
   d) Watt

3. What is the acceleration due to gravity on Earth?
   a) 8.9 m/s²
   b) 9.8 m/s²
   c) 10.2 m/s²
   d) 11.0 m/s²

Answer Key:
1. c
2. b
3. b

Good luck on your exam!`;

async function test() {
    for (let i = 0; i < keyList.length; i++) {
        const apiKey = keyList[i];
        console.log(`\n--- Testing key ${i + 1} (${apiKey.slice(0, 8)}...${apiKey.slice(-4)}) ---`);

        const genAI = new GoogleGenerativeAI(apiKey);

        // Test 1: gemini-2.5-pro
        try {
            console.log('Trying gemini-2.5-pro...');
            const model = genAI.getGenerativeModel({
                model: 'gemini-2.5-pro',
                generationConfig: {
                    responseMimeType: 'application/json',
                },
            });
            const result = await model.generateContent(`Extract questions from this text as JSON array with fields: id, text, options (string[]), correctAnswerIndex (0-based, -1 if unknown). Return ONLY valid JSON.\n\n${sampleMarkdown}`);
            const text = result.response.text();
            console.log('✅ gemini-2.5-pro SUCCESS');
            console.log('Response length:', text.length);
            const parsed = JSON.parse(text);
            console.log('Parsed questions:', parsed.length);
            console.log('First question:', JSON.stringify(parsed[0], null, 2));
        } catch (e) {
            console.error('❌ gemini-2.5-pro FAILED:', e.message);

            // Test 2: fallback
            try {
                console.log('Trying gemini-2.0-flash fallback...');
                const fallbackModel = genAI.getGenerativeModel({
                    model: 'gemini-2.0-flash',
                    generationConfig: {
                        responseMimeType: 'application/json',
                    },
                });
                const fallbackResult = await fallbackModel.generateContent(`Extract questions from this text as JSON array with fields: id, text, options (string[]), correctAnswerIndex (0-based, -1 if unknown). Return ONLY valid JSON.\n\n${sampleMarkdown}`);
                const text = fallbackResult.response.text();
                console.log('✅ gemini-2.0-flash SUCCESS');
                const parsed = JSON.parse(text);
                console.log('Parsed questions:', parsed.length);
            } catch (e2) {
                console.error('❌ gemini-2.0-flash FAILED:', e2.message);
            }
        }
    }
}

test().catch(e => console.error('FATAL ERROR:', e));
