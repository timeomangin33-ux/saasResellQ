const fs = require('fs');
const path = require('path');
const root = process.cwd();
const report = path.join(root, 'cspell_after_sweep_utf8.txt');
const cfgPath = path.join(root, '.cspell.json');
if (!fs.existsSync(report)) { console.error('Report not found:', report); process.exit(1); }
if (!fs.existsSync(cfgPath)) { console.error('.cspell.json not found'); process.exit(1); }
const txt = fs.readFileSync(report, 'utf8');
const regex = /Unknown word \(([^)]+)\)/g;
const words = new Set();
let m;
while ((m = regex.exec(txt)) !== null) words.add(m[1]);
const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
cfg.words = Array.from(new Set([...(cfg.words||[]), ...Array.from(words)])).sort((a,b)=>a.localeCompare(b,'fr'));
fs.writeFileSync(cfgPath, JSON.stringify(cfg,null,2),'utf8');
console.log('Merged', words.size, 'words from report into .cspell.json (total:', cfg.words.length,')');
