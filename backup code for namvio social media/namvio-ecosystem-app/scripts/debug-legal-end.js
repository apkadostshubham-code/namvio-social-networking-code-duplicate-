const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', '_backup', 'fix-layout-2026-06-07T02-29-29.html'), 'utf8');

function findBlockEnd(source, start) {
    const tagEnd = source.indexOf('>', start) + 1;
    let depth = 1;
    let i = tagEnd;
    const openRe = /<div[\s>]/gi;
    const closeRe = /<\/div>/gi;
    while (depth > 0 && i < source.length) {
        openRe.lastIndex = i;
        closeRe.lastIndex = i;
        const o = openRe.exec(source);
        const c = closeRe.exec(source);
        if (!c) throw new Error('Unclosed div at ' + start);
        if (o && o.index < c.index) {
            depth++;
            i = o.index + o[0].length;
        } else {
            depth--;
            i = c.index + c[0].length;
            if (depth === 0) return i;
        }
    }
    throw new Error('Block end not found at ' + start);
}

const legalStart = html.indexOf('id="view-legal"');
const end = findBlockEnd(html, html.lastIndexOf('<div', legalStart));
console.log('legal start', legalStart, 'end', end);
console.log('snippet at end-80:', JSON.stringify(html.slice(end - 80, end + 80)));
console.log('next view-admin at', html.indexOf('id="view-admin"', legalStart + 10));