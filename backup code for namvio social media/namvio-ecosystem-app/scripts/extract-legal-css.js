const fs = require('fs');
const path = require('path');

const sessionPath =
    'C:/Users/ADMIN/.grok/sessions/C%3A%5CUsers%5CADMIN%5COneDrive%5CApps/019e93da-82db-71d2-b0fc-0e4a46a3adb2/updates.jsonl';
const lines = fs.readFileSync(sessionPath, 'utf8').split('\n');

for (const line of lines) {
    if (!line.includes('lg-page-hero') || !line.includes('custom-style.css')) continue;
    try {
        const obj = JSON.parse(line);
        const content = obj?.params?.update?.content || obj?.params?.update?.update?.content;
        if (!Array.isArray(content)) continue;
        for (const item of content) {
            if (item.newText && item.newText.includes('.lg-page-hero {')) {
                fs.writeFileSync(
                    path.join(__dirname, '_patch-legal-css-meta.json'),
                    JSON.stringify({ oldText: item.oldText, newText: item.newText }, null, 2),
                    'utf8'
                );
                console.log('CSS patch saved, len', item.newText.length);
                process.exit(0);
            }
        }
    } catch (_) {
        /* skip */
    }
}
console.error('CSS not found');
process.exit(1);