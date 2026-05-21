const fs = require('fs');
function replaceClasses(file) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/bg-\[\#070b17\]/g, 'bg-surface');
  content = content.replace(/bg-\[linear-gradient\(180deg,\#0a0f1d_0\%,\#0a0e19_100\%\)\]/g, 'bg-surface-subtle border border-[color:var(--border)]');
  content = content.replace(/bg-\[radial-gradient\(circle_at_top,\#0f1730,transparent_35\%\),linear-gradient\(180deg,\#050914_0\%,\#050914_100\%\)\]/g, 'bg-surface border border-[color:var(--border)]');
  content = content.replace(/bg-\[linear-gradient\(180deg,\#0b1020_0\%,\#090d19_100\%\)\]/g, 'bg-surface');
  content = content.replace(/bg-white\/\[0\.03\]/g, 'bg-surface-subtle/50 text-fg');
  content = content.replace(/bg-white\/\[0\.04\]/g, 'bg-surface-subtle');
  content = content.replace(/border-white\/10/g, 'border-[color:var(--border)]');
  content = content.replace(/bg-white\/5[^0-9]/g, 'bg-surface-subtle ');
  content = content.replace(/bg-white\/5\"/g, 'bg-surface-subtle\"');
  content = content.replace(/bg-white\/10/g, 'bg-surface-subtle/80');
  content = content.replace(/text-white\/[0-9]{2}/g, 'text-muted');
  content = content.replace(/text-white/g, 'text-fg');
  content = content.replace(/bg-black\/[0-9]{2}/g, 'bg-surface-subtle/60');
  content = content.replace(/bg-black/g, 'bg-surface border border-[color:var(--border)] shadow-sm');
  content = content.replace(/shadow-\[0_30px_100px_rgba\(0,0,0,0\.42\)\]/g, 'shadow-lg');
  content = content.replace(/shadow-\[0_24px_70px_rgba\(0,0,0,0\.34\)\]/g, 'shadow-md');
  content = content.replace(/text-emerald-200/g, 'text-emerald-700');
  content = content.replace(/text-red-200/g, 'text-red-700');
  content = content.replace(/text-amber-200/g, 'text-amber-700');
  content = content.replace(/text-violet-200/g, 'text-violet-700');
  content = content.replace(/text-sky-200/g, 'text-sky-700');
  content = content.replace(/text-lime-200/g, 'text-lime-700');
  content = content.replace(/text-emerald-300/g, 'text-emerald-700');
  content = content.replace(/text-red-300/g, 'text-red-700');
  content = content.replace(/text-amber-300/g, 'text-amber-700');
  content = content.replace(/text-violet-300/g, 'text-violet-700');
  content = content.replace(/text-sky-300/g, 'text-sky-700');
  // the text was previously white so emotions text on light background could be too bright. Let's make the background slightly more visible if they use 500/15 instead of changing just text.
  content = content.replace(/bg-([a-z]+)-500\/15/g, 'bg-$1-500/10 text-$1-700');
  fs.writeFileSync(file, content);
}
replaceClasses('c:/Users/nurba/elas/elas-frontend/src/app/teacher/session/[id]/page.tsx');
replaceClasses('c:/Users/nurba/elas/elas-frontend/src/components/session/CameraCheck.tsx');
