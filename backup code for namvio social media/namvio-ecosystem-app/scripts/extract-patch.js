const fs = require('fs');

const sessionPath =
    'C:/Users/ADMIN/.grok/sessions/C%3A%5CUsers%5CADMIN%5COneDrive%5CApps/019e93da-82db-71d2-b0fc-0e4a46a3adb2/updates.jsonl';
const lines = fs.readFileSync(sessionPath, 'utf8').split('\n');

const needle = process.argv[2] || 'view-legal';

for (const line of lines) {
    if (!line.includes('index.html') || !line.includes('completed')) continue;
    let raw;
    try {
        raw = JSON.parse(line);
    } catch {
        continue;
    }
    const update = raw.params?.update || {};
    const inner = update.update || update;
    if (inner.status !== 'completed' && update.status !== 'completed') continue;
    const content = inner.content || update.content;
    if (!Array.isArray(content)) continue;
    for (const item of content) {
        if (!item.path?.includes('index.html') || item.type !== 'diff') continue;
        const nt = item.newText || '';
        if (nt.includes(needle)) {
            console.log('--- ts', raw.timestamp, 'oldLen', (item.oldText || '').length, 'newLen', nt.length);
            const i = nt.indexOf(needle);
            console.log(nt.slice(Math.max(0, i - 200), i + 1200));
            console.log('---');
        }
    }
}