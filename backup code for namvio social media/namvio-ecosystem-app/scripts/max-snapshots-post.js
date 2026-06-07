const fs = require('fs');
const { consider, relFromPath, printTargets } = require('./max-snapshots-lib.js');

const sessionPath =
    'C:/Users/ADMIN/.grok/sessions/C%3A%5CUsers%5CADMIN%5COneDrive%5CApps/019e93da-82db-71d2-b0fc-0e4a46a3adb2/updates.jsonl';
const AFTER = Number(process.argv[2] || 1780794725);
const lines = fs.readFileSync(sessionPath, 'utf8').split('\n');
const best = {};

function considerLocal(rel, text, ts, src) {
    if (!rel || text == null) return;
    const cur = best[rel];
    if (!cur || text.length > cur.len) best[rel] = { len: text.length, ts, src, text };
}

for (const line of lines) {
    if (!line.trim()) continue;
    let raw;
    try {
        raw = JSON.parse(line);
    } catch {
        continue;
    }
    if (raw.timestamp < AFTER) continue;

    const update = raw.params?.update || {};
    const inner = update.update || update;
    const toolCall = inner.toolCall || update.toolCall;

    if (update.sessionUpdate === 'tool_call' && update.title === 'Write' && update.rawInput?.contents != null) {
        const rel = relFromPath(update.rawInput.path || '');
        considerLocal(rel, update.rawInput.contents, raw.timestamp, 'pending-write');
    }
    if (toolCall?.title === 'Write' && toolCall.rawInput?.contents != null) {
        const rel = relFromPath(toolCall.rawInput.path || '');
        considerLocal(rel, toolCall.rawInput.contents, raw.timestamp, 'tc-write');
    }

    if (inner.status !== 'completed' && update.status !== 'completed') continue;
    const content = inner.content || update.content;
    if (!Array.isArray(content)) continue;
    for (const item of content) {
        if (!item.path || item.type !== 'diff') continue;
        const rel = relFromPath(item.path);
        if (item.newText != null) considerLocal(rel, item.newText, raw.timestamp, 'diff');
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
    if (!b) {
        console.log(t, 'NONE');
        continue;
    }
    const s = b.text;
    console.log(
        t,
        b.len,
        '@',
        b.ts,
        b.src,
        JSON.stringify({
            admin: s.includes('view-admin'),
            legal: s.includes('view-legal'),
            chats: s.includes('view-chats'),
            profileHero: s.includes('profile-hero-card')
        })
    );
}