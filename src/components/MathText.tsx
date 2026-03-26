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
export function normalizeLatexText(raw: string): string {
    let text = raw;

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
    return text;
}

/** Pre-process Unicode math notation to LaTeX (only outside existing $ delimiters) */
export function preprocessUnicodeMath(text: string): string {
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

        // Convert Unicode superscripts: x² → x$^{2}$
        const supChars = Object.keys(UNICODE_SUP);
        if (supChars.length > 0) {
            const supRe = new RegExp(`([a-zA-Z0-9])([${supChars.join('')}]+)`, 'g');
            t = t.replace(supRe, (_, base: string, sups: string) => {
                const digits = [...sups].map(c => UNICODE_SUP[c] || c).join('');
                return `${base}$^{${digits}}$`;
            });
        }

        // Convert Unicode subscripts: H₂ → H$_{2}$
        const subChars = Object.keys(UNICODE_SUB);
        if (subChars.length > 0) {
            const subRe = new RegExp(`([a-zA-Z0-9])([${subChars.join('')}]+)`, 'g');
            t = t.replace(subRe, (_, base: string, subs: string) => {
                const digits = [...subs].map(c => UNICODE_SUB[c] || c).join('');
                return `${base}$_{${digits}}$`;
            });
        }

        // Convert ASCII superscripts/subscripts outside math delimiters:
        //   x^{2n+1} → x$^{2n+1}$   CO_{2} → CO$_{2}$
        //   x^2 → x$^{2}$   a_i → a$_{i}$   H^+ → H$^{+}$   e^- → e$^{-}$
        // Braced form: word^{...} or word_{...}
        t = t.replace(/([a-zA-Z0-9)])(\^|_)\{([^}]+)\}/g, (_, pre, op, inner) => {
            return `${pre}$${op}{${inner}}$`;
        });
        // Simple single-char form: word^X or word_X (letter, digit, +, -)
        t = t.replace(/([a-zA-Z0-9)])(\^|_)([a-zA-Z0-9+\-])/g, (_, pre, op, ch) => {
            return `${pre}$${op}{${ch}}$`;
        });

        // Convert common chemical formulas (H2O, CO2, C6H12O6) into subscripts
        // Only for tokens that contain at least one uppercase letter and one digit.
        t = t.replace(/\b([A-Z][A-Za-z0-9]*)\b/g, (token) => {
            if (!/[A-Z]/.test(token) || !/\d/.test(token)) return token;
            // Avoid plain years or IDs (e.g., 2026) and course codes like M102
            if (/^\d+$/.test(token)) return token;
            if (/^[A-Z]{1,4}\d{1,4}$/.test(token)) return token; // course codes
            return token.replace(/([A-Za-z])(\d+)/g, (_m, letter, digits) => `${letter}$_{${digits}}$`);
        });

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

export function detectAndSplitMath(text: string): { content: string; isMath: boolean; isBlock: boolean }[] {
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
        } else if (match[4]) {
            // $...$
            addMath(matchStart, matchStart + fullMatch.length, false);
            masterRegex.lastIndex = pos;
        } else if (match[5]) {
            // \(...\)
            addMath(matchStart, matchStart + fullMatch.length, false);
            masterRegex.lastIndex = pos;
        } else if (match[6]) {
            // Standalone command — use balanced brace matching for full extent
            const cmdEnd = matchStart + fullMatch.length;
            const consumed = consumeBraceGroups(text, cmdEnd);
            const realEnd = consumed > cmdEnd ? consumed : cmdEnd;
            addMath(matchStart, realEnd, false);
            masterRegex.lastIndex = pos;
        } else if (match[7]) {
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
