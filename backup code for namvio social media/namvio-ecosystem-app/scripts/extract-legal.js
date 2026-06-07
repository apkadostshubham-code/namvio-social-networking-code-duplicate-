/**
 * Extract full Legal Center accordion HTML from session transcript.
 */
const fs = require('fs');
const path = require('path');

const sessionPath =
    'C:/Users/ADMIN/.grok/sessions/C%3A%5CUsers%5CADMIN%5COneDrive%5CApps/019e93da-82db-71d2-b0fc-0e4a46a3adb2/updates.jsonl';
const outPath = path.join(__dirname, '_patch-legal-accordion.txt');
const END_MARKERS = ['<!-- Market Pulse -->', '<div id="view-market-pulse"', '<div id="view-mesages"'];

const lines = fs.readFileSync(sessionPath, 'utf8').split('\n');
let bestHtml = '';
let bestSource = '';

function tryExtract(obj) {
    const content = obj?.params?.update?.content;
    if (!Array.isArray(content)) return '';
    for (const item of content) {
        if (item.type === 'diff' && item.newText && item.newText.includes('legal-accordion')) {
            return item.newText;
        }
        const text = item?.content?.text || '';
        if (text.includes('legal-accordion') && text.includes('<!-- 1. Terms of Service -->')) {
            const start = text.indexOf('<!-- 1. Terms of Service -->');
            const endMarkers = END_MARKERS;
            let end = text.length;
            for (const m of endMarkers) {
                const i = text.indexOf(m, start);
                if (i > start) end = Math.min(end, i);
            }
            return text.slice(start, end).trim();
        }
    }
    return '';
}

for (const line of lines) {
    if (!line.includes('legal-accordion') || !line.includes('Terms of Service')) continue;
    try {
        const obj = JSON.parse(line);
        const html = tryExtract(obj);
        if (html.length > bestHtml.length) {
            bestHtml = html;
            bestSource = 'line ' + (lines.indexOf(line) + 1);
        }
    } catch (_) {
        /* skip */
    }
}

// Fallback: scan index snapshots in transcript for largest legal block
if (bestHtml.length < 500) {
    for (const line of lines) {
        if (!line.includes('heading30') && !line.includes('30. Platform')) continue;
        try {
            const obj = JSON.parse(line);
            const text = obj?.params?.update?.content?.[0]?.content?.text || '';
            const start = text.indexOf('<!-- 1. Terms of Service -->');
            if (start < 0) continue;
            let end = -1;
            for (const marker of END_MARKERS) {
                const i = text.indexOf(marker, start);
                if (i > start) end = end < 0 ? i : Math.min(end, i);
            }
            if (end < 0) continue;
            const chunk = text.slice(start, end).trim();
            if (chunk.length > bestHtml.length) {
                bestHtml = chunk;
                bestSource = 'snapshot line ' + (lines.indexOf(line) + 1);
            }
        } catch (_) {
            /* skip */
        }
    }
}

if (!bestHtml) {
    console.error('No legal accordion found in transcript');
    process.exit(1);
}

// If we got full view-legal diff, extract just accordion inner cards
const accordionStart = bestHtml.indexOf('<!-- 1. Terms of Service -->');
if (accordionStart >= 0) {
    let inner = bestHtml.slice(accordionStart);
    const footIdx = inner.indexOf('lg-accordion-foot');
    let cut = inner.length;
    if (footIdx > 0) cut = Math.min(cut, footIdx);
    for (const marker of END_MARKERS) {
        const i = inner.indexOf(marker);
        if (i > 0) cut = Math.min(cut, i);
    }
    inner = inner.slice(0, cut).trim();
    // Remove trailing closing divs from accordion shell
    inner = inner.replace(/\s*<\/div>\s*<\/div>\s*<\/div>\s*$/, '').trim();
    bestHtml = inner;
}

const cardCount = (bestHtml.match(/class="card mb-1"/g) || []).length;
fs.writeFileSync(outPath, bestHtml, 'utf8');
console.log('Source:', bestSource);
console.log('Written:', outPath);
console.log('Chars:', bestHtml.length, '| Cards:', cardCount);