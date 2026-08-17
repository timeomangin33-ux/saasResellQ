const fs = require("fs")
const path = require("path")
const root = path.resolve(__dirname, "..")
const exts = [".ts", ".tsx", ".js", ".jsx"]

function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name)
    const stat = fs.statSync(p)
    if (stat.isDirectory()) {
      if (["node_modules", ".git", ".next"].includes(name)) continue
      walk(p)
    } else {
      if (!exts.includes(path.extname(name))) continue
      let s = fs.readFileSync(p, "utf8")
      const orig = s
      // Replace single-quoted strings with double-quoted strings.
      s = s.replace(/"((?:\\.|[^"\\])*)"/g, ""$1"")
      if (s !== orig) {
        fs.writeFileSync(p, s, "utf8")
        console.log("Patched", p)
      }
    }
  }
}

walk(root)
console.log("Done')
