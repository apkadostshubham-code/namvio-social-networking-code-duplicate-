/**
 * Boot-time JS syntax + symbol checks (no browser).
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

const scriptRe = /<script src="([^"]+\.js[^"]*)"><\/script>/g;
const scripts = [];
let m;
while ((m = scriptRe.exec(html))) {
    const src = m[1].split('?')[0];
    if (src.startsWith('assets/')) scripts.push(path.join(ROOT, src));
}

const errors = [];
const document = {
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => []
};
const window = { document, addEventListener: () => {}, innerWidth: 1024 };
const ctx = vm.createContext({
    window,
    document,
    console,
    localStorage: { getItem: () => null, setItem: () => {} },
    setTimeout,
    clearTimeout,
    requestAnimationFrame: (fn) => setTimeout(fn, 0)
});

for (const file of scripts) {
    if (!fs.existsSync(file)) {
        errors.push('missing file: ' + path.basename(file));
        continue;
    }
    const src = fs.readFileSync(file, 'utf8');
    try {
        vm.runInContext(src, ctx, { filename: file });
    } catch (e) {
        errors.push(path.basename(file) + ': ' + e.message);
    }
}

const router = fs.readFileSync(path.join(ROOT, 'assets/js/app-router.js'), 'utf8');
const requiredFns = [
    'routeView', 'initTrending', 'bootNamvio', 'initMarketPulse', 'initMesages', 'startMesageWith', 'initDomainSalesFullPage', 'openDomainSalesFullPage', 'syncInviteCodeUI', 'filterFeedSearch', 'handleSearchKey', 'executePostPublish', 'cancelSubscription'
];
for (const fn of requiredFns) {
    if (!router.includes('function ' + fn) && !router.includes('window.' + fn)) {
        errors.push('app-router missing: ' + fn);
    }
}

const docs = fs.readFileSync(path.join(ROOT, 'assets/js/docs-system.js'), 'utf8');
if (!docs.includes('initLegal')) {
    errors.push('docs-system missing initLegal');
}
if (!docs.includes('initGuide') || !docs.includes('initRules') || !docs.includes('initHelp')) {
    errors.push('docs-system missing guide/rules/help init');
}
const supportPath = path.join(ROOT, 'assets/js/support-namvio-system.js');
if (!fs.existsSync(supportPath)) {
    errors.push('missing support-namvio-system.js');
}

const css = fs.readFileSync(path.join(ROOT, 'assets/css/custom-style.css'), 'utf8');
if (css.includes('REMOVE_CORRUPT_MARKER')) errors.push('corrupt CSS marker still present');

console.log(JSON.stringify({ scripts: scripts.length, errors }, null, 2));
process.exit(errors.length ? 1 : 0);