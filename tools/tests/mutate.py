#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""آزمایشِ خودِ آزمایش‌ها.

برنامه در یک رونوشتِ موقت، هر بار عمداً در یک جا خراب می‌شود و همان آزمایشِ مربوط اجرا می‌شود؛
اگر آزمایش باز هم «درست» بدهد، یعنی آن آزمایش چیزی را نمی‌سنجد. خودِ مخزن دست نمی‌خورد.

    python3 tools/tests/mutate.py            همهٔ موردها (چند دقیقه)
    python3 tools/tests/mutate.py وسط‌چین    فقط موردهایی که این واژه در نامشان هست

هر مورد: (نام، تکه‌ای از index.html، جایگزینِ خراب، نام فایل آزمایش). اگر «الگو پیدا نشد» آمد،
یعنی آن تکه از برنامه عوض شده و باید همین فهرست به‌روز شود.
"""
import os
import shutil
import subprocess
import sys
import tempfile

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MUT = os.path.join(tempfile.gettempdir(), 'kz-mut')
src=open(REPO+'/index.html',encoding='utf-8').read()
muts=[
 ('نگه‌داشتن امضای ثبت‌نشده هنگام بازسازی', "  try{ if(typeof vPadsKeep === 'function') vPadsKeep(); }catch(e){}\n", "", 't_sign'),
 ('دو بازسازی نزدیک به هم', "    if (cv._keep) { V_PAD_KEEP.set(vPadKey(cv), cv._keep); return; }\n", "", 't_sign'),
 ('نمایش امضای تازه پس از امضای دوباره', "  if (url) { V_URLS.delete(k); try { URL.revokeObjectURL(url); } catch(e) {} }", "", 't_sign'),
 ('کنارگذاشتن گوش‌دادنِ کادرهای قدیمی', "    if (!cv.isConnected) { window.removeEventListener('resize', fit); return; }\n", "", 't_sign'),
 ('پذیرفتن پشتیبانِ بدون تصویر امضای کارشناس', "add('sigs',vSigKey(v.id,'x',v.sigExpert),true);", "add('sigs',vSigKey(v.id,'x',v.sigExpert));", 't_sign'),
 ('حذف تصویر امضای کارشناس با حذف بازدید', "try{ await vIdbDel('sigs', xk); }catch(e){} vSigUrlDrop(xk);", "vSigUrlDrop(xk);", 't_sign'),
 ('بریدن تصویر امضا', "        out = c;\n", "", 't_sign'),
 ('کلید جدا برای امضای کارشناس', "function vSigKey(vid, who, sx){ return who === 'x' ? vid + '|x|' + String((sx && sx.id) || '') : vid; }", "function vSigKey(vid, who, sx){ return vid; }", 't_sign'),
 ('کلید تازه برای هر امضای کارشناس', "function vSigKey(vid, who, sx){ return who === 'x' ? vid + '|x|' + String((sx && sx.id) || '') : vid; }", "function vSigKey(vid, who, sx){ return who === 'x' ? vid + '|x|' : vid; }", 't_sign'),
 ('وسط‌چین بودن خانه‌های جدول', "{ size: V_TBL_SIZE, b: fixed, after: 0, align: 'center', color: head ? '1F6F43' : null }", "{ size: V_TBL_SIZE, b: fixed, after: 0, color: head ? '1F6F43' : null }", 't_word'),
 ('پررنگ بودن ستون عنوان‌ها', "{ size: V_TBL_SIZE, b: fixed, after: 0, align: 'center', color: head ? '1F6F43' : null }", "{ size: V_TBL_SIZE, b: head, after: 0, align: 'center', color: head ? '1F6F43' : null }", 't_word'),
 ('اندازهٔ ۱۱ در جدول', "const V_TBL_SIZE = 22;", "const V_TBL_SIZE = 20;", 't_word'),
 ('اندازهٔ ۱۴ سرتیترها', "const V_HEAD = { heading:true, size:28,", "const V_HEAD = { heading:true, size:24,", 't_word'),
 ('جابه‌جا نشدن دو امضا', "sigXCache ? sigCell(sigXCache, 'signature-expert.png', 991) : sigAbsent()", "sigCache ? sigCell(sigCache, 'signature-expert.png', 991) : sigAbsent()", 't_word'),
 ('عبارت کارشناس فنی', "expertRow = ['کارشناس فنی', v.sigExpert.name", "expertRow = ['مسئول فنی', v.sigExpert.name", 't_word'),
 ('هشدار نبودنِ تصویر امضای کارشناس', "  if(missingPhotos || missingSig || missingSigX){", "  if(missingPhotos || missingSig){", 't_word'),
]
only = sys.argv[1:] 
ok=True
for name, a, b, test in muts:
    if only and not any(o in name for o in only): continue
    if src.count(a) < 1: print('✗ الگو پیدا نشد:', name); ok=False; continue
    shutil.rmtree(MUT, ignore_errors=True); os.makedirs(MUT)
    for f in ('sw.js','manifest.webmanifest','icon-192.png','icon-512.png','demo.html'): shutil.copy(REPO+'/'+f, MUT)
    open(MUT+'/index.html','w',encoding='utf-8').write(src.replace(a, b, 1))
    r = subprocess.run(['node', REPO+'/tools/tests/'+test+'.mjs'], capture_output=True, text=True, env=dict(os.environ, KZ_SITE_ROOT=MUT), timeout=400)
    out = r.stdout + r.stderr
    fails = [l.strip()[:110] for l in out.split('\n') if l.strip().startswith('✗') and '[' not in l[:4]]
    caught = bool(fails) or r.returncode != 0
    print(('گرفته شد ✓ ' if caught else 'گرفته نشد ✗ ') + name + ' → ' + (fails[0] if fails else ('کد ' + str(r.returncode) + ' ' + out.strip().split('\n')[-1][:100])))
    ok = ok and caught
shutil.rmtree(MUT, ignore_errors=True)
print('نتیجه:', 'همهٔ خرابی‌های عمدی گرفته شد' if ok else 'بعضی گرفته نشد')
