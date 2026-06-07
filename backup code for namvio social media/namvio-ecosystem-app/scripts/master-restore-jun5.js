/**
 * Master restore: June 5, 2026 9:35 PM IST + all required features.
 * 1) Backup current files
 * 2) Replay transcript base (Jun 5 cutoff)
 * 3) Re-apply feature layers (legal, seeds, trending, listings, networking)
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const SCRIPTS = __dirname;
const CACHE = '20260605';
const CUTOFF = 1780675500;
const SESSION =
    'C:/Users/ADMIN/.grok/sessions/C%3A%5CUsers%5CADMIN%5COneDrive%5CApps/019e93da-82db-71d2-b0fc-0e4a46a3adb2/updates.jsonl';
const MARKER = 'namvio-ecosystem-app';

const BACKUP_KEYS = [
    'index.html',
    'assets/js/app-router.js',
    'assets/css/custom-style.css',
    'assets/js/docs-system.js',
    'assets/js/listings-system.js',
    'assets/js/networking-system.js',
    'assets/js/nav-system.js',
    'assets/js/sponsored-network.js'
];

function backup() {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const dir = path.join(ROOT, '_backup', `pre-jun5-master-${stamp}`);
    fs.mkdirSync(dir, { recursive: true });
    for (const rel of BACKUP_KEYS) {
        const src = path.join(ROOT, rel);
        if (fs.existsSync(src)) {
            const dest = path.join(dir, rel);
            fs.mkdirSync(path.dirname(dest), { recursive: true });
            fs.copyFileSync(src, dest);
        }
    }
    fs.writeFileSync(
        path.join(dir, 'RESTORE_INFO.txt'),
        `Backup before master Jun 5 9:35 PM restore\nTime: ${new Date().toISOString()}\nCutoff unix: ${CUTOFF}\n`,
        'utf8'
    );
    console.log('Backup ->', dir);
    return dir;
}

function replayTranscript() {
    const files = new Map();
    const lines = fs.readFileSync(SESSION, 'utf8').split('\n');

    function relFromPath(p) {
        if (!p) return null;
        const norm = p.replace(/\\/g, '/');
        const idx = norm.toLowerCase().indexOf(MARKER);
        if (idx === -1) return null;
        const rel = norm.slice(idx + MARKER.length).replace(/^\/+/, '');
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

    for (let pass = 0; pass < 4; pass++) {
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
        }
    }

    // Only replay JS/CSS modules — keep current index/router as base (richer state)
    const skipReplay = new Set(['index.html', 'assets/js/app-router.js']);
    for (const [rel, text] of files) {
        if (skipReplay.has(rel)) continue;
        const out = path.join(ROOT, rel);
        if (!fs.existsSync(path.dirname(out))) fs.mkdirSync(path.dirname(out), { recursive: true });
        fs.writeFileSync(out, text);
    }
    console.log('Transcript replay (excl. index + router):', files.size, 'files touched');
}

function ensureScript(html, file, afterPattern) {
    const tag = `<script src="assets/js/${file}?v=${CACHE}"></script>`;
    if (html.includes(file)) {
        return html.replace(new RegExp(`${file}\\?v=\\d+`), `${file}?v=${CACHE}`);
    }
    return html.replace(afterPattern, `$1\n    ${tag}`);
}

function patchIndex() {
    let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

    const marketplaceBlock = `                    <!-- Marketplace -->
                    <div id="view-marketplace" class="nv-routing-view d-none nv-marketplace-view">
                        <div class="mp-page-hero card-component mb-3">
                            <div class="mp-page-hero-glow" aria-hidden="true"></div>
                            <div class="mp-page-hero-body">
                                <div class="mp-page-hero-icon"><i class="fa-solid fa-store"></i></div>
                                <div>
                                    <p class="mp-page-hero-kicker mb-0">Premium names</p>
                                    <h5 class="mp-page-hero-title mb-1">Featured Listings</h5>
                                    <p class="mp-page-hero-desc mb-0">Buy, sell &amp; negotiate escrow-ready domains with verified members.</p>
                                </div>
                            </div>
                        </div>
                        <div class="row mp-kpi-row" id="mp-kpi-row"></div>
                        <div class="card-component p-3 mb-3">
                            <div id="mp-filters" class="mp-filters mb-3"></div>
                            <div class="mp-search-wrap">
                                <i class="fa-solid fa-magnifying-glass mp-search-icon"></i>
                                <input type="search" class="form-control form-control-sm mp-search-input" id="mp-search-input" placeholder="Search domain, seller or niche…" autocomplete="off">
                            </div>
                        </div>
                        <div id="mp-listings-grid"></div>
                    </div>`;

    html = html.replace(/<!-- Marketplace -->[\s\S]*?(?=<!-- Subscriptions -->)/, marketplaceBlock + '\n\n');

    // Networking KPI + filters shell
    if (!html.includes('id="net-kpi-row"')) {
        html = html.replace(
            /<div id="nv-network-sponsors-main" class="mb-3"><\/div>/,
            `<div id="nv-network-sponsors-main" class="mb-3"></div>

                        <div class="row net-kpi-row mb-3" id="net-kpi-row"></div>
                        <div class="card-component p-3 mb-3">
                            <div id="net-filters" class="net-filters mb-3"></div>`
        );
        html = html.replace(
            /<div class="card-component p-4 mb-3">\s*<div class="d-flex justify-content-between align-items-center flex-wrap mb-3" style="gap:8px;">\s*<h6 class="font-weight-bold text-dark mb-0">Suggested connections<\/h6>/,
            `<div class="card-component p-4 mb-3">
                            <div class="d-flex justify-content-between align-items-center flex-wrap mb-3" style="gap:8px;">
                                <h6 class="font-weight-bold text-dark mb-0">Suggested connections</h6>`
        );
    }

    if (!html.includes('networking-events-list')) {
        html = html.replace(
            /<div id="networking-members-grid"><\/div>\s*<\/div>\s*<\/div>\s*<!-- Marketplace -->/,
            `<div id="networking-members-grid"></div>
                        </div>

                        <div class="card-component p-4 mb-3">
                            <h6 class="font-weight-bold text-dark mb-3"><i class="fa-solid fa-calendar-days mr-2 text-primary"></i>Upcoming events</h6>
                            <div id="networking-events-list"></div>
                        </div>
                    </div>

                    <!-- Marketplace -->`
        );
    }

    // Scripts
    const scriptChain = [
        ['listings-system.js', /(<script src="assets\/js\/domain-sales-analytics\.js\?v=\d+"><\/script>)/],
        ['networking-system.js', /(<script src="assets\/js\/listings-system\.js\?v=\d+"><\/script>)/],
        ['moderation-system.js', /(<script src="assets\/js\/profile-system\.js\?v=\d+"><\/script>)/]
    ];
    for (const [file, pat] of scriptChain) {
        html = ensureScript(html, file, pat);
    }

    html = html.replace(/custom-style\.css\?v=\d+/g, `custom-style.css?v=${CACHE}`);
    html = html.replace(/assets\/js\/([a-z0-9-]+)\.js\?v=\d+/g, `assets/js/$1.js?v=${CACHE}`);

    fs.writeFileSync(path.join(ROOT, 'index.html'), html, 'utf8');
    console.log('index.html patched (marketplace, networking, scripts)');
}

function patchRouter() {
    let router = fs.readFileSync(path.join(ROOT, 'assets/js/app-router.js'), 'utf8');

    if (!router.includes('const NETWORKING_EVENTS')) {
        router = router.replace(
            'const NETWORKING_MEMBERS = SEED_ACCOUNTS;',
            `const NETWORKING_EVENTS = [
    { title: 'Broker Roundtable: Q2 .io liquidity', when: 'Jun 12, 2026', type: 'Virtual', attendees: 48 },
    { title: 'AI Domain Appraisal Workshop', when: 'Jun 18, 2026', type: 'Hybrid', attendees: 72 },
    { title: 'Registrar Renewal Promo AMA', when: 'Jun 25, 2026', type: 'Live', attendees: 31 }
];

const NETWORKING_MEMBERS = SEED_ACCOUNTS;`
        );
    }

    if (!router.includes('function initMarketplace')) {
        router = router.replace(
            'function initNetworking() {',
            `function initMarketplace() {
    if (window.NamvioListings) NamvioListings.init();
}

function initNetworking() {`
        );
    }

    if (!router.includes('NamvioNetworking.init')) {
        router = router.replace(
            'function initNetworking() {\n    const grid = document.getElementById(\'networking-members-grid\');',
            `function initNetworking() {
    if (window.NamvioNetworking) {
        NamvioNetworking.init();
        const eventsList = document.getElementById('networking-events-list');
        if (eventsList && typeof NETWORKING_EVENTS !== 'undefined') {
            eventsList.innerHTML = NETWORKING_EVENTS.map(
                (ev) => \`
            <div class="network-event-row">
                <div class="flex-grow-1 min-width-0 pr-3">
                    <p class="font-weight-bold text-dark mb-1">\${escapeHtml(ev.title)}</p>
                    <p class="text-muted small mb-0"><i class="fa-regular fa-clock mr-1"></i>\${escapeHtml(ev.when)} · \${escapeHtml(ev.type)}</p>
                </div>
                <div class="text-right flex-shrink-0">
                    <span class="badge badge-light border font-weight-bold">\${ev.attendees} going</span>
                    <button type="button" class="btn btn-sm btn-outline-primary font-weight-bold mt-2 d-block ml-auto"
                            onclick="rsvpNetworkingEvent(this)">RSVP</button>
                </div>
            </div>\`
            ).join('');
        }
        return;
    }

    const grid = document.getElementById('networking-members-grid');`
        );
    }

    if (!router.includes("viewId === 'marketplace'")) {
        router = router.replace(
            /if \(viewId === 'networking'\) initNetworking\(\);/,
            `if (viewId === 'marketplace') initMarketplace();
    if (viewId === 'networking') initNetworking();`
        );
    }

    if (!router.includes('window.initMarketplace')) {
        router = router.replace(
            'window.initNetworking = initNetworking;',
            'window.initMarketplace = initMarketplace;\n    window.initNetworking = initNetworking;'
        );
    }

    if (!router.includes('NamvioNav.init')) {
        router = router.replace(
            /if \(window\.NamvioNav\) NamvioNav\.init\(\);/,
            `if (window.NamvioNav) NamvioNav.init();`
        );
    }

    fs.writeFileSync(path.join(ROOT, 'assets/js/app-router.js'), router, 'utf8');
    console.log('app-router.js patched (seeds kept, marketplace, networking)');
}

function patchCss() {
    let css = fs.readFileSync(path.join(ROOT, 'assets/css/custom-style.css'), 'utf8');

    const mpCss = `
/* Marketplace listings */
.mp-page-hero { position:relative; overflow:hidden; border:1px solid rgba(79,70,229,0.14); background:linear-gradient(125deg,rgba(79,70,229,0.1) 0%,#fff 50%,rgba(16,185,129,0.06) 100%); padding:18px 20px; }
.mp-page-hero-glow { position:absolute; top:-40%; right:-8%; width:180px; height:180px; border-radius:50%; background:radial-gradient(circle,rgba(79,70,229,0.2) 0%,transparent 68%); pointer-events:none; }
.mp-page-hero-body { position:relative; display:flex; align-items:flex-start; gap:14px; z-index:1; }
.mp-page-hero-icon { width:48px; height:48px; border-radius:14px; display:flex; align-items:center; justify-content:center; font-size:20px; color:var(--nv-primary); background:rgba(255,255,255,0.9); border:1px solid rgba(79,70,229,0.2); flex-shrink:0; }
.mp-page-hero-kicker { font-size:10px; font-weight:800; letter-spacing:0.55px; text-transform:uppercase; color:var(--nv-primary); }
.mp-page-hero-title { font-size:18px; font-weight:800; color:var(--nv-text-dark); }
.mp-page-hero-desc { font-size:13px; color:var(--nv-text-muted); }
.mp-kpi-row { margin-bottom:14px; }
.mp-kpi { display:flex; flex-wrap:wrap; gap:8px; }
.mp-kpi-card { background:#fff; border:1px solid var(--nv-border); border-radius:10px; padding:12px 14px; flex:1; min-width:120px; }
.mp-kpi-value { display:block; font-size:16px; font-weight:800; color:var(--nv-primary); }
.mp-kpi-label { font-size:10px; font-weight:700; text-transform:uppercase; color:var(--nv-text-muted); }
.mp-filters { display:flex; flex-wrap:wrap; gap:6px; }
.mp-filter-btn { border:1px solid var(--nv-border); background:#fff; color:var(--nv-text-muted); font-size:10px; font-weight:700; padding:5px 10px; border-radius:999px; cursor:pointer; }
.mp-filter-btn.active, .mp-filter-btn:hover { background:var(--nv-primary-light); border-color:var(--nv-primary); color:var(--nv-primary); }
.mp-search-wrap { position:relative; }
.mp-search-icon { position:absolute; left:12px; top:50%; transform:translateY(-50%); font-size:11px; color:var(--nv-text-muted); }
.mp-search-input { padding-left:32px !important; border-radius:999px !important; }
.mp-listing-grid { display:grid; grid-template-columns:1fr; gap:12px; }
@media (min-width:768px) { .mp-listing-grid { grid-template-columns:1fr 1fr; } }
.mp-listing-card { position:relative; border:1px solid var(--nv-border); border-radius:12px; padding:16px; background:#fff; overflow:hidden; transition:border-color 0.2s, box-shadow 0.2s; }
.mp-listing-card:hover { border-color:rgba(79,70,229,0.25); box-shadow:0 8px 24px rgba(79,70,229,0.08); }
.mp-listing-card--featured { border-color:rgba(217,119,6,0.35); }
.mp-featured-badge { display:inline-block; font-size:10px; font-weight:800; color:#b45309; background:#fffbeb; border:1px solid #fde68a; padding:2px 8px; border-radius:999px; margin-bottom:8px; }
.mp-listing-top { display:flex; justify-content:space-between; gap:12px; margin-bottom:10px; }
.mp-listing-price { display:block; font-size:18px; font-weight:800; color:var(--nv-text-dark); }
.mp-listing-meta, .mp-listing-age { font-size:11px; color:var(--nv-text-muted); }
.mp-listing-stats { display:flex; flex-wrap:wrap; gap:10px; font-size:11px; color:var(--nv-text-muted); margin-bottom:10px; }
.mp-escrow-tag { color:#047857; font-weight:700; }
.mp-listing-seller { display:flex; align-items:center; gap:8px; margin-bottom:12px; flex-wrap:wrap; }
.mp-listing-actions { display:flex; flex-wrap:wrap; gap:6px; }
.mp-cta-btn { background:var(--nv-primary) !important; border-color:var(--nv-primary) !important; }
.mp-empty { text-align:center; padding:40px 16px; color:var(--nv-text-muted); }

/* Networking enhanced */
.net-kpi-row { margin-bottom:0; }
.net-kpi { display:flex; flex-wrap:wrap; gap:8px; }
.net-kpi-card { background:#fff; border:1px solid var(--nv-border); border-radius:10px; padding:12px 14px; flex:1; min-width:110px; }
.net-kpi-value { display:block; font-size:15px; font-weight:800; color:var(--nv-primary); }
.net-kpi-label { font-size:10px; font-weight:700; text-transform:uppercase; color:var(--nv-text-muted); }
.net-filters { display:flex; flex-wrap:wrap; gap:6px; }
.net-filter-btn { border:1px solid var(--nv-border); background:#fff; color:var(--nv-text-muted); font-size:10px; font-weight:700; padding:5px 10px; border-radius:999px; cursor:pointer; }
.net-filter-btn.active, .net-filter-btn:hover { background:var(--nv-primary-light); border-color:var(--nv-primary); color:var(--nv-primary); }
.net-member-grid { display:grid; grid-template-columns:1fr; gap:12px; }
@media (min-width:768px) { .net-member-grid { grid-template-columns:1fr 1fr; } }
.net-member-card { border:1px solid var(--nv-border); border-radius:12px; padding:16px; background:#fff; transition:border-color 0.2s, box-shadow 0.2s; }
.net-member-card:hover { border-color:rgba(79,70,229,0.2); box-shadow:0 6px 20px rgba(79,70,229,0.06); }
.net-member-actions { display:flex; flex-wrap:wrap; gap:6px; }
.net-empty { text-align:center; padding:32px; color:var(--nv-text-muted); font-size:12px; }
.network-event-row { display:flex; align-items:center; padding:12px 0; border-bottom:1px solid var(--nv-border); }
.network-event-row:last-child { border-bottom:none; }
`;

    if (!css.includes('.mp-page-hero')) {
        css += '\n' + mpCss;
        console.log('Added marketplace + networking CSS');
    }

    fs.writeFileSync(path.join(ROOT, 'assets/css/custom-style.css'), css, 'utf8');
}

function runChild(name) {
    const p = path.join(SCRIPTS, name);
    if (!fs.existsSync(p)) return;
    try {
        execSync(`node "${p}"`, { stdio: 'inherit', cwd: SCRIPTS });
    } catch (e) {
        console.warn('Child script warning:', name, e.message);
    }
}

function verify() {
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    const router = fs.readFileSync(path.join(ROOT, 'assets/js/app-router.js'), 'utf8');
    const checks = {
        legal30: (html.match(/id="heading\d+"/g) || []).length >= 30,
        trending: html.includes('trending-keywords-box'),
        namebio: html.includes('namebio-sales-data.js'),
        marketPulse: html.includes('view-market-pulse'),
        seeds: router.includes('SEED_POSTS') && router.includes('SEED_ACCOUNTS'),
        listings: html.includes('mp-listings-grid') && router.includes('initMarketplace'),
        networking: html.includes('networking-members-grid') && router.includes('NETWORKING_EVENTS'),
        sidebar: html.includes('side-menu-list'),
        sponsor: html.includes('nv-network-sponsors-sidebar')
    };
    console.log('\n=== Verification ===');
    console.log(JSON.stringify(checks, null, 2));
    const fail = Object.entries(checks).filter(([, v]) => !v).map(([k]) => k);
    if (fail.length) console.warn('Missing:', fail.join(', '));
    else console.log('All checks passed.');
}

console.log('Target:', new Date(CUTOFF * 1000).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
backup();
replayTranscript();
patchIndex();
patchRouter();
patchCss();
runChild('restore-legal.js');
runChild('fix-index-layout.js');
runChild('verify-sidebar.js');

// Unify cache after child scripts
let htmlFinal = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
htmlFinal = htmlFinal.replace(/v=202606\d+/g, `v=${CACHE}`);
fs.writeFileSync(path.join(ROOT, 'index.html'), htmlFinal, 'utf8');

verify();
console.log('\nMaster restore complete. Cache:', CACHE);
console.log('Hard refresh: Ctrl+Shift+R | optional: localStorage.removeItem("namvio_session_v1")');