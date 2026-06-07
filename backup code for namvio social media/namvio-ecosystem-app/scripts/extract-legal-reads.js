const fs = require('fs');
const path = require('path');

const sessionPath =
    'C:/Users/ADMIN/.grok/sessions/C%3A%5CUsers%5CADMIN%5COneDrive%5CApps/019e93da-82db-71d2-b0fc-0e4a46a3adb2/updates.jsonl';
const lines = fs.readFileSync(sessionPath, 'utf8').split('\n');

const chunks = [];

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.includes('index.html') || !line.includes('legal-accordion')) continue;
    try {
        const obj = JSON.parse(line);
        const text = obj?.params?.update?.content?.[0]?.content?.text || '';
        if (!text.includes('legal-accordion')) continue;
        // Strip read tool line number prefixes like "   680|"
        const cleaned = text.replace(/^\s*\d+\|/gm, '');
        const start = cleaned.indexOf('<!-- 1. Terms of Service -->');
        const start2 = cleaned.indexOf('<!-- 13. API');
        const start3 = cleaned.indexOf('<!-- 29. Eligibility');
        const idx = start >= 0 ? start : start2 >= 0 ? start2 : start3;
        if (idx < 0) continue;
        let slice = cleaned.slice(idx);
        const end = slice.indexOf('lg-accordion-foot');
        if (end > 0) slice = slice.slice(0, end);
        chunks.push({ line: i + 1, len: slice.length, text: slice.trim() });
    } catch (_) {
        /* skip */
    }
}

chunks.sort((a, b) => b.len - a.len);
console.log('Found', chunks.length, 'read chunks');
chunks.slice(0, 5).forEach((c) => {
    const n = (c.text.match(/id="heading\d+"/g) || []).length;
    console.log('line', c.line, 'len', c.len, 'policies', n);
});

if (chunks.length) {
    // Merge: start with largest chunk, add missing policy sections from others
    const policyRe = /<!-- (\d+)\.[\s\S]*?(?=<!-- \d+\.|$)/g;
    const policies = new Map();

    for (const chunk of chunks) {
        let m;
        const re = /<!-- (\d+)\.[^]*?(?=\n\s*<!-- \d+\.|\n\s*<\/div>\s*\n\s*<\/div>\s*\n\s*<div class="lg-accordion-foot|$)/g;
        while ((m = re.exec(chunk.text)) !== null) {
            const num = parseInt(m[1], 10);
            const block = m[0].trim();
            if (!policies.has(num) || block.length > policies.get(num).length) {
                policies.set(num, block);
            }
        }
    }

    const merged = [];
    for (let n = 1; n <= 30; n++) {
        if (policies.has(n)) merged.push(policies.get(n));
        else console.warn('Missing policy', n);
    }

    const out = merged.join('\n\n                                ');
    const outPath = path.join(__dirname, '_patch-legal-accordion.txt');
    fs.writeFileSync(outPath, out, 'utf8');
    console.log('Merged policies:', merged.length, '->', outPath);
}