export interface QuizQuestion {
    id: number;
    text: string;
    options: string[];
    correctAnswerIndex: number; // 0-based index
}

export interface QuizParseResult {
    questions: QuizQuestion[];
    errors: string[];
}

/**
 * Smart Quiz Markdown Parser
 * 
 * Parses quiz content in flexible formats.
 * Supports:
 * - Questions First, Answers Last (Standard)
 * - Inline Answers (e.g., "*a) Option", "a) Option (Correct)")
 * - Multiline questions and options
 * - Missing Answer Key headers (auto-detect)
 * - Mixed numbering styles (1., 1), Q1, etc.)
 */
export function parseQuizMarkdown(text: string): QuizParseResult {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    const questions: QuizQuestion[] = [];
    const errors: string[] = [];

    // ============ PATTERNS ============
    
    // Question patterns: "1. Text", "1) Text", "1- Text", "Q1. Text", "Question 1: Text", "السؤال 1:"
    const questionPatterns = [
        /^\**Question\s*(\d+)\**[\.:\s]*(.*)/i, // **Question 1** (or Question 1)
        /^(\d+)[\.\)\-]\s+(.+)/,              // 1. / 1) / 1- 
        /^Q\.?\s*(\d+)[\.:\s]\s*(.+)/i,       // Q1. / Q 1 
        /^السؤال\s*(\d+)[\.:\s]\s*(.+)/i,     // Arabic
    ];

    // Option patterns: "a) Text", "A. Text", "a- Text", "(a) Text", "*a) Text"
    // Capture groups: 1=Marker(optional), 2=Letter, 3=Text
    const optionPatterns = [
        /^(\*)?\s*([a-zA-Z])[\.\)\-]\s+(.+)/,   // a) / A. / a- (with optional leading *)
        /^(\*)?\s*\(([a-zA-Z])\)\s+(.+)/,       // (a)
        /^(\*)?\s*\[([a-zA-Z])\]\s+(.+)/,       // [a]
    ];

    // Answer Section Headers
    const answerSectionPatterns = [
        /^#+\s*(answer\s*key|answers?|correct\s*answers?|solutions?|answer\s*sheet)/i,
        /^(answer\s*key|answers?|correct\s*answers?|solutions?|answer\s*sheet)\s*[:\-]?\s*$/i,
        /^[-=*]{3,}\s*(answer|الإجابات|الاجابات)/i,
        /^(الإجابات|الاجابات|مفتاح\s*الإجابة)\s*[:\-]?\s*$/i,
        /^\*\*(answer\s*key|answers?)\*\*\s*[:\-]?\s*$/i,
    ];

    // Inline Correctness Markers (at end of line)
    const inlineCorrectPatterns = [
        /\s+\(?(correct|answer|true|sah|صح)\)?$/i, // " (Correct)" or " Correct"
        /\s+[\*✅✔✓]+$/,                           // " *" or " ✅"
        /\s+\[x\]$/i,                               // " [x]"
        /\s+<--$/                                   // " <--"
    ];

    // Answer Line Patterns (for key section)
    const answerLinePatterns = [
        /^(\d+)[\.\:\-\=\)\s]+([a-zA-Z])\b/,  // 1. b
        /^(\d+)\.([a-zA-Z])\b/,               // 1.b
        /^Q?(\d+)\s*[\-:]\s*([a-zA-Z])\b/i    // Q1 - b
    ];


    // ============ STEP 1: Detect Structure ============
    
    let splitIndex = -1;
    let foundHeader = false;

    // Try to find explicit header
    for (let i = 0; i < lines.length; i++) {
        if (answerSectionPatterns.some(p => p.test(lines[i]))) {
            splitIndex = i;
            foundHeader = true;
            break;
        }
    }

    // If no header, try to heuristics: find where the block of "1. a" lines starts at the end
    if (splitIndex === -1) {
        // Look backwards from the end
        let potentialAnswerStart = -1;
        let consecutiveAnswers = 0;
        
        for (let i = lines.length - 1; i >= 0; i--) {
            if (answerLinePatterns.some(p => p.test(lines[i]))) {
                consecutiveAnswers++;
                potentialAnswerStart = i;
            } else {
                // If we hit a non-answer line after finding some answers, stop
                if (consecutiveAnswers > 0) {
                    // Check if it's a question or option - if so, we definitely found the split
                    const isContent = questionPatterns.some(p => p.test(lines[i])) || 
                                    optionPatterns.some(p => p.test(lines[i]));
                    if (isContent) {
                        break;
                    }
                }
            }
        }

        // Only accept implicit split if we found at least 2 consecutive answer-like lines
        // or 1 line if it's the very last line and looks very much like an answer
        if (consecutiveAnswers >= 2 || (consecutiveAnswers === 1 && potentialAnswerStart === lines.length - 1)) {
            splitIndex = potentialAnswerStart;
        }
    }

    const questionLines = splitIndex !== -1 ? lines.slice(0, splitIndex) : lines;
    const answerLines = splitIndex !== -1 ? (foundHeader ? lines.slice(splitIndex + 1) : lines.slice(splitIndex)) : [];


    // ============ STEP 2: Parse Questions & Inline Answers ============

    let currentQ: Partial<QuizQuestion> | null = null;
    let lastType: 'question' | 'option' | null = null;

    const finalizeCurrentQuestion = () => {
        if (currentQ && currentQ.options && currentQ.options.length > 0) {
            questions.push({
                id: currentQ.id!,
                text: currentQ.text!,
                options: [...currentQ.options],
                correctAnswerIndex: currentQ.correctAnswerIndex ?? -1
            });
        }
    };

    for (const line of questionLines) {
        // 1. Check for New Question
        let qMatch: RegExpMatchArray | null = null;
        for (const p of questionPatterns) {
            const m = line.match(p);
            if (m) { qMatch = m; break; }
        }

        if (qMatch) {
            finalizeCurrentQuestion();
            currentQ = {
                id: parseInt(qMatch[1]),
                text: qMatch[2],
                options: [],
                correctAnswerIndex: -1
            };
            lastType = 'question';
            continue;
        }

        // 2. Check for Option
        let optMatch: RegExpMatchArray | null = null;
        for (const p of optionPatterns) {
            const m = line.match(p);
            if (m) { optMatch = m; break; }
        }

        if (optMatch && currentQ) {
            const isMarkedStart = !!optMatch[1]; // matches the (*) group
            const letter = optMatch[2];
            let text = optMatch[3];
            
            // Check for trailing markers
            let isMarkedEnd = false;
            for (const p of inlineCorrectPatterns) {
                if (p.test(text)) {
                    isMarkedEnd = true;
                    text = text.replace(p, '').trim(); // Remove the marker
                    break;
                }
            }

            const isCorrect = isMarkedStart || isMarkedEnd;
            const currentIdx = currentQ.options!.length;
            
            currentQ.options!.push(text);
            
            if (isCorrect) {
                // If multiple marked, last one wins (or warn?)
                currentQ.correctAnswerIndex = currentIdx;
            }

            lastType = 'option';
            continue;
        }

        // 3. Handle Continuation (Multiline)
        if (currentQ) {
            if (lastType === 'question') {
                currentQ.text += ' ' + line;
            } else if (lastType === 'option' && currentQ.options!.length > 0) {
                const idx = currentQ.options!.length - 1;
                currentQ.options![idx] += ' ' + line;
            }
        }
    }
    
    finalizeCurrentQuestion();

    // ============ STEP 3: Parse Answer Key (if exists) ============

    for (const line of answerLines) {
        for (const pattern of answerLinePatterns) {
            const match = line.match(pattern);
            if (match) {
                const qId = parseInt(match[1]);
                const letter = match[2].toLowerCase();
                const index = letter.charCodeAt(0) - 97; // 'a' -> 0

                const question = questions.find(q => q.id === qId);
                if (question) {
                    if (index >= 0 && index < question.options.length) {
                        question.correctAnswerIndex = index;
                    } else {
                        // Warn but don't fail hard?
                        // errors.push(`Q${qId}: Answer '${match[2]}' out of range.`);
                    }
                }
                break; // Stop checking patterns for this line
            }
        }
    }

    // ============ STEP 4: Validation ============
    
    if (questions.length === 0) {
        errors.push("❌ No questions found. Ensure questions start with a number (e.g., '1. Question...').");
    } else {
        const missingAnswers = questions.filter(q => q.correctAnswerIndex === -1);
        if (missingAnswers.length > 0) {
            errors.push(`⚠️ Missing answers for questions: ${missingAnswers.map(q => q.id).join(', ')}. Provide an Answer Key or mark options with '*' or '(correct)'.`);
        }
    }

    return { questions, errors };
}

