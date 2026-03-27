const katex = require('katex');
const fs = require('fs');
const res = katex.renderToString('x \\sin(x + y) + 7 = 0', { throwOnError: false, displayMode: false });
fs.writeFileSync('katex_test.html', `<html><body>${res}</body></html>`);
console.log('done');
