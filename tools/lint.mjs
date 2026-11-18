// بررسی ایستا: نام‌هایی که در اسکریپتِ برنامه استفاده شده‌اند ولی هیچ‌جا تعریف نشده‌اند (مثل اشتباه تایپی).
// اجرا:  node tools/lint.mjs
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
import { ESLint } from 'eslint'; import globals from 'globals';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
let bad = 0;
const eslint = new ESLint({ overrideConfigFile: true, cwd: ROOT, overrideConfig: [{
  languageOptions: { ecmaVersion: 2023, sourceType: 'script', globals: { ...globals.browser, ...globals.serviceworker } },
  rules: { 'no-undef': 'error', 'no-dupe-keys': 'error', 'no-redeclare': 'error', 'no-unreachable': 'warn', 'no-const-assign': 'error', 'no-dupe-args': 'error', 'no-func-assign': 'error' } }] });
const check = async (name, code, line0) => {
  const res = await eslint.lintText('\n'.repeat(line0) + code, { filePath: path.join(ROOT, name + '.js') });
  for (const m of res[0].messages) { if (m.severity === 2) bad++; console.log((m.severity === 2 ? '✗ ' : '• ') + name + ':' + m.line + '  ' + m.message + (m.ruleId ? '  [' + m.ruleId + ']' : '')); }
};
let n = 0;
for (const m of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) { if (!m[1].trim()) continue; n++; await check('index.html', m[1], html.slice(0, m.index).split('\n').length - 1); }
await check('sw', fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8'), 0);
console.log(bad ? '✗ ' + bad + ' خطا' : '✓ نام تعریف‌نشده یا تکراری پیدا نشد (' + n + ' اسکریپت + sw.js)');
process.exit(bad ? 1 : 0);
