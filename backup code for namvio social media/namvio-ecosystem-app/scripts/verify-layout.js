const fs = require('fs');
const path = require('path');
const h = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

const rowOpen = h.indexOf('<div class="row">', h.indexOf('nv-app-layout'));
const rs = h.indexOf('<!-- Right sidebar -->', rowOpen);
const rowSlice = h.slice(rowOpen, rs + 200);
const cols = [...rowSlice.matchAll(/<div class="col-lg-\d+[^"]*"[^>]*>/g)].map((m) => m[0]);
console.log('Columns in app row:', cols.length);
cols.forEach((c, i) => console.log(' ', i + 1, c.slice(0, 80)));

const leftIdx = h.indexOf('nv-left-sidebar', rowOpen);
const centerIdx = h.indexOf('dynamic-viewport-container', rowOpen);
const rightIdx = h.indexOf('nv-right-sidebar', rowOpen);
console.log('Order: left', leftIdx, 'center', centerIdx, 'right', rightIdx);
console.log('Left before center:', leftIdx < centerIdx, 'Center before right:', centerIdx < rightIdx);