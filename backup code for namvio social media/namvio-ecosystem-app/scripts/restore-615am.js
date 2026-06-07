/**
 * Restore to June 7, 2026 6:15 AM IST (unix 1780793100)
 * Multi-pass transcript replay + post-fixes for patches that existed by 6:15.
 */
const fs = require('fs');
const path = require('path');

const CUTOFF = 1780793100;
const sessionPath =
    'C:/Users/ADMIN/.grok/sessions/C%3A%5CUsers%5CADMIN%5COneDrive%5CApps/019e93da-82db-71d2-b0fc-0e4a46a3adb2/updates.jsonl';
const root = 'C:/Users/ADMIN/OneDrive/Apps/namvio-ecosystem-app';
const marker = 'namvio-ecosystem-app';
const CACHE = '20260615';

const files = new Map();
const lines = fs.readFileSync(sessionPath, 'utf8').split('\n');

function relFromPath(p) {
    if (!p) return null;
    const norm = p.replace(/\\/g, '/');
    const idx = norm.toLowerCase().indexOf(marker);
    if (idx === -1) return null;
    const rel = norm.slice(idx + marker.length).replace(/^\/+/, '');
    if (!rel || rel.startsWith('scripts/') || rel.startsWith('_')) return null;
    return rel;
}

function applyDiff(rel, oldText, newText) {
    const nt = newText ?? '';
    if (oldText === null || oldText === '') {
        files.set(rel, nt);
        return true;
    }
    if (nt.startsWith('<!DOCTYPE') && nt.length > 15000) {
        files.set(rel, nt);
        return true;
    }
    if (!files.has(rel)) return false;
    const cur = files.get(rel);
    let idx = cur.indexOf(oldText);
    if (idx === -1 && oldText.length > 30) {
        const t = oldText.trim();
        idx = cur.indexOf(t);
        if (idx !== -1) {
            files.set(rel, cur.slice(0, idx) + nt + cur.slice(idx + t.length));
            return true;
        }
    }
    if (idx === -1) return false;
    files.set(rel, cur.slice(0, idx) + nt + cur.slice(idx + oldText.length));
    return true;
}

function processEvents(passLabel) {
    let applied = 0;
    let failed = 0;
    for (const line of lines) {
        if (!line.trim()) continue;
        let raw;
        try {
            raw = JSON.parse(line);
        } catch {
            continue;
        }
        if (raw.timestamp >= CUTOFF) continue;

        const update = raw.params?.update || {};
        const inner = update.update || update;
        const toolCall = inner.toolCall || update.toolCall;

        if (update.sessionUpdate === 'tool_call' && update.title === 'Write' && update.rawInput?.contents != null) {
            const rel = relFromPath(update.rawInput.path || '');
            if (rel) files.set(rel, update.rawInput.contents);
        }
        if (toolCall?.title === 'Write' && toolCall.rawInput?.contents != null) {
            const rel = relFromPath(toolCall.rawInput.path || '');
            if (rel) files.set(rel, toolCall.rawInput.contents);
        }

        if (inner.status !== 'completed' && update.status !== 'completed') continue;
        const content = inner.content || update.content;
        if (!Array.isArray(content)) continue;

        for (const item of content) {
            if (!item.path || item.type !== 'diff') continue;
            const rel = relFromPath(item.path);
            if (!rel) continue;
            if (applyDiff(rel, item.oldText, item.newText)) applied++;
            else if (item.oldText && item.oldText !== '') failed++;
        }

        if (toolCall?.title === 'Delete') {
            const rel = relFromPath(toolCall.rawInput?.path || '');
            if (rel) files.delete(rel);
        }
    }
    console.log(passLabel, 'applied', applied, 'failed', failed);
}

processEvents('pass-1');
processEvents('pass-2');
processEvents('pass-3');

for (const [rel, text] of files) {
    const out = path.join(root, rel);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, text);
}

// Post-fix app-router: features confirmed before 6:15 AM
let router = files.get('assets/js/app-router.js') || fs.readFileSync(path.join(root, 'assets/js/app-router.js'), 'utf8');

if (!router.includes('NamvioHof.init')) {
    router = router.replace(
        'function initHallOfFame() {\n    const tbody',
        `function initHallOfFame() {
    if (window.NamvioHof) {
        NamvioHof.init(activeSessionState);
        return;
    }

    const tbody`
    );
}

if (!router.includes('function initMarketplace')) {
    router = router.replace(
        /function formatTrendingPrice\(n\) \{/,
        `function initMarketplace() {
    if (window.NamvioListings) NamvioListings.init();
}

function formatTrendingPrice(n) {`
    );
}

if (!router.includes('NamvioMotion.onRouteChange')) {
    router = router.replace(
        /if \(viewId === 'chats'\) initChats\(\);\n\}/,
        `if (viewId === 'chats') initChats();

    if (viewId === 'feed') {
        const searchInput = document.getElementById('global-search');
        const q = searchInput ? searchInput.value : '';
        filterFeedSearch(q);
        refreshSidebarMarketWidgets();
    }

    if (window.NamvioMotion) NamvioMotion.onRouteChange(viewId);
}`
    );
}

if (!router.includes('window.refreshSidebarMarketWidgets')) {
    router = router.replace(
        /window\.connectNetworkingMember = connectNetworkingMember;/,
        `window.connectNetworkingMember = connectNetworkingMember;
    window.initTrending = initTrending;
    window.refreshSidebarMarketWidgets = refreshSidebarMarketWidgets;`
    );
}

fs.writeFileSync(path.join(root, 'assets/js/app-router.js'), router);

// Cache bust all HTML refs
let html = files.get('index.html') || fs.readFileSync(path.join(root, 'index.html'), 'utf8');
html = html.replace(/custom-style\.css\?v=\d+/g, `custom-style.css?v=${CACHE}`);
html = html.replace(/motion-graphics\.css\?v=\d+/g, `motion-graphics.css?v=${CACHE}`);
html = html.replace(/assets\/js\/([a-z0-9-]+)\.js(\?v=\d+)?/g, `assets/js/$1.js?v=${CACHE}`);
fs.writeFileSync(path.join(root, 'index.html'), html);

const idx = html;
const css = fs.readFileSync(path.join(root, 'assets/css/custom-style.css'), 'utf8');
console.log('\n=== Restored to 6:15 AM IST ===');
console.log('Cutoff unix:', CUTOFF);
console.log('index.html:', idx.length, {
    chats: idx.includes('view-chats'),
    networking: idx.includes('net-page-hero'),
    admin: idx.includes('view-admin'),
    legal: idx.includes('view-legal'),
    profileHero: idx.includes('profile-hero-card'),
    rightSidebar: idx.includes('nv-right-sidebar')
});
console.log('custom-style.css:', css.length);
console.log('app-router.js:', router.length, {
    motion: router.includes('NamvioMotion.onRouteChange'),
    marketplace: router.includes('function initMarketplace'),
    feedRefresh: router.includes('refreshSidebarMarketWidgets')
});
console.log('cache:', CACHE);