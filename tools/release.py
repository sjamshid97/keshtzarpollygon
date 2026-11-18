#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""شمارهٔ نسخه را در همهٔ جاهای لازم یکسان می‌کند و نسخهٔ نمایشی را دوباره می‌سازد.

هر انتشار باید این چهار چیز را با هم داشته باشد:
  ۱) index.html   →  const APP_VERSION = 'x.y.z'
  ۲) sw.js        →  const CACHE = 'seedcoord-vx.y.z'      (تا گوشی‌ها فایل تازه را بگیرند)
  ۳) README.md    →  «نسخهٔ x.y.z — …»
  ۴) demo.html    →  از روی index.html تازه ساخته شده باشد

اجرا:
    python3 tools/release.py 2.6.2      شماره را می‌گذارد و demo.html را می‌سازد
    python3 tools/release.py --check    فقط بررسی می‌کند که همه‌چیز هم‌خوان است
"""
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FA = str.maketrans('0123456789.', '۰۱۲۳۴۵۶۷۸۹٫')


def read(name):
    return (ROOT / name).read_text(encoding='utf-8')


def write(name, text):
    (ROOT / name).write_text(text, encoding='utf-8')


def sub_once(text, pattern, repl, what):
    out, n = re.subn(pattern, repl, text)
    if n != 1:
        raise SystemExit(f'✗ {what}: باید دقیقاً یک بار پیدا شود، {n} بار پیدا شد.')
    return out


def versions():
    v_app = re.search(r"const APP_VERSION = '([0-9.]+)'", read('index.html'))
    v_sw = re.search(r"const CACHE = 'seedcoord-v([0-9.]+)'", read('sw.js'))
    v_readme = re.search(r'^نسخهٔ ([۰-۹٫]+) —', read('README.md'), re.M)
    return (v_app and v_app.group(1), v_sw and v_sw.group(1), v_readme and v_readme.group(1))


def check():
    v_app, v_sw, v_readme = versions()
    ok = True
    if not v_app or v_app != v_sw:
        ok = False
        print(f'✗ نسخهٔ برنامه ({v_app}) و نام کش در sw.js ({v_sw}) یکی نیست.')
    if not v_readme or (v_app or '').translate(FA) != v_readme:
        ok = False
        print(f'✗ نسخهٔ README ({v_readme}) با نسخهٔ برنامه ({v_app}) یکی نیست.')
    for cmd in (['python3', str(ROOT / 'tools' / 'build_demo.py'), '--check'], ['python3', str(ROOT / 'tools' / 'syntax_check.py')]):
        r = subprocess.run(cmd, capture_output=True, text=True)
        print(r.stdout.strip())
        ok = ok and r.returncode == 0
    print(('✓ همه‌چیز هم‌خوان است: نسخهٔ ' + str(v_app)) if ok else '✗ انتشار آماده نیست.')
    return 0 if ok else 1


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return 2
    if sys.argv[1] == '--check':
        return check()
    v = sys.argv[1]
    if not re.fullmatch(r'\d+\.\d+\.\d+', v):
        raise SystemExit('شمارهٔ نسخه باید مثل 2.6.2 باشد.')
    write('index.html', sub_once(read('index.html'), r"const APP_VERSION = '[0-9.]+'", f"const APP_VERSION = '{v}'", 'APP_VERSION در index.html'))
    write('sw.js', sub_once(read('sw.js'), r"const CACHE = 'seedcoord-v[0-9.]+'", f"const CACHE = 'seedcoord-v{v}'", 'CACHE در sw.js'))
    write('README.md', sub_once(read('README.md'), r'(?m)^نسخهٔ [۰-۹٫]+ —', f'نسخهٔ {v.translate(FA)} —', 'خط نسخه در README.md'))
    subprocess.run(['python3', str(ROOT / 'tools' / 'build_demo.py')], check=True)
    return check()


if __name__ == '__main__':
    sys.exit(main())
