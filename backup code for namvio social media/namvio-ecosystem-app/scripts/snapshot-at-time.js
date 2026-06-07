const fs = require('fs');
const CUTOFF = Number(process.argv[2] || 1780793100);
const sessionPath =
    'C:/Users/ADMIN/.grok/sessions/C%3A%5CUsers%5CADMIN%5COneDrive%5CApps/019e93da-82db-71d2-b0fc-0e4a46a3adb2/updates.jsonl';
const marker = 'namvio-ecosystem-app';
const lines = fs.readFileSync(sessionPath, 'utf8').split('\n');
const best = {};

function rel(p) {
    if (!p) return null;
    const n = p.replace(/\\/g, '/');
    const i = n.toLowerCase().indexOf(marker);
    if (i === -1) return null;
    return n.slice(i + marker.length).replace(/^\/+/, '');
}

function consider(r, t, ts, src) {
    if (!r || t == null) return;
    if (!best[r] || t.length > best[r].len) best[r] = { len: t.length, ts, src };
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
    const u = raw.params?.update || {};
    const inner = u.update || u;
    const tc = inner.toolCall || u.toolCall;
    if (u.sessionUpdate === 'tool_call' && u.title === 'Write' && u.rawInput?.contents) {
        consider(rel(u.rawInput.path), u.rawInput.contents, raw.timestamp, 'write');
    }
    if (tc?.title === 'Write' && tc.rawInput?.contents) {
        consider(rel(tc.rawInput.path), tc.rawInput.contents, raw.timestamp, 'write');
    }
    if (inner.status !== 'completed' && u.status !== 'completed') continue;
    const content = inner.content || u.content;
    if (!Array.isArray(content)) continue;
    for (const item of content) {
        if (item.type !== 'diff' || !item.path || item.newText == null) continue;
        consider(rel(item.path), item.newText, raw.timestamp, 'diff');
    }
}

const keys = [
    'index.html',
    'assets/css/custom-style.css',
    'assets/js/app-router.js',
    'assets/js/nav-system.js',
    'assets/js/chat-system.js',
    'assets/js/profile-system.js'
];
console.log('Max chunks before', CUTOFF, new Date(CUTOFF * 1000).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
for (const k of keys) {
    const b = best[k];
    console.log(k, b ? `${b.len} @ ${b.ts} (${b.src})` : 'NONE');
}