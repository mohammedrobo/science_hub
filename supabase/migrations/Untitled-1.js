// REPLACE THIS:
text = text.replace(/^#{1,6}\s+\*{0,2}(?:part|section|topic|chapter|category)\s+\d*\*{0,2}\s*[:\-]?\s*.*/gmi, '');

// WITH THIS:
text = text.replace(/^#{1,6}\s+\*{0,2}(?:part|section|topic|chapter|category)\s+\d*\*{0,2}\s*[:\-\u2013\u2014]?\s*.*/gmi, (match) => {
    if (/answer|solution|\u0627\u0644\u0625\u062c\u0627\u0628/i.test(match)) return match;
    return '';
});