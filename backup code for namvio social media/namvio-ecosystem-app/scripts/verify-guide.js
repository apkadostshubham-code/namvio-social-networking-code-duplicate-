const fs = require('fs');
const path = require('path');
const h = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

const checks = {
    guidePresent: h.includes('id="view-guide"'),
    rulesPresent: h.includes('id="view-rules"'),
    helpPresent: h.includes('id="view-help"'),
    supportPresent: h.includes('id="view-support"'),
    legalKept: h.includes('id="view-legal"'),
    supportScript: /support-namvio-system\.js(?:\\)?\?v=\d+/.test(h),
    docsScript: /docs-system\.js(?:\\)?\?v=\d+/.test(h)
};

console.log(JSON.stringify(checks, null, 2));
const ok = Object.values(checks).every(Boolean);
process.exit(ok ? 0 : 1);