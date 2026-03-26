import { normalizeLatexText, preprocessUnicodeMath, detectAndSplitMath } from './src/components/MathText';

const testStrings = [
    String.raw`P(x) = 3$\sqrt$x + 5`,
    String.raw`3/x + 5x^2`,
    String.raw`3x^2 + 5`,
    String.raw`What is the reciprocal of \\sin x?`,
    String.raw`\\sec x`,
    String.raw`What is \\sin(2x) equal to?`,
    String.raw`sin^2x + cos^2x`,
    String.raw`2 \\sin x \\cos x`,
    String.raw`The value of \\sin(3\pi/2) is:`,
    String.raw`\\ln(a^b) = \\ln a / b`
];

console.log('--- TEST RESULTS ---');
for (const s of testStrings) {
    console.log(`\nInput: ${s}`);
    
    // The exact flow in MathText
    let processedText = normalizeLatexText(s);
    console.log(`Normalized: ${processedText}`);
    
    processedText = preprocessUnicodeMath(processedText);
    console.log(`Post-Unicode: ${processedText}`);
    
    const segments = detectAndSplitMath(processedText);
    console.log('Resulting parts:');
    segments.forEach((seg, i) => {
        console.log(`  [${i}] isMath=${seg.isMath} content: "${seg.content}"`);
    });
}
