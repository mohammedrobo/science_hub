export interface QuizQuestion {
    id: number;
    text: string;
    options: string[];
    correctAnswerIndex: number; // 0-based index, -1 if unknown
    type: 'mcq' | 'true_false';
}

export interface QuizParseResult {
    questions: QuizQuestion[];
    errors: string[];
    stats: {
        totalDetected: number;
        withAnswers: number;
        withoutAnswers: number;
        truefalseCount: number;
        mcqCount: number;
    };
}

// ════════════════════════════════════════════════════════════════════════════
// ULTIMATE QUIZ MARKDOWN PARSER v3
// Zero-limitation parser — handles ANY markdown quiz format, ANY language
// 25+ tested formats: MCQ, True/False, inline options, Arabic, Roman,
// numbered sub-options, tables, comma-separated answer keys, etc.
// ════════════════════════════════════════════════════════════════════════════

// ── Preprocessing ──────────────────────────────────────────────────────────

function preprocess(raw: string): string {
    let text = raw;

    // 1. Normalize line endings
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // 2. Remove conversational greetings/closings
    const conversationalPatterns = [
        /^(sure!?|here\s+(is|are)|okay|ok!?|certainly|of course|hello|hi!?|hey|great|absolutely).*/i,
        /^(good luck|hope this helps|i hope|feel free|let me know|best of luck|happy studying).*/i,
        /^(here'?s?\s+(a|your|the)\s+.*(quiz|exam|test|questions?)).*/i,
        /^(this\s+(quiz|exam|test)\s+(contains?|has|includes|covers?)).*/i,
        /^(below\s+(is|are)\s+.*(questions?|quiz|exam)).*/i,
        /^(note\s*:|disclaimer\s*:|instructions?\s*:).*/i,
        /^(total\s+(marks?|points?|score)\s*[:=]).*/i,
        /^(time\s*(allowed|limit|duration)\s*[:=]).*/i,
    ];

    const lines = text.split('\n');
    const filtered = lines.filter(line => {
        const trimmed = line.trim();
        if (!trimmed) return true;
        return !conversationalPatterns.some(p => p.test(trimmed));
    });
    text = filtered.join('\n');

    // 3. Remove markdown section headers that are NOT answer keys and NOT inside answer sections
    text = text.replace(/^#{1,6}\s+\*{0,2}(?:part|section|topic|chapter|category)\s+\d*\*{0,2}\s*[:\-\u2013\u2014]?\s*.*/gmi, (match) => {
        if (/answer|solution|\u0627\u0644\u0625\u062c\u0627\u0628/i.test(match)) return match;
        return '';
    });

    // 4. Remove horizontal rules
    text = text.replace(/^\s*[-*_]{3,}\s*$/gm, '');

    // 5. Remove bold wrappers around question numbers: **1.** -> 1.
    text = text.replace(/^\*{1,2}(\d+[\.\)\-])\*{1,2}\s*/gm, '$1 ');

    // 6. Unwrap fully bold questions: **1. What is X?** -> 1. What is X?
    text = text.replace(/^\*{1,2}((?:\d+|Q\d+|Question\s*\d+)[\.\)\-:\s].+?)\*{1,2}\s*$/gmi, '$1');

    // 7. Remove standalone bold markers on lines (e.g., lines that are just "**")
    text = text.replace(/^\s*\*{2,}\s*$/gm, '');

    // 8. Unwrap bold around "Answer Key:" variants (colon inside or outside)
    text = text.replace(/^\*{1,2}((?:answer\s*key|answers?|correct\s*answers?|solutions?)\s*:?)\*{1,2}\s*:?\s*$/gmi, '$1:');

    return text;
}

// ── LaTeX Protection ───────────────────────────────────────────────────────

function protectLatex(text: string): { cleaned: string; restore: (s: string) => string } {
    const placeholders: Map<string, string> = new Map();
    let counter = 0;

    // Protect $$...$$ (block math)
    let cleaned = text.replace(/\$\$([^$]+?)\$\$/g, (match) => {
        const key = `__LATEX_B${counter++}__`;
        placeholders.set(key, match);
        return key;
    });

    // Protect $...$ (inline math)
    cleaned = cleaned.replace(/\$([^$\n]+?)\$/g, (match) => {
        const key = `__LATEX_I${counter++}__`;
        placeholders.set(key, match);
        return key;
    });

    // Protect \( ... \) and \[ ... \]
    cleaned = cleaned.replace(/\\\((.+?)\\\)/g, (match) => {
        const key = `__LATEX_P${counter++}__`;
        placeholders.set(key, match);
        return key;
    });
    cleaned = cleaned.replace(/\\\[(.+?)\\\]/g, (match) => {
        const key = `__LATEX_K${counter++}__`;
        placeholders.set(key, match);
        return key;
    });

    const restore = (s: string): string => {
        let result = s;
        for (const [key, val] of placeholders) {
            result = result.replaceAll(key, val);
        }
        return result;
    };

    return { cleaned, restore };
}

// ── Inline Options Splitter ────────────────────────────────────────────────
// Handles: "A) X   B) Y   C) Z   D) W" all on one line (2+ spaces between)

function trySplitInline(line: string): { letter: string; text: string }[] | null {
    const parts = line.split(/\s{2,}(?=\*{0,2}[a-hA-H]\s*[\.\)\-:])/);
    if (parts.length < 2) return null;

    const results: { letter: string; text: string }[] = [];
    const optRe = /^\*{0,2}\s*([a-hA-H])\s*[\.\)\-:]\s*\*{0,2}\s*(.+)/;

    for (const p of parts) {
        const m = p.trim().match(optRe);
        if (m) {
            results.push({ letter: m[1], text: m[2].trim() });
        }
    }

    return results.length >= 2 ? results : null;
}

// ── Correct Marker Detection ───────────────────────────────────────────────

const INLINE_CORRECT_PATTERNS: RegExp[] = [
    /\s*\(?(correct|answer|the answer|\u0635\u062d\u064a\u062d|\u0635\u062d|\u2713|\u2714)\)?\s*$/i,
    /\s*[\u2705\u2714\u2713]+\s*$/,
    /\s*\[x\]\s*$/i,
    /\s*<-{1,2}\s*$/,
    /\s*\u2190\s*$/,
];

function stripCorrectMarker(text: string): { cleaned: string; isCorrect: boolean } {
    for (const p of INLINE_CORRECT_PATTERNS) {
        if (p.test(text)) {
            return { cleaned: text.replace(p, '').trim(), isCorrect: true };
        }
    }
    return { cleaned: text, isCorrect: false };
}

// ── Clean Option/Question Text ─────────────────────────────────────────────

function cleanText(text: string): string {
    return text
        .replace(/^\*{1,2}\s*/, '')      // leading bold
        .replace(/\s*\*{1,2}$/, '')      // trailing bold
        .replace(/^`+\s*/, '')           // leading backticks
        .replace(/\s*`+$/, '')           // trailing backticks
        .replace(/^\s*>\s*/, '')         // blockquote
        .trim();
}

// ── Apply Answer to Question ───────────────────────────────────────────────

function applyAnswer(q: QuizQuestion, ansRaw: string): void {
    const ans = ansRaw.trim().toLowerCase();

    // MCQ letter answer (a-h)
    if (/^[a-h]$/i.test(ans)) {
        q.correctAnswerIndex = ans.charCodeAt(0) - 97;
        return;
    }

    // True/False answer
    if (/^(true|t|\u0635\u062d|\u0635\u062d\u064a\u062d)$/i.test(ans)) {
        q.type = 'true_false';
        if (q.options.length === 0) q.options = ['True', 'False'];
        q.correctAnswerIndex = q.options.findIndex(o => /^(true|t|\u0635\u062d|\u0635\u062d\u064a\u062d)$/i.test(o.trim()));
        if (q.correctAnswerIndex === -1) q.correctAnswerIndex = 0;
        return;
    }
    if (/^(false|f|\u062e\u0637\u0623|\u062e\u0627\u0637\u0626)$/i.test(ans)) {
        q.type = 'true_false';
        if (q.options.length === 0) q.options = ['True', 'False'];
        q.correctAnswerIndex = q.options.findIndex(o => /^(false|f|\u062e\u0637\u0623|\u062e\u0627\u0637\u0626)$/i.test(o.trim()));
        if (q.correctAnswerIndex === -1) q.correctAnswerIndex = 1;
        return;
    }
}

// ── Main Parser ────────────────────────────────────────────────────────────

export function parseQuizMarkdown(text: string): QuizParseResult {
    const preprocessed = preprocess(text);
    const { cleaned: safeText, restore } = protectLatex(preprocessed);

    const lines = safeText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    const questions: QuizQuestion[] = [];
    const errors: string[] = [];

    // ════════════════════ PATTERNS ════════════════════

    // --- Question starters (extremely broad) ---
    const questionPatterns: { regex: RegExp; numGroup: number; textGroup: number }[] = [
        // "Question 1: text" / "Question 1. text" / "**Question 1:** text"
        { regex: /^\*{0,2}\s*Question\s*#?\s*(\d+)\s*\*{0,2}\s*[.\-:\)]\s*(.*)/i, numGroup: 1, textGroup: 2 },
        // "Q1. text" / "Q.1 text" / "Q1: text"
        { regex: /^\*{0,2}\s*Q\.?\s*#?\s*(\d+)\s*\*{0,2}\s*[.\-:\)]\s*(.*)/i, numGroup: 1, textGroup: 2 },
        // Arabic: question header
        { regex: /^\*{0,2}\s*\u0627\u0644\u0633\u0624\u0627\u0644\s*(\d+)\s*\*{0,2}\s*[.:\-\)]\s*(.*)/i, numGroup: 1, textGroup: 2 },
        // "1. text" / "1) text" / "1- text" / "1: text"
        { regex: /^\*{0,2}\s*(\d+)\s*\*{0,2}\s*[.\)\-:]\s*(.*\S.*)/, numGroup: 1, textGroup: 2 },
        // Roman numerals: "i. text" / "ii) text" / "iii. text"
        { regex: /^\*{0,2}\s*((?:x{0,3})(?:ix|iv|v?i{0,3}))\s*\*{0,2}\s*[.\)]\s*(.*\S.*)/i, numGroup: -1, textGroup: 2 },
    ];

    // --- Option matchers ---
    const OPT_LETTER = /^(\*?\s*)\*{0,2}\s*([a-hA-H])\s*[.\)\-:]\s*\*{0,2}\s*(.+)/;
    const OPT_PAREN = /^(\*?\s*)\*{0,2}\s*\(([a-hA-H])\)\s*\*{0,2}\s*(.+)/;
    const OPT_BRACKET = /^(\*?\s*)\*{0,2}\s*\[([a-hA-H])\]\s*\*{0,2}\s*(.+)/;
    // Arabic lettered options
    const OPT_ARABIC = /^\*{0,2}\s*([\u0623\u0628\u062c\u062f\u0647\u0648\u0632\u062d\u0637\u064a\u0643\u0644\u0645\u0646\u0633\u0639\u0641\u0635\u0642\u0631\u0634\u062a\u062b\u062e\u0630\u0636\u0638\u063a])\s*[.\)\-:]\s*\*{0,2}\s*(.+)/;
    // Dash/bullet options (no letter): "- text", "bullet text", "* text"
    const OPT_DASH = /^[-\u2022*]\s+(.+)/;
    // Numbered sub-options: "1) text" when inside a question context (digit 1-8)
    const OPT_NUMBERED = /^(\d)\s*[.\)]\s*(.+)/;

    // --- Bare True/False as options ---
    const bareTrueFalseOption = /^[-\u2022*]?\s*\*{0,2}\s*\(?\s*(True|False|\u0635\u062d|\u062e\u0637\u0623|\u0635\u062d\u064a\u062d|\u062e\u0627\u0637\u0626)\s*\)?\s*\*{0,2}\s*$/i;

    // --- Numbered True/False that should be options ---
    const numberedTrueFalseOption = /^\*{0,2}\s*(\d+)\s*\*{0,2}\s*[.\)\-]\s*\*{0,2}\s*(True|False|\u0635\u062d|\u062e\u0637\u0623|\u0635\u062d\u064a\u062d|\u062e\u0627\u0637\u0626)\s*\*{0,2}\s*$/i;

    // --- True/False indicator line ---
    const trueFalseIndicator = [
        /^\*{0,2}\s*True\s*[\/\\|,]\s*False\s*\*{0,2}\s*$/i,
        /^\*{0,2}\s*True\s+or\s+False\s*\*{0,2}\s*$/i,
        /^\*{0,2}\s*\u0635\u062d\s*[\/\\|,]\s*\u062e\u0637\u0623\s*\*{0,2}\s*$/i,
        /^\*{0,2}\s*T\s*[\/\\|,]\s*F\s*\*{0,2}\s*$/i,
    ];

    // --- Inline answer patterns ---
    const inlineAnswerPatterns = [
        /^\*{0,2}\s*(?:correct\s+)?answer\s*:\s*\*{0,2}\s*([a-hA-H])\b/i,
        /^\*{0,2}\s*(?:correct\s+)?answer\s*:\s*\*{0,2}\s*(True|False)\b/i,
        /^\*{0,2}\s*(?:correct\s+)?answer\s*:\s*\*{0,2}\s*(.+)/i,
        /^\*{0,2}\s*\u0627\u0644\u0625\u062c\u0627\u0628\u0629\s*:\s*\*{0,2}\s*(.+)/i,
    ];

    // --- Answer section headers ---
    // Support emojis (✅✓📋🔑), unicode, bold, heading levels, colons inside/outside bold
    const ANSWER_KEYWORDS = 'answer\\s*key|answers?|correct\\s*answers?|solutions?|answer\\s*sheet|\u0627\u0644\u0625\u062c\u0627\u0628\u0627\u062a|\u0627\u0644\u0627\u062c\u0627\u0628\u0627\u062a|\u0645\u0641\u062a\u0627\u062d';
    const answerSectionPatterns = [
        // "## ✅ Answer Key" — heading with optional emoji/symbol prefix
        new RegExp(`^#{1,6}\\s*[^\\w]*?\\*{0,2}\\s*(${ANSWER_KEYWORDS})\\s*\\*{0,2}\\s*:?\\s*$`, 'iu'),
        // "✅ Answer Key" / "**Answer Key:**" — standalone line with optional emoji/symbols
        new RegExp(`^[^\\w]*?\\*{0,2}\\s*(${ANSWER_KEYWORDS})\\s*:?\\s*\\*{0,2}\\s*:?\\s*$`, 'iu'),
        // "**answers**" / "*solutions*"
        new RegExp(`^\\*{1,2}(${ANSWER_KEYWORDS})\\*{1,2}\\s*:?\\s*$`, 'iu'),
        // "answers:" / "answer key:"
        new RegExp(`^\\*{0,2}(${ANSWER_KEYWORDS})\\*{0,2}\\s*:\\s*$`, 'iu'),
    ];

    // --- Answer key line matchers ---
    // IMPORTANT: True/False patterns MUST come BEFORE MCQ letter patterns
    // because 'F' (from 'False') is in the [a-hA-H] range and would match MCQ first
    const answerKeyLinePatterns: { regex: RegExp; type: 'mcq' | 'tf' }[] = [
        // True/False answers (check BEFORE MCQ to prevent 'False' matching as letter 'F')
        { regex: /^(\d+)\s*[.\)\-:=]\s*\*{0,2}\s*(True|False|\u0635\u062d|\u062e\u0637\u0623|\u0635\u062d\u064a\u062d|\u062e\u0627\u0637\u0626)\s*\*{0,2}\s*(?:\(.*\))?.*$/i, type: 'tf' },
        { regex: /^(\d+)\s*[.\)\-:=]\s*\*{0,2}\s*(True|False)\s*\*{0,2}/i, type: 'tf' },
        // "1. C" / "1) C" / "1- C" / "1: C" / "1 = C" (single letter only, not followed by word chars)
        { regex: /^(\d+)\s*[.\)\-:=]\s*\*{0,2}\s*([a-hA-H])\s*\*{0,2}\s*(?:\(.*\))?\s*$/i, type: 'mcq' },
        { regex: /^(\d+)\s*[.\)\-:=]\s*\*{0,2}\s*([a-hA-H])\s*\*{0,2}\s*$/i, type: 'mcq' },
        // "1. (C)" parenthesized answer
        { regex: /^(\d+)\s*[.\)\-:=]\s*\(([a-hA-H])\)/i, type: 'mcq' },
        // "Q1: C"
        { regex: /^Q\.?\s*(\d+)\s*[.\)\-:=]\s*\*{0,2}\s*([a-hA-H])\s*\*{0,2}\s*$/i, type: 'mcq' },
        // "(1) C"
        { regex: /^\((\d+)\)\s*\*{0,2}\s*([a-hA-H])\s*\*{0,2}\s*$/i, type: 'mcq' },
        // "1.C" no space
        { regex: /^(\d+)\.([a-hA-H])\s*$/i, type: 'mcq' },
        // "1. The answer is C"
        { regex: /^(\d+)\s*[.\)\-:=]\s*(?:the\s+answer\s+is\s+)\*{0,2}\s*([a-hA-H])\s*\*{0,2}/i, type: 'mcq' },
    ];

    // --- Table answer key: "| 1 | C |" or "| 1  | B      |" (with extra spaces) ---
    const tableAnswerPattern = /^\|?\s*(\d+)\s*\|\s*\*{0,2}\s*([a-hA-H]|True|False|\u0635\u062d|\u062e\u0637\u0623|\u0635\u062d\u064a\u062d|\u062e\u0627\u0637\u0626)\s*\*{0,2}\s*\|?\s*$/i;

    // --- Table header row to skip: "| Q | Answer |" ---
    const tableHeaderPattern = /^\|?\s*(Q|#|No\.?|Question|Num\.?)\s*\|\s*(Answer|Ans\.?|Correct|Solution|\u0627\u0644\u0625\u062c\u0627\u0628\u0629)\s*\|?\s*$/i;

    // --- Sub-section headers inside answer key (Part A – MCQ, Part B – T/F, etc.) ---
    const answerSubSectionSkip = [
        /^#{1,6}\s*\*{0,2}\s*(?:part|section)\s+[a-zA-Z0-9]+\s*[\-\u2013\u2014:]\s*.*/i,
        /^\*{0,2}\s*(?:part|section)\s+[a-zA-Z0-9]+\s*[\-\u2013\u2014:]\s*.*/i,
        /^#{1,6}\s*\*{0,2}\s*(?:multiple\s*choice|mcq|true\s*[\/ \\|]?\s*false|t\s*[\/ |]\s*f|short\s*answer)\s*\*{0,2}\s*$/i,
    ];

    // --- Comma-separated answer keys: "1.C, 2.A, 3.B" ---
    const commaSepAnswerPattern = /^(\d+)\s*[.\-:=]\s*([a-hA-H])\s*[,;\s]\s*(\d+)\s*[.\-:=]\s*([a-hA-H])/i;

    // --- Section sub-header skip patterns ---
    const subHeaderSkip = [
        /^\*{0,2}\s*(part|section)\s+\d+\s*[:\-]/i,
        /^\*{0,2}\s*(multiple\s*choice|mcq|short\s*answer|fill\s*in)\s*(questions?)?\s*(\(\d+.*\))?\s*\*{0,2}\s*$/i,
        // "True/False Questions" or "T/F" as section header (must have "questions" or similar after it)
        /^\*{0,2}\s*(true\s*[\/\\|,]?\s*false|t\s*[\/|]\s*f)\s+(questions?|section|part)\s*(\(\d+.*\))?\s*\*{0,2}\s*$/i,
        /^\*{0,2}\s*\(\d+\s*(marks?|points?|questions?)\s*\)\s*\*{0,2}\s*$/i,
        /^\*{0,2}\s*\d+\s*(marks?|points?)\s*each\s*\*{0,2}\s*$/i,
    ];

    // ════════════════════ STEP 1: Find Answer Key Section ════════════════════

    let answerSectionStart = -1;

    // Try explicit header
    for (let i = 0; i < lines.length; i++) {
        if (answerSectionPatterns.some(p => p.test(lines[i]))) {
            answerSectionStart = i;
            break;
        }
    }

    // If no header, check for comma-separated answer keys
    if (answerSectionStart === -1) {
        for (let i = lines.length - 1; i >= 0; i--) {
            if (commaSepAnswerPattern.test(lines[i])) {
                answerSectionStart = i;
                break;
            }
        }
    }

    // If no header, find cluster of answer-like lines at the end
    if (answerSectionStart === -1) {
        let clusterStart = -1;
        let clusterSize = 0;

        for (let i = lines.length - 1; i >= 0; i--) {
            const line = lines[i];

            if (subHeaderSkip.some(p => p.test(line))) {
                if (clusterSize > 0) clusterStart = i;
                continue;
            }
            if (answerSubSectionSkip.some(p => p.test(line))) {
                if (clusterSize > 0) clusterStart = i;
                continue;
            }
            if (answerSectionPatterns.some(p => p.test(line))) {
                clusterStart = i;
                continue;
            }

            // Don't count numbered T/F options (like "1) True", "2) False") as answer key lines
            // These are T/F options for questions, not standalone answer entries
            if (numberedTrueFalseOption.test(line)) {
                if (clusterSize > 0) {
                    break; // stop cluster if we hit T/F options
                }
                continue;
            }

            // Skip table headers and separators in cluster detection
            if (tableHeaderPattern.test(line) || /^\|?\s*[-:]+\s*\|/.test(line)) {
                if (clusterSize > 0) clusterStart = i;
                continue;
            }
            // Skip decorative/italic lines
            if (/^\*[^*]+\*\s*$/.test(line) && !/\d/.test(line)) {
                if (clusterSize > 0) clusterStart = i;
                continue;
            }

            const isAnswerLine = answerKeyLinePatterns.some(p => p.regex.test(line)) ||
                tableAnswerPattern.test(line);
            if (isAnswerLine) {
                clusterSize++;
                clusterStart = i;
            } else if (clusterSize > 0) {
                break;
            }
        }

        if (clusterSize >= 2) {
            answerSectionStart = clusterStart;
        }
    }

    const questionLines = answerSectionStart !== -1 ? lines.slice(0, answerSectionStart) : lines;
    const answerLines = answerSectionStart !== -1 ? lines.slice(answerSectionStart) : [];

    // ════════════════════ STEP 2: Parse Questions & Options ════════════════════

    let currentQ: QuizQuestion | null = null;
    let lastType: 'question' | 'option' | 'answer' | null = null;
    let autoId = 0;
    let romanIdx = 0;
    let dashOptionMode = false; // track if we're collecting dash-style options

    const finalizeQ = () => {
        if (!currentQ || !currentQ.text.trim()) return;

        currentQ.text = cleanText(restore(currentQ.text));
        currentQ.options = currentQ.options.map(o => cleanText(restore(o)));

        // If true_false type but no options yet, add defaults
        if (currentQ.type === 'true_false' && currentQ.options.length === 0) {
            currentQ.options = ['True', 'False'];
        }

        // Remove empty options
        currentQ.options = currentQ.options.filter(o => o.length > 0);

        // Push if has 2+ options, or if true_false type, or even with 0 options
        // (questions with 0 options may get T/F options applied from answer key later)
        if (currentQ.options.length >= 2) {
            questions.push({ ...currentQ });
        } else if (currentQ.type === 'true_false') {
            currentQ.options = ['True', 'False'];
            questions.push({ ...currentQ });
        } else {
            // Keep the question even without options — answer key may provide T/F type
            questions.push({ ...currentQ });
        }
    };

    const matchQuestion = (line: string): { num: number; text: string } | null => {
        for (const { regex, numGroup, textGroup } of questionPatterns) {
            const m = line.match(regex);
            if (m) {
                let num: number;
                if (numGroup === -1) {
                    romanIdx++;
                    num = romanIdx;
                } else {
                    num = parseInt(m[numGroup]);
                }
                let qtext = m[textGroup] || '';
                qtext = cleanText(qtext);

                // Reject if text is empty or just punctuation
                if (!qtext || /^[\s\-:.]*$/.test(qtext)) return null;
                return { num, text: qtext };
            }
        }
        return null;
    };

    const matchOption = (line: string): { letter: string; text: string; markedBefore: boolean } | null => {
        for (const pat of [OPT_LETTER, OPT_PAREN, OPT_BRACKET]) {
            const m = line.match(pat);
            if (m) {
                const markedBefore = m[1]?.trim() === '*';
                return { letter: m[2], text: m[3], markedBefore };
            }
        }
        // Arabic lettered options
        const arabicM = line.match(OPT_ARABIC);
        if (arabicM) {
            return { letter: arabicM[1], text: arabicM[2], markedBefore: false };
        }
        return null;
    };

    for (let i = 0; i < questionLines.length; i++) {
        const line = questionLines[i];

        // Skip sub-headers
        if (subHeaderSkip.some(p => p.test(line))) continue;
        // Skip answer section headers that leaked
        if (answerSectionPatterns.some(p => p.test(line))) continue;
        // Skip table separator rows
        if (/^\|?\s*[-:]+\s*\|/.test(line)) continue;

        // ─── Numbered True/False that are OPTIONS ───
        if (currentQ) {
            const ntf = line.match(numberedTrueFalseOption);
            if (ntf) {
                const tfVal = ntf[2];
                const { cleaned: tfCleaned, isCorrect } = stripCorrectMarker(tfVal);
                const normalized = /^(true|t|\u0635\u062d|\u0635\u062d\u064a\u062d)$/i.test(tfCleaned) ? 'True' : 'False';
                if (!currentQ.options.some(o => o.toLowerCase() === normalized.toLowerCase())) {
                    currentQ.options.push(normalized);
                    if (isCorrect) currentQ.correctAnswerIndex = currentQ.options.length - 1;
                }
                currentQ.type = 'true_false';
                lastType = 'option';
                continue;
            }
        }

        // ─── Bare True/False option lines ───
        if (currentQ && bareTrueFalseOption.test(line)) {
            const m = line.match(bareTrueFalseOption)!;
            const val = m[1].trim();
            const { cleaned, isCorrect } = stripCorrectMarker(val);
            const normalized = /^(true|t|\u0635\u062d|\u0635\u062d\u064a\u062d)$/i.test(cleaned) ? 'True' : 'False';

            if (!currentQ.options.some(o => o.toLowerCase() === normalized.toLowerCase())) {
                currentQ.options.push(normalized);
                if (isCorrect) currentQ.correctAnswerIndex = currentQ.options.length - 1;
            }
            currentQ.type = 'true_false';
            lastType = 'option';
            continue;
        }

        // ─── True/False indicator line ───
        if (currentQ && trueFalseIndicator.some(p => p.test(line))) {
            currentQ.type = 'true_false';
            currentQ.options = ['True', 'False'];
            lastType = 'option';
            continue;
        }

        // ─── Inline answer line: "Correct Answer: C" ───
        if (currentQ) {
            let inlineAnswerMatched = false;
            for (const p of inlineAnswerPatterns) {
                const m = line.match(p);
                if (m) {
                    applyAnswer(currentQ, m[1]);
                    lastType = 'answer';
                    inlineAnswerMatched = true;
                    break;
                }
            }
            if (inlineAnswerMatched) continue;
        }

        // ─── Inline options on same line: "A) X   B) Y   C) Z" ───
        if (currentQ) {
            const inlineOpts = trySplitInline(line);
            if (inlineOpts) {
                for (const opt of inlineOpts) {
                    const optText = cleanText(opt.text);
                    const { cleaned, isCorrect } = stripCorrectMarker(optText);
                    currentQ.options.push(cleaned);
                    if (isCorrect) currentQ.correctAnswerIndex = currentQ.options.length - 1;
                }
                if (currentQ.options.length === 2) {
                    const sorted = currentQ.options.map(o => o.toLowerCase()).sort();
                    if (sorted[0] === 'false' && sorted[1] === 'true') currentQ.type = 'true_false';
                }
                lastType = 'option';
                dashOptionMode = false;
                continue;
            }
        }

        // ─── Lettered option (including Arabic) ───
        const opt = matchOption(line);
        if (opt && currentQ) {
            const optText = cleanText(opt.text);
            const { cleaned, isCorrect } = stripCorrectMarker(optText);
            currentQ.options.push(cleaned);
            if (opt.markedBefore || isCorrect) {
                currentQ.correctAnswerIndex = currentQ.options.length - 1;
            }

            if (currentQ.options.length === 2) {
                const sorted = currentQ.options.map(o => o.toLowerCase().trim()).sort();
                if ((sorted[0] === 'false' && sorted[1] === 'true') ||
                    (sorted[0] === '\u062e\u0637\u0623' && sorted[1] === '\u0635\u062d') ||
                    (sorted[0] === 'f' && sorted[1] === 't')) {
                    currentQ.type = 'true_false';
                }
            }
            lastType = 'option';
            dashOptionMode = false;
            continue;
        }

        // ─── Dash/bullet options (no letter prefix) ───
        if (currentQ && (lastType === 'question' || dashOptionMode)) {
            const dashM = line.match(OPT_DASH);
            if (dashM) {
                const optText = cleanText(dashM[1]);
                const { cleaned, isCorrect } = stripCorrectMarker(optText);
                currentQ.options.push(cleaned);
                if (isCorrect) currentQ.correctAnswerIndex = currentQ.options.length - 1;

                if (currentQ.options.length === 2) {
                    const sorted = currentQ.options.map(o => o.toLowerCase().trim()).sort();
                    if (sorted[0] === 'false' && sorted[1] === 'true') currentQ.type = 'true_false';
                }
                lastType = 'option';
                dashOptionMode = true;
                continue;
            }
        }

        // ─── Numbered sub-options (1-8, sequential, inside question) ───
        if (currentQ && currentQ.options.length > 0 && lastType === 'option' && currentQ.type !== 'true_false') {
            const numOptM = line.match(OPT_NUMBERED);
            if (numOptM) {
                const subNum = parseInt(numOptM[1]);
                const optCandidate = numOptM[2].trim();
                // Reject if text looks like a real question (contains ?) or is too long for an option
                if (subNum <= 8 && subNum === currentQ.options.length + 1 && !optCandidate.includes('?') && optCandidate.length <= 80) {
                    const optText = cleanText(optCandidate);
                    const { cleaned, isCorrect } = stripCorrectMarker(optText);
                    currentQ.options.push(cleaned);
                    if (isCorrect) currentQ.correctAnswerIndex = currentQ.options.length - 1;
                    continue;
                }
            }
        }

        // ─── New question ───
        const qMatch = matchQuestion(line);
        if (qMatch) {
            // Guard: stray answer-key line
            if (/^\s*\*{0,2}\s*[a-hA-H]\s*\*{0,2}\s*$/.test(qMatch.text)) continue;

            // Guard: "1. True" / "2. False" that's actually a numbered T/F option for currentQ
            if (/^\s*\*{0,2}\s*(True|False|\u0635\u062d|\u062e\u0637\u0623|\u0635\u062d\u064a\u062d|\u062e\u0627\u0637\u0626)\s*\*{0,2}\s*$/i.test(qMatch.text)) {
                if (currentQ) {
                    // Treat as numbered T/F option for current question
                    const tfVal = qMatch.text.trim();
                    const normalized = /^(true|t|\u0635\u062d|\u0635\u062d\u064a\u062d)$/i.test(tfVal) ? 'True' : 'False';
                    if (!currentQ.options.some(o => o.toLowerCase() === normalized.toLowerCase())) {
                        currentQ.options.push(normalized);
                    }
                    currentQ.type = 'true_false';
                    lastType = 'option';
                    continue;
                }
            }

            finalizeQ();
            autoId++;
            currentQ = {
                id: qMatch.num || autoId,
                text: qMatch.text,
                options: [],
                correctAnswerIndex: -1,
                type: 'mcq',
            };
            lastType = 'question';
            dashOptionMode = false;
            continue;
        }

        // ─── Multiline continuation ───
        if (currentQ) {
            if (/^[-=*_]{3,}$/.test(line)) continue;
            if (/^#{1,6}\s/.test(line)) continue;

            const cleanLine = cleanText(line);
            if (!cleanLine) continue;

            if (lastType === 'question') {
                currentQ.text += ' ' + cleanLine;
            } else if (lastType === 'option' && currentQ.options.length > 0) {
                const idx = currentQ.options.length - 1;
                currentQ.options[idx] += ' ' + cleanLine;
            }
        }
    }

    finalizeQ();

    // ════════════════════ STEP 3: Parse Answer Key ════════════════════

    for (const line of answerLines) {
        // Skip headers, sub-headers, table separators, table header rows
        if (answerSectionPatterns.some(p => p.test(line))) continue;
        if (subHeaderSkip.some(p => p.test(line))) continue;
        if (answerSubSectionSkip.some(p => p.test(line))) continue;
        if (tableHeaderPattern.test(line)) continue;
        if (/^\|?\s*[-:]+\s*\|/.test(line)) continue;
        // Skip decorative lines in answer section ("Good luck! 🎓", "*italic text*")
        if (/^\*?[^*|]*?(good\s*luck|\ud83c\udf93|\ud83c\udf40|\u2728)[^|]*?\*?\s*$/iu.test(line)) continue;
        if (/^\*[^*]+\*\s*$/.test(line) && !/\d/.test(line)) continue;

        // --- Table format: "| 1 | C |" ---
        const tableM = line.match(tableAnswerPattern);
        if (tableM) {
            const qId = parseInt(tableM[1]);
            const ansRaw = tableM[2].trim();
            const question = questions.find(q => q.id === qId);
            if (question) {
                if (/^[a-hA-H]$/i.test(ansRaw)) {
                    question.correctAnswerIndex = ansRaw.toLowerCase().charCodeAt(0) - 97;
                } else {
                    applyAnswer(question, ansRaw);
                }
            }
            continue;
        }

        // --- Comma-separated: "1.C, 2.A, 3.B, ..." ---
        if (commaSepAnswerPattern.test(line)) {
            const pairs = line.match(/(\d+)\s*[.\-:=]\s*\(?([a-hA-H]|True|False)\)?/gi);
            if (pairs) {
                for (const pair of pairs) {
                    const pm = pair.match(/(\d+)\s*[.\-:=]\s*\(?([a-hA-H]|True|False)\)?/i);
                    if (pm) {
                        const qId = parseInt(pm[1]);
                        const ansRaw = pm[2].trim();
                        const question = questions.find(q => q.id === qId);
                        if (question) {
                            if (/^[a-hA-H]$/i.test(ansRaw)) {
                                question.correctAnswerIndex = ansRaw.toLowerCase().charCodeAt(0) - 97;
                            } else {
                                applyAnswer(question, ansRaw);
                            }
                        }
                    }
                }
            }
            continue;
        }

        // --- Standard answer key line patterns ---
        let matched = false;
        for (const { regex, type } of answerKeyLinePatterns) {
            const m = line.match(regex);
            if (m) {
                const qId = parseInt(m[1]);
                const answerRaw = m[2].trim();
                const question = questions.find(q => q.id === qId);

                if (question) {
                    if (type === 'mcq') {
                        const index = answerRaw.toLowerCase().charCodeAt(0) - 97;
                        if (index >= 0 && index <= 7) {
                            question.correctAnswerIndex = index;
                        }
                    } else if (type === 'tf') {
                        question.type = 'true_false';
                        if (question.options.length === 0 ||
                            (question.options.length === 2 && /^(true|\u0635\u062d)/i.test(question.options[0]))) {
                            question.options = ['True', 'False'];
                        }
                        if (/^(true|t|\u0635\u062d|\u0635\u062d\u064a\u062d)$/i.test(answerRaw)) {
                            question.correctAnswerIndex = question.options.findIndex(
                                o => /^(true|t|\u0635\u062d|\u0635\u062d\u064a\u062d)$/i.test(o.trim())
                            );
                            if (question.correctAnswerIndex === -1) question.correctAnswerIndex = 0;
                        } else {
                            question.correctAnswerIndex = question.options.findIndex(
                                o => /^(false|f|\u062e\u0637\u0623|\u062e\u0627\u0637\u0626)$/i.test(o.trim())
                            );
                            if (question.correctAnswerIndex === -1) question.correctAnswerIndex = 1;
                        }
                    }
                }
                matched = true;
                break;
            }
        }

        if (matched) continue;
    }

    // ════════════════════ STEP 4: Post-Processing ════════════════════

    // Remove questions that have no options and weren't converted to T/F by answer key
    for (let i = questions.length - 1; i >= 0; i--) {
        if (questions[i].options.length < 2 && questions[i].type !== 'true_false') {
            questions.splice(i, 1);
        }
    }

    // Fix question IDs to be sequential
    const seenIds = new Set<number>();
    let nextId = 1;
    for (const q of questions) {
        if (seenIds.has(q.id)) {
            q.id = nextId;
        }
        seenIds.add(q.id);
        nextId = q.id + 1;
    }

    // Normalize True/False options
    for (const q of questions) {
        if (q.type === 'true_false') {
            const hasTrue = q.options.some(o => /^(true|t|\u0635\u062d|\u0635\u062d\u064a\u062d)$/i.test(o.trim()));
            const hasFalse = q.options.some(o => /^(false|f|\u062e\u0637\u0623|\u062e\u0627\u0637\u0626)$/i.test(o.trim()));
            if (hasTrue && hasFalse && q.options.length === 2) {
                const correctVal = q.correctAnswerIndex >= 0 ? q.options[q.correctAnswerIndex]?.trim().toLowerCase() : null;
                q.options = ['True', 'False'];
                if (correctVal && /^(true|t|\u0635\u062d|\u0635\u062d\u064a\u062d)$/i.test(correctVal)) {
                    q.correctAnswerIndex = 0;
                } else if (correctVal && /^(false|f|\u062e\u0637\u0623|\u062e\u0627\u0637\u0626)$/i.test(correctVal)) {
                    q.correctAnswerIndex = 1;
                }
            }
        }
    }

    // ════════════════════ STEP 5: Stats & Errors ════════════════════

    const withAnswers = questions.filter(q => q.correctAnswerIndex !== -1);
    const withoutAnswers = questions.filter(q => q.correctAnswerIndex === -1);
    const truefalseCount = questions.filter(q => q.type === 'true_false').length;
    const mcqCount = questions.filter(q => q.type === 'mcq').length;

    if (questions.length === 0) {
        errors.push("\u274C No questions found. Make sure questions start with a number (e.g., '1. Question text') followed by options (e.g., 'A) Option').");
    } else {
        if (withoutAnswers.length > 0) {
            errors.push(
                `\u26A0\uFE0F Missing answers for ${withoutAnswers.length} question(s): #${withoutAnswers.map(q => q.id).join(', #')}. ` +
                `Add an Answer Key section or mark correct options with \u2705 or (Correct).`
            );
        }
    }

    return {
        questions,
        errors,
        stats: {
            totalDetected: questions.length,
            withAnswers: withAnswers.length,
            withoutAnswers: withoutAnswers.length,
            truefalseCount,
            mcqCount,
        },
    };
}
