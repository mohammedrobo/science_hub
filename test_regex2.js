function preprocessUnicodeMath(raw) {
    let t = raw;
    t = t.replace(/→/g, '\\to ');
    t = t.replace(/∞/g, '\\infty');
    t = t.replace(/≠/g, '\\neq ');
    t = t.replace(/≤/g, '\\leq ');
    t = t.replace(/≥/g, '\\geq ');
    t = t.replace(/×/g, '\\times ');
    t = t.replace(/÷/g, '\\div ');
    t = t.replace(/±/g, '\\pm ');
    return t;
}

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
    const funcRe = new RegExp(`(?:^|[^\\\\])\\b(${funcList.join('|')})\\b(?=\\s*[A-Za-z0-9(\\\\])`, 'gi');
    text = text.replace(funcRe, (match, word) => match.replace(word, '\\' + word));

    const piecewiseRe = /\{((?:[^{}]+?(?:for|if|when)[^{}]+?(?:,|;|\n)\s*)+[^{}]+?(?:for|if|when)[^{}]+?)\}/gi;
    text = text.replace(piecewiseRe, (match, inner) => {
        return "PIECEWISE";
    });

    const convertSlashToFrac = (str) => {
        let res = str;
        let lastLen = 0;
        
        while (res.length !== lastLen) {
            lastLen = res.length;
            const slashIdx = res.indexOf('/');
            if (slashIdx === -1) break;

            if (res.slice(Math.max(0, slashIdx - 4), slashIdx).includes('http')) {
                break; 
            }

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
            } else {
                while (numStart >= 0 && /[a-zA-Z0-9.\_^\\{}]/.test(res[numStart])) {
                    numStart--;
                }
            }
            numStart++; 

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
            
            const cleanNum = (numerator.startsWith('(') && numerator.endsWith(')')) ? numerator.slice(1, -1) : numerator;
            const cleanDen = (denominator.startsWith('(') && denominator.endsWith(')')) ? denominator.slice(1, -1) : denominator;

            if (numerator && denominator) {
                res = res.slice(0, numStart) + `\\frac{${cleanNum}}{${cleanDen}}` + res.slice(denEnd);
            } else {
                res = res.slice(0, slashIdx) + '÷' + res.slice(slashIdx + 1);
            }
        }
        return res.replace(/÷/g, '/');
    };
    text = convertSlashToFrac(text);

    text = text.replace(/(?<!\$)\b([a-zA-Z0-9])\^([0-9a-zA-Z]+|\{[^}]+\})\b(?!\$)/g, (match, base, exp) => {
        const expClean = exp.startsWith('{') ? exp : `{${exp}}`;
        return `${base}$^${expClean}$`;
    });

    return text;
}

const input = "Evaluate lim x→∞ (3x^3 + 5x)/(x^2 + 1).";
console.log(normalizeLatexText(preprocessUnicodeMath(input)));
