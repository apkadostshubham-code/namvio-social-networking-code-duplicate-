/**
 * Restore namvio-ecosystem-app to state BEFORE today's wipe (ts < 1780794725)
 */
const fs = require('fs');
const path = require('path');

const CUTOFF = 1780794725;
const sessionPath =
    'C:/Users/ADMIN/.grok/sessions/C%3A%5CUsers%5CADMIN%5COneDrive%5CApps/019e93da-82db-71d2-b0fc-0e4a46a3adb2/updates.jsonl';
const root = 'C:/Users/ADMIN/OneDrive/Apps/namvio-ecosystem-app';
const marker = 'namvio-ecosystem-app';

const files = new Map();
const misses = [];
const lines = fs.readFileSync(sessionPath, 'utf8').split('\n');

function relFromPath(p) {
    if (!p) return null;
    const norm = p.replace(/\\/g, '/');
    const idx = norm.toLowerCase().indexOf(marker);
    if (idx === -1) return null;
    const rel = norm.slice(idx + marker.length).replace(/^\/+/, '');
    if (!rel || rel.startsWith('scripts/') || rel.startsWith('_')) return null;
    return rel;
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
    if (raw.timestamp >= CUTOFF) continue;

    const update = raw.params?.update || {};
    const inner = update.update || update;
    const toolCall = inner.toolCall || update.toolCall;

    if (update.sessionUpdate === 'tool_call' && update.title === 'Write' && update.rawInput?.contents != null) {
        const rel = relFromPath(update.rawInput.path || '');
        if (rel) files.set(rel, update.rawInput.contents);
    }
    if (toolCall?.title === 'Write' && toolCall.rawInput?.contents != null) {
        const rel = relFromPath(toolCall.rawInput.path || '');
        if (rel) files.set(rel, toolCall.rawInput.contents);
    }

    if (inner.status !== 'completed' && update.status !== 'completed') continue;
    const content = inner.content || update.content;
    if (!Array.isArray(content)) continue;

    for (const item of content) {
        if (!item.path || item.type !== 'diff') continue;
        const rel = relFromPath(item.path);
        if (!rel) continue;
        const ok = applyDiff(rel, item.oldText, item.newText);
        if (!ok && item.oldText && item.oldText !== '') misses.push(rel);
    }

    if (toolCall?.title === 'Delete') {
        const rel = relFromPath(toolCall.rawInput?.path || '');
        if (rel) files.delete(rel);
    }
    if (update.sessionUpdate === 'tool_call' && update.title === 'Delete') {
        const rel = relFromPath(update.rawInput?.path || '');
        if (rel) files.delete(rel);
    }
}

for (const [rel, text] of files) {
    const out = path.join(root, rel);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, text);
}

const idx = files.get('index.html') || '';
console.log('Restored (before wipe) — files:', files.size);
console.log('index.html:', idx.length);
console.log('  profile-hero:', idx.includes('profile-hero-card'));
console.log('  hof-hero:', idx.includes('hof-hero'));
console.log('  chat-page-hero:', idx.includes('chat-page-hero'));
console.log('  view-blogs:', idx.includes('view-blogs'));
console.log('  st-page-hero:', idx.includes('st-page-hero'));
console.log('custom-style.css:', (files.get('assets/css/custom-style.css') || '').length);
console.log('app-router.js:', (files.get('assets/js/app-router.js') || '').length);
console.log('Missed patches:', [...new Set(misses)].length);