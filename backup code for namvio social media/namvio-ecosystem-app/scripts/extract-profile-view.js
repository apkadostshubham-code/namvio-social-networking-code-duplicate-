const fs = require('fs');
const p =
    'C:/Users/ADMIN/.grok/sessions/C%3A%5CUsers%5CADMIN%5COneDrive%5CApps/019e93da-82db-71d2-b0fc-0e4a46a3adb2/updates.jsonl';
const lines = fs.readFileSync(p, 'utf8').split('\n');
let best = { len: 0, text: '' };

for (const line of lines) {
    if (!line.includes('profile-hero-card')) continue;
    try {
        const o = JSON.parse(line);
        const raw = JSON.stringify(o);
        const start = raw.indexOf('view-identity');
        if (start < 0) continue;
        const slice = raw.slice(start, start + 35000);
        if (slice.length > best.len) best = { len: slice.length, text: slice };
    } catch (_) {}
}

let text = best.text.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\t/g, '\t');
const htmlStart = text.indexOf('<div id="view-identity');
const markers = ['<div id="view-hof"', '</div>\n\n                    <div id="view-hof"'];
let htmlEnd = -1;
for (const m of markers) {
    const i = text.indexOf(m, htmlStart + 50);
    if (i > htmlStart) {
        htmlEnd = i;
        break;
    }
}
if (htmlEnd < 0) {
    // close at last </div> before next view comment
    const tail = text.slice(htmlStart);
    const closeIdx = tail.lastIndexOf('</div>');
    htmlEnd = htmlStart + closeIdx + 6;
}

const html = text.slice(htmlStart, htmlEnd);
const out = 'C:/Users/ADMIN/OneDrive/Apps/namvio-ecosystem-app/scripts/_profile-view-extract.html';
fs.writeFileSync(out, html);
console.log('chars:', html.length);
console.log(html.slice(0, 500));
console.log('...\n');
console.log(html.slice(-300));