const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const router = fs.readFileSync(path.join(ROOT, 'assets/js/app-router.js'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'assets/css/custom-style.css'), 'utf8');

const checks = {
    profile_hero: html.includes('profile-hero-card'),
    profile_tabs: html.includes('profile-tab-btn'),
    profile_containers: html.includes('identity-verify-badges') && html.includes('identity-trust-wrap'),
    reputation_js: fs.existsSync(path.join(ROOT, 'assets/js/reputation-system.js')),
    moderation_js: fs.existsSync(path.join(ROOT, 'assets/js/moderation-system.js')),
    profile_js: fs.existsSync(path.join(ROOT, 'assets/js/profile-system.js')),
    hof_js: html.includes('hof-system.js'),
    support_views_present: html.includes('view-rules') && html.includes('view-guide') && html.includes('view-help') && html.includes('view-support'),
    admin_dashboard: html.includes('mod-reported-users-list') && html.includes('admin-rep-logs-list'),
    rep_wiring: router.includes("nvApplyRep('POST_CREATED'") && router.includes('submitPostComment'),
    rep_css: css.includes('.rep-tier-pill') && css.includes('.rep-progress-wrap'),
    mod_css: css.includes('.mod-risk-pill') && css.includes('.mod-queue-item'),
    css_clean: !css.includes('const fs = require('),
    comment_css: css.includes('.post-comment-item')
};

console.log('=== Namvio Systems Verification ===');
console.log(JSON.stringify(checks, null, 2));
const fail = Object.entries(checks).filter(([, v]) => !v).map(([k]) => k);
if (fail.length) {
    console.error('FAILED:', fail.join(', '));
    process.exit(1);
}
console.log('ALL SYSTEMS OK');