const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const { GoogleGenerativeAI } = require('@google/generative-ai');

const keys = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || '';
const keyList = keys.split(',').map(k => k.trim()).filter(k => k.length > 0);

console.log('=== GEMINI API TEST ===');
console.log('Keys found:', keyList.length);

if (keyList.length === 0) {
    console.error('NO API KEYS FOUND');
    process.exit(1);
}

const sampleMarkdown = `1. What is Newton's first law?
a) F = ma
b) An object at rest stays at rest unless acted upon
c) Energy cannot be created
d) For every action there is a reaction

Answer Key:
1. b`;

async function test() {
    const apiKey = keyList[0];
    console.log('Using key:', apiKey.slice(0, 8) + '...');
    
    const genAI = new GoogleGenerativeAI(apiKey);
    
    try {
        console.log('Calling gemini-2.0-flash...');
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash',
            generationConfig: { responseMimeType: 'application/json' },
        });
        const result = await model.generateContent('Extract questions as JSON array [{id, text, options, correctAnswerIndex}]: ' + sampleMarkdown);
        const text = result.response.text();
        console.log('SUCCESS:', text);
    } catch (e) {
        console.error('FAILED:', e.message);
        console.error('Full error:', JSON.stringify(e, null, 2));
    }
}

test().then(() => process.exit(0)).catch(e => { console.error('FATAL:', e); process.exit(1); });
