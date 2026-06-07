const fs = require('fs');
const sessionPath =
    'C:/Users/ADMIN/.grok/sessions/C%3A%5CUsers%5CADMIN%5COneDrive%5CApps/019e93da-82db-71d2-b0fc-0e4a46a3adb2/updates.jsonl';
const lines = fs.readFileSync(sessionPath, 'utf8').split('\n');
const outDir = __dirname;

function rel(p) {
    if (!p) return null;
    const n = p.replace(/\\/g, '/');
    const i = n.toLowerCase().indexOf('namvio-ecosystem-app');
    if (i === -1) return null;
    return n.slice(i + 'namvio-ecosystem-app'.length).replace(/^\/+/, '');
}

function apply(files, relPath, oldText, newText) {
    if (oldText === null || oldText === '') {
        files.set(relPath, newText ?? '');
        return;
    }
    if (!files.has(relPath)) return;
    const cur = files.get(relPath);
    const idx = cur.indexOf(oldText);
    if (idx === -1) return;
    files.set(relPath, cur.slice(0, idx) + (newText ?? '') + cur.slice(idx + oldText.length));
}

const files = new Map();
const CUTOFF = 1780794725;

for (const line of lines) {
    let raw;
    try {
        raw = JSON.parse(line);
    } catch {
        continue;
    }
    if (raw.timestamp >= CUTOFF) continue;
    const u = raw.params?.update || {};
    const inner = u.update || u;

    if (u.sessionUpdate === 'tool_call' && u.title === 'Write' && u.rawInput?.contents) {
        const r = rel(u.rawInput.path);
        if (r) files.set(r, u.rawInput.contents);
    }

    if (inner.status !== 'completed' && u.status !== 'completed') continue;
    const content = inner.content || u.content;
    if (!Array.isArray(content)) continue;
    for (const item of content) {
        if (item.type !== 'diff') continue;
        const r = rel(item.path);
        if (!r) continue;
        apply(files, r, item.oldText, item.newText);
    }
}

const router = files.get('assets/js/app-router.js') || '';
const html = files.get('index.html') || '';

console.log('router len', router.length, 'initBlogs', router.includes('function initBlogs'));
console.log('html len', html.length, 'view-blogs', html.includes('view-blogs'));

const blogStart = router.indexOf('const BLOG_POSTS');
const blogEnd = router.indexOf('function initNotifications');
if (blogStart !== -1 && blogEnd !== -1) {
    const chunk = router.slice(blogStart, blogEnd);
    fs.writeFileSync(`${outDir}/_patch-blogs-js.txt`, chunk);
    console.log('Wrote _patch-blogs-js.txt', chunk.length);
} else {
    const alt = router.indexOf('function initBlogs');
    if (alt !== -1) {
        const end = router.indexOf('\nfunction ', alt + 1);
        fs.writeFileSync(`${outDir}/_patch-blogs-js.txt`, router.slice(alt - 200, end > alt ? end : alt + 8000));
        console.log('Wrote initBlogs slice');
    }
}

const htmlIdx = html.indexOf('view-blogs');
if (htmlIdx !== -1) {
    const start = html.lastIndexOf('<!--', htmlIdx);
    const end = html.indexOf('<!-- Legal', htmlIdx);
    const block = html.slice(start, end > start ? end : htmlIdx + 4000);
    fs.writeFileSync(`${outDir}/_patch-blogs-html.txt`, block);
    console.log('Wrote _patch-blogs-html.txt', block.length);
}