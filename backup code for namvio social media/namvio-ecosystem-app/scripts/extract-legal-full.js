/**
 * Extract complete Legal Center from session transcript.
 */
const fs = require('fs');
const path = require('path');

const sessionPath =
    'C:/Users/ADMIN/.grok/sessions/C%3A%5CUsers%5CADMIN%5COneDrive%5CApps/019e93da-82db-71d2-b0fc-0e4a46a3adb2/updates.jsonl';
const outDir = __dirname;

const lines = fs.readFileSync(sessionPath, 'utf8').split('\n');

let bestIndexHtml = '';
let bestCssPatch = null;
let bestCssOld = '';

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    try {
        const obj = JSON.parse(line);
        const content = obj?.params?.update?.content;
        if (!Array.isArray(content)) continue;

        for (const item of content) {
            const p = (item.path || '').replace(/\\/g, '/');
            if (item.type === 'diff' && p.endsWith('index.html')) {
                const nt = item.newText || '';
                const has30 = nt.includes('heading30') || nt.includes('collapse30');
                const hasLegal = nt.includes('view-legal') && nt.includes('legal-accordion');
                if (hasLegal && has30 && nt.length > bestIndexHtml.length) {
                    bestIndexHtml = nt;
                    console.log('index snapshot line', i + 1, 'len', nt.length);
                }
            }
            if (item.type === 'diff' && p.endsWith('custom-style.css')) {
                const nt = item.newText || '';
                if (nt.includes('lg-page-hero') && nt.includes('lg-kpi-card')) {
                    bestCssPatch = nt;
                    bestCssOld = item.oldText || '';
                    console.log('css patch line', i + 1);
                }
            }
        }
    } catch (_) {
        /* skip */
    }
}

// Replay all index.html writes up to cutoff to rebuild file
if (!bestIndexHtml.includes('heading30')) {
    const CUTOFF = 1780794800; // after legal was added
    const marker = 'namvio-ecosystem-app/';
    let html = '';
    for (const line of lines) {
        if (!line.trim()) continue;
        try {
            const obj = JSON.parse(line);
            if ((obj.timestamp || 0) > CUTOFF) continue;
            const content = obj?.params?.update?.content;
            if (!Array.isArray(content)) continue;
            for (const item of content) {
                const p = (item.path || '').replace(/\\/g, '/');
                if (!p.includes(marker + 'index.html')) continue;
                if (item.type === 'diff' && item.newText) {
                    if (!html && item.oldText === null) html = item.newText;
                    else if (html && item.oldText && html.includes(item.oldText.slice(0, 80))) {
                        html = html.replace(item.oldText, item.newText);
                    } else if (item.newText.includes('heading30')) {
                        html = item.newText; // full file snapshot
                    }
                }
            }
        } catch (_) {
            /* skip */
        }
    }
    if (html.includes('heading30')) {
        bestIndexHtml = html;
        console.log('replayed index.html len', html.length);
    }
}

if (!bestIndexHtml.includes('legal-accordion')) {
    console.error('Failed to recover legal center HTML');
    process.exit(1);
}

const viewStart = bestIndexHtml.indexOf('<!-- Legal Center -->');
let viewEnd = bestIndexHtml.indexOf('<!-- Market Pulse -->', viewStart);
if (viewEnd < 0) viewEnd = bestIndexHtml.indexOf('<div id="view-market-pulse"', viewStart);
if (viewEnd < 0) viewEnd = bestIndexHtml.indexOf('<div id="view-mesages"', viewStart);
const viewBlock = bestIndexHtml.slice(viewStart, viewEnd).trim();

const accStart = viewBlock.indexOf('<!-- 1. Terms of Service -->');
const accEnd = viewBlock.indexOf('lg-accordion-foot');
let accordion = viewBlock.slice(accStart, accEnd > accStart ? accEnd : undefined).trim();

const cards = (accordion.match(/id="heading\d+"/g) || []).length;

fs.writeFileSync(path.join(outDir, '_patch-legal-view.txt'), viewBlock, 'utf8');
fs.writeFileSync(path.join(outDir, '_patch-legal-accordion.txt'), accordion, 'utf8');
if (bestCssPatch) {
    fs.writeFileSync(
        path.join(outDir, '_patch-legal-css-meta.json'),
        JSON.stringify({ oldText: bestCssOld, newText: bestCssPatch }, null, 2),
        'utf8'
    );
}

console.log('Policies found:', cards);
console.log('View block written, chars:', viewBlock.length);