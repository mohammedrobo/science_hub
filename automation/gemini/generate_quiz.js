require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') });

const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { GoogleAIFileManager } = require('@google/generative-ai/server');

const [,, rawPdfPath, ...restArgs] = process.argv;

let pdfPath = rawPdfPath;
let canUseGemini = restArgs.length > 0 ? restArgs[restArgs.length - 1] : 'false';
let course = restArgs.length > 1 ? restArgs[0] : 'General';
// Gather title from the remaining arguments in case spaces weren't quoted
let title = restArgs.length > 2 ? restArgs.slice(1, -1).join(' ') : 'Lecture';

function out(data)  { console.log(JSON.stringify(data)); }
function err(msg)   { console.error(msg); }

async function attemptQuizGeneration(apiKey, fileManager, model, prompt, accountIndex) {
  let uploadedFileName = null;
  try {
    err(`📎 Uploading PDF to Gemini API (Key ${accountIndex + 1})...`);
    const uploadResult = await fileManager.uploadFile(pdfPath, {
        mimeType: "application/pdf",
        displayName: title || "Lecture PDF",
    });
    uploadedFileName = uploadResult.file.name;
    
    let fileState = await fileManager.getFile(uploadedFileName);
    while (fileState.state === "PROCESSING") {
        err('⏳ Waiting for Gemini to process the PDF...');
        await new Promise((resolve) => setTimeout(resolve, 5000));
        fileState = await fileManager.getFile(uploadedFileName);
    }
    
    if (fileState.state === "FAILED") {
        throw new Error("Gemini failed to process the PDF file");
    }

    err('✍️  Sending prompt to Gemini API...');
    const result = await model.generateContent([
        {
            fileData: {
                mimeType: uploadResult.file.mimeType,
                fileUri: uploadResult.file.uri
            }
        },
        { text: prompt }
    ]);
    const response = await result.response;
    const quizText = response.text();

    if (!quizText || (!quizText.includes('Q1.') && quizText.length < 200)) {
        throw new Error('QUOTA_EXCEEDED_OR_EMPTY');
    }

    err('🔍 Asking Gemini for a YouTube search query...');
    const ytPrompt = "Based on the lecture PDF provided, what is the best, concise Arabic search phrase to find an educational YouTube explanation exactly for this topic? Output ONLY the search query, nothing else.";
    const ytResult = await model.generateContent([
        {
            fileData: {
                mimeType: uploadResult.file.mimeType,
                fileUri: uploadResult.file.uri
            }
        },
        { text: ytPrompt }
    ]);
    const ytQuery = (await ytResult.response).text().trim();

    return { success: true, quizText, ytQuery, uploadedFileName };
  } catch (e) {
    err(`❌ Error with Key ${accountIndex + 1}: ${e.message}`);
    return { success: false, error: e, uploadedFileName };
  }
}

async function run() {
  if (!pdfPath || canUseGemini === 'false' || !fs.existsSync(pdfPath)) {
    out({ success: false, quizText: '', reason: 'no_pdf_or_too_large' });
    return;
  }

  const sizeMB = fs.statSync(pdfPath).size / 1024 / 1024;
  if (sizeMB > 50.0) {
    out({ success: false, quizText: '', reason: `pdf_too_large_${sizeMB.toFixed(1)}mb` });
    return;
  }

  const apiKeysStr = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY;
  if (!apiKeysStr) {
    out({ success: false, quizText: '', reason: 'no_api_key_configured' });
    return;
  }
  
  const apiKeys = apiKeysStr.split(',').map(k => k.trim()).filter(Boolean);
  
  // Randomize start index for load distribution, but ensure we try all keys
  let startIndex = Math.floor(Math.random() * apiKeys.length);
  
  const prompt = `You are an expert university educator. Read the provided lecture PDF carefully.
If the document is in Arabic, you MUST output the questions and answers in Arabic. If it's mostly English, use English.

Course: ${course || 'General'}
Lecture: ${title || 'Lecture'}

Generate a quiz based ONLY on the PDF content:
- 20 Multiple Choice Questions (MCQ)
- 10 True/False Questions

Use this EXACT format, no deviations (for English - adapt similarly for Arabic):

Q1. [question text]
a) [option]
b) [option]
c) [option]
d) [option]
Correct Answer: a

TF1. [statement]
Answer: True

Rules:
- Every question must come from the PDF
- Mix difficulty: 40% easy, 40% medium, 20% hard
- Wrong MCQ options must be plausible
- Output ONLY the quiz. No intro, no summary, nothing else.`;

  let lastErrorMsg = 'Unknown logic error';

  for (let i = 0; i < apiKeys.length; i++) {
    const accountIndex = (startIndex + i) % apiKeys.length;
    const apiKey = apiKeys[accountIndex];
    
    const fileManager = new GoogleAIFileManager(apiKey);
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3.1-pro-preview" });

    const attempt = await attemptQuizGeneration(apiKey, fileManager, model, prompt, accountIndex);
    
    if (attempt.uploadedFileName) {
       try {
          await fileManager.deleteFile(attempt.uploadedFileName);
          err('🗑️ Cleaned up file from Gemini API');
       } catch (delErr) {
          err(`⚠️ Failed to delete file: ${delErr.message}`);
       }
    }

    if (attempt.success) {
      out({ success: true, quizText: attempt.quizText, ytQuery: attempt.ytQuery, accountIndex, accountEmail: 'gemini_api' });
      return;
    } else {
      lastErrorMsg = attempt.error.message;
      // If it's a fatal non-quota error like file too large or invalid PDF, break immediately
      if (lastErrorMsg.includes("PDF file") && lastErrorMsg.includes("failed to process")) {
         break;
      }
      err(`⚠️ API Key fallback: Trying next key...`);
    }
  }

  // If all keys failed
  err(`❌ All API keys exhausted or failed.`);
  out({ success: false, quizText: '', reason: lastErrorMsg });
}

run();
