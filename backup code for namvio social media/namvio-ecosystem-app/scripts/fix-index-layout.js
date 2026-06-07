/**
 * Deduplicate view-* blocks and rebuild #dynamic-viewport-container in canonical order.
 */
const fs = require('fs');
const path = require('path');

const INDEX = path.join(__dirname, '..', 'index.html');
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const BACKUP = path.join(__dirname, '..', '_backup', `fix-layout-${stamp}.html`);

const html = fs.readFileSync(INDEX, 'utf8');

const PREFER_LAST = new Set(['view-admin']);
const ORDER = [
    'view-feed', 'view-identity', 'view-hof', 'view-networking', 'view-marketplace',
    'view-subscription', 'view-settings', 'view-blogs', 'view-admin', 'view-legal',
    'view-support', 'view-guide', 'view-rules', 'view-help',
    'view-market-pulse', 'view-mesages'
];

function findBlockEndBounded(source, start, maxEnd) {
    const tagEnd = source.indexOf('>', start) + 1;
    let depth = 1;
    let i = tagEnd;
    const openRe = /<div[\s>]/gi;
    const closeRe = /<\/div>/gi;
    while (depth > 0 && i < maxEnd) {
        openRe.lastIndex = i;
        closeRe.lastIndex = i;
        const o = openRe.exec(source);
        const c = closeRe.exec(source);
        if (!c || c.index >= maxEnd) break;
        if (o && o.index < c.index && o.index < maxEnd) {
            depth++;
            i = o.index + o[0].length;
        } else {
            depth--;
            i = c.index + c[0].length;
            if (depth === 0) return i;
        }
    }
    const fallback = source.lastIndexOf('</div>', maxEnd);
    if (fallback <= start) throw new Error('Cannot bound block at ' + start);
    return fallback + 6;
}

function findContainerBounds(source) {
    const open = source.indexOf('<div class="col-lg-6 col-md-12" id="dynamic-viewport-container">');
    if (open < 0) throw new Error('dynamic-viewport-container not found');
    const innerStart = source.indexOf('>', open) + 1;
    const rightSidebarIdx = source.indexOf('<!-- Right sidebar -->', open);
    if (rightSidebarIdx < 0) throw new Error('Right sidebar marker not found');
    const closeTagStart = source.lastIndexOf('</div>', rightSidebarIdx);
    if (closeTagStart <= innerStart) throw new Error('Container close not found');
    return { innerStart, closeTagStart };
}

const { innerStart, closeTagStart } = findContainerBounds(html);

const viewRe = /<div\s+id="(view-[^"]+)"[^>]*class="[^"]*nv-routing-view[^"]*"[^>]*>/g;
const matches = [];
let m;
while ((m = viewRe.exec(html)) !== null) {
    matches.push({ id: m[1], start: m.index });
}

const blocksById = {};
matches.forEach(({ id, start }, idx) => {
    const maxEnd = idx + 1 < matches.length ? matches[idx + 1].start : closeTagStart;
    const end = findBlockEndBounded(html, start, maxEnd);
    const block = html.slice(start, end);
    if (!blocksById[id]) blocksById[id] = [];
    blocksById[id].push({ block, len: block.length, start });
});

const winners = {};
Object.entries(blocksById).forEach(([id, blocks]) => {
    if (blocks.length === 1) {
        winners[id] = blocks[0].block;
        return;
    }
    let winner;
    if (PREFER_LAST.has(id)) {
        winner = blocks[blocks.length - 1];
        const longest = blocks.reduce((a, b) => (a.len > b.len ? a : b));
        if (longest.len > winner.len) winner = longest;
    } else {
        winner = blocks.reduce((a, b) => (a.len > b.len ? a : b));
    }
    winners[id] = winner.block;
    const nested = [...winner.block.matchAll(/id="(view-[^"]+)"/g)].map((x) => x[1]);
    console.log(`Dedup ${id}: ${blocks.length} blocks -> kept ${winner.len} chars (nested: ${nested.join(', ')})`);
});

const missing = ORDER.filter((id) => !winners[id]);
if (missing.length) {
    console.error('Missing views:', missing.join(', '));
    process.exit(1);
}

const inner = '\n\n                    ' + ORDER.map((id) => winners[id].trim()).join('\n\n                    ') + '\n\n                ';
const finalHtml = html.slice(0, innerStart) + inner + html.slice(closeTagStart);

fs.mkdirSync(path.dirname(BACKUP), { recursive: true });
fs.copyFileSync(INDEX, BACKUP);
fs.writeFileSync(INDEX, finalHtml, 'utf8');

const check = [...finalHtml.slice(innerStart, closeTagStart + inner.length - (closeTagStart - innerStart)).matchAll(/id="(view-[^"]+)"/g)];
const viewIds = [...inner.matchAll(/id="(view-[^"]+)"/g)].map((x) => x[1]);
console.log('Backup:', BACKUP);
console.log('Rebuilt container with', viewIds.length, 'top-level views:', viewIds.join(', '));