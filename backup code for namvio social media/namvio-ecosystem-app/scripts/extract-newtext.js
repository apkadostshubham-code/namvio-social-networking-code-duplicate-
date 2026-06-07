const fs = require('fs');

const sessionPath =
    'C:/Users/ADMIN/.grok/sessions/C%3A%5CUsers%5CADMIN%5COneDrive%5CApps/019e93da-82db-71d2-b0fc-0e4a46a3adb2/updates.jsonl';
const ts = Number(process.argv[2]);
const out = process.argv[3];
const needle = process.argv[4] || '';
const lines = fs.readFileSync(sessionPath, 'utf8').split('\n');

for (const line of lines) {
    if (!line.includes('index.html') || !line.includes('completed')) continue;
    let raw;
    try {
        raw = JSON.parse(line);
    } catch {
        continue;
    }
    if (raw.timestamp !== ts) continue;
    const update = raw.params?.update || {};
    const inner = update.update || update;
    const content = inner.content || update.content;
    if (!Array.isArray(content)) continue;
    for (const item of content) {
        if (!item.path?.includes('index.html') || item.type !== 'diff') continue;
        const nt = item.newText || '';
        if (needle && !nt.includes(needle)) continue;
        fs.writeFileSync(out, nt);
        console.log('Wrote', out, nt.length);
        process.exit(0);
    }
}
console.log('Not found');
process.exit(1);