const fs = require('fs');
const path = require('path');

const sessionPath =
    'C:/Users/ADMIN/.grok/sessions/C%3A%5CUsers%5CADMIN%5COneDrive%5CApps/019e93da-82db-71d2-b0fc-0e4a46a3adb2/updates.jsonl';
const out = path.join('C:/Users/ADMIN/OneDrive/Apps/namvio-ecosystem-app', 'index.html');
const lines = fs.readFileSync(sessionPath, 'utf8').split('\n');

let best = null;

for (const line of lines) {
    if (!line.includes('index.html') || !line.includes('completed')) continue;
    let raw;
    try {
        raw = JSON.parse(line);
    } catch {
        continue;
    }
    const update = raw.params?.update || {};
    const inner = update.update || update;
    if (inner.status !== 'completed' && update.status !== 'completed') continue;
    const content = inner.content || update.content;
    if (!Array.isArray(content)) continue;
    for (const item of content) {
        if (!item.path?.includes('index.html') || item.type !== 'diff') continue;
        const nt = item.newText;
        if (!nt || nt.length < 70000) continue;
        if (!nt.includes('view-chats')) continue;
        if (!best || nt.length > best.len) {
            best = {
                ts: raw.timestamp,
                len: nt.length,
                admin: nt.includes('view-admin'),
                legal: nt.includes('view-legal'),
                supportRemoved: !nt.includes('view-guide') && !nt.includes('view-rules') && !nt.includes('view-help'),
                text: nt
            };
        }
    }
}

if (!best) {
    console.log('No large snapshot found');
    process.exit(1);
}

fs.writeFileSync(out, best.text);
console.log('Wrote index.html from ts', best.ts);
console.log('len', best.len, { admin: best.admin, legal: best.legal, supportRemoved: best.supportRemoved });