const fs = require('fs');
const sessionPath =
    'C:/Users/ADMIN/.grok/sessions/C%3A%5CUsers%5CADMIN%5COneDrive%5CApps/019e93da-82db-71d2-b0fc-0e4a46a3adb2/updates.jsonl';
const lines = fs.readFileSync(sessionPath, 'utf8').split('\n');

function unescapeJsonFragment(s) {
    return s
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\');
}

const targets = [
    'view-blogs',
    'blogs-grid',
    'function initBlogs',
    'const BLOG_POSTS',
    'publishFakePost',
    'write-post-form',
    'blog-card',
    'nv-blog'
];

for (const line of lines) {
    let raw;
    try {
        raw = JSON.parse(line);
    } catch {
        continue;
    }
    if (raw.timestamp > 1780794725) continue;
    const blob = line;
    for (const t of targets) {
        if (!blob.includes(t)) continue;
        const idx = blob.indexOf(t);
        const frag = unescapeJsonFragment(blob.slice(Math.max(0, idx - 300), idx + 6000));
        if (frag.includes(t)) {
            const out = `--- ts ${raw.timestamp} marker ${t} ---\n${frag}\n\n`;
            fs.appendFileSync(`${__dirname}/_mined-blogs.txt`, out);
        }
    }
}

console.log('done, see _mined-blogs.txt');