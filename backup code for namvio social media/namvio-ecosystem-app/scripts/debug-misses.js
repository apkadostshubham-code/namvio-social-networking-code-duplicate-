const fs = require('fs');

const sessionPath =
    'C:/Users/ADMIN/.grok/sessions/C%3A%5CUsers%5CADMIN%5COneDrive%5CApps/019e93da-82db-71d2-b0fc-0e4a46a3adb2/updates.jsonl';
const marker = 'namvio-ecosystem-app';
const lines = fs.readFileSync(sessionPath, 'utf8').split('\n');
const files = new Map();
const misses = [];

function relFromPath(p) {
    if (!p) return null;
    const norm = p.replace(/\\/g, '/');
    const idx = norm.toLowerCase().indexOf(marker);
    if (idx === -1) return null;
    return norm.slice(idx + marker.length).replace(/^\/+/, '');
}

function applyDiff(rel, oldText, newText) {
    if (oldText === null || oldText === '') {
        files.set(rel, newText ?? '');
        return true;
    }
    if (!files.has(rel)) return false;
    const cur = files.get(rel);
    const idx = cur.indexOf(oldText);
    if (idx === -1) return false;
    files.set(rel, cur.slice(0, idx) + (newText ?? '') + cur.slice(idx + oldText.length));
    return true;
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
    const inner = update.update || update;
    const toolCall = inner.toolCall || update.toolCall;

    if (toolCall?.title === 'Write' && toolCall.rawInput?.contents != null) {
        const rel = relFromPath(toolCall.rawInput.path || '');
        if (rel && !rel.startsWith('scripts/') && !rel.startsWith('_')) {
            files.set(rel, toolCall.rawInput.contents);
        }
    }

    if (inner.status !== 'completed' && update.status !== 'completed') continue;
    const content = inner.content || update.content;
    if (!Array.isArray(content)) continue;

    for (const item of content) {
        if (!item.path || item.type !== 'diff') continue;
        const rel = relFromPath(item.path);
        if (!rel || rel.startsWith('scripts/') || rel.startsWith('_')) continue;
        const ok = applyDiff(rel, item.oldText, item.newText);
        if (!ok && item.oldText && item.oldText !== '') {
            misses.push({
                ts: raw.timestamp,
                rel,
                oldLen: item.oldText.length,
                newHasAdmin: (item.newText || '').includes('view-admin'),
                newHasLegal: (item.newText || '').includes('view-legal'),
                oldStart: item.oldText.slice(0, 80).replace(/\n/g, '\\n')
            });
        }
    }
}

console.log('Final index has admin:', (files.get('index.html') || '').includes('view-admin'));
console.log('Misses for index.html:', misses.filter((m) => m.rel === 'index.html').length);
misses
    .filter((m) => m.rel === 'index.html')
    .slice(-20)
    .forEach((m) =>
        console.log(m.ts, 'oldLen', m.oldLen, 'admin?', m.newHasAdmin, 'legal?', m.newHasLegal, m.oldStart)
    );