/**
 * Restore namvio-ecosystem-app to state before a Unix timestamp cutoff.
 * Usage: node restore-at-cutoff.js <unix_ts> [cache_version]
 */
const fs = require('fs');
const path = require('path');

const CUTOFF = Number(process.argv[2] || 1780789800);
const CACHE = process.argv[3] || '20260607';
const sessionPath =
    'C:/Users/ADMIN/.grok/sessions/C%3A%5CUsers%5CADMIN%5COneDrive%5CApps/019e93da-82db-71d2-b0fc-0e4a46a3adb2/updates.jsonl';
const root = 'C:/Users/ADMIN/OneDrive/Apps/namvio-ecosystem-app';
const marker = 'namvio-ecosystem-app';

// Features added AFTER these timestamps — do NOT inject if cutoff is earlier
const FEAT = {
    motion: 1780791395,      // 5:46 AM — NamvioMotion.onRouteChange
    marketplace: 1780792752, // 6:09 AM — initMarketplace
    feedRefresh: 1780675634  // earlier session day — always on by 5:20
};

console.log('Target:', new Date(CUTOFF * 1000).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));

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

for (let pass = 0; pass < 3; pass++) {
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
            applyDiff(rel, item.oldText, item.newText);
        }

        if (toolCall?.title === 'Delete') {
            const rel = relFromPath(toolCall.rawInput?.path || '');
            if (rel) files.delete(rel);
        }
    }
}

for (const [rel, text] of files) {
    const out = path.join(root, rel);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, text);
}

let router = files.get('assets/js/app-router.js') || fs.readFileSync(path.join(root, 'assets/js/app-router.js'), 'utf8');

if (CUTOFF > FEAT.feedRefresh && !router.includes('refreshSidebarMarketWidgets')) {
    // feed refresh existed long before 5:20
}

if (CUTOFF >= FEAT.motion && !router.includes('NamvioMotion.onRouteChange')) {
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

if (CUTOFF >= FEAT.marketplace && !router.includes('function initMarketplace')) {
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
    router = router.replace(
        /function formatTrendingPrice\(n\) \{/,
        `function initMarketplace() {
    if (window.NamvioListings) NamvioListings.init();
}

function formatTrendingPrice(n) {`
    );
    router = router.replace(
        /if \(viewId === 'hof'\) initHallOfFame\(\);/,
        `if (viewId === 'hof') initHallOfFame();
    if (viewId === 'marketplace') initMarketplace();`
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

let html = files.get('index.html') || fs.readFileSync(path.join(root, 'index.html'), 'utf8');
html = html.replace(/custom-style\.css\?v=\d+/g, `custom-style.css?v=${CACHE}`);
html = html.replace(/motion-graphics\.css\?v=\d+/g, `motion-graphics.css?v=${CACHE}`);
html = html.replace(/assets\/js\/([a-z0-9-]+)\.js(\?v=\d+)?/g, `assets/js/$1.js?v=${CACHE}`);
fs.writeFileSync(path.join(root, 'index.html'), html);

const css = fs.readFileSync(path.join(root, 'assets/css/custom-style.css'), 'utf8');
console.log('\n=== Restore complete ===');
console.log('index.html:', html.length, {
    chats: html.includes('view-chats'),
    chatHero: html.includes('chat-page-hero'),
    netHero: html.includes('net-page-hero'),
    mpHero: html.includes('mp-page-hero'),
    hofHero: html.includes('hof-hero'),
    admin: html.includes('view-admin'),
    legal: html.includes('view-legal'),
    motion: html.includes('motion-graphics.css'),
    rightSidebar: html.includes('nv-right-sidebar')
});
console.log('custom-style.css:', css.length);
console.log('app-router.js:', router.length, {
    motion: router.includes('NamvioMotion.onRouteChange'),
    marketplace: router.includes('function initMarketplace')
});
console.log('cache:', CACHE);