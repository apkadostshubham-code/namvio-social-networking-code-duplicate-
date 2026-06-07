const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

const viewIds = [...html.matchAll(/id="(view-[^"]+)"/g)].map((m) => m[1]);
const dupViews = viewIds.filter((id, i) => viewIds.indexOf(id) !== i);
const uniqueViews = [...new Set(viewIds)];

const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);
const missingScripts = scripts.filter((s) => {
    if (/^https?:\/\//i.test(s)) return false;
    const p = path.join(__dirname, '..', s.split('?')[0]);
    return !fs.existsSync(p);
});

const escapedCacheBust = /\\\?v=\d+/.test(html);

console.log(JSON.stringify({
    viewCount: uniqueViews.length,
    duplicateViews: [...new Set(dupViews)],
    missingScripts,
    escapedCacheBust,
    supportPagesPresent: html.includes('id="view-guide"') && html.includes('id="view-rules"') && html.includes('id="view-help"') && html.includes('id="view-support"'),
    hasLegalAccordion: html.includes('id="legal-accordion"')
}, null, 2));

const ok = !dupViews.length && !missingScripts.length && !escapedCacheBust;
process.exit(ok ? 0 : 1);