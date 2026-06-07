const fs = require('fs');
const path = require('path');

const sessionPath =
    'C:/Users/ADMIN/.grok/sessions/C%3A%5CUsers%5CADMIN%5COneDrive%5CApps/019e93da-82db-71d2-b0fc-0e4a46a3adb2/updates.jsonl';
const cssPath = path.join(__dirname, '..', 'assets/css/custom-style.css');
const outPath = path.join(__dirname, '_patch-legal-css.txt');

const lines = fs.readFileSync(sessionPath, 'utf8').split('\n');
let cssNew = '';
let cssOld = '';

for (const line of lines) {
    if (!line.includes('lg-page-hero') || !line.includes('custom-style.css')) continue;
    try {
        const obj = JSON.parse(line);
        const content = obj?.params?.update?.content || obj?.params?.update?.update?.content;
        if (!Array.isArray(content)) continue;
        for (const item of content) {
            if (item.newText && item.newText.includes('.lg-page-hero {') && item.newText.length > cssNew.length) {
                cssNew = item.newText;
                cssOld = item.oldText || '';
            }
        }
    } catch (_) {
        /* skip */
    }
}

if (!cssNew) {
    console.error('CSS block not found');
    process.exit(1);
}

fs.writeFileSync(outPath, cssNew, 'utf8');
console.log('Extracted CSS chars:', cssNew.length);

let css = fs.readFileSync(cssPath, 'utf8');

// Remove accidental JS appended at end
const corruptIdx = css.indexOf('const fs = require(');
if (corruptIdx >= 0) {
    css = css.slice(0, corruptIdx).trimEnd() + '\n';
    console.log('Removed corrupted JS tail');
}

if (css.includes('.lg-page-hero {')) {
    console.log('lg CSS already in file');
} else if (cssOld && css.includes(cssOld)) {
    css = css.replace(cssOld, cssNew);
    console.log('Replaced old docs anchor with legal CSS');
} else {
    const anchor = '.upgrade-cta-card {';
    const idx = css.indexOf(anchor);
    if (idx < 0) {
        css += '\n\n' + cssNew;
    } else {
        css = css.slice(0, idx) + cssNew + '\n\n' + css.slice(idx);
    }
    console.log('Inserted legal CSS before upgrade-cta-card');
}

fs.writeFileSync(cssPath, css, 'utf8');
console.log('custom-style.css updated');