const assert = require('assert');

// The original logic
function normalizeLatexText(raw) {
    let text = raw;
    text = text.replace(/\\\\([a-zA-Z]+)/g, '\\$1');
    text = text.replace(/\\\\([()\[\]{}])/g, '\\$1');
    return text;
}

console.log("Input: '\\\\lim x -> 0' -> ", normalizeLatexText('\\\\lim x -> 0'));
console.log("Input: '\\lim x -> 0' -> ", normalizeLatexText('\\lim x -> 0'));
console.log("Input: '\\\\lim x \\\\to 0 \\\\frac{5x}{x}' -> ", normalizeLatexText('\\\\lim x \\\\to 0 \\\\frac{5x}{x}'));

