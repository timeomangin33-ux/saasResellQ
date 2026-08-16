const fs = require("fs");
const path = require("path");
const glob = require("glob");

const root = process.cwd();
const exts = ["**/*.md","**/*.tsx","**/*.ts","**/*.js","**/*.json","**/*.html","**/*.txt","**/*.yaml","**/*.yml"];

const replacements = {
  "é":"é","è":"è","ê":"ê","ë":"ë","ô":"ô","ç":"ç","À": "À", "À":"À",
  "":"" , "’":"’","–":"–","—":"—","…":"…",""":"\"","’":"’"," ":" ",
  """:""",""":"\"","“":"“","”":"”","”":"”","à":"à","\u0096":"-"
};

function replaceAll(content) {
  let out = content;
  for (const [k,v] of Object.entries(replacements)) {
    out = out.split(k).join(v);
  }
  return out;
}

function processFile(file) {
  try {
    const raw = fs.readFileSync(file, "utf8");
    const fixed = replaceAll(raw);
    if (fixed !== raw) {
      fs.writeFileSync(file, fixed, "utf8");
      console.log("Updated:", file);
    }
  } catch (e) {
    // ignore unreadable files
  }
}

(async ()=>{
  const patterns = exts;
  const files = new Set();
  for (const p of patterns) {
    const matches = glob.sync(p, {ignore: ["**/node_modules/**","**/vinted-discord-bot-main/**"]});
    matches.forEach(m=>files.add(m));
  }
  for (const f of Array.from(files)) processFile(path.join(root, f));
  console.log("Text sweep completed, files processed:", files.size);
})();
