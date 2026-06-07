const fs = require('fs');
const root = 'C:/Users/ADMIN/OneDrive/Apps/namvio-ecosystem-app';
const html = fs.readFileSync(`${root}/index.html`, 'utf8');
const router = fs.readFileSync(`${root}/assets/js/app-router.js`, 'utf8');
const css = fs.readFileSync(`${root}/assets/css/custom-style.css`, 'utf8');
const scripts = [...html.matchAll(/<script src="assets\/js\/([^"]+)"/g)].map((m) => m[1]);

console.log('=== 5:20 AM snapshot ===');
console.log('index.html:', html.length);
console.log('css:', css.length);
console.log('router:', router.length);
console.log('scripts:', scripts.join(', '));
console.log('features:', {
    chats: html.includes('view-chats'),
    chatHero: html.includes('chat-page-hero'),
    netHero: html.includes('net-page-hero'),
    motion: html.includes('motion-graphics'),
    ambient: html.includes('nv-ambient'),
    feedHero: html.includes('nv-feed-hero'),
    rightSidebar: html.includes('desktop-sidebar'),
    legal: html.includes('view-legal'),
    cache: (html.match(/v=(\d+)/) || [])[1]
});
console.log('router:', {
    motion: router.includes('NamvioMotion'),
    marketplace: router.includes('initMarketplace'),
    chatSystem: router.includes('NamvioChat')
});