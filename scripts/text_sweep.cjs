const fs = require('fs');
const path = require('path');
const root = process.cwd();
const exts = ['.md','.tsx','.ts','.js','.json','.html','.txt','.yaml','.yml'];

const replacements = {
  'Ã©':'é','Ã¨':'è','Ãª':'ê','Ã«':'ë','Ã´':'ô','Ã§':'ç','Ã ':'À','Ã€':'À',
  'Â':'' , 'â€™':'’','â€“':'–','â€”':'—','â€¦':'…','&apos':'\'','&rsquo;':'’','&nbsp;':' ',
  '&quot;':'"','&amp;apos;':'\'','â€œ':'“','â€"':'”','â€':'”','Ã':'à','Â\u0096':'-','Â\u0092':'’',
  '├®':'é','├¿':'è','├¬':'ô','├ó':'ó','├ó':'ô','ÔÇÖ':'’','â‚¬':'€','â€˜':'‘','â€”':'—'
};

// Additional mojibake patterns observed in reports
const extra = {
  '├¬':'ê','├«':'î','├º':'ç','┼ô':'œ','├ë':'é','├╗':'û','├½':'é','┬║':'à','Ö':'Ô'
};
Object.assign(replacements, extra);

function replaceAll(content) {
  let out = content;
  for (const [k,v] of Object.entries(replacements)) {
    out = out.split(k).join(v);
  }
  return out;
}

function processFile(file) {
  try {
    const raw = fs.readFileSync(file, 'utf8');
    const fixed = replaceAll(raw);
    if (fixed !== raw) {
      fs.writeFileSync(file, fixed, 'utf8');
      console.log('Updated:', file);
    }
  } catch (e) {
    // ignore unreadable files
  }
}

function walkDir(dir, cb) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === 'vinted-discord-bot-main') continue;
      walkDir(full, cb);
    } else if (e.isFile()) {
      cb(full);
    }
  }
}

(async ()=>{
  const files = [];
  walkDir(root, (f)=>{
    const ext = path.extname(f).toLowerCase();
    if (exts.includes(ext)) files.push(path.relative(root, f));
  });
  for (const f of files) processFile(path.join(root, f));
  console.log('Text sweep completed, files processed:', files.length);
})();
