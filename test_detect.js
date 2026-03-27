const LATEX_ENV_RE = /\\begin\{([^}]+)\}[\s\S]*?\\end\{\1\}/;

function buildCommandRegexSource() {
    return ['frac', 'sqrt'].join('|');
}

function buildSymbolRegexSource() {
    return ['lim', 'sin'].join('|');
}

function findMatchingBrace(text, start) {
    if (text[start] !== '{') return -1;
    let depth = 0;
    for (let i = start; i < text.length; i++) {
        if (text[i] === '\\' && i + 1 < text.length) { i++; continue; }
        if (text[i] === '{') depth++;
        else if (text[i] === '}') { depth--; if (depth === 0) return i; }
    }
    return -1;
}

function consumeBraceGroups(text, pos) {
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

function detectAndSplitMath(text) {
    const parts = [];
    let pos = 0;

    const addText = (end) => {
        if (end > pos) {
            parts.push({ content: text.substring(pos, end), isMath: false });
        }
    };

    const addMath = (start, end) => {
        addText(start);
        parts.push({ content: text.substring(start, end), isMath: true });
        pos = end;
    };

    const cmdSource = buildCommandRegexSource();
    const symSource = buildSymbolRegexSource();

    const masterRegex = new RegExp(
        [
            '(\\$\\$[\\s\\S]+?\\$\\$)',
            '(\\\\\\[[\\s\\S]+?\\\\\\])',
            '(' + LATEX_ENV_RE.source + ')',
            '((?<!\\\\)\\$(?!\\d[\\d,]*\\.?\\d*\\$)[^\\$\\n]+?\\$)',
            '(\\\\\\([^\\)]+?\\\\\\))',
            `(\\\\(?:${cmdSource})(?![a-zA-Z]))`,
            `(\\\\(?:${symSource})(?![a-zA-Z]))`,
        ].join('|'),
        'g'
    );

    let match;
    while ((match = masterRegex.exec(text)) !== null) {
        const fullMatch = match[0];
        const matchStart = match.index;

        if (matchStart < pos) continue;

        if (match[1]) {
            addMath(matchStart, matchStart + fullMatch.length);
            masterRegex.lastIndex = pos;
        } else if (match[2]) {
            addMath(matchStart, matchStart + fullMatch.length);
            masterRegex.lastIndex = pos;
        } else if (match[3]) {
            addMath(matchStart, matchStart + fullMatch.length);
            masterRegex.lastIndex = pos;
        } else if (match[4]) {
            addMath(matchStart, matchStart + fullMatch.length);
            masterRegex.lastIndex = pos;
        } else if (match[5]) {
            addMath(matchStart, matchStart + fullMatch.length);
            masterRegex.lastIndex = pos;
        } else if (match[6]) {
            const cmdEnd = matchStart + fullMatch.length;
            const consumed = consumeBraceGroups(text, cmdEnd);
            const realEnd = consumed > cmdEnd ? consumed : cmdEnd;
            addMath(matchStart, realEnd);
            masterRegex.lastIndex = pos;
        } else if (match[7]) {
            addMath(matchStart, matchStart + fullMatch.length);
            masterRegex.lastIndex = pos;
        }
    }

    addText(text.length);
    return parts;
}

console.log(detectAndSplitMath('What is \\lim x -> 0 \\sin\\frac{5x}{x}?'));

