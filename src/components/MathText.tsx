'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import 'katex/dist/katex.min.css';
// Load extensions for chemistry and cancel notation
import 'katex/contrib/mhchem';

import {
    KATEX_MACROS,
    UNICODE_MATH_MAP,
    UNICODE_SUPERSCRIPTS,
    UNICODE_SUBSCRIPTS,
    buildCommandRegexSource,
    buildSymbolRegexSource,
} from '@/lib/latex-constants';

const InlineMath = dynamic(() => import('react-katex').then(mod => mod.InlineMath), {
    ssr: false,
});

const BlockMath = dynamic(() => import('react-katex').then(mod => mod.BlockMath), {
    ssr: false,
});

interface MathTextProps {
    text: string;
    className?: string;
}

// ── KaTeX Settings ─────────────────────────────────────────────────────────
const KATEX_SETTINGS = {
    strict: false,
    trust: true,
    throwOnError: false,
    macros: KATEX_MACROS,
};

// ── Balanced Brace Matching ────────────────────────────────────────────────
// Matches the parser's unlimited-depth approach instead of regex nesting.

function findMatchingBrace(text: string, start: number): number {
    if (text[start] !== '{') return -1;
    let depth = 0;
    for (let i = start; i < text.length; i++) {
        if (text[i] === '\\' && i + 1 < text.length) { i++; continue; }
        if (text[i] === '{') depth++;
        else if (text[i] === '}') { depth--; if (depth === 0) return i; }
    }
    return -1;
}

function consumeBraceGroups(text: string, pos: number): number {
    let cur = pos;
    let groups = 0;
    while (cur < text.length) {
        while (cur < text.length && (text[cur] === ' ' || text[cur] === '\t')) cur++;
        if (cur < text.length && text[cur] === '[') {
            const close = text.indexOf(']', cur + 1);
            if (close === -1) break;
            cur = close + 1;
            continue;
        }
        if (cur < text.length && text[cur] === '{') {
            const close = findMatchingBrace(text, cur);
            if (close === -1) break;
            cur = close + 1;
            groups++;
        } else break;
    }
    return groups > 0 ? cur : pos;
}

// ── LaTeX environment regex ────────────────────────────────────────────────
const LATEX_ENV_RE = /\\begin\{([^}]+)\}[\s\S]*?\\end\{\1\}/;

// ── Unicode Math ───────────────────────────────────────────────────────────
const UNICODE_SUP = UNICODE_SUPERSCRIPTS;
const UNICODE_SUB = UNICODE_SUBSCRIPTS;

// ── Light LaTeX Repair ─────────────────────────────────────────────────────
// Fix common AI outputs like \sqrt(x) without braces and stray single '$'
function normalizeLatexText(raw: string): string {
    let text = raw;

    // 1. Fix double escaped backslashes from JSON parsing (e.g. \\sin -> \sin)
    text = text.replace(/\\\\([a-zA-Z]+)/g, '\\$1');
    text = text.replace(/\\\\([()\[\]{}])/g, '\\$1');

    // If there's an odd number of $, drop the last one to avoid half-open math
    const dollarCount = (text.match(/\$/g) || []).length;
    if (dollarCount % 2 === 1) {
        const last = text.lastIndexOf('$');
        if (last >= 0) text = text.slice(0, last) + text.slice(last + 1);
    }

    // Convert \sqrt( ... ) -> \sqrt{ ... } with balanced parentheses
    const fixParenCommand = (input: string, cmd: string): string => {
        const token = `${cmd}(`;
        let out = '';
        let i = 0;
        while (i < input.length) {
            const idx = input.indexOf(token, i);
            if (idx === -1) {
                out += input.slice(i);
                break;
            }
            out += input.slice(i, idx);
            // Find matching ')'
            let j = idx + token.length;
            let depth = 1;
            let inner = '';
            while (j < input.length) {
                const ch = input[j];
                if (ch === '\\' && j + 1 < input.length) {
                    inner += ch + input[j + 1];
                    j += 2;
                    continue;
                }
                if (ch === '(') depth++;
                if (ch === ')') depth--;
                if (depth === 0) {
                    j++; // consume ')'
                    break;
                }
                inner += ch;
                j++;
            }
            if (depth === 0) {
                out += `${cmd}{${inner}}`;
                i = j;
            } else {
                // Unbalanced — keep the rest as-is
                out += input.slice(idx);
                break;
            }
        }
        return out;
    };

    // Add missing backslash for common math functions (sin, cos, log, etc.)
    const funcList = [
        'sin', 'cos', 'tan', 'cot', 'sec', 'csc',
        'sinh', 'cosh', 'tanh', 'coth', 'sech', 'csch',
        'arcsin', 'arccos', 'arctan',
        'ln', 'log', 'exp', 'lim',
        'sqrt',
    ];
    const funcRe = new RegExp(`(^|[^\\\\])\\b(${funcList.join('|')})\\b(?=\\s*[A-Za-z0-9(\\\\])`, 'gi');
    text = text.replace(funcRe, '$1\\\\$2');

    // Convert bare sqrt without backslash: sqrt( ... ) -> \sqrt( ... )
    text = text.replace(/(^|[^\\])\bsqrt\s*\(/gi, '$1\\\\sqrt(');

    // Normalize powers/subscripts on commands: \sin^2 x -> \sin^{2} x, \tan^-1 -> \tan^{-1}
    text = text.replace(/\\([a-zA-Z]+)\s*([\^_])\s*\{([^}]+)\}/g, '\\\\$1$2{$3}');
    text = text.replace(/\\([a-zA-Z]+)\s*([\^_])\s*([+\-]?\d+|[a-zA-Z])/g, '\\\\$1$2{$3}');

    // Convert bare sqrt without backslash: sqrt( ... ) -> \sqrt( ... )
    text = fixParenCommand(text, '\\sqrt');

    // Convert plain text piecewise functions into proper LaTeX \begin{cases} environments
    // Example: { x^2 for x<1, 5 for x=1 } -> \begin{cases} x^2 & \text{for } x<1 \\ 5 & \text{for } x=1 \end{cases}
    const piecewiseRe = /\{((?:[^{}]+?(?:for|if|when)[^{}]+?(?:,|;|\n)\s*)+[^{}]+?(?:for|if|when)[^{}]+?)\}/gi;
    text = text.replace(piecewiseRe, (match, inner) => {
        const lines = inner.split(/[,;\n]/);
        let casesContent = '';
        let valid = true;
        
        for (let line of lines) {
            line = line.trim();
            if(!line) continue;
            const parts = line.split(/\s+(for|if|when)\s+/i);
            if (parts.length >= 3) {
                const keyword = parts[parts.length - 2];
                const cond = parts[parts.length - 1];
                const expr = parts.slice(0, parts.length - 2).join('').trim();
                casesContent += `${expr} & \\text{${keyword} } ${cond} \\\\ `;
            } else if (line.toLowerCase().includes('otherwise')) {
                const expr = line.replace(/\s*otherwise\s*/i, '').trim();
                casesContent += `${expr} & \\text{otherwise} \\\\ `;
            } else {
                valid = false;
                break;
            }
        }
        
        if (valid && casesContent) {
            return `\\begin{cases} ${casesContent} \\end{cases}`;
        }
        return match;
    });

    // 2. Convert raw slashes into \frac{}{} for better UI (e.g. 3/x -> \frac{3}{x})
    const convertSlashToFrac = (str: string): string => {
        let res = str;
        let lastLen = 0;
        
        while (res.length !== lastLen) {
            lastLen = res.length;
            const slashIdx = res.indexOf('/');
            if (slashIdx === -1) break;

            // Only parse if the slash looks like a math division, not a URL
            if (res.slice(Math.max(0, slashIdx - 4), slashIdx).includes('http')) {
                break; // likely a URL, abort replacing slashes entirely to be safe
            }

            // Find Numerator
            let numStart = slashIdx - 1;
            while (numStart >= 0 && /\s/.test(res[numStart])) numStart--;
            
            if (numStart >= 0 && res[numStart] === ')') {
                let depth = 1;
                numStart--;
                while (numStart >= 0 && depth > 0) {
                    if (res[numStart] === ')') depth++;
                    if (res[numStart] === '(') depth--;
                    numStart--;
                }
                // Check if preceded by a function like \sin or \ln
                let probe = numStart;
                while (probe >= 0 && /\s/.test(res[probe])) probe--;
                while (probe >= 0 && /[a-zA-Z\\]/.test(res[probe])) probe--;
                const preWord = res.slice(probe + 1, numStart + 1).trim();
                if (/^\\[a-zA-Z]+$/.test(preWord) || funcList.includes(preWord.replace('\\', ''))) {
                    numStart = probe;
                }
            } else {
                while (numStart >= 0 && /[a-zA-Z0-9.\_^\\{}]/.test(res[numStart])) {
                    numStart--;
                }
                // Grab preceding math functions separated by space (e.g. "\ln a" -> num)
                let probe = numStart;
                while (probe >= 0 && /\s/.test(res[probe])) probe--;
                let wordEnd = probe;
                while (probe >= 0 && /[a-zA-Z\\]/.test(res[probe])) probe--;
                const preWord = res.slice(probe + 1, wordEnd + 1).trim();
                if (/^\\[a-zA-Z]+$/.test(preWord) || funcList.includes(preWord.replace('\\', ''))) {
                    numStart = probe;
                }
            }
            numStart++; // Adjust back to valid char

            // Find Denominator
            let denEnd = slashIdx + 1;
            while (denEnd < res.length && /\s/.test(res[denEnd])) denEnd++;
            
            if (denEnd < res.length && res[denEnd] === '(') {
                let depth = 1;
                denEnd++;
                while (denEnd < res.length && depth > 0) {
                    if (res[denEnd] === '(') depth++;
                    if (res[denEnd] === ')') depth--;
                    denEnd++;
                }
            } else {
                while (denEnd < res.length && /[a-zA-Z0-9.\_^\\{}]/.test(res[denEnd])) {
                    denEnd++;
                }
            }

            const numerator = res.slice(numStart, slashIdx).trim();
            const denominator = res.slice(slashIdx + 1, denEnd).trim();
            
            // Clean matched parentheses if wrapped completely
            const cleanNum = (numerator.startsWith('(') && numerator.endsWith(')')) ? numerator.slice(1, -1) : numerator;
            const cleanDen = (denominator.startsWith('(') && denominator.endsWith(')')) ? denominator.slice(1, -1) : denominator;

            if (numerator && denominator) {
                res = res.slice(0, numStart) + `\\frac{${cleanNum}}{${cleanDen}}` + res.slice(denEnd);
            } else {
                // If parsing fails cleanly, replace / with something else temporarily so we don't infinitely loop
                res = res.slice(0, slashIdx) + '÷' + res.slice(slashIdx + 1);
            }
        }
        return res.replace(/÷/g, '/'); // restore any unparseable slashes
    };

    text = convertSlashToFrac(text);

    // 3. Aggressive Math Wrapper Heuristic for Pure ASCII Math 
    // Example: "3x^2 + 5" or "3/x + 5x^2"
    // If the string appears to be mostly math and completely lacks standard prose
    const isLikelyPureMath = (str: string): boolean => {
        // If it already has delimiters covering the whole thing, ignore
        if (/^\s*\$.*\$\s*$/.test(str)) return false;
        if (/^\s*\\\[.*\\\]\s*$/.test(str)) return false;

        // Extract words (not starting with backslash)
        const words = str.split(/\s+/).filter(w => !w.startsWith('\\'));
        
        // Check for normal prose words (longer than 2 chars that aren't functions)
        const commonVars = ['sin', 'cos', 'tan', 'log', 'ln', 'lim'];
        const hasProseWords = words.some(w => {
            const cleanWord = w.replace(/[^a-zA-Z]/g, '');
            return cleanWord.length > 2 && !commonVars.includes(cleanWord.toLowerCase());
        });

        if (hasProseWords) return false;

        // Ensure it actually has some math indicators
        // operators (+, -, =, /, ^, \frac) or backslash commands or variable attached to number (3x)
        const mathIndicators = /[\^=+\-\/\\_]|(\d[a-zA-Z])/;
        return mathIndicators.test(str);
    };

    if (isLikelyPureMath(text)) {
        // Wrap the whole string in inline math, ignoring stray $ that AI might have put
        text = `$${text.replace(/\$/g, '').trim()}$`;
    }

    return text;
}

/** Pre-process Unicode math notation to LaTeX (only outside existing $ delimiters) */
function preprocessUnicodeMath(text: string): string {
    const segments: { text: string; isMath: boolean }[] = [];
    let pos = 0;
    const delimRe = /\$\$[\s\S]+?\$\$|\$[^$\n]+?\$|\\\([\s\S]+?\\\)|\\\[[\s\S]+?\\\]|\\begin\{[^}]+\}[\s\S]*?\\end\{[^}]+\}/g;
    let m: RegExpExecArray | null;
    while ((m = delimRe.exec(text)) !== null) {
        if (m.index > pos) segments.push({ text: text.substring(pos, m.index), isMath: false });
        segments.push({ text: m[0], isMath: true });
        pos = m.index + m[0].length;
    }
    if (pos < text.length) segments.push({ text: text.substring(pos), isMath: false });

    return segments.map(seg => {
        if (seg.isMath) return seg.text;
        let t = seg.text;

        // Convert standalone Unicode math symbols
        for (const [pattern, replacement] of UNICODE_MATH_MAP) {
            t = t.replace(pattern, `$${replacement}$`);
        }

        // Clean up adjacent $$ from consecutive replacements: $\alpha$$\beta$ → $\alpha \beta$
        t = t.replace(/\$\$/g, ' ');
        return t;
    }).join('');
}

// ── Build detection regex using shared constants ───────────────────────────
// Uses balanced-brace matching via iterative search instead of limited nesting regex.

function detectAndSplitMath(text: string): { content: string; isMath: boolean; isBlock: boolean }[] {
    const parts: { content: string; isMath: boolean; isBlock: boolean }[] = [];
    let pos = 0;

    const addText = (end: number) => {
        if (end > pos) {
            parts.push({ content: text.substring(pos, end), isMath: false, isBlock: false });
        }
    };

    const addMath = (start: number, end: number, isBlock: boolean) => {
        addText(start);
        parts.push({ content: text.substring(start, end), isMath: true, isBlock });
        pos = end;
    };

    // Build standalone command regex from shared constants
    const cmdSource = buildCommandRegexSource();
    const symSource = buildSymbolRegexSource();

    // Combined regex for initial detection — order matters
    const masterRegex = new RegExp(
        [
            // Block: $$...$$
            '(\\$\\$[\\s\\S]+?\\$\\$)',
            // Block: \\[...\\]
            '(\\\\\\[[\\s\\S]+?\\\\\\])',
            // Environment: \\begin{...}...\\end{...}
            '(' + LATEX_ENV_RE.source + ')',
            // Inline: $...$  (skip currency $<digits>)
            '((?<!\\\\)\\$(?!\\d[\\d,]*\\.?\\d*\\$)[^\\$\\n]+?\\$)',
            // Inline: \\(...\\)
            '(\\\\\\([^\\)]+?\\\\\\))',
            // Standalone commands (will be re-checked with balanced braces)
            `(\\\\(?:${cmdSource})(?![a-zA-Z]))`,
            // Standalone symbols
            `(\\\\(?:${symSource})(?![a-zA-Z]))`,
        ].join('|'),
        'g'
    );

    let match: RegExpExecArray | null;
    while ((match = masterRegex.exec(text)) !== null) {
        const fullMatch = match[0];
        const matchStart = match.index;

        // Skip if already past this position
        if (matchStart < pos) continue;

        // Determine which group matched
        if (match[1]) {
            // $$...$$
            addMath(matchStart, matchStart + fullMatch.length, true);
            masterRegex.lastIndex = pos;
        } else if (match[2]) {
            // \[...\]
            addMath(matchStart, matchStart + fullMatch.length, true);
            masterRegex.lastIndex = pos;
        } else if (match[3]) {
            // \begin{...}...\end{...}
            addMath(matchStart, matchStart + fullMatch.length, true);
            masterRegex.lastIndex = pos;
        } else if (match[5]) {  // shifted due to match[4] being the inner group of begin
            // $...$
            addMath(matchStart, matchStart + fullMatch.length, false);
            masterRegex.lastIndex = pos;
        } else if (match[6]) {
            // \(...\)
            addMath(matchStart, matchStart + fullMatch.length, false);
            masterRegex.lastIndex = pos;
        } else if (match[7]) {
            // Standalone command — use balanced brace matching for full extent
            const cmdEnd = matchStart + fullMatch.length;
            const consumed = consumeBraceGroups(text, cmdEnd);
            const realEnd = consumed > cmdEnd ? consumed : cmdEnd;
            addMath(matchStart, realEnd, false);
            masterRegex.lastIndex = pos;
        } else if (match[8]) {
            // Standalone symbol
            addMath(matchStart, matchStart + fullMatch.length, false);
            masterRegex.lastIndex = pos;
        }
    }

    // Add remaining text
    addText(text.length);

    return parts;
}

function extractLatex(match: string): { content: string; isBlock: boolean } {
    if (match.startsWith('$$') && match.endsWith('$$')) {
        return { content: match.slice(2, -2).trim(), isBlock: true };
    }
    if (match.startsWith('\\[') && match.endsWith('\\]')) {
        return { content: match.slice(2, -2).trim(), isBlock: true };
    }
    if (match.startsWith('\\begin{')) {
        return { content: match, isBlock: true };
    }
    if (match.startsWith('$') && match.endsWith('$')) {
        return { content: match.slice(1, -1).trim(), isBlock: false };
    }
    if (match.startsWith('\\(') && match.endsWith('\\)')) {
        return { content: match.slice(2, -2).trim(), isBlock: false };
    }
    return { content: match, isBlock: false };
}

export const MathText = ({ text, className }: MathTextProps) => {
    if (!text) return null;

    // Repair common LaTeX issues, then pre-process Unicode math symbols
    const processed = preprocessUnicodeMath(normalizeLatexText(text));

    // Use balanced-brace-aware detection
    const segments = detectAndSplitMath(processed);
    const parts: React.ReactNode[] = [];

    for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];

        if (!seg.isMath) {
            if (seg.content) {
                parts.push(<span key={`t-${i}`}>{seg.content}</span>);
            }
            continue;
        }

        const { content, isBlock } = extractLatex(seg.content);

        // Force display-style fractions in inline math for bigger horizontal bars
        // Without this, \frac renders with a tiny bar in textstyle mode
        const inlineContent =
            !isBlock && /\\(frac|dfrac|cfrac|tfrac|binom|dbinom)/.test(content) && !content.includes('\\displaystyle')
                ? '\\displaystyle ' + content
                : content;

        if (isBlock) {
            parts.push(
                <BlockMath
                    key={`b-${i}`}
                    settings={KATEX_SETTINGS}
                    renderError={(error: { message: string }) => (
                        <span className="text-amber-500 font-mono text-xs" title={error.message}>
                            {seg.content}
                        </span>
                    )}
                >
                    {content}
                </BlockMath>
            );
        } else {
            parts.push(
                <InlineMath
                    key={`i-${i}`}
                    settings={KATEX_SETTINGS}
                    renderError={(error: { message: string }) => (
                        <span className="text-amber-500 font-mono text-xs" title={error.message}>
                            {seg.content}
                        </span>
                    )}
                >
                    {inlineContent}
                </InlineMath>
            );
        }
    }

    if (parts.length === 0) {
        return <span className={className}>{text}</span>;
    }

    return <span className={className} dir="auto">{parts}</span>;
};
