
const constants = require('./temp-constants.js');
// Mocking them into global or letting mathText use them
Object.assign(global, constants);

const mathText = require('./temp-mathText.js');

const testStrings = [
    "P(x) = 3$\\sqrt$x + 5",
    "3/x + 5x^2",
    "3x^2 + 5",
    "What is the reciprocal of \\\\sin x?",
    "\\\\sec x",
    "What is \\\\sin(2x) equal to?",
    "sin^2x + cos^2x",
    "2 \\\\sin x \\\\cos x",
    "The value of \\\\sin(3\\pi/2) is:",
    "\\\\ln(a^b) = \\\\ln a / b"
];

console.log('--- TEST RESULTS ---');
for (const s of testStrings) {
    console.log('\nInput:', s);
    let processed = mathText.normalizeLatexText(s);
    console.log('Normalized:', processed);
    processed = mathText.preprocessUnicodeMath(processed);
    console.log('Post-Unicode:', processed);
    const parts = mathText.detectAndSplitMath(processed);
    console.log('Parts:');
    parts.forEach((p, i) => console.log('  [' + i + '] isMath=' + p.isMath + ' ' + p.content));
}
