const React = require('react');

// Just mock the essential logic
function testRender() {
    const text = 'Evaluate lim x→∞ (3x^3 + 5x)/(x^2 + 1).';
    
    let t = text;
    t = t.replace(/→/g, '\\to ');
    t = t.replace(/∞/g, '\\infty');
    
    t = t.replace(/\\\\([a-zA-Z]+)/g, '\\$1');
    t = t.replace(/\\\\([()\[\]{}])/g, '\\$1');

    t = t.replace(/(^|\s)x\s*\^\s*x($|\s)/g, '$1x^{x}$2');
    t = t.replace(/\\([a-zA-Z]+)\s*([\^_])\s*\{([^}]+)\}/g, '\\$1$2{$3}');
    t = t.replace(/\\([a-zA-Z]+)\s*([\^_])\s*([+\-]?\d+|[a-zA-Z])/g, '\\$1$2{$3}');

    const funcList = ['sin', 'cos', 'tan', 'lim', 'ln', 'log'];
    const funcRe = new RegExp(`(^|[^\\\\])\\b(${funcList.join('|')})\\b(?=\\s*[A-Za-z0-9(\\\\])`, 'gi');
    t = t.replace(funcRe, '$1\\\\$2');
    
    function convert(str) {
        // Mock of convertSlashToFrac
        return "Evaluate \\lim x\\to \\infty \\frac{3x^3 + 5x}{x^2 + 1}."; 
    }
    t = convert(t);
    
    const LATEX_COMMANDS = ['frac', 'sqrt'];
    const LATEX_SYMBOLS = ['lim', 'to', 'infty'];
    
    const cmdSource = LATEX_COMMANDS.join('|');
    const symSource = LATEX_SYMBOLS.join('|');
    
    const LATEX_ENV_RE = /\\begin\{([^}]+)\}[\s\S]*?\\end\{\1\}/g;
    
    // Exact masterRegex from MathText.ts
    const masterRegex = new RegExp(
        `(\\$\\$[\\s\\S]+?\\$\\$)|(\\\\[\\[\\(][\\s\\S]*?\\\\[\\]\\)])|(\\\\begin\\{([^}]+)\\}[\\s\\S]*?\\\\end\\{\\4\\})|(\\$((?:[^\\$]|\\n(?!\\n)){1,2000}?)\\$)|(\\\\(?:${cmdSource})(?![a-zA-Z]))|(\\\\(?:${symSource})(?![a-zA-Z]))`,
        'g'
    );
    
    const parts = [];
    let lastIndex = 0;
    let match;
    masterRegex.lastIndex = 0;
    
    while ((match = masterRegex.exec(t)) !== null) {
        if (match.index > lastIndex) {
            parts.push({c: t.slice(lastIndex, match.index), m: false});
        }
        
        const matchStart = match.index;
        const fullMatch = match[0];
        let pos = matchStart + fullMatch.length;
        
        if (match[7]) { // cmdSource
            const cmdEnd = pos;
            let cur = cmdEnd;
            if (t.slice(cur).startsWith('{3x^3 + 5x}')) { cur += 11; }
            if (t.slice(cur).startsWith('{x^2 + 1}')) { cur += 9; }
            pos = cur;
            parts.push({c: t.slice(matchStart, pos), m: true});
            masterRegex.lastIndex = pos;
        } else if (match[8]) { // symSource
            parts.push({c: fullMatch, m: true});
            masterRegex.lastIndex = pos;
        }
        lastIndex = pos;
    }
    if (lastIndex < t.length) {
        parts.push({c: t.slice(lastIndex), m: false});
    }
    
    console.log("FINAL PARTS:");
    parts.forEach(p => console.log(p.m ? 'MATH:' : 'TEXT:', p.c));
}
testRender();
