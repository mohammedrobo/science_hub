import { LATEX_COMMANDS, LATEX_SYMBOLS, buildCommandRegexSource, buildSymbolRegexSource } from './latex-constants';

export interface QuizQuestion {
    id: number;
    text: string;
    options: string[];
    correctAnswerIndex: number; // 0-based index, -1 if unknown
    type: 'mcq' | 'true_false' | 'fill_blank';
    explanation?: string;
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
        fillBlankCount: number;
    };
}

// ════════════════════════════════════════════════════════════════════════════
// QUIZ TEXT PARSER v5
// Robust plain-text parser — handles ANY quiz format, ANY language
// Supports: MCQ (a–z, roman, numbered, dash), True/False (incl. Yes/No,
// Correct/Incorrect, Right/Wrong), Fill-blank, inline options, Arabic,
// answer keys with explanations, and ANY math/physics/chemistry formula.
// ════════════════════════════════════════════════════════════════════════════

// Maximum input limits to prevent browser freezes
const MAX_INPUT_BYTES = 512_000; // 500 KB
const MAX_INPUT_LINES = 10_000;

// ── Preprocessing ──────────────────────────────────────────────────────────

function preprocess(raw: string): string {
    let text = raw;

    // 0. Normalize non-breaking spaces, zero-width chars, and other invisible Unicode
    text = text.replace(/[\u00A0\u200B\u200C\u200D\uFEFF]/g, ' ');

    // 1. Normalize line endings
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // 1b. Strip HTML tags — quizzes copied from web editors / rich text
    //     Convert <br> to newline first, then remove all other tags
    text = text.replace(/<br\s*\/?>/gi, '\n');
    text = text.replace(/<\/?(?:b|strong|em|i|u|mark|span|div|p|code|pre|font|s|del|ins|small|big|abbr|cite|q|var|kbd|samp|wbr|details|summary|section|article|aside|header|footer|main|nav|figure|figcaption|ul|ol|li|dl|dt|dd|h[1-6]|a|sup|sub|ruby|rt|rp|bdi|bdo|data|time|dfn|output|meter|progress)(\s[^>]*)?\/?>|<\/?table(\s[^>]*)?\/?>|<\/?t(?:head|body|foot|r|h|d)(\s[^>]*)?\/?>|<\!--[\s\S]*?-->/gi, '');

    // 1c. Convert emoji number indicators to regular digits
    text = text.replace(/([\u0030-\u0039])\uFE0F\u20E3/g, '$1.');

    // 1d. Remove markdown images: ![alt](url) — these are never quiz content
    text = text.replace(/!\[[^\]]*\]\([^)]*\)/g, '');

    // 1e. Convert markdown links to just their text: [text](url) → text
    text = text.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');

    // 2. Remove conversational greetings/closings — ONLY in the first & last 5 non-empty lines
    const conversationalPatterns = [
        /^(sure!?|here\s+(is|are)|okay|ok!?|certainly|of course|hello|hi!?|hey|great|absolutely).*/i,
        /^(good luck|hope this helps|i hope|feel free|let me know|best of luck|happy studying).*/i,
        /^(here'?s?\s+(a|your|the)\s+.*(quiz|exam|test|questions?)).*/i,
        /^(this\s+(quiz|exam|test)\s+(contains?|has|includes|covers?)).*/i,
        /^(below\s+(is|are)\s+.*(questions?|quiz|exam)).*/i,
        /^(total\s+(marks?|points?|score)\s*[:=]).*/i,
        /^(time\s*(allowed|limit|duration)\s*[:=]).*/i,
    ];

    const headerOnlyPatterns = [
        /^(note\s*:|disclaimer\s*:|instructions?\s*:).*/i,
    ];

    const lines = text.split('\n');

    const nonEmptyIndices: number[] = [];
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim()) nonEmptyIndices.push(i);
    }
    const headIndices = new Set(nonEmptyIndices.slice(0, 5));
    const tailIndices = new Set(nonEmptyIndices.slice(-5));

    const filtered = lines.filter((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return true;

        if (headIndices.has(idx)) {
            if (headerOnlyPatterns.some(p => p.test(trimmed))) return false;
        }

        if (headIndices.has(idx) || tailIndices.has(idx)) {
            if (conversationalPatterns.some(p => p.test(trimmed))) return false;
        }

        return true;
    });
    text = filtered.join('\n');

    // 3. Strip markdown artifacts that interfere with parsing

    // 3a. Strip fenced code block delimiters (``` or ~~~) — keep inner content as plain text
    text = text.replace(/^\s*(`{3,}|~{3,})[^\n]*$/gm, '');

    // 3b. Strip blockquote markers (> ) from the start of lines
    text = text.replace(/^(\s*)>\s?/gm, '$1');

    // 3b2. Convert markdown checkbox lists to regular options with markers
    //      - [x] Option  →  - ✅ Option (correct)   - [ ] Option  →  - Option
    text = text.replace(/^(\s*)[-*]\s*\[x\]\s*/gmi, '$1- ✅ ');
    text = text.replace(/^(\s*)[-*]\s*\[\s\]\s*/gm, '$1- ');

    // 3b3. Convert heading-based questions to plain numbered format
    //      ## 1. What is... → 1. What is...   ### Question 1: ... → Question 1: ...
    text = text.replace(/^#{1,6}\s+(\d+[.\)\-:])/gm, '$1');
    text = text.replace(/^#{1,6}\s+(Q\.?\s*\d+)/gmi, '$1');
    text = text.replace(/^#{1,6}\s+(Question\s*\d+)/gmi, '$1');
    text = text.replace(/^#{1,6}\s+(\u0627\u0644\u0633\u0624\u0627\u0644\s*\d+)/gmi, '$1');

    // 3c. Remove section headers that are NOT answer keys
    text = text.replace(/^#{1,6}\s+\*{0,2}(?:part|section|topic|chapter|category)\s+\d*\*{0,2}\s*[:\-\u2013\u2014]?\s*.*/gmi, (match) => {
        if (/answer|solution|\u0627\u0644\u0625\u062c\u0627\u0628/i.test(match)) return match;
        return '';
    });

    // Remove horizontal rules
    text = text.replace(/^\s*[-*_=]{3,}\s*$/gm, '');

    // 3c2. Strip markdown table separator rows (---|---)
    text = text.replace(/^\s*\|?\s*[:|-]+\s*(\|[:|-]+\s*)+\|?\s*$/gm, '');

    // 3d. Shield math delimiters BEFORE bold-stripping so * inside formulas isn't corrupted
    //     Temporarily replace $...$ and $$...$$ with placeholders
    const mathShield: string[] = [];
    text = text.replace(/\$\$[\s\S]+?\$\$/g, (m) => {
        mathShield.push(m);
        return `__MATH_SHIELD_${mathShield.length - 1}__`;
    });
    text = text.replace(/(?<!\\)\$(?:[^$]|\n(?!\n)){1,2000}?\$/g, (m) => {
        // Skip currency: $50, $1,000
        if (/^\$\d[\d,]*\.?\d*$/.test(m)) return m;
        mathShield.push(m);
        return `__MATH_SHIELD_${mathShield.length - 1}__`;
    });

    // 3e. Bold-stripping (now safe — formulas are shielded)
    // Remove bold/italic wrappers around question numbers: **1.** or ***1.*** -> 1.
    text = text.replace(/^\*{1,3}(\d+[\.\)\-])\*{1,3}\s*/gm, '$1 ');

    // Unwrap fully bold/italic questions: **1. What is X?** or ***1. What is X?*** -> 1. What is X?
    text = text.replace(/^\*{1,3}((?:\d+|Q\d+|Question\s*\d+)[\.\)\-:\s].+?)\*{1,3}\s*$/gmi, '$1');

    // Unwrap bold/italic around option letters: *a)* text → a) text, _b)_ text → b) text
    text = text.replace(/^[_*]{1,3}([a-zA-Z][.\)\-:])[_*]{1,3}\s*/gm, '$1 ');

    // Remove standalone bold markers on lines
    text = text.replace(/^\s*\*{2,}\s*$/gm, '');

    // Unwrap bold/italic around "Answer Key:" variants
    text = text.replace(/^\*{1,3}((?:answer\s*key|answers?|correct\s*answers?|solutions?)\s*:?)\*{1,3}\s*:?\s*$/gmi, '$1:');

    // 3f. Restore shielded math
    for (let i = 0; i < mathShield.length; i++) {
        text = text.replace(`__MATH_SHIELD_${i}__`, mathShield[i]);
    }

    // 3g. Unescape markdown escape characters (but NOT LaTeX backslash commands)
    //     \* → *, \_ → _, \# → #, \` → `, \~ → ~, \> → >, \| → |, \. → ., \) → )
    //     Must run AFTER math restoration to avoid corrupting LaTeX
    text = text.replace(/\\([*_#`~>|.\)\-!])/g, '$1');

    // 3h. Strip leading list markers before question numbers: - **1.** → 1.
    text = text.replace(/^\s*[-•]\s+\*{0,2}(\d+[.\)\-:])/gm, '$1');

    return text;
}

// ── Balanced Brace Helpers ─────────────────────────────────────────────────

/** Find the index of the closing '}' matching the '{' at `start`. Handles arbitrary nesting and escaped braces. Returns -1 if unbalanced. */
function findMatchingBrace(text: string, start: number): number {
    if (text[start] !== '{') return -1;
    let depth = 0;
    for (let i = start; i < text.length; i++) {
        if (text[i] === '\\' && i + 1 < text.length) { i++; continue; } // skip escaped chars
        if (text[i] === '{') depth++;
        else if (text[i] === '}') { depth--; if (depth === 0) return i; }
    }
    return -1;
}

/** From `pos`, consume consecutive optional-bracket [..] and brace groups {..}.
 *  Returns end index (exclusive). `minGroups` = minimum required brace groups to succeed.
 *  Allows crossing up to `maxNewlines` newlines between groups to handle AI-generated
 *  formulas split across lines (e.g. \frac\n{a}\n{b}). */
function consumeBraceGroups(text: string, pos: number, minGroups = 1, maxNewlines = 3): number {
    let cur = pos;
    let groups = 0;
    let newlinesCrossed = 0;
    while (cur < text.length) {
        // Skip whitespace (including newlines up to limit) between groups
        const wsStart = cur;
        while (cur < text.length && (text[cur] === ' ' || text[cur] === '\t' || text[cur] === '\n' || text[cur] === '\r')) {
            if (text[cur] === '\n') {
                newlinesCrossed++;
                if (newlinesCrossed > maxNewlines) { cur = wsStart; break; }
            }
            cur++;
        }
        if (newlinesCrossed > maxNewlines) break;
        // Optional bracket group [...]
        if (cur < text.length && text[cur] === '[') {
            const close = text.indexOf(']', cur + 1);
            if (close === -1) { cur = wsStart; break; }
            cur = close + 1;
            continue;
        }
        // Brace group {...} with balanced nesting
        if (cur < text.length && text[cur] === '{') {
            const close = findMatchingBrace(text, cur);
            if (close === -1) { cur = wsStart; break; }
            cur = close + 1;
            groups++;
        } else {
            // No group found — rewind past any consumed whitespace/newlines
            cur = wsStart;
            break;
        }
    }
    return groups >= minGroups ? cur : pos;
}

// ── LaTeX Protection ───────────────────────────────────────────────────────

function protectLatex(text: string): { cleaned: string; restore: (s: string) => string } {
    const placeholders: Map<string, string> = new Map();
    let counter = 0;

    const protect = (match: string, prefix: string): string => {
        const key = `__LATEX:${prefix}${counter++}__`;
        placeholders.set(key, match);
        return key;
    };

    let cleaned = text;

    // ── Phase 1: Delimited math (balanced by delimiters — regex is safe) ──

    // 1. Block math: $$...$$ (greedy across newlines)
    cleaned = cleaned.replace(/\$\$([\s\S]+?)\$\$/g, (m) => protect(m, 'B'));

    // 2. LaTeX environments: \begin{...}...\end{...}
    //    Must come before \[...\] to avoid conflicts with \begin{bmatrix} etc.
    cleaned = cleaned.replace(/\\begin\{([^}]+)\}[\s\S]*?\\end\{\1\}/g, (m) => protect(m, 'E'));

    // 3. Display math: \[...\]
    cleaned = cleaned.replace(/\\\[([\s\S]+?)\\\]/g, (m) => protect(m, 'K'));

    // 4. Inline math: $...$ — supports multi-line (up to 5 lines), up to 2000 chars
    //    Currency disambiguation: $<digits> or $<digits>,<digits> NOT treated as LaTeX
    cleaned = cleaned.replace(/(?<!\\)\$((?:[^$]|\n(?!\n)){1,2000}?)\$/g, (m, inner) => {
        // Skip currency: $50, $1,000, $3.99
        if (/^\$\d[\d,]*\.?\d*$/.test(m)) return m;
        // Skip if inner is purely digits (price like $50)
        if (/^\d[\d,]*\.?\d*$/.test(inner.trim())) return m;
        // Allow up to 5 lines
        const lineCount = (inner.match(/\n/g) || []).length;
        if (lineCount > 5) return m;
        return protect(m, 'I');
    });

    // 5. Parenthesized inline: \(...\)
    cleaned = cleaned.replace(/\\\(([\s\S]+?)\\\)/g, (m) => protect(m, 'P'));

    // ── Phase 2: Standalone commands with arbitrary nesting depth ──
    //    Uses iterative balanced-brace matching instead of regex for braces.

    const cmdSource = buildCommandRegexSource();
    const cmdRegex = new RegExp(`\\\\(?:${cmdSource})(?![a-zA-Z])`, 'g');
    let result = '';
    let lastIdx = 0;
    let cmdMatch: RegExpExecArray | null;

    // Special handling for \left...\right pairs
    const leftRightResult: string[] = [];
    let lrText = cleaned;

    // First pass: protect \left...\right pairs (can nest)
    // Use iterative approach for \left...\right
    let lrPos = 0;
    while (lrPos < lrText.length) {
        const leftIdx = lrText.indexOf('\\left', lrPos);
        if (leftIdx === -1) {
            leftRightResult.push(lrText.substring(lrPos));
            break;
        }
        // Check it's actually \left (not \leftarrow etc.)
        const afterLeft = lrText.substring(leftIdx + 5);
        const validLeftDelims = /^[\(\[\{|.\\]/;
        if (!validLeftDelims.test(afterLeft)) {
            leftRightResult.push(lrText.substring(lrPos, leftIdx + 5));
            lrPos = leftIdx + 5;
            continue;
        }

        // Find matching \right by counting \left/\right depth
        let depth = 0;
        let searchPos = leftIdx;
        let rightEnd = -1;
        while (searchPos < lrText.length) {
            const nextLeft = lrText.indexOf('\\left', searchPos);
            const nextRight = lrText.indexOf('\\right', searchPos);

            if (nextRight === -1) break; // no matching \right

            if (nextLeft !== -1 && nextLeft < nextRight) {
                // Check if it's a real \left (not \leftarrow)
                const checkAfter = lrText.substring(nextLeft + 5);
                if (validLeftDelims.test(checkAfter)) {
                    depth++;
                    searchPos = nextLeft + 5;
                } else {
                    searchPos = nextLeft + 5;
                }
            } else {
                if (depth === 0) {
                    // Find the delimiter after \right
                    const afterRight = lrText.substring(nextRight + 6);
                    const delimMatch = afterRight.match(/^[\)\]\}|.\\]/);
                    rightEnd = nextRight + 6 + (delimMatch ? delimMatch[0].length : 0);
                    break;
                }
                depth--;
                searchPos = nextRight + 6;
            }
        }

        if (rightEnd !== -1) {
            leftRightResult.push(lrText.substring(lrPos, leftIdx));
            const fullExpr = lrText.substring(leftIdx, rightEnd);
            leftRightResult.push(protect(fullExpr, 'LR'));
            lrPos = rightEnd;
        } else {
            leftRightResult.push(lrText.substring(lrPos, leftIdx + 5));
            lrPos = leftIdx + 5;
        }
    }
    cleaned = leftRightResult.join('');

    // Second pass: protect standalone commands with brace groups
    result = '';
    lastIdx = 0;
    cmdRegex.lastIndex = 0;

    while ((cmdMatch = cmdRegex.exec(cleaned)) !== null) {
        const cmdName = cmdMatch[0].substring(1); // remove leading backslash

        // Skip \left/\right/\big etc. — already handled or don't consume braces
        if (['left', 'right', 'bigl', 'bigr', 'Bigl', 'Bigr', 'biggl', 'biggr', 'Biggl', 'Biggr', 'middle',
            'displaystyle', 'textstyle', 'scriptstyle', 'scriptscriptstyle',
            'big', 'Big', 'bigg', 'Bigg',
            'limits', 'nolimits'].includes(cmdName)) {
            // These are modifiers that don't necessarily take brace groups
            // Protect just the command itself
            result += cleaned.substring(lastIdx, cmdMatch.index);
            result += protect(cmdMatch[0], 'C');
            lastIdx = cmdMatch.index + cmdMatch[0].length;
            continue;
        }

        result += cleaned.substring(lastIdx, cmdMatch.index);
        const cmdEnd = cmdMatch.index + cmdMatch[0].length;
        const consumed = consumeBraceGroups(cleaned, cmdEnd, 0);
        if (consumed > cmdEnd) {
            const fullCmd = cleaned.substring(cmdMatch.index, consumed);
            result += protect(fullCmd, 'C');
            lastIdx = consumed;
            cmdRegex.lastIndex = consumed;
        } else {
            result += protect(cmdMatch[0], 'C');
            lastIdx = cmdEnd;
        }
    }
    result += cleaned.substring(lastIdx);
    cleaned = result;

    // ── Phase 3: Standalone symbols (Greek, operators, relations, arrows, etc.) ──
    const symSource = buildSymbolRegexSource();
    const symRegex = new RegExp(`\\\\(?:${symSource})(?![a-zA-Z])`, 'g');
    cleaned = cleaned.replace(symRegex, (m) => protect(m, 'S'));

    // ── Phase 4: Superscripts/subscripts without $ delimiters ──
    // Uses extractBalancedBraces for unlimited nesting depth
    // Braced: x^{...}, CO_{2}, H^{+}
    result = '';
    lastIdx = 0;
    const subSupBraceRegex = /(?<=[a-zA-Z0-9\)}\]])[\^_]\{/g;
    let ssMatch: RegExpExecArray | null;
    while ((ssMatch = subSupBraceRegex.exec(cleaned)) !== null) {
        result += cleaned.substring(lastIdx, ssMatch.index);
        const caretOrUnderscore = cleaned[ssMatch.index];
        const braceStart = ssMatch.index + 1; // position of {
        const braceEnd = findMatchingBrace(cleaned, braceStart + (caretOrUnderscore === '^' || caretOrUnderscore === '_' ? 0 : 0));
        // Actually: ssMatch matches ^{ or _{, so the { is at ssMatch.index + 1
        const actualBraceStart = ssMatch.index + 1;
        const actualBraceEnd = findMatchingBrace(cleaned, actualBraceStart);
        if (actualBraceEnd !== -1) {
            const fullExpr = cleaned.substring(ssMatch.index, actualBraceEnd + 1);
            result += protect(fullExpr, 'X');
            lastIdx = actualBraceEnd + 1;
            subSupBraceRegex.lastIndex = actualBraceEnd + 1;
        } else {
            result += cleaned.substring(lastIdx, ssMatch.index + ssMatch[0].length);
            lastIdx = ssMatch.index + ssMatch[0].length;
        }
    }
    result += cleaned.substring(lastIdx);
    cleaned = result;

    // Simple single-char: x^2, a_i, H^+, e^x, H^-, O^2
    cleaned = cleaned.replace(/(?<=[a-zA-Z0-9\)}\]])[\^_]([a-zA-Z0-9+\-*])/g, (m) => protect(m, 'X'));

    const restore = (s: string): string => {
        let result = s;
        // Need multiple passes because placeholders can be nested
        let maxPasses = 10;
        while (maxPasses-- > 0) {
            let changed = false;
            for (const [key, val] of placeholders) {
                if (result.includes(key)) {
                    result = result.replaceAll(key, val);
                    changed = true;
                }
            }
            if (!changed) break;
        }
        return result;
    };

    return { cleaned, restore };
}

// ── Inline Options Splitter ────────────────────────────────────────────────

function trySplitInline(line: string): { letter: string; text: string }[] | null {
    // Support a-z range for inline options, with 1+ space separation
    const parts = line.split(/\s{2,}(?=\*{0,2}[a-zA-Z]\s*[\.\)\-:])/);
    if (parts.length < 2) return null;

    const results: { letter: string; text: string }[] = [];
    const optRe = /^\*{0,2}\s*([a-zA-Z])\s*[\.\)\-:]\s*\*{0,2}\s*(.+)/;

    for (const p of parts) {
        const m = p.trim().match(optRe);
        if (m) {
            const letter = m[1].toLowerCase();
            if (letter >= 'a' && letter <= 'z') {
                results.push({ letter, text: m[2].trim() });
            }
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
    /\s*\u2606\s*$/,   // ☆
    /\s*\u2605\s*$/,   // ★
    /\s*>>\s*$/,        // >>
];

function stripCorrectMarker(text: string): { cleaned: string; isCorrect: boolean } {
    // Check for trailing correct markers
    for (const p of INLINE_CORRECT_PATTERNS) {
        if (p.test(text)) {
            return { cleaned: text.replace(p, '').trim(), isCorrect: true };
        }
    }
    // Check for leading ✅ marker (e.g. from checkbox conversion: - [x] -> - ✅ Option)
    if (/^[\u2705\u2714\u2713]+\s+/.test(text)) {
        return { cleaned: text.replace(/^[\u2705\u2714\u2713]+\s+/, '').trim(), isCorrect: true };
    }
    return { cleaned: text, isCorrect: false };
}

// ── Clean Option/Question Text ─────────────────────────────────────────────

function cleanText(text: string): string {
    return text
        .replace(/^\*{1,2}\s*/, '')
        .replace(/\s*\*{1,2}$/, '')
        .trim();
}

// ── Apply Answer to Question (with bounds checking) ────────────────────────

function applyAnswer(q: QuizQuestion, ansRaw: string, explanation?: string): void {
    const ans = ansRaw.trim().toLowerCase();

    if (explanation) {
        q.explanation = explanation.trim();
    }

    // MCQ letter answer (a-z) — WITH bounds check
    if (/^[a-z]$/i.test(ans)) {
        const index = ans.charCodeAt(0) - 97;
        if (index >= 0 && index <= 25 && (q.options.length === 0 || index < q.options.length)) {
            q.correctAnswerIndex = index;
        }
        return;
    }

    // True/False answer (including Yes/No, Correct/Incorrect, Right/Wrong)
    if (/^(true|t|yes|y|correct|right|\u0635\u062d|\u0635\u062d\u064a\u062d)$/i.test(ans)) {
        q.type = 'true_false';
        if (q.options.length === 0) q.options = ['True', 'False'];
        q.correctAnswerIndex = q.options.findIndex(o =>
            /^(true|t|yes|y|correct|right|\u0635\u062d|\u0635\u062d\u064a\u062d)$/i.test(o.trim())
        );
        if (q.correctAnswerIndex === -1) q.correctAnswerIndex = 0;
        return;
    }
    if (/^(false|f|no|n|incorrect|wrong|\u062e\u0637\u0623|\u062e\u0627\u0637\u0626)$/i.test(ans)) {
        q.type = 'true_false';
        if (q.options.length === 0) q.options = ['True', 'False'];
        q.correctAnswerIndex = q.options.findIndex(o =>
            /^(false|f|no|n|incorrect|wrong|\u062e\u0637\u0623|\u062e\u0627\u0637\u0626)$/i.test(o.trim())
        );
        if (q.correctAnswerIndex === -1) q.correctAnswerIndex = 1;
        return;
    }

    // Fill-blank text answer: store raw answer text
    if (q.type === 'fill_blank') {
        q.options = [ansRaw.trim()];
        q.correctAnswerIndex = 0;
        return;
    }
}

// ── Roman numeral helpers ──────────────────────────────────────────────────

const romanToInt = (roman: string): number => {
    const map: Record<string, number> = {
        i: 1, v: 5, x: 10, l: 50, c: 100, d: 500, m: 1000,
    };
    let result = 0;
    const s = roman.toLowerCase();
    for (let j = 0; j < s.length; j++) {
        const cur = map[s[j]] || 0;
        const nxt = map[s[j + 1]] || 0;
        if (cur < nxt) result -= cur;
        else result += cur;
    }
    return result;
};

const isRomanNumeral = (s: string): boolean => {
    return /^(?:m{0,3})(?:cm|cd|d?c{0,3})(?:xc|xl|l?x{0,3})(?:ix|iv|v?i{0,3})$/i.test(s) && s.length > 0;
};

// ── Main Parser ────────────────────────────────────────────────────────────

export function parseQuizText(text: string): QuizParseResult {
    const errors: string[] = [];

    // ── Input size guard ──
    if (text.length > MAX_INPUT_BYTES) {
        return {
            questions: [],
            errors: ['\u274C Input is too large (max 500 KB). Please paste a smaller quiz.'],
            stats: { totalDetected: 0, withAnswers: 0, withoutAnswers: 0, truefalseCount: 0, mcqCount: 0, fillBlankCount: 0 },
        };
    }

    const preprocessed = preprocess(text);
    const { cleaned: safeText, restore } = protectLatex(preprocessed);

    const lines = safeText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    if (lines.length > MAX_INPUT_LINES) {
        return {
            questions: [],
            errors: [`\u274C Too many lines (${lines.length}). Max ${MAX_INPUT_LINES} lines supported.`],
            stats: { totalDetected: 0, withAnswers: 0, withoutAnswers: 0, truefalseCount: 0, mcqCount: 0, fillBlankCount: 0 },
        };
    }

    const questions: QuizQuestion[] = [];

    // ════════════════════ PATTERNS ════════════════════

    const questionPatterns: { regex: RegExp; numGroup: number; textGroup: number }[] = [
        { regex: /^\*{0,2}\s*Question\s*#?\s*(\d+)\s*\*{0,2}\s*[.\-:\)]\s*(.*)/i, numGroup: 1, textGroup: 2 },
        { regex: /^\*{0,2}\s*Q\.?\s*#?\s*(\d+)\s*\*{0,2}\s*[.\-:\)]\s*(.*)/i, numGroup: 1, textGroup: 2 },
        { regex: /^\*{0,2}\s*\u0627\u0644\u0633\u0624\u0627\u0644\s*(\d+)\s*\*{0,2}\s*[.:\-\)]\s*(.*)/i, numGroup: 1, textGroup: 2 },
        { regex: /^\*{0,2}\s*(\d+)\s*\*{0,2}\s*[.\)\-:]\s*(.*\S.*)/, numGroup: 1, textGroup: 2 },
        { regex: /^\*{0,2}\s*((?:m{0,3})(?:cm|cd|d?c{0,3})(?:xc|xl|l?x{0,3})(?:ix|iv|v?i{0,3}))\s*\*{0,2}\s*[.\)]\s*(.*\S.*)/i, numGroup: -1, textGroup: 2 },
    ];

    // Options: now support a-z (full alphabet)
    const OPT_LETTER = /^(\*?\s*)\*{0,2}\s*([a-zA-Z])\s*[.\)\-:]\s*\*{0,2}\s*(.+)/;
    const OPT_PAREN = /^(\*?\s*)\*{0,2}\s*\(([a-zA-Z])\)\s*\*{0,2}\s*(.+)/;
    const OPT_BRACKET = /^(\*?\s*)\*{0,2}\s*\[([a-zA-Z])\]\s*\*{0,2}\s*(.+)/;
    const OPT_ARABIC = /^\*{0,2}\s*([\u0623\u0628\u062c\u062f\u0647\u0648\u0632\u062d\u0637\u064a\u0643\u0644\u0645\u0646\u0633\u0639\u0641\u0635\u0642\u0631\u0634\u062a\u062b\u062e\u0630\u0636\u0638\u063a])\s*[.\)\-:]\s*\*{0,2}\s*(.+)/;
    const OPT_DASH = /^[-\u2022*]\s+(.+)/;
    const OPT_NUMBERED = /^(\d{1,2})\s*[.\)]\s*(.+)/;
    // Roman numeral options: i), ii), iii), iv) etc.
    const OPT_ROMAN = /^\*{0,2}\s*((?:x{0,3})(?:ix|iv|v?i{0,3}))\s*[.\)\-:]\s*\*{0,2}\s*(.+)/i;

    // True/False option patterns — now includes Yes/No, Correct/Incorrect, Right/Wrong
    const TF_VALUES = 'True|False|Yes|No|Correct|Incorrect|Right|Wrong|T|F|Y|N|\u0635\u062d|\u062e\u0637\u0623|\u0635\u062d\u064a\u062d|\u062e\u0627\u0637\u0626';
    const bareTrueFalseOption = new RegExp(
        `^[-\\u2022*]?\\s*\\*{0,2}\\s*\\(?\\s*(${TF_VALUES})\\s*\\)?\\s*\\*{0,2}\\s*$`, 'i'
    );
    const numberedTrueFalseOption = new RegExp(
        `^\\*{0,2}\\s*(\\d+)\\s*\\*{0,2}\\s*[.\\)\\-]\\s*\\*{0,2}\\s*(${TF_VALUES})\\s*\\*{0,2}\\s*$`, 'i'
    );

    const trueFalseIndicator = [
        /^\*{0,2}\s*True\s*[\/\\|,]\s*False\s*\*{0,2}\s*$/i,
        /^\*{0,2}\s*True\s+or\s+False\s*\*{0,2}\s*$/i,
        /^\*{0,2}\s*\u0635\u062d\s*[\/\\|,]\s*\u062e\u0637\u0623\s*\*{0,2}\s*$/i,
        /^\*{0,2}\s*T\s*[\/\\|,]\s*F\s*\*{0,2}\s*$/i,
        // Yes/No variants
        /^\*{0,2}\s*Yes\s*[\/\\|,]\s*No\s*\*{0,2}\s*$/i,
        /^\*{0,2}\s*Correct\s*[\/\\|,]\s*Incorrect\s*\*{0,2}\s*$/i,
        /^\*{0,2}\s*Right\s*[\/\\|,]\s*Wrong\s*\*{0,2}\s*$/i,
    ];

    const inlineAnswerPatterns = [
        /^\*{0,2}\s*(?:correct\s+)?answer\s*:\s*\*{0,2}\s*([a-zA-Z])\b/i,
        /^\*{0,2}\s*(?:correct\s+)?answer\s*:\s*\*{0,2}\s*(True|False|Yes|No|Correct|Incorrect|Right|Wrong)\b/i,
        /^\*{0,2}\s*(?:correct\s+)?answer\s*:\s*\*{0,2}\s*(.+)/i,
        /^\*{0,2}\s*\u0627\u0644\u0625\u062c\u0627\u0628\u0629\s*:\s*\*{0,2}\s*(.+)/i,
    ];

    const ANSWER_KEYWORDS = 'answer\\s*key|answers?|correct\\s*answers?|solutions?|answer\\s*sheet|\u0627\u0644\u0625\u062c\u0627\u0628\u0627\u062a|\u0627\u0644\u0627\u062c\u0627\u0628\u0627\u062a|\u0645\u0641\u062a\u0627\u062d';
    const answerSectionPatterns = [
        new RegExp(`^#{1,6}\\s*[^\\w]*?\\*{0,2}\\s*(${ANSWER_KEYWORDS})\\s*\\*{0,2}\\s*:?\\s*$`, 'iu'),
        new RegExp(`^[^\\w]*?\\*{0,2}\\s*(${ANSWER_KEYWORDS})\\s*:?\\s*\\*{0,2}\\s*:?\\s*$`, 'iu'),
        new RegExp(`^\\*{1,2}(${ANSWER_KEYWORDS})\\*{1,2}\\s*:?\\s*$`, 'iu'),
        new RegExp(`^\\*{0,2}(${ANSWER_KEYWORDS})\\*{0,2}\\s*:\\s*$`, 'iu'),
    ];

    const TF_ANS = 'True|False|Yes|No|Correct|Incorrect|Right|Wrong|T|F|Y|N|\u0635\u062d|\u062e\u0637\u0623|\u0635\u062d\u064a\u062d|\u062e\u0627\u0637\u0626';
    const answerKeyLinePatterns: { regex: RegExp; type: 'mcq' | 'tf' }[] = [
        { regex: new RegExp(`^(\\d+)\\s*[.\\)\\-:=]\\s*\\*{0,2}\\s*(${TF_ANS})\\s*\\*{0,2}\\s*(?:\\(.*\\))?.*$`, 'i'), type: 'tf' },
        { regex: /^(\d+)\s*[.\)\-:=]\s*\*{0,2}\s*([a-zA-Z])\s*\*{0,2}\s*(?:\(.*\))?\s*$/i, type: 'mcq' },
        { regex: /^(\d+)\s*[.\)\-:=]\s*\*{0,2}\s*([a-zA-Z])\s*\*{0,2}\s*$/i, type: 'mcq' },
        // Answer key with letter followed by ) and optional descriptive text: "1. b) Spherical"
        { regex: /^(\d+)\s*[.\)\-:=]\s*\*{0,2}\s*([a-zA-Z])\s*\)\s*.*$/i, type: 'mcq' },
        // Answer key with (letter): "1. (b) Spherical"
        { regex: /^(\d+)\s*[.\)\-:=]\s*\(([a-zA-Z])\)\s*.*$/i, type: 'mcq' },
        { regex: /^Q\.?\s*(\d+)\s*[.\)\-:=]\s*\*{0,2}\s*([a-zA-Z])\s*\*{0,2}\s*$/i, type: 'mcq' },
        { regex: new RegExp(`^Q\\.?\\s*(\\d+)\\s*[.\\)\\-:=]\\s*\\*{0,2}\\s*(${TF_ANS})\\s*\\*{0,2}\\s*$`, 'i'), type: 'tf' },
        { regex: /^\((\d+)\)\s*\*{0,2}\s*([a-zA-Z])\s*\*{0,2}\s*$/i, type: 'mcq' },
        { regex: /^(\d+)\.([a-zA-Z])\s*$/i, type: 'mcq' },
        { regex: /^(\d+)\s*[.\)\-:=]\s*(?:the\s+answer\s+is\s+)\*{0,2}\s*([a-zA-Z])\s*\*{0,2}/i, type: 'mcq' },
        // Roman numeral answer keys
        { regex: /^((?:m{0,3})(?:cm|cd|d?c{0,3})(?:xc|xl|l?x{0,3})(?:ix|iv|v?i{0,3}))\s*[.\)\-:=]\s*\*{0,2}\s*([a-zA-Z])\s*\*{0,2}\s*$/i, type: 'mcq' },
        { regex: new RegExp(`^((?:m{0,3})(?:cm|cd|d?c{0,3})(?:xc|xl|l?x{0,3})(?:ix|iv|v?i{0,3}))\\s*[.\\)\\-:=]\\s*\\*{0,2}\\s*(${TF_ANS})\\s*\\*{0,2}\\s*$`, 'i'), type: 'tf' },
    ];

    // Answer key lines with explanations: "1. b — Because mercury is liquid"
    const answerKeyWithExplanation = /^(\d+)\s*[.\)\-:=]\s*\*{0,2}\s*([a-zA-Z])\s*\*{0,2}\s*[\-\u2013\u2014:]+\s*(.+)$/i;
    const answerKeyTfWithExplanation = new RegExp(
        `^(\\d+)\\s*[.\\)\\-:=]\\s*\\*{0,2}\\s*(${TF_ANS})\\s*\\*{0,2}\\s*[\\-\\u2013\\u2014:(]+\\s*(.+?)\\)?\\s*$`, 'i'
    );

    const tableAnswerPattern = new RegExp(
        `^\\|?\\s*(\\d+)\\s*\\|\\s*\\*{0,2}\\s*([a-zA-Z]|${TF_ANS})\\s*\\*{0,2}\\s*\\|?\\s*$`, 'i'
    );
    const tableHeaderPattern = /^\|?\s*(Q|#|No\.?|Question|Num\.?)\s*\|\s*(Answer|Ans\.?|Correct|Solution|\u0627\u0644\u0625\u062c\u0627\u0628\u0629)\s*\|?\s*$/i;

    const answerSubSectionSkip = [
        /^#{1,6}\s*\*{0,2}\s*(?:part|section)\s+[a-zA-Z0-9]+\s*[\-\u2013\u2014:]\s*.*/i,
        /^\*{0,2}\s*(?:part|section)\s+[a-zA-Z0-9]+\s*[\-\u2013\u2014:]\s*.*/i,
        /^#{1,6}\s*\*{0,2}\s*(?:multiple\s*choice|mcq|true\s*(?:or\s+|[\/ \\|,]?\s*)false|t\s*[\/ |]\s*f|yes\s*[\/|]\s*no|correct\s*[\/|]\s*incorrect|right\s*[\/|]\s*wrong|short\s*answer)\s*\*{0,2}\s*:?\s*$/i,
        /^\*{0,2}\s*(?:multiple\s*choice|mcq|true\s*(?:or\s+|[\/ \\|,]?\s*)false|t\s*[\/ |]\s*f|yes\s*[\/|]\s*no|correct\s*[\/|]\s*incorrect|right\s*[\/|]\s*wrong|short\s*answer)\s*\*{0,2}\s*:?\s*$/i,
    ];

    const commaSepAnswerPattern = new RegExp(
        `^(?:Q\\.?\\s*)?\\d+\\s*[.\\-:=]\\s*\\(?(?:${TF_ANS}|[a-zA-Z])\\)?\\s*[,;]\\s*(?:Q\\.?\\s*)?\\d+\\s*[.\\-:=]\\s*\\(?(?:${TF_ANS}|[a-zA-Z])\\)?`, 'i'
    );

    const subHeaderSkip = [
        /^\*{0,2}\s*(part|section)\s+\d+\s*[:\-]/i,
        /^\*{0,2}\s*(multiple\s*choice|mcq|short\s*answer|fill\s*in)\s*(questions?)?\s*(\(\d+.*\))?\s*\*{0,2}\s*:?\s*$/i,
        /^\*{0,2}\s*(true\s*(?:or\s+|[\/\\|,]?\s*)false|t\s*[\/|]\s*f|yes\s*[\/|]\s*no|correct\s*[\/|]\s*incorrect|right\s*[\/|]\s*wrong)\s*(questions?|section|part)?\s*(\(\d+.*\))?\s*\*{0,2}\s*:?\s*$/i,
        /^\*{0,2}\s*\(\d+\s*(marks?|points?|questions?)\s*\)\s*\*{0,2}\s*$/i,
        /^\*{0,2}\s*\d+\s*(marks?|points?)\s*each\s*\*{0,2}\s*$/i,
    ];

    // ════════════════════ STEP 1: Find Answer Key Section ════════════════════

    let answerSectionStart = -1;

    for (let i = 0; i < lines.length; i++) {
        if (answerSectionPatterns.some(p => p.test(lines[i]))) {
            answerSectionStart = i;
            break;
        }
    }

    if (answerSectionStart === -1) {
        for (let i = lines.length - 1; i >= 0; i--) {
            if (commaSepAnswerPattern.test(lines[i])) {
                answerSectionStart = i;
                break;
            }
        }
    }

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

            if (numberedTrueFalseOption.test(line)) {
                if (clusterSize > 0) break;
                continue;
            }

            if (tableHeaderPattern.test(line) || /^\|?\s*[-:]+\s*\|/.test(line)) {
                if (clusterSize > 0) clusterStart = i;
                continue;
            }
            if (/^\*[^*]+\*\s*$/.test(line) && !/\d/.test(line)) {
                if (clusterSize > 0) clusterStart = i;
                continue;
            }

            const isAnswerLine = answerKeyLinePatterns.some(p => p.regex.test(line)) ||
                answerKeyWithExplanation.test(line) ||
                answerKeyTfWithExplanation.test(line) ||
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
    let dashOptionCount = 0;
    let sectionType: 'mcq' | 'true_false' | null = null;

    // Track option letters for proper sequential detection
    let lastOptionLetter = '';
    // Track whether we're in a numbered sub-option sequence (started from 1)
    let hasNumberedSubOptions = false;

    const isTFPositive = (s: string): boolean =>
        /^(true|t|yes|y|correct|right|\u0635\u062d|\u0635\u062d\u064a\u062d)$/i.test(s.trim());
    const isTFNegative = (s: string): boolean =>
        /^(false|f|no|n|incorrect|wrong|\u062e\u0637\u0623|\u062e\u0627\u0637\u0626)$/i.test(s.trim());
    const isTFValue = (s: string): boolean => isTFPositive(s) || isTFNegative(s);

    const normalizeTFValue = (s: string): string => isTFPositive(s) ? 'True' : 'False';

    const finalizeQ = () => {
        if (!currentQ || !currentQ.text.trim()) return;

        currentQ.text = cleanText(restore(currentQ.text));
        currentQ.options = currentQ.options.map(o => cleanText(restore(o)));
        if (currentQ.explanation) {
            currentQ.explanation = cleanText(restore(currentQ.explanation));
        }

        // ── Fill-blank detection ──
        if (currentQ.options.length < 2) {
            const FILL_BLANK_MARKERS = [
                /_{3,}/,
                /\.{4,}/,
                /\[blank\]/i,
                /\{blank\}/i,
                /\[fill\s*(?:in)?(?:\s*the)?(?:\s*blank)?\]/i,
                /\(\s*\.\.\.\s*\)/,
                /\u2026{2,}/,
                /_{2,}\s*\./,
            ];
            if (FILL_BLANK_MARKERS.some(p => p.test(currentQ!.text))) {
                currentQ!.type = 'fill_blank';
            }
        }

        // Only inject True/False options if still true_false type
        if (currentQ.type === 'true_false' && currentQ.options.length === 0) {
            currentQ.options = ['True', 'False'];
        }

        currentQ.options = currentQ.options.filter(o => o.length > 0);

        // ── Deduplicate options ──
        const seen = new Map<string, number>();
        const deduped: string[] = [];
        let newCorrectIdx = currentQ.correctAnswerIndex;
        for (let i = 0; i < currentQ.options.length; i++) {
            const key = currentQ.options[i].toLowerCase().trim();
            if (seen.has(key)) {
                if (i === currentQ.correctAnswerIndex) {
                    newCorrectIdx = seen.get(key)!;
                } else if (currentQ.correctAnswerIndex > i) {
                    newCorrectIdx--;
                }
            } else {
                seen.set(key, deduped.length);
                if (i === currentQ.correctAnswerIndex) {
                    newCorrectIdx = deduped.length;
                }
                deduped.push(currentQ.options[i]);
            }
        }
        if (deduped.length < currentQ.options.length) {
            errors.push(`\u26A0\uFE0F Q${currentQ.id}: Removed ${currentQ.options.length - deduped.length} duplicate option(s).`);
            currentQ.options = deduped;
            currentQ.correctAnswerIndex = newCorrectIdx;
        }

        // ── Bounds-check correctAnswerIndex ──
        if (currentQ.correctAnswerIndex >= currentQ.options.length) {
            errors.push(`\u26A0\uFE0F Q${currentQ.id}: Answer index out of bounds. Answer cleared.`);
            currentQ.correctAnswerIndex = -1;
        }

        if (currentQ.options.length >= 2) {
            questions.push({ ...currentQ });
        } else if (currentQ.type === 'true_false') {
            currentQ.options = ['True', 'False'];
            questions.push({ ...currentQ });
        } else if (currentQ.type === 'fill_blank') {
            questions.push({ ...currentQ });
        } else {
            questions.push({ ...currentQ });
        }
    };

    const matchQuestion = (line: string): { num: number; text: string } | null => {
        for (const { regex, numGroup, textGroup } of questionPatterns) {
            const m = line.match(regex);
            if (m) {
                let num: number;
                if (numGroup === -1) {
                    // Roman numeral
                    const romanStr = m[1];
                    if (isRomanNumeral(romanStr)) {
                        num = romanToInt(romanStr);
                    } else {
                        continue; // not a valid roman numeral
                    }
                } else {
                    num = parseInt(m[numGroup]);
                }
                let qtext = m[textGroup] || '';
                qtext = cleanText(qtext);
                if (!qtext || /^[\s\-:.]*$/.test(qtext)) return null;
                return { num, text: qtext };
            }
        }
        return null;
    };

    const matchOption = (line: string): { letter: string; text: string; markedBefore: boolean } | null => {
        // Check for roman numeral options first (i, ii, iii, iv, etc.)
        const romanM = line.match(OPT_ROMAN);
        if (romanM && isRomanNumeral(romanM[1]) && romanToInt(romanM[1]) <= 20) {
            // Only treat as roman option if we're already collecting options or current question exists
            if (currentQ && (lastType === 'question' || lastType === 'option')) {
                return { letter: romanM[1].toLowerCase(), text: romanM[2], markedBefore: false };
            }
        }

        for (const pat of [OPT_LETTER, OPT_PAREN, OPT_BRACKET]) {
            const m = line.match(pat);
            if (m) {
                const letter = m[2].toLowerCase();
                // Only accept a-z letters as options (not question labels)
                if (letter >= 'a' && letter <= 'z') {
                    const markedBefore = m[1]?.trim() === '*';
                    return { letter, text: m[3], markedBefore };
                }
            }
        }
        const arabicM = line.match(OPT_ARABIC);
        if (arabicM) {
            return { letter: arabicM[1], text: arabicM[2], markedBefore: false };
        }
        return null;
    };

    // Helper to detect if a question text contains embedded T/F indicator
    const hasEmbeddedTF = (text: string): boolean => {
        return /(?:true\s+or\s+false|T\s*\/\s*F|true\s*\/\s*false|yes\s+or\s+no|correct\s+or\s+incorrect|right\s+or\s+wrong)\s*[:.?]?\s*/i.test(text);
    };

    for (let i = 0; i < questionLines.length; i++) {
        const line = questionLines[i];

        // ─── Section type detection ───
        if (subHeaderSkip.some(p => p.test(line))) {
            if (/true\s*(?:or|[\/\\|,])?\s*false|t\s*[\/|]\s*f|yes\s*[\/|]\s*no|correct\s*[\/|]\s*incorrect|right\s*[\/|]\s*wrong/i.test(line)) sectionType = 'true_false';
            else if (/multiple\s*choice|mcq/i.test(line)) sectionType = 'mcq';
            continue;
        }
        // Standalone section headers
        if (line.length < 80 && !/^\d+[.\)\-:]/.test(line) && !/^Q\.?\s*\d/i.test(line)) {
            if (/^#{0,6}\s*\*{0,2}\s*(?:true\s*(?:or\s+|[\/\\|,]?\s*)false|t\s*[\/|]\s*f|yes\s*(?:or\s+|[\/\\|,]?\s*)no|correct\s*(?:or\s+|[\/\\|,]?\s*)incorrect|right\s*(?:or\s+|[\/\\|,]?\s*)wrong)\s*(?:questions?)?\s*\*{0,2}\s*:?\s*$/i.test(line)) {
                sectionType = 'true_false';
                continue;
            }
            if (/^#{0,6}\s*\*{0,2}\s*(?:multiple\s*choice|mcq)\s*(?:questions?)?\s*\*{0,2}\s*:?\s*$/i.test(line)) {
                sectionType = 'mcq';
                continue;
            }
        }
        if (answerSectionPatterns.some(p => p.test(line))) continue;
        if (/^\|?\s*[-:]+\s*\|/.test(line)) continue;

        // ─── Numbered True/False that are OPTIONS ───
        if (currentQ) {
            const ntf = line.match(numberedTrueFalseOption);
            if (ntf) {
                const tfVal = ntf[2];
                const { cleaned: tfCleaned, isCorrect } = stripCorrectMarker(tfVal);
                const normalized = normalizeTFValue(tfCleaned);
                if (!currentQ.options.some(o => o.toLowerCase() === normalized.toLowerCase())) {
                    currentQ.options.push(normalized);
                    if (isCorrect) currentQ.correctAnswerIndex = currentQ.options.length - 1;
                }
                currentQ.type = 'true_false';
                lastType = 'option';
                continue;
            }
        }

        // ─── Bare True/False/Yes/No option lines ───
        if (currentQ && bareTrueFalseOption.test(line)) {
            const m = line.match(bareTrueFalseOption)!;
            const val = m[1].trim();
            const { cleaned, isCorrect } = stripCorrectMarker(val);
            const normalized = normalizeTFValue(cleaned);

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

        // ─── Inline options on same line ───
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
                    if (
                        (sorted[0] === 'false' && sorted[1] === 'true') ||
                        (sorted[0] === 'no' && sorted[1] === 'yes') ||
                        (sorted[0] === 'incorrect' && sorted[1] === 'correct') ||
                        (sorted[0] === 'wrong' && sorted[1] === 'right')
                    ) {
                        currentQ.type = 'true_false';
                    }
                }
                lastType = 'option';
                dashOptionCount = 0;
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
                if (
                    (sorted[0] === 'false' && sorted[1] === 'true') ||
                    (sorted[0] === '\u062e\u0637\u0623' && sorted[1] === '\u0635\u062d') ||
                    (sorted[0] === 'f' && sorted[1] === 't') ||
                    (sorted[0] === 'no' && sorted[1] === 'yes') ||
                    (sorted[0] === 'n' && sorted[1] === 'y') ||
                    (sorted[0] === 'incorrect' && sorted[1] === 'correct') ||
                    (sorted[0] === 'wrong' && sorted[1] === 'right')
                ) {
                    currentQ.type = 'true_false';
                }
            }
            lastType = 'option';
            dashOptionCount = 0;
            continue;
        }

        // ─── Dash/bullet options ───
        if (currentQ && (lastType === 'question' || dashOptionCount > 0)) {
            const dashM = line.match(OPT_DASH);
            if (dashM && dashM[1].length <= 120) {
                const optText = cleanText(dashM[1]);
                const { cleaned, isCorrect } = stripCorrectMarker(optText);
                currentQ.options.push(cleaned);
                if (isCorrect) currentQ.correctAnswerIndex = currentQ.options.length - 1;

                if (currentQ.options.length === 2) {
                    const sorted = currentQ.options.map(o => o.toLowerCase().trim()).sort();
                    if (sorted[0] === 'false' && sorted[1] === 'true') currentQ.type = 'true_false';
                    if (sorted[0] === 'no' && sorted[1] === 'yes') currentQ.type = 'true_false';
                }
                lastType = 'option';
                dashOptionCount++;
                continue;
            }
        }

        // ─── Numbered sub-options (1-26, sequential, inside question) ───
        if (currentQ && (lastType === 'question' || lastType === 'option') && currentQ.type !== 'true_false') {
            const numOptM = line.match(OPT_NUMBERED);
            if (numOptM) {
                const subNum = parseInt(numOptM[1]);
                const optCandidate = numOptM[2].trim();
                // Allow numbered sub-options only if:
                // - Starting from 1 (with no options yet, or first numbered sub-option)
                // - OR continuing a numbered sequence already started
                const canBeNumberedOpt =
                    subNum <= 26 &&
                    subNum === currentQ.options.length + 1 &&
                    !optCandidate.includes('?') &&
                    !optCandidate.endsWith(':') &&
                    optCandidate.length <= 120 &&
                    (subNum === 1 || hasNumberedSubOptions);
                if (canBeNumberedOpt) {
                    const optText = cleanText(optCandidate);
                    const { cleaned, isCorrect } = stripCorrectMarker(optText);
                    currentQ.options.push(cleaned);
                    if (isCorrect) currentQ.correctAnswerIndex = currentQ.options.length - 1;
                    hasNumberedSubOptions = true;
                    lastType = 'option';
                    continue;
                }
            }
        }

        // ─── New question ───
        const qMatch = matchQuestion(line);
        if (qMatch) {
            if (/^\s*\*{0,2}\s*[a-zA-Z]\s*\*{0,2}\s*$/.test(qMatch.text)) continue;

            // Check if this "question" is actually a T/F value for the current question
            if (isTFValue(qMatch.text.replace(/\*{1,2}/g, '').trim())) {
                if (currentQ) {
                    const tfVal = qMatch.text.replace(/\*{1,2}/g, '').trim();
                    const normalized = normalizeTFValue(tfVal);
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
            let qType: 'mcq' | 'true_false' | 'fill_blank' = sectionType === 'true_false' ? 'true_false' : 'mcq';

            // Detect embedded T/F in question text
            if (hasEmbeddedTF(qMatch.text)) {
                qType = 'true_false';
            }

            currentQ = {
                id: qMatch.num || autoId,
                text: qMatch.text,
                options: [],
                correctAnswerIndex: -1,
                type: qType,
            };
            lastType = 'question';
            dashOptionCount = 0;
            lastOptionLetter = '';
            hasNumberedSubOptions = false;
            continue;
        }

        // ─── Multiline continuation ───
        if (currentQ) {
            if (/^[-=*_]{3,}$/.test(line)) continue;
            // Only skip pure decorative section headers — preserve # lines that may contain formulas/content
            if (/^#{1,6}\s+\*{0,2}(?:part|section|topic|chapter|category)\s+\d*\s*[:\-]?\s*$/i.test(line)) continue;

            const cleanLine = cleanText(line);
            if (!cleanLine) continue;

            if (lastType === 'question') {
                currentQ.text += ' ' + cleanLine;
            } else if (lastType === 'option' && currentQ.options.length > 0) {
                // Don't append very long lines — they're likely standalone paragraphs
                if (cleanLine.length > 200) continue;
                const idx = currentQ.options.length - 1;
                currentQ.options[idx] += ' ' + cleanLine;
            }
        }
    }

    finalizeQ();

    // ════════════════════ STEP 3: Fix IDs BEFORE Answer Key ════════════════════

    const idToQuestion = new Map<number, QuizQuestion>();
    for (const q of questions) {
        if (!idToQuestion.has(q.id)) {
            idToQuestion.set(q.id, q);
        }
    }

    const seenIds = new Set<number>();
    let nextId = 1;
    for (const q of questions) {
        if (seenIds.has(q.id)) {
            q.id = nextId;
        }
        seenIds.add(q.id);
        nextId = q.id + 1;
    }

    // ════════════════════ STEP 4: Parse Answer Key (with positional fallback) ════════════════════

    const findQuestion = (id: number): QuizQuestion | undefined => {
        const exact = questions.find(q => q.id === id);
        if (exact) return exact;
        const byOriginal = idToQuestion.get(id);
        if (byOriginal) return byOriginal;
        if (id >= 1 && id <= questions.length) return questions[id - 1];
        return undefined;
    };

    for (const line of answerLines) {
        if (answerSectionPatterns.some(p => p.test(line))) continue;
        if (subHeaderSkip.some(p => p.test(line))) continue;
        if (answerSubSectionSkip.some(p => p.test(line))) continue;
        if (tableHeaderPattern.test(line)) continue;
        if (/^\|?\s*[-:]+\s*\|/.test(line)) continue;
        if (/^\*?[^*|]*?(good\s*luck|\ud83c\udf93|\ud83c\udf40|\u2728)[^|]*?\*?\s*$/iu.test(line)) continue;
        if (/^\*[^*]+\*\s*$/.test(line) && !/\d/.test(line)) continue;

        // Table format
        const tableM = line.match(tableAnswerPattern);
        if (tableM) {
            const qId = parseInt(tableM[1]);
            const ansRaw = tableM[2].trim();
            const question = findQuestion(qId);
            if (question) {
                if (/^[a-zA-Z]$/i.test(ansRaw) && !isTFValue(ansRaw)) {
                    const idx = ansRaw.toLowerCase().charCodeAt(0) - 97;
                    if (idx >= 0 && idx <= 25 && (question.options.length === 0 || idx < question.options.length)) {
                        question.correctAnswerIndex = idx;
                    }
                } else {
                    applyAnswer(question, ansRaw);
                }
            }
            continue;
        }

        // Comma-separated
        if (commaSepAnswerPattern.test(line)) {
            const pairs = line.match(new RegExp(`(?:Q\\.?\\s*)?\\d+\\s*[.\\-:=]\\s*\\(?(?:${TF_ANS}|[a-zA-Z])\\)?`, 'gi'));
            if (pairs) {
                for (const pair of pairs) {
                    const pm = pair.match(new RegExp(`(?:Q\\.?\\s*)?(\\d+)\\s*[.\\-:=]\\s*\\(?(${TF_ANS}|[a-zA-Z])\\)?`, 'i'));
                    if (pm) {
                        const qId = parseInt(pm[1]);
                        const ansRaw = pm[2].trim();
                        const question = findQuestion(qId);
                        if (question) {
                            if (/^[a-zA-Z]$/i.test(ansRaw) && !isTFValue(ansRaw)) {
                                const idx = ansRaw.toLowerCase().charCodeAt(0) - 97;
                                if (idx >= 0 && idx <= 25 && (question.options.length === 0 || idx < question.options.length)) {
                                    question.correctAnswerIndex = idx;
                                }
                            } else {
                                applyAnswer(question, ansRaw);
                            }
                        }
                    }
                }
            }
            continue;
        }

        // Answer key with explanation: "1. b — Because mercury is liquid"
        const explM = line.match(answerKeyWithExplanation);
        if (explM) {
            const qId = parseInt(explM[1]);
            const ansLetter = explM[2].trim();
            const explanation = explM[3].trim();
            const question = findQuestion(qId);
            if (question) {
                const index = ansLetter.toLowerCase().charCodeAt(0) - 97;
                if (index >= 0 && index <= 25 && (question.options.length === 0 || index < question.options.length)) {
                    question.correctAnswerIndex = index;
                }
                if (explanation) question.explanation = restore(explanation);
            }
            continue;
        }

        // Answer key T/F with explanation: "11. True (s-orbitals are symmetrical)"
        const tfExplM = line.match(answerKeyTfWithExplanation);
        if (tfExplM) {
            const qId = parseInt(tfExplM[1]);
            const ansRaw = tfExplM[2].trim();
            const explanation = tfExplM[3].trim();
            const question = findQuestion(qId);
            if (question) {
                applyAnswer(question, ansRaw, explanation);
            }
            continue;
        }

        // Standard answer key lines
        let matched = false;
        for (const { regex, type } of answerKeyLinePatterns) {
            const m = line.match(regex);
            if (m) {
                let qId: number;
                const idStr = m[1];
                if (/^[ivxlcdmIVXLCDM]+$/.test(idStr) && isRomanNumeral(idStr)) {
                    qId = romanToInt(idStr);
                } else {
                    qId = parseInt(idStr);
                }
                const answerRaw = m[2].trim();
                const question = findQuestion(qId);

                if (question) {
                    // When a single letter (t/f/y/n) matches TF but question has >2 MCQ options,
                    // treat it as an MCQ letter answer instead
                    const isSingleLetterTF = type === 'tf' && /^[a-zA-Z]$/i.test(answerRaw);
                    const shouldTreatAsMCQ = isSingleLetterTF && question.options.length > 2 && question.type !== 'true_false';

                    if (type === 'mcq' || shouldTreatAsMCQ) {
                        const index = answerRaw.toLowerCase().charCodeAt(0) - 97;
                        if (index >= 0 && index <= 25 && (question.options.length === 0 || index < question.options.length)) {
                            question.correctAnswerIndex = index;
                        }
                    } else if (type === 'tf') {
                        question.type = 'true_false';
                        if (question.options.length === 0 ||
                            (question.options.length === 2 && isTFPositive(question.options[0]))) {
                            question.options = ['True', 'False'];
                        }
                        if (isTFPositive(answerRaw)) {
                            question.correctAnswerIndex = question.options.findIndex(o => isTFPositive(o));
                            if (question.correctAnswerIndex === -1) question.correctAnswerIndex = 0;
                        } else {
                            question.correctAnswerIndex = question.options.findIndex(o => isTFNegative(o));
                            if (question.correctAnswerIndex === -1) question.correctAnswerIndex = 1;
                        }
                    }
                }
                matched = true;
                break;
            }
        }

        if (matched) continue;

        // ── Fill-blank answer fallback: capture text answers from answer key ──
        const fillM = line.match(/^(\d+)\s*[.\)\-:=]\s*(.+)$/);
        if (fillM) {
            const qId = parseInt(fillM[1]);
            const answerText = restore(fillM[2].trim());
            const question = findQuestion(qId);
            if (question && question.type === 'fill_blank' && answerText) {
                question.options = [answerText];
                question.correctAnswerIndex = 0;
            }
        }
    }

    // ════════════════════ STEP 5: Post-Processing ════════════════════

    for (let i = questions.length - 1; i >= 0; i--) {
        if (questions[i].options.length < 2 && questions[i].type !== 'true_false' && questions[i].type !== 'fill_blank') {
            questions.splice(i, 1);
        }
    }

    // Re-number IDs sequentially after removals
    for (let i = 0; i < questions.length; i++) {
        questions[i].id = i + 1;
    }

    // Normalize True/False options
    for (const q of questions) {
        if (q.type === 'true_false') {
            const hasPositive = q.options.some(o => isTFPositive(o));
            const hasNegative = q.options.some(o => isTFNegative(o));
            if (hasPositive && hasNegative && q.options.length === 2) {
                const correctVal = q.correctAnswerIndex >= 0 ? q.options[q.correctAnswerIndex]?.trim().toLowerCase() : null;
                q.options = ['True', 'False'];
                if (correctVal && isTFPositive(correctVal)) {
                    q.correctAnswerIndex = 0;
                } else if (correctVal && isTFNegative(correctVal)) {
                    q.correctAnswerIndex = 1;
                }
            }
        }
    }

    // Final bounds-check pass
    for (const q of questions) {
        if (q.correctAnswerIndex >= q.options.length) {
            q.correctAnswerIndex = -1;
        }
    }

    // ════════════════════ STEP 6: Stats & Errors ════════════════════

    const withAnswers = questions.filter(q => q.correctAnswerIndex !== -1);
    const withoutAnswers = questions.filter(q => q.correctAnswerIndex === -1);
    const truefalseCount = questions.filter(q => q.type === 'true_false').length;
    const mcqCount = questions.filter(q => q.type === 'mcq').length;
    const fillBlankCount = questions.filter(q => q.type === 'fill_blank').length;

    if (questions.length === 0) {
        errors.push("\u274C No questions found. Make sure questions start with a number (e.g., '1. Question text') followed by options (e.g., 'A) Option').");
    } else {
        if (withoutAnswers.length > 0 && withoutAnswers.length === questions.length) {
            errors.push(
                `\u274C No answers found for any of the ${questions.length} question(s). ` +
                `Add an Answer Key section at the end, or mark correct options with \u2705 or (Correct).`
            );
        } else if (withoutAnswers.length > 0) {
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
            fillBlankCount,
        },
    };
}

// Backward-compatible alias
export const parseQuizMarkdown = parseQuizText;
