const fs = require('fs');

function convertSlashToFrac(str) {
    const funcList = [
        'sin', 'cos', 'tan', 'cot', 'sec', 'csc',
        'sinh', 'cosh', 'tanh', 'coth', 'sech', 'csch',
        'arcsin', 'arccos', 'arctan',
        'ln', 'log', 'exp', 'lim',
        'sqrt',
    ];
    let res = str;
    let lastLen = 0;
    
    while (res.length !== lastLen) {
        lastLen = res.length;
        const slashIdx = res.indexOf('/');
        if (slashIdx === -1) break;

        // Find Numerator
        let numStart = slashIdx - 1;
        while (numStart >= 0 && /\s/.test(res[numStart])) numStart--;
        
        if (numStart >= 0 && res[numStart] === ')') {
            // ...
        } else {
            while (numStart >= 0 && /[a-zA-Z0-9.\_^\\{}]/.test(res[numStart])) {
                numStart--;
            }
            numStart++; 
        }

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
            // WE ADDED SUPPORT FOR FUNCTIONS? No! Let's see original code:
            while (denEnd < res.length && /[a-zA-Z0-9.\_^\\{}]/.test(res[denEnd])) {
                denEnd++;
            }
        }

        const numerator = res.slice(numStart, slashIdx).trim();
        const denominator = res.slice(slashIdx + 1, denEnd).trim();
        
        if (numerator && denominator) {
            res = res.slice(0, numStart) + `\\frac{${numerator}}{${denominator}}` + res.slice(denEnd);
        } else {
            res = res.slice(0, slashIdx) + '÷' + res.slice(slashIdx + 1);
        }
    }
    return res.replace(/÷/g, '/');
}

console.log(convertSlashToFrac('x / sin(x + y) + 7 = 0'));
