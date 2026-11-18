#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""ساخت demo.html از روی index.html

نسخهٔ نمایشی همان برنامه است با این تفاوت‌ها:
  ۱) عنوان صفحه «[نمایشی]» دارد.
  ۲) دادهٔ ساختگی دارد (tools/demo/seed.html) و در حافظهٔ جداگانه ذخیره می‌کند،
     تا هیچ‌وقت با دادهٔ واقعی قاطی نشود.
  ۳) نوار «نسخهٔ نمایشی» پایین صفحه دارد و همگام‌سازی با سرور در آن خاموش است
     (tools/demo/bar.html).

اجرا:
    python3 tools/build_demo.py           demo.html را می‌سازد
    python3 tools/build_demo.py --check   فقط بررسی می‌کند که demo.html به‌روز است
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TOOLS = ROOT / 'tools'

# (متن اصلی، متن نمایشی، تعداد دفعاتی که باید در index.html باشد)
KEYS = [
    ("<title>دفترچه مختصات زمین‌های تولید بذر</title>", "<title>[نمایشی] دفترچه مختصات زمین‌های تولید بذر</title>", 1),
    ("const STORE_KEY = 'seed_coord_notebook_v1';", "const STORE_KEY = 'seed_coord_notebook_demo_v1';", 1),
    ("const AB_KEY = 'seed_autosave_v1';", "const AB_KEY = 'seed_autosave_demo_v1';", 1),
    ("indexedDB.open('seed_autosave_idb', 1)", "indexedDB.open('seed_autosave_demo_idb', 1)", 1),
    ("getDirectoryHandle('backup', { create:true })", "getDirectoryHandle('backup_demo', { create:true })", 1),
    ("const VS_KEY = 'seed_vsync_v1';", "const VS_KEY = 'seed_vsync_demo_v1';", 1),
    ("const VB_KEY = 'seed_vbin_v1';", "const VB_KEY = 'seed_vbin_demo_v1';", 1),
    ("indexedDB.open('seedvisit_v1', 1)", "indexedDB.open('seedvisit_demo_v1', 1)", 1),
    ("const GS_LOCAL = 'seed_cloud_v2';", "const GS_LOCAL = 'seed_cloud_demo_v2';", 1),
    ("localStorage.getItem('seed_gdrive_v1')", "localStorage.getItem('seed_gdrive_demo_v1')", 1),
    ("const BEAT_LOCAL = 'seed_beat_v1';", "const BEAT_LOCAL = 'seed_beat_demo_v1';", 1),
]
BODY = '</head>\n<body>\n'
TAIL = '</script>\n<script>\n\n</script>\n</body>\n</html>\n'


def build(index_text: str) -> str:
    out = index_text
    for old, new, n in KEYS:
        got = out.count(old)
        if got != n:
            raise SystemExit(f'ساخت نمایشی متوقف شد: «{old}» باید {n} بار در index.html باشد ولی {got} بار هست.')
        out = out.replace(old, new)
    if out.count(BODY) != 1:
        raise SystemExit('ساخت نمایشی متوقف شد: جای شروع <body> پیدا نشد.')
    if not out.endswith(TAIL):
        raise SystemExit('ساخت نمایشی متوقف شد: انتهای index.html شکل همیشگی را ندارد.')
    seed = (TOOLS / 'demo' / 'seed.html').read_text(encoding='utf-8')
    bar = (TOOLS / 'demo' / 'bar.html').read_text(encoding='utf-8')
    out = out.replace(BODY, BODY + seed)
    cut = len(out) - len('</body>\n</html>\n')
    out = out[:cut] + bar + out[cut:]
    # نسخهٔ نمایشی هرگز نباید کلید حافظهٔ برنامهٔ اصلی را داشته باشد
    for bad in ("'seed_coord_notebook_v1'", "'seedvisit_v1'", "'seed_cloud_v2'", "'seed_vsync_v1'"):
        if bad in out:
            raise SystemExit(f'ساخت نمایشی متوقف شد: کلید حافظهٔ برنامهٔ اصلی ({bad}) در نسخهٔ نمایشی مانده است.')
    return out


def main() -> int:
    index_text = (ROOT / 'index.html').read_text(encoding='utf-8')
    demo = build(index_text)
    target = ROOT / 'demo.html'
    if '--check' in sys.argv:
        same = target.exists() and target.read_text(encoding='utf-8') == demo
        print('demo.html به‌روز است.' if same else 'demo.html با index.html هم‌خوان نیست؛ tools/build_demo.py را اجرا کنید.')
        return 0 if same else 1
    target.write_text(demo, encoding='utf-8')
    print(f'demo.html ساخته شد ({len(demo.encode("utf-8"))} بایت).')
    return 0


if __name__ == '__main__':
    sys.exit(main())
