const fs = require('fs');

const sessionPath =
    'C:/Users/ADMIN/.grok/sessions/C%3A%5CUsers%5CADMIN%5COneDrive%5CApps/019e93da-82db-71d2-b0fc-0e4a46a3adb2/updates.jsonl';
const marker = 'namvio-ecosystem-app';
const CUTOFF = 1780794725;
const lines = fs.readFileSync(sessionPath, 'utf8').split('\n');
const big = [];

function relFromPath(p) {
    if (!p) return null;
    const norm = p.replace(/\\/g, '/');
    const idx = norm.toLowerCase().indexOf(marker);
    if (idx === -1) return null;
    return norm.slice(idx + marker.length).replace(/^\/+/, '');
}

for (const line of lines) {
    if (!line.trim()) continue;
    let raw;
    try {
        raw = JSON.parse(line);
    } catch {
        continue;
    }
    if (raw.timestamp >= CUTOFF) continue;

    const update = raw.params?.update || {};
    const inner = update.update || update;
    if (inner.status !== 'completed' && update.status !== 'completed') continue;
    const content = inner.content || update.content;
    if (!Array.isArray(content)) continue;

    for (const item of content) {
        if (item.type !== 'diff' || !item.path) continue;
        if (relFromPath(item.path) !== 'index.html') continue;
        const nt = item.newText || '';
        if (nt.length < 3000) continue;
        big.push({
            ts: raw.timestamp,
            len: nt.length,
            oldLen: (item.oldText || '').length,
            admin: nt.includes('view-admin'),
            legal: nt.includes('view-legal'),
            supportRemoved: !nt.includes('view-guide') && !nt.includes('view-rules') && !nt.includes('view-help'),
            chats: nt.includes('view-chats'),
            doctype: nt.startsWith('<!DOCTYPE')
        });
    }
}

big.sort((a, b) => b.len - a.len);
console.log('Top index.html diff newText chunks (pre-wipe):');
big.slice(0, 20).forEach((x) => console.log(x));