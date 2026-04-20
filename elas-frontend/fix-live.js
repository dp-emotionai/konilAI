const fs = require('fs');
function replaceClasses(file) {
  let content = fs.readFileSync(file, 'utf8');

  // Dashboard structure
  content = content.replace(/bg-\[\#070b17\]/g, 'bg-surface');
  content = content.replace(/shadow-\[0_30px_100px_rgba\(0,0,0,0\.42\)\]/g, 'shadow-lg');
  content = content.replace(/bg-\[radial-gradient\(circle_at_top,\#0f1730,transparent_35\%\),linear-gradient\(180deg,\#050914_0\%,\#050914_100\%\)\]/g, 'bg-surface');
  content = content.replace(/bg-\[linear-gradient\(180deg,\#0a0f1d_0\%,\#0a0e19_100\%\)\]/g, 'bg-surface-subtle');
  content = content.replace(/border-white\/10/g, 'border-[color:var(--border)]');

  // Text colors
  content = content.replace(/text-white\/40/g, 'text-muted');
  content = content.replace(/text-white\/45/g, 'text-muted');
  content = content.replace(/text-white\/50/g, 'text-muted');
  content = content.replace(/text-white\/55/g, 'text-muted');
  content = content.replace(/text-white\/60/g, 'text-muted');
  content = content.replace(/text-white\/65/g, 'text-muted');
  content = content.replace(/text-white\/70/g, 'text-muted');
  content = content.replace(/text-white\/75/g, 'text-muted');
  content = content.replace(/text-white\/80/g, 'text-muted');
  content = content.replace(/text-white\/85/g, 'text-muted');
  content = content.replace(/text-white\/90/g, 'text-muted');
  content = content.replace(/text-white/g, 'text-fg');

  // Background and borders of small controls inside the live page
  content = content.replace(/bg-white\/5([^0-9])/g, 'bg-surface-subtle/50$1');
  content = content.replace(/bg-white\/5"/g, 'bg-surface-subtle/50"');
  content = content.replace(/bg-white\/10/g, 'bg-surface-subtle');
  content = content.replace(/bg-black\/30/g, 'bg-surface/80');
  content = content.replace(/bg-black\/35/g, 'bg-surface/80');
  content = content.replace(/bg-black\/40/g, 'bg-surface/80');
  content = content.replace(/bg-black\/45/g, 'bg-surface/80');
  content = content.replace(/bg-black\/50/g, 'bg-surface/80');
  content = content.replace(/bg-black/g, 'bg-surface');
  
  // Specific alert badges
  content = content.replace(/text-emerald-300/g, 'text-emerald-700');
  content = content.replace(/text-sky-300/g, 'text-sky-700');
  content = content.replace(/text-amber-300/g, 'text-amber-700');
  content = content.replace(/text-red-300/g, 'text-red-700');
  content = content.replace(/text-violet-300/g, 'text-violet-700');

  // Avoid pure black elements for light UI
  content = content.replace(/bg-emerald-500\/15/g, 'bg-emerald-500/10 text-emerald-700');
  content = content.replace(/bg-sky-500\/15/g, 'bg-sky-500/10 text-sky-700');
  content = content.replace(/bg-amber-500\/15/g, 'bg-amber-500/10 text-amber-700');
  content = content.replace(/bg-red-500\/15/g, 'bg-red-500/10 text-red-700');
  content = content.replace(/bg-violet-500\/15/g, 'bg-violet-500/10 text-violet-700');

  // Button hover states
  content = content.replace(/hover:bg-white\/10/g, 'hover:bg-surface-subtle');

  fs.writeFileSync(file, content);
}
replaceClasses('c:/Users/nurba/elas/elas-frontend/src/app/teacher/session/[id]/page.tsx');
console.log('Fixed Teacher Live Monitor');
