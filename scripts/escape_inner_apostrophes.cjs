const fs = require('fs');
const path = require('path');
const root = process.cwd();
const exts = ['.ts','.tsx','.js','.jsx'];
let changed=0;
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
      // Escape apostrophes that are between letters (e.g., d'historique -> d\'historique)
      s = s.replace(/([A-Za-zÀ-ÖØ-öø-ÿ])'([A-Za-zÀ-ÖØ-öø-ÿ])/g, "$1\\'$2");
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
