const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(fullPath));
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      results.push(fullPath);
    }
  });
  return results;
}

const files = walk('./src');
let changedCount = 0;
let changedFiles = [];

files.forEach((f) => {
  let content = fs.readFileSync(f, 'utf8');
  let original = content;

  content = content.replace(/import\s+Card\s+from\s+["']@\/components\/ui\/Card["'];?/g, 'import { Card } from "@/components/ui/Card";');
  content = content.replace(/import\s+Card,\s*\{\s*CardContent\s*}\s+from\s+["']@\/components\/ui\/Card["'];?/g, 'import { Card, CardContent } from "@/components/ui/Card";');
  content = content.replace(/import\s+Card,\s*\{\s*CardHeader,\s*CardContent\s*}\s+from\s+["']@\/components\/ui\/Card["'];?/g, 'import { Card, CardHeader, CardContent } from "@/components/ui/Card";');

  if (content !== original) {
    fs.writeFileSync(f, content, 'utf8');
    changedFiles.push(f);
    changedCount++;
  }
});

console.log('Changed Files:');
changedFiles.forEach(f => console.log('Fixed', f));
console.log('Total files changed:', changedCount);
