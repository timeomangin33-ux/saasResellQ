const fs = require('fs');
const path = require('path');
const root = process.cwd();
const exts = ['.ts','.tsx'];
let changed = 0;
function walk(dir){
  for(const name of fs.readdirSync(dir)){
    const fp = path.join(dir,name);
    const stat = fs.statSync(fp);
    if(stat.isDirectory()){
      if(['node_modules','.git','.next','vinted-discord-bot-main'].includes(name)) continue;
      walk(fp);
    } else {
      if(!exts.includes(path.extname(name))) continue;
      let s = fs.readFileSync(fp,'utf8');
      const orig = s;
      // Insert missing commas between closing quote union types and the next identifier in type objects
      // Example: "'demandScore' sortKey:" -> "'demandScore', sortKey:"
      s = s.replace(/('(?:[^'\\]|\\.)+')\s+([A-Za-z_][A-Za-z0-9_]*)\s*:/g, "$1, $2:");
      // Also handle cases with | unions before identifier
      s = s.replace(/(\|\s*'[^']+'\s*)\s+([A-Za-z_][A-Za-z0-9_]*)\s*:/g, "$1, $2:");
      if(s !== orig){
        fs.writeFileSync(fp,s,'utf8');
        changed++;
        console.log('Updated:', fp);
      }
    }
  }
}
walk(root);
console.log('Done, files changed:', changed);
