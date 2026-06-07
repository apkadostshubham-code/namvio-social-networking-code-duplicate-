const fs = require('fs');
const sessionPath =
    'C:/Users/ADMIN/.grok/sessions/C%3A%5CUsers%5CADMIN%5COneDrive%5CApps/019e93da-82db-71d2-b0fc-0e4a46a3adb2/updates.jsonl';
const marker = 'namvio-ecosystem-app';
const lines = fs.readFileSync(sessionPath, 'utf8').split('\n');
const best = {};

function relFromPath(p) {
    if (!p) return null;
    const norm = p.replace(/\\/g, '/');
    const idx = norm.toLowerCase().indexOf(marker);
    if (idx === -1) return null;
    return norm.slice(idx + marker.length).replace(/^\/+/, '');
}

function consider(rel, text, ts, kind) {
    if (!rel || !text) return;
    const cur = best[rel];
    if (!cur || text.length > cur.len) {
        best[rel] = { len: text.length, ts, kind };
    }
}

for (const line of lines) {
    if (!line.trim()) continue;
    let raw;
    try {
        raw = JSON.parse(line);
    } catch {
        continue;
    }
    const update = raw.params?.update || {};

    if (update.sessionUpdate === 'tool_call' && update.title === 'Write' && update.rawInput?.contents != null) {
        const rel = relFromPath(update.rawInput.path || '');
        consider(rel, update.rawInput.contents, raw.timestamp, 'write-pending');
    }

    const inner = update.update || update;
    if (inner.status !== 'completed' && update.status !== 'completed') continue;
    const content = inner.content || update.content;
    if (!Array.isArray(content)) continue;
    for (const item of content) {
        if (!item.path || item.type !== 'diff') continue;
        const rel = relFromPath(item.path);
        if (item.newText != null && (item.oldText === null || item.oldText === '')) {
            consider(rel, item.newText, raw.timestamp, 'diff-full');
        }
    }
}

const targets = [
    'index.html',
    'assets/css/custom-style.css',
    'assets/js/app-router.js',
    'assets/js/profile-system.js'
];
for (const t of targets) {
    const b = best[t];
    console.log(t, b ? `${b.len} @ ${b.ts} (${b.kind})` : 'none');
}