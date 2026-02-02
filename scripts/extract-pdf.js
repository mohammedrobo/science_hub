const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

async function extract() {
    console.log("Starting Extraction...");
    const pdfPath = path.join(process.cwd(), 'students.pdf');
    const outPath = path.join(process.cwd(), 'src/data/students_raw.txt');

    if (!fs.existsSync(pdfPath)) {
        console.error("PDF NOT FOUND:", pdfPath);
        process.exit(1);
    }

    const buf = fs.readFileSync(pdfPath);
    try {
        const data = await pdf(buf);
        fs.mkdirSync(path.dirname(outPath), { recursive: true });
        fs.writeFileSync(outPath, data.text);
        console.log(`Extracted ${data.text.length} chars to ${outPath}`);
    } catch (e) {
        console.error("Extraction failed:", e);
    }
}
extract();
