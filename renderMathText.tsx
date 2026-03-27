import React from 'react';
import { renderToString } from 'react-dom/server';
import { MathText } from './src/components/MathText';

const testStrings = [
    "Evaluate lim x→∞ (3x^3 + 5x)/(x^2 + 1).",
    "Which condition is necessary for a function f(x) to be continuous at x=a?\nA) f(a) exists\nB) \\lim x \\to a f(x) exists\nC) f(a) = \\lim x \\to a f(x)\nD) all of the above",
    "What is \\lim x\\to0 \\sin\\frac{5x}{x}?"
];

testStrings.forEach((text, i) => {
    console.log(`\n\n--- Test ${i + 1} ---`);
    console.log("Input:", text);
    try {
        const result = renderToString(React.createElement(MathText, { text }));
        console.log("HTML Output:");
        console.log(result);
    } catch (e) {
        console.log("Error:", e);
    }
});
