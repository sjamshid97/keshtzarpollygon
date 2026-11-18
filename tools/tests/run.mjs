// اجرای همهٔ آزمایش‌ها پشت‌سرهم.   node tools/tests/run.mjs        (یا فقط چندتا:  node tools/tests/run.mjs restore sync)
import { spawnSync } from 'child_process'; import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const want = process.argv.slice(2);
const files = fs.readdirSync(here).filter(f => /^t_.*\.mjs$/.test(f)).sort().filter(f => !want.length || want.some(w => f.includes(w)));
let ok = 0, bad = 0; const failed = []; const t0 = Date.now();
for (const f of files) {
  const r = spawnSync('node', [path.join(here, f)], { encoding: 'utf8', timeout: 600000, maxBuffer: 1 << 26 });
  const out = (r.stdout || '') + (r.stderr || '');
  const m = [...out.matchAll(/\[(.+?)\] (\d+) درست، (\d+) نادرست/g)].pop();
  if (m && r.status === 0 && +m[3] === 0) { ok += +m[2]; console.log('✓ ' + f.padEnd(22) + m[2].padStart(4) + ' بررسی   ' + m[1]); }
  else { failed.push(f); if (m) { ok += +m[2]; bad += +m[3]; } else bad++; console.log('✗ ' + f + '\n' + out.split('\n').filter(l => /✗|Error|خطا/.test(l)).slice(0, 12).join('\n')); }
}
console.log('\n' + (failed.length ? '✗' : '✓') + ' ' + files.length + ' فایل آزمایش، ' + ok + ' بررسیِ درست، ' + bad + ' نادرست — ' + Math.round((Date.now() - t0) / 1000) + ' ثانیه');
process.exit(failed.length ? 1 : 0);
