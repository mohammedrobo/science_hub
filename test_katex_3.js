const katex = require('katex');

try {
    const res = katex.renderToString('\\displaystyle \\frac{3x^3 + 5x}{x^2 + 1}', { throwOnError: true, displayMode: false });
    console.log("Success.");
} catch(e) {
    console.log("Error:", e.message);
}
