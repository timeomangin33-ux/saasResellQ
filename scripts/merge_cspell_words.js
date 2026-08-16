const fs = require("fs");
const path = require("path");
const root = process.cwd();
const wordsFile = path.join(root, ".cspell_unknown_words.txt");
const configFile = path.join(root, ".cspell.json");
if (!fs.existsSync(wordsFile)) { console.error("No .cspell_unknown_words.txt found"); process.exit(1); }
if (!fs.existsSync(configFile)) { console.error("No .cspell.json found"); process.exit(1); }
const rawWords = fs.readFileSync(wordsFile, "utf8").split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
const cfg = JSON.parse(fs.readFileSync(configFile,"utf8"));
cfg.words = Array.from(new Set([...(cfg.words||[]), ...rawWords])).sort((a,b)=>a.localeCompare(b,"fr"));
fs.writeFileSync(configFile, JSON.stringify(cfg, null, 2),"utf8");
console.log("Merged", rawWords.length, "words into .cspell.json (total words:", cfg.words.length,")");
