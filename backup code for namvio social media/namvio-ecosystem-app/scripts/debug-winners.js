const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', '_backup', 'fix-layout-2026-06-07T02-29-29.html'), 'utf8');

function findBlockEnd(source, start) {
    const tagEnd = source.indexOf('>', start) + 1;
    let depth = 1;
    let i = tagEnd;
    const openRe = /<div[\s>]/gi;
    const closeRe = /<\/div>/gi;
    while (depth > 0 && i < source.length) {
        openRe.lastIndex = i;
        closeRe.lastIndex = i;
        const o = openRe.exec(source);
        const c = closeRe.exec(source);
        if (!c) throw new Error('Unclosed div at ' + start);
        if (o && o.index < c.index) {
            depth++;
            i = o.index + o[0].length;
        } else {
            depth--;
            i = c.index + c[0].length;
            if (depth === 0) return i;
        }
    }
    throw new Error('Block end not found at ' + start);
}

const viewRe = /<div\s+id="(view-[^"]+)"[^>]*class="[^"]*nv-routing-view[^"]*"[^>]*>/g;
const matches = [];
let m;
while ((m = viewRe.exec(html)) !== null) {
    matches.push({ id: m[1], start: m.index });
}

const blocksById = {};
matches.forEach(({ id, start }) => {
    const end = findBlockEnd(html, start);
    const block = html.slice(start, end);
    if (!blocksById[id]) blocksById[id] = [];
    blocksById[id].push({ block, len: block.length, start });
});

Object.entries(blocksById).forEach(([id, blocks]) => {
    console.log('\n' + id + ' (' + blocks.length + ' blocks):');
    blocks.forEach((b, i) => {
        const nested = [...b.block.matchAll(/id="(view-[^"]+)"/g)].map((x) => x[1]);
        console.log('  block', i + 1, 'len', b.len, 'start', b.start, 'nested views:', nested.join(', '));
    });
});