const fs = require('fs');
const p =
    'C:/Users/ADMIN/.grok/sessions/C%3A%5CUsers%5CADMIN%5COneDrive%5CApps/019e93da-82db-71d2-b0fc-0e4a46a3adb2/updates.jsonl';
let best = '';
for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    if (!line.includes('hof-hero') || !line.includes('view-hof')) continue;
    try {
        const raw = JSON.stringify(JSON.parse(line));
        const i = raw.indexOf('view-hof');
        if (i < 0) continue;
        const s = raw.slice(i, i + 15000);
        if (s.length > best.length) best = s;
    } catch (_) {}
}
best = best.replace(/\\n/g, '\n').replace(/\\"/g, '"');
const st = best.indexOf('<div id="view-hof');
const en = best.indexOf('<div id="view-networking');
const out = 'C:/Users/ADMIN/OneDrive/Apps/namvio-ecosystem-app/scripts/_hof-view-extract.html';
if (st >= 0 && en > st) {
    fs.writeFileSync(out, best.slice(st, en));
    console.log('written', en - st);
} else {
    console.log('not found', st, en);
}