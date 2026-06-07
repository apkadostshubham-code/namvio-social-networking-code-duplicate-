const fs = require('fs');
const sessionPath =
    'C:/Users/ADMIN/.grok/sessions/C%3A%5CUsers%5CADMIN%5COneDrive%5CApps/019e93da-82db-71d2-b0fc-0e4a46a3adb2/updates.jsonl';
const lines = fs.readFileSync(sessionPath, 'utf8').split('\n');
let router = '';

for (const line of lines) {
    if (!line.includes('app-router.js')) continue;
    let raw;
    try {
        raw = JSON.parse(line);
    } catch {
        continue;
    }
    if (raw.timestamp >= 1780794725) continue;
    const update = raw.params?.update || {};
    const inner = update.update || update;
    if (inner.status !== 'completed' && update.status !== 'completed') continue;
    const content = inner.content || update.content;
    if (!Array.isArray(content)) continue;
    for (const item of content) {
        if (item.type !== 'diff' || !item.path?.includes('app-router.js')) continue;
        if (item.oldText === null || item.oldText === '') {
            if ((item.newText || '').includes('function initBlogs') && item.newText.length > router.length) {
                router = item.newText;
            }
        }
    }
}

// replay all writes/diffs to get cumulative router at pre-wipe
const files = new Map();
function rel(p) {
    if (!p) return null;
    const n = p.replace(/\\/g, '/');
    const i = n.toLowerCase().indexOf('namvio-ecosystem-app');
    if (i === -1) return null;
    return n.slice(i + 'namvio-ecosystem-app'.length).replace(/^\/+/, '');
}
function apply(rel, oldText, newText) {
    if (oldText === null || oldText === '') {
        files.set(rel, newText ?? '');
        return;
    }
    if (!files.has(rel)) return;
    const cur = files.get(rel);
    const idx = cur.indexOf(oldText);
    if (idx === -1) return;
    files.set(rel, cur.slice(0, idx) + (newText ?? '') + cur.slice(idx + oldText.length));
}
for (const line of lines) {
    let raw;
    try {
        raw = JSON.parse(line);
    } catch {
        continue;
    }
    if (raw.timestamp >= 1780794725) continue;
    const u = raw.params?.update || {};
    const inner = u.update || u;
    const tc = inner.toolCall || u.toolCall;
    if (u.sessionUpdate === 'tool_call' && u.title === 'Write' && u.rawInput?.contents) {
        const r = rel(u.rawInput.path);
        if (r === 'assets/js/app-router.js') files.set(r, u.rawInput.contents);
    }
    if (inner.status !== 'completed' && u.status !== 'completed') continue;
    const content = inner.content || u.content;
    if (!Array.isArray(content)) continue;
    for (const item of content) {
        if (item.type !== 'diff') continue;
        const r = rel(item.path);
        if (r === 'assets/js/app-router.js') apply(r, item.oldText, item.newText);
    }
}

const full = files.get('assets/js/app-router.js') || '';
const start = full.indexOf('const BLOG_POSTS');
const end = full.indexOf('function initNotifications');
if (start !== -1 && end !== -1) {
    const chunk = full.slice(start, end);
    fs.writeFileSync('C:/Users/ADMIN/OneDrive/Apps/namvio-ecosystem-app/scripts/_patch-blogs-js.txt', chunk);
    console.log('Extracted blogs js', chunk.length);
} else {
    console.log('BLOG_POSTS not found, has initBlogs', full.includes('initBlogs'));
}