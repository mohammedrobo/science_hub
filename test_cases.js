function convertPiecewise(text) {
    // Look for f(x) = { ... } or just { ... } if it contains 'for' or 'if'
    // Pattern: { expr1 for cond1, expr2 for cond2, ... }
    
    // We can use a regex replacement:
    const piecewiseRe = /\{((?:[^{}]+?(?:for|if|when)[^{}]+?(?:,|;|\n)\s*)+[^{}]+?(?:for|if|when)[^{}]+?)\}/gi;
    
    return text.replace(piecewiseRe, (match, inner) => {
        // Split by comma or semicolon
        const lines = inner.split(/[,;\n]/);
        let casesContent = '';
        let valid = true;
        
        for (let line of lines) {
            line = line.trim();
            if(!line) continue;
            // Split by "for" or "if" or "when"
            const parts = line.split(/\s+(for|if|when)\s+/i);
            if (parts.length >= 3) {
                // The last two parts are the keyword and the condition
                const keyword = parts[parts.length - 2];
                const cond = parts[parts.length - 1];
                const expr = parts.slice(0, parts.length - 2).join('').trim();
                
                casesContent += `${expr} & \\text{${keyword} } ${cond} \\\\ `;
            } else {
                // If there's an "otherwise", handle it
                if (line.toLowerCase().includes('otherwise')) {
                    const expr = line.replace(/\s*otherwise\s*/i, '').trim();
                    casesContent += `${expr} & \\text{otherwise} \\\\ `;
                } else {
                    valid = false;
                    break;
                }
            }
        }
        
        if (valid && casesContent) {
            return `\\begin{cases} ${casesContent} \\end{cases}`;
        }
        return match;
    });
}

const t1 = "Is the function f(x) = { x^2 for x<1, 5 for x=1, 3x+1 for x>1 } continuous at x=1?";
const t2 = "Find k such that f(x) = { (x^2 - 9)/(x - 3) for x≠3, k-4 for x=3 } is continuous at x=3.";

console.log(convertPiecewise(t1));
console.log(convertPiecewise(t2));
