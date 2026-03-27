const fs = require('fs');

function testRegex() {
    let text = "Is the function f(x) = { x^2 for x<1, 5 for x=1, 3x+1 for x>1 } continuous at x=1?";
    
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

    console.log("Piecewise test output:");
    console.log(text);
}

testRegex();
