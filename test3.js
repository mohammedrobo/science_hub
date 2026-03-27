const LATEX_ENV_RE = /\\begin\{([^}]+)\}[\s\S]*?\\end\{\1\}/;

const cmdSource = ['frac'].join('|');
const symSource = ['lim', 'sin'].join('|');

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

const text = 'What is \\lim x -> 0 \\sin\\frac{5x}{x}?';
let match;
while ((match = masterRegex.exec(text)) !== null) {
    console.log("MATCH", match[0], "at", match.index);
}
