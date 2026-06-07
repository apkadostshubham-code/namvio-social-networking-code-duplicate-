const fs = require('fs');
const path = require('path');

const sessionPath =
    'C:/Users/ADMIN/.grok/sessions/C%3A%5CUsers%5CADMIN%5COneDrive%5CApps/019e93da-82db-71d2-b0fc-0e4a46a3adb2/updates.jsonl';
const root = 'C:/Users/ADMIN/OneDrive/Apps/namvio-ecosystem-app';
const prefix = 'namvio-ecosystem-app/';

const files = new Map();
const deleted = new Set();
const lines = fs.readFileSync(sessionPath, 'utf8').split('\n');

for (const line of lines) {
    if (!line.includes('"status":"completed"')) continue;
    let raw;
    try {
        raw = JSON.parse(line);
    } catch {
        continue;
    }

    const content = raw.params?.update?.update?.content || raw.params?.update?.content;
    if (!Array.isArray(content)) continue;

    for (const item of content) {
        if (!item.path) continue;
        const norm = item.path.replace(/\\/g, '/');
        if (!norm.includes(prefix)) continue;
        const rel = norm.split(prefix)[1];
        if (!rel || rel.startsWith('scripts/')) continue;

        if (item.type === 'diff') {
            if (item.oldText === null || item.oldText === '') {
                if (item.newText != null) files.set(rel, item.newText);
            } else if (item.newText != null && files.has(rel)) {
                const cur = files.get(rel);
                if (cur.includes(item.oldText)) {
                    files.set(rel, cur.replace(item.oldText, item.newText));
                }
            } else if (item.newText != null && item.oldText != null) {
                // attempt full replace on disk if not tracked yet
            }
        }
    }

    // Handle Delete tool
    const toolCall = raw.params?.update?.toolCall || raw.params?.update?.update?.toolCall;
    const title = toolCall?.title || raw.params?.update?.update?.title;
    if (title === 'Delete' || (typeof line === 'string' && line.includes('"title":"Delete"'))) {
        const delPath = toolCall?.rawInput?.path || '';
        const norm = delPath.replace(/\\/g, '/');
        if (norm.includes(prefix)) {
            const rel = norm.split(prefix)[1];
            if (rel) deleted.add(rel);
        }
    }
}

// Second pass: apply StrReplace diffs from rawInput when file exists on disk from first pass
for (const line of lines) {
    if (!line.includes('"status":"completed"')) continue;
    let raw;
    try {
        raw = JSON.parse(line);
    } catch {
        continue;
    }
    const content = raw.params?.update?.update?.content || raw.params?.update?.content;
    if (!Array.isArray(content)) continue;
    for (const item of content) {
        if (!item.path || item.type !== 'diff') continue;
        const norm = item.path.replace(/\\/g, '/');
        if (!norm.includes(prefix)) continue;
        const rel = norm.split(prefix)[1];
        if (!rel || !files.has(rel)) continue;
        if (item.oldText == null || item.oldText === '') continue;
        const cur = files.get(rel);
        if (cur.includes(item.oldText)) {
            files.set(rel, cur.replace(item.oldText, item.newText ?? ''));
        }
    }
}

console.log('Tracked files:', files.size);
for (const [rel, text] of files) {
    const out = path.join(root, rel);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, text);
    console.log('Wrote', rel, text.length);
}