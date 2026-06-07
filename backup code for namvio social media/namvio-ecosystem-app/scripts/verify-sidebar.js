/**
 * Verify trending + domain sales sidebar can populate (data + HTML targets).
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

const checks = {
    rightSidebar: html.includes('id="nv-right-sidebar"'),
    trendingBox: html.includes('id="trending-keywords-box"'),
    salesBox: html.includes('id="recent-domain-sales-box"'),
    yearSelect: html.includes('id="domain-sales-year-select"'),
    domainSalesShell: html.includes('id="nv-domain-sales-shell"'),
    domainSalesKpi: html.includes('id="ds-kpi-grid"'),
    domainSalesTable: html.includes('id="domain-sales-full-tbody"'),
    domainSalesAnalyticsScript: html.includes('domain-sales-analytics.js'),
    namebioScript: html.includes('namebio-sales-data.js'),
    appRouter: html.includes('app-router.js'),
    customCss: /custom-style\.css(?:\\)?\?v=\d+/.test(html)
};

const window = {};
const ctx = vm.createContext({ window, console });
vm.runInContext(fs.readFileSync(path.join(ROOT, 'assets/js/namebio-sales-data.js'), 'utf8'), ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'assets/js/namebio-sales-by-year.js'), 'utf8'), ctx);

checks.namebioCount = (window.NAMEBIO_TOP_SALES || []).length;
checks.yearOptions = (window.DOMAIN_SALES_YEAR_OPTIONS || []).length;

const routerSrc = fs.readFileSync(path.join(ROOT, 'assets/js/app-router.js'), 'utf8');
const kwMatch = routerSrc.match(/const TRENDING_KEYWORDS = \[([\s\S]*?)\];/);
checks.trendingCount = kwMatch ? (kwMatch[1].match(/rank:/g) || []).length : 0;

const css = fs.readFileSync(path.join(ROOT, 'assets/css/custom-style.css'), 'utf8');
checks.trendingCss = css.includes('.trending-keyword-row');
checks.salesCss = css.includes('.recent-sale-row');
checks.sidebarDesktop = css.includes('#nv-right-sidebar') && css.includes('display: block !important');

console.log(JSON.stringify(checks, null, 2));
const ok = Object.entries(checks).every(([k, v]) => typeof v === 'boolean' ? v : v > 0);
process.exit(ok ? 0 : 1);