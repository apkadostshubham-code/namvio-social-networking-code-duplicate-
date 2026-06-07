const fs = require('fs');
const path = require('path');

const sessionPath =
    'C:/Users/ADMIN/.grok/sessions/C%3A%5CUsers%5CADMIN%5COneDrive%5CApps/019e93da-82db-71d2-b0fc-0e4a46a3adb2/updates.jsonl';
const root = 'C:/Users/ADMIN/OneDrive/Apps/namvio-ecosystem-app';
const prefix = 'namvio-ecosystem-app/';

const files = new Map();
const misses = [];
const lines = fs.readFileSync(sessionPath, 'utf8').split('\n');

function relFromPath(p) {
    const norm = p.replace(/\\/g, '/');
    if (!norm.includes(prefix)) return null;
    return norm.split(prefix)[1];
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

    const update = raw.params?.update?.update || raw.params?.update || {};
    const status = update.status || update.toolCallUpdate?.status;

    // Full Write from rawInput.contents
    const toolCall = update.toolCall;
    if (toolCall?.title === 'Write' && toolCall.rawInput?.contents != null) {
        const rel = relFromPath(toolCall.rawInput.path || '');
        if (rel && !rel.startsWith('_') && !rel.startsWith('scripts/')) {
            files.set(rel, toolCall.rawInput.contents);
        }
    }

    if (status !== 'completed') continue;

    const content = update.content;
    if (!Array.isArray(content)) continue;

    for (const item of content) {
        if (!item.path || item.type !== 'diff') continue;
        const rel = relFromPath(item.path);
        if (!rel || rel.startsWith('_') || rel.startsWith('scripts/')) continue;

        const ok = applyDiff(rel, item.oldText, item.newText);
        if (!ok && item.oldText && item.oldText !== '') {
            misses.push(rel);
        }
    }

    // Delete tool
    if (toolCall?.title === 'Delete') {
        const rel = relFromPath(toolCall.rawInput?.path || '');
        if (rel) files.delete(rel);
    }
}

// Write files
for (const [rel, text] of files) {
    const out = path.join(root, rel);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, text);
}

// Remove temp junk from broken replay
for (const junk of ['_revert-5.js', '_revert-css.js', '_fix-settings.js', '_check-html.js', '_settings-body.html']) {
    const p = path.join(root, junk);
    if (fs.existsSync(p)) fs.unlinkSync(p);
}

console.log('Files restored:', files.size);
for (const [rel, text] of [...files.entries()].sort()) {
    console.log(' ', rel, text.length);
}
console.log('Missed patches:', [...new Set(misses)].length);