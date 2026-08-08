import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const exts = ['.tsx', '.ts', '.jsx', '.js'];
function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      if (file.includes('node_modules') || file.includes('.git')) return;
      results = results.concat(walk(file));
    } else {
      if (exts.includes(path.extname(file))) results.push(file);
    }
  });
  return results;
}

const files = walk(process.cwd());
let changed = 0;
for (const f of files) {
  let content = fs.readFileSync(f, 'utf8');
  const orig = content;
  // Replace typographic apostrophe &apos; and left apostrophe &apos; with &apos;
  content = content.replace(/&apos;/g, "&apos;").replace(/&apos;/g, "&apos;");
  // Replace left/right double quotes &quot; &quot; with &quot;
  content = content.replace(/[&quot;&quot;]/g, '&quot;');
  // Replace French ellipsis char ... with ... (optional)
  content = content.replace(/.../g, '...');
  if (content !== orig) {
    fs.writeFileSync(f, content, 'utf8');
    changed++;
    console.log('Fixed', f);
  }
}
console.log('Files changed:', changed);
process.exit(0);
