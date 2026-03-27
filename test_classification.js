function normalizeLatexText(raw) {
    let text = raw;
    text = text.replace(/\\\\([a-zA-Z]+)/g, '\\$1');
    text = text.replace(/\\\\([()\[\]{}])/g, '\\$1');

    text = text.replace(/(^|\s)x\s*\^\s*x($|\s)/g, '$1x^{x}$2');
    text = text.replace(/\\([a-zA-Z]+)\s*([\^_])\s*\{([^}]+)\}/g, '\\$1$2{$3}');
    text = text.replace(/\\([a-zA-Z]+)\s*([\^_])\s*([+\-]?\d+|[a-zA-Z])/g, '\\$1$2{$3}');

    const funcList = [
        'sin', 'cos', 'tan', 'cot', 'sec', 'csc',
        'sinh', 'cosh', 'tanh', 'coth', 'sech', 'csch',
        'arcsin', 'arccos', 'arctan',
        'ln', 'log', 'exp', 'lim',
        'sqrt',
    ];
    const funcRe = new RegExp(`(^|[^\\\\])\\b(${funcList.join('|')})\\b(?=\\s*[A-Za-z0-9(\\\\])`, 'gi');
    text = text.replace(funcRe, '$1\\\\$2');

    return text;
}

function detectAndSplitMath(text) {
    const isLikelyPureMath = (str) => {
        const words = str.split(/\s+/).filter(w => !w.startsWith('\\'));
        const commonVars = ['sin', 'cos', 'tan', 'log', 'ln', 'lim'];
        const hasProseWords = words.some(w => {
            const cleanWord = w.replace(/[^a-zA-Z]/g, '');
            return cleanWord.length > 2 && !commonVars.includes(cleanWord.toLowerCase());
        });

        if (hasProseWords) return false;

        const mathIndicators = /[\^=+\-\/\\_]|(\d[a-zA-Z])/;
        return mathIndicators.test(str);
    };

    if (isLikelyPureMath(text)) {
        return [{ content: text, isMath: true, fullMatch: true }];
    }
    
    return [{ content: text, isMath: false, reason: "not pure math" }];
}

const input = "x sin(x + y) + 7 = 0";
const normal = normalizeLatexText(input);
console.log("Normalized:", JSON.stringify(normal));
const parts = detectAndSplitMath(normal);
console.log("Parts:", parts);
