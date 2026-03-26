'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectAndSplitMath = detectAndSplitMath;
var InlineMath = dynamic(function () {
    return t;
}).join('');
// ── Build detection regex using shared constants ───────────────────────────
// Uses balanced-brace matching via iterative search instead of limited nesting regex.
function detectAndSplitMath(text) {
    var parts = [];
    var pos = 0;
    var addText = function (end) {
        if (end > pos) {
            parts.push({ content: text.substring(pos, end), isMath: false, isBlock: false });
        }
    };
    var addMath = function (start, end, isBlock) {
        addText(start);
        parts.push({ content: text.substring(start, end), isMath: true, isBlock: isBlock });
        pos = end;
    };
    // Build standalone command regex from shared constants
    var cmdSource = buildCommandRegexSource();
    var symSource = buildSymbolRegexSource();
    // Combined regex for initial detection — order matters
    var masterRegex = new RegExp([
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
        "(\\\\(?:".concat(cmdSource, ")(?![a-zA-Z]))"),
        // Standalone symbols
        "(\\\\(?:".concat(symSource, ")(?![a-zA-Z]))"),
    ].join('|'), 'g');
    var match;
    while ((match = masterRegex.exec(text)) !== null) {
        var fullMatch = match[0];
        var matchStart = match.index;
        // Skip if already past this position
        if (matchStart < pos)
            continue;
        // Determine which group matched
        if (match[1]) {
            // $$...$$
            addMath(matchStart, matchStart + fullMatch.length, true);
            masterRegex.lastIndex = pos;
        }
        else if (match[2]) {
            // \[...\]
            addMath(matchStart, matchStart + fullMatch.length, true);
            masterRegex.lastIndex = pos;
        }
        else if (match[3]) {
            // \begin{...}...\end{...}
            addMath(matchStart, matchStart + fullMatch.length, true);
            masterRegex.lastIndex = pos;
        }
        else if (match[4]) {
            // $...$
            addMath(matchStart, matchStart + fullMatch.length, false);
            masterRegex.lastIndex = pos;
        }
        else if (match[5]) {
            // \(...\)
            addMath(matchStart, matchStart + fullMatch.length, false);
            masterRegex.lastIndex = pos;
        }
        else if (match[6]) {
            // Standalone command — use balanced brace matching for full extent
            var cmdEnd = matchStart + fullMatch.length;
            var consumed = consumeBraceGroups(text, cmdEnd);
            var realEnd = consumed > cmdEnd ? consumed : cmdEnd;
            addMath(matchStart, realEnd, false);
            masterRegex.lastIndex = pos;
        }
        else if (match[7]) {
            // Standalone symbol
            addMath(matchStart, matchStart + fullMatch.length, false);
            masterRegex.lastIndex = pos;
        }
    }
    // Add remaining text
    addText(text.length);
    return parts;
}
function extractLatex(match) {
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
