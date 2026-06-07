const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const router = fs.readFileSync(path.join(ROOT, 'assets/js/app-router.js'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'assets/css/custom-style.css'), 'utf8');

const viewIds = [...html.matchAll(/id="(view-[^"]+)"/g)].map((m) => m[1]);
const viewCounts = {};
viewIds.forEach((id) => { viewCounts[id] = (viewCounts[id] || 0) + 1; });
const dupViews = Object.entries(viewCounts).filter(([, c]) => c > 1);

const cacheMatch = html.match(/\?v=(\d{8})/g) || [];
const cacheVersions = [...new Set(cacheMatch.map((x) => x.replace('?v=', '')))];

const checks = {
    cache_unified: cacheVersions.length <= 1,
    cache_versions: cacheVersions,
    views_unique: dupViews.length === 0,
    view_count: Object.keys(viewCounts).length,
    legal30: (html.match(/id="heading\d+"/g) || []).length >= 30,
    trending_sidebar: html.includes('trending-keywords-box'),
    domain_sales_sidebar: html.includes('recent-domain-sales-box'),
    domain_sales_shell: html.includes('nv-domain-sales-shell'),
    mesages_view: html.includes('view-mesages'),
    trending_css: css.includes('.trending-keyword-row'),
    sales_css: css.includes('.recent-sale-row'),
    chat_removed: !html.includes('view-chats') && !router.includes('chat-system.js'),
    seeds: router.includes('SEED_POSTS') && router.includes('SEED_ACCOUNTS'),
    marketplace: html.includes('mp-listings-grid'),
    networking: html.includes('net-kpi-row'),
    left_menu: html.includes('nv-sidebar-nav-host') || html.includes('side-menu-list'),
    sponsor: html.includes('nv-network-sponsors-sidebar')
};

console.log('=== June 5 9:35 PM Restore Verification ===');
console.log(JSON.stringify(checks, null, 2));
if (dupViews.length) console.log('Duplicate views:', dupViews.map(([k, c]) => k + ' x' + c).join(', '));
const fail = Object.entries(checks).filter(([, v]) => !v).map(([k]) => k);
if (fail.length) {
    console.error('FAILED:', fail.join(', '));
    process.exit(1);
}
console.log('ALL OK —', Object.keys(viewCounts).length, 'views, cache', cacheVersions.join('|') || 'none');