const fs = require('fs');

const sessionPath =
    'C:/Users/ADMIN/.grok/sessions/C%3A%5CUsers%5CADMIN%5COneDrive%5CApps/019e93da-82db-71d2-b0fc-0e4a46a3adb2/updates.jsonl';
const CUTOFF = 1780794725;
const lines = fs.readFileSync(sessionPath, 'utf8').split('\n');
let best = null;

for (const line of lines) {
    if (!line.includes('app-router.js') || !line.includes('routeView')) continue;
    let raw;
    try {
        raw = JSON.parse(line);
    } catch {
        continue;
    }
    if (raw.timestamp >= CUTOFF) continue;
    const update = raw.params?.update || {};
    const inner = update.update || update;
    if (inner.status !== 'completed' && update.status !== 'completed') continue;
    const content = inner.content || update.content;
    if (!Array.isArray(content)) continue;
    for (const item of content) {
        if (!item.path?.includes('app-router.js') || item.type !== 'diff') continue;
        const nt = item.newText || '';
        if (!nt.includes('function routeView')) continue;
        const score =
            (nt.includes('NamvioMotion.onRouteChange') ? 10 : 0) +
            (nt.includes("viewId === 'feed'") ? 5 : 0) +
            (nt.includes("viewId === 'identity'") ? 5 : 0) +
            (nt.includes("viewId === 'admin'") ? 5 : 0) +
            (nt.includes('initMarketplace') ? 3 : 0) +
            nt.length / 1000;
        if (!best || score > best.score) {
            best = { ts: raw.timestamp, score, text: nt, len: nt.length };
        }
    }
}

if (!best) {
    console.log('No routeView snapshot');
    process.exit(1);
}
console.log('Best routeView patch ts', best.ts, 'score', best.score, 'len', best.len);
const start = best.text.indexOf('function routeView');
const end = best.text.indexOf('\nfunction ', start + 1);
console.log(best.text.slice(start, end > start ? end : start + 2500));