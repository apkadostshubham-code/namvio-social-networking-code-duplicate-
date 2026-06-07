const fs = require('fs');
const html = fs.readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf8');
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
const counts = {};
ids.forEach((id) => { counts[id] = (counts[id] || 0) + 1; });
const dups = Object.entries(counts).filter(([, c]) => c > 1).sort((a, b) => b[1] - a[1]);
console.log('Total ids:', ids.length);
console.log('Duplicates:', dups.length);
dups.forEach(([id, c]) => console.log(c + 'x ' + id));