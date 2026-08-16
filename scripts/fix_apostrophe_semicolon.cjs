const fs = require('fs');
const path = require('path');
const root = process.cwd();
const exts = ['.ts','.tsx','.js','.jsx','.md','.html','.json','.txt'];
let count=0;
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
      // Fix patterns like l';option -> l'option and d';automatisation -> d'automatisation
      s = s.replace(/'\s*;|;\s*'/g, "'");
      // Also fix ;' inside words like d'; -> d'
      s = s.replace(/;(?=')/g,'');
      // Replace sequences like ;option (semicolon directly after apostrophe) -> 'option
      s = s.replace(/';(?=[A-Za-zÀ-ÖØ-öø-ÿ])/g,"'");
      if(s !== orig){
        fs.writeFileSync(fp,s,'utf8');
        count++;
        console.log('Updated:', fp);
      }
    }
  }
}
walk(root);
console.log('Done, files changed:', count);
