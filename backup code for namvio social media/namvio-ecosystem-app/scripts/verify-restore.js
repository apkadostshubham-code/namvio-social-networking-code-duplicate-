const fs = require('fs');
const root = 'C:/Users/ADMIN/OneDrive/Apps/namvio-ecosystem-app';

const html = fs.readFileSync(`${root}/index.html`, 'utf8');
const router = fs.readFileSync(`${root}/assets/js/app-router.js`, 'utf8');
const css = fs.readFileSync(`${root}/assets/css/custom-style.css`, 'utf8');

const scripts = [...html.matchAll(/<script src="assets\/js\/([^"]+)"/g)].map((m) => m[1]);
const dupes = scripts.filter((s, i) => scripts.indexOf(s) !== i);

console.log('index.html', html.length, 'bytes');
console.log('custom-style.css', css.length, 'bytes');
console.log('app-router.js', router.length, 'bytes');
console.log('script tags', scripts.length, 'duplicates', dupes.length);
console.log('views', {
    admin: html.includes('view-admin'),
    legal: html.includes('view-legal'),
    supportRemoved: !html.includes('view-guide') && !html.includes('view-rules') && !html.includes('view-help'),
    chats: html.includes('view-chats'),
    hof: html.includes('view-hof'),
    rightSidebar: html.includes('nv-right-sidebar')
});
console.log('router hooks', {
    motion: router.includes('NamvioMotion.onRouteChange'),
    feedRefresh: router.includes('refreshSidebarMarketWidgets'),
    marketplace: router.includes('function initMarketplace'),
    identity: router.includes("viewId === 'identity'")
});
console.log('cache', html.includes('20260652') ? '20260652' : 'other');