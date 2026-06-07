/**
 * Restore namvio-ecosystem-app to state at a given Unix timestamp cutoff.
 * Usage: node restore-at-time.js [cutoffTs]
 */
const fs = require('fs');
const path = require('path');

const CUTOFF = Number(process.argv[2] || 1780793100);
const sessionPath =
    'C:/Users/ADMIN/.grok/sessions/C%3A%5CUsers%5CADMIN%5COneDrive%5CApps/019e93da-82db-71d2-b0fc-0e4a46a3adb2/updates.jsonl';
const root = 'C:/Users/ADMIN/OneDrive/Apps/namvio-ecosystem-app';
const marker = 'namvio-ecosystem-app';

console.log('Cutoff:', CUTOFF, '→', new Date(CUTOFF * 1000).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));

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
    const nt = newText ?? '';
    if (oldText === null || oldText === '') {
        files.set(rel, nt);
        return true;
    }
    if (nt.startsWith('<!DOCTYPE') && nt.length > 20000) {
        files.set(rel, nt);
        return true;
    }
    if (!files.has(rel)) {
        misses.push(rel);
        return false;
    }
    const cur = files.get(rel);
    const idx = cur.indexOf(oldText);
    if (idx === -1) {
        misses.push(rel);
        return false;
    }
    files.set(rel, cur.slice(0, idx) + nt + cur.slice(idx + oldText.length));
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
        applyDiff(rel, item.oldText, item.newText);
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
const css = files.get('assets/css/custom-style.css') || '';
const router = files.get('assets/js/app-router.js') || '';

console.log('Files restored:', files.size);
console.log('index.html:', idx.length, {
    admin: idx.includes('view-admin'),
    legal: idx.includes('view-legal'),
    supportRemoved: !idx.includes('view-guide') && !idx.includes('view-rules') && !idx.includes('view-help'),
    chats: idx.includes('view-chats'),
    profileHero: idx.includes('profile-hero-card'),
    rightSidebar: idx.includes('nv-right-sidebar')
});
console.log('custom-style.css:', css.length);
console.log('app-router.js:', router.length, {
    motion: router.includes('NamvioMotion.onRouteChange'),
    marketplace: router.includes('initMarketplace')
});
console.log('Missed patches:', [...new Set(misses)].join(', ') || 'none');