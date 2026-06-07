const fs = require('fs');
const sessionPath =
    'C:/Users/ADMIN/.grok/sessions/C%3A%5CUsers%5CADMIN%5COneDrive%5CApps/019e93da-82db-71d2-b0fc-0e4a46a3adb2/updates.jsonl';
const lines = fs.readFileSync(sessionPath, 'utf8').split('\n');
let bestHtml = null;
let bestJs = null;

for (const line of lines) {
    if (!line.includes('view-blogs') && !line.includes('initBlogs')) continue;
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
        if (item.type !== 'diff' || !item.path) continue;
        const nt = item.newText || '';
        if (item.path.includes('index.html') && nt.includes('view-blogs') && nt.includes('blogs-grid')) {
            if (!bestHtml || nt.length > bestHtml.len) bestHtml = { len: nt.length, text: nt, ts: raw.timestamp };
        }
        if (item.path.includes('app-router.js') && nt.includes('function initBlogs')) {
            if (!bestJs || nt.length > bestJs.len) bestJs = { len: nt.length, text: nt, ts: raw.timestamp };
        }
    }
}

if (bestHtml) {
    const start = bestHtml.text.indexOf('<!-- Namvio Blogs');
    const end = bestHtml.text.indexOf('<!-- Legal Center -->');
    const block = start !== -1 && end !== -1 ? bestHtml.text.slice(start, end).trim() : bestHtml.text.slice(0, 2000);
    fs.writeFileSync('C:/Users/ADMIN/OneDrive/Apps/namvio-ecosystem-app/scripts/_patch-blogs.txt', block);
    console.log('blogs html block', block.length, '@', bestHtml.ts);
} else console.log('no blogs html');

if (bestJs) {
    const s = bestJs.text.indexOf('function initBlogs');
    const e = bestJs.text.indexOf('\nfunction ', s + 5);
    console.log('initBlogs js chunk', bestJs.len, '@', bestJs.ts);
    console.log(bestJs.text.slice(s, e > s ? e : s + 1500));
}