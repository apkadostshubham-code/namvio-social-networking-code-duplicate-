const fs = require('fs');

const sessionPath =
    'C:/Users/ADMIN/.grok/sessions/C%3A%5CUsers%5CADMIN%5COneDrive%5CApps/019e93da-82db-71d2-b0fc-0e4a46a3adb2/updates.jsonl';
const marker = 'namvio-ecosystem-app';
const CUTOFF = Number(process.argv[2] || 1780794725);
const lines = fs.readFileSync(sessionPath, 'utf8').split('\n');
const best = {};

function relFromPath(p) {
    if (!p) return null;
    const norm = p.replace(/\\/g, '/');
    const idx = norm.toLowerCase().indexOf(marker);
    if (idx === -1) return null;
    return norm.slice(idx + marker.length).replace(/^\/+/, '');
}

function consider(rel, text, ts, src) {
    if (!rel || text == null) return;
    const cur = best[rel];
    if (!cur || text.length > cur.len) {
        best[rel] = { len: text.length, ts, src, text };
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
    if (raw.timestamp >= CUTOFF) continue;

    const update = raw.params?.update || {};
    const inner = update.update || update;
    const toolCall = inner.toolCall || update.toolCall;

    if (update.sessionUpdate === 'tool_call' && update.title === 'Write' && update.rawInput?.contents != null) {
        const rel = relFromPath(update.rawInput.path || '');
        consider(rel, update.rawInput.contents, raw.timestamp, 'pending-write');
    }
    if (toolCall?.title === 'Write' && toolCall.rawInput?.contents != null) {
        const rel = relFromPath(toolCall.rawInput.path || '');
        consider(rel, toolCall.rawInput.contents, raw.timestamp, 'tc-write');
    }

    if (inner.status !== 'completed' && update.status !== 'completed') continue;
    const content = inner.content || update.content;
    if (!Array.isArray(content)) continue;

    for (const item of content) {
        if (!item.path || item.type !== 'diff') continue;
        const rel = relFromPath(item.path);
        if (item.newText != null) {
            consider(rel, item.newText, raw.timestamp, 'diff-newText');
        }
    }
}

const targets = process.argv.slice(3);
const list = targets.length ? targets : Object.keys(best).sort();
for (const t of list) {
    const b = best[t];
    if (!b) {
        console.log(t, 'NONE');
        continue;
    }
    const s = b.text;
    const flags = {
        admin: s.includes('view-admin'),
        legal: s.includes('view-legal'),
        supportRemoved: !s.includes('view-guide') && !s.includes('view-rules') && !s.includes('view-help'),
        chats: s.includes('view-chats'),
        hof: s.includes('view-hof') || s.includes('id="view-hof"'),
        motion: s.includes('motion-graphics'),
        shell: s.includes('app-shell')
    };
    console.log(t, b.len, '@', b.ts, b.src, JSON.stringify(flags));
}