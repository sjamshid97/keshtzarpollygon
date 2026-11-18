#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""اجرای آزمایشیِ فایل نصب در یک «ویندوزِ شبیه‌سازی‌شده» (بدون ویندوز واقعی).

بدنهٔ اجراییِ فایل نصب را در شبیه‌ساز speakeasy اجرا می‌کند و می‌بیند چه پوشه و پرونده‌هایی می‌سازد،
چه دستوری اجرا می‌کند و چه پیام‌هایی نشان می‌دهد؛ بعد همه را با فایل نصبِ قبلی و با فایل‌های مخزن مقایسه می‌کند.

این آزمایش «اسکریپت نصب» (install.ps1) را اجرا نمی‌کند؛ آن فقط روی ویندوز واقعی اجرا می‌شود.

نیاز:  pip install speakeasy-emulator
اجرا:   python3 tools/installer/emu_check.py --base فایل-نصب-قبلی.exe --new فایل-نصب-تازه.exe
"""
import argparse
import hashlib
import json
import logging
import sys
from pathlib import Path

try:
    import speakeasy
except ImportError:
    print('برای این آزمایش لازم است:  pip install speakeasy-emulator')
    sys.exit(2)

logging.disable(logging.CRITICAL)
ROOT = Path(__file__).resolve().parent.parent.parent
HERE = Path(__file__).resolve().parent


def run(path, answers=(6, 6), exit_code=0):
    """answers = پاسخ به پنجره‌های پیام (۶ = بله، ۷ = نه) ؛ exit_code = کدی که اسکریپت نصب برمی‌گرداند"""
    se = speakeasy.Speakeasy()
    ev, box, handles, written = [], [0], {}, {}

    def ws(addr):
        try:
            return se.read_mem_string(addr, 2) if addr else ''
        except Exception:
            return '?'

    def hook(emu, api, func, params):
        rv = func(params)
        n = api.split('.')[-1]
        if n == 'MessageBoxW':
            rv = answers[min(box[0], len(answers) - 1)]
            box[0] += 1
            ev.append(('پیام', ws(params[2]), ws(params[1]), 'پاسخ=' + {6: 'بله', 7: 'نه'}.get(rv, str(rv))))
        elif n == 'CreateDirectoryW':
            ev.append(('پوشه', ws(params[0])))
        elif n == 'CreateFileW':
            ev.append(('پرونده', ws(params[0])))
            handles[rv] = ws(params[0])
        elif n == 'WriteFile':
            key = handles.get(params[0], str(params[0]))
            written[key] = written.get(key, b'') + bytes(se.mem_read(params[1], params[2]))
        elif n == 'CreateProcessW':
            ev.append(('اجرا', ws(params[1])))
        elif n == 'GetExitCodeProcess':
            se.mem_write(params[1], int(exit_code).to_bytes(4, 'little'))
            ev.append(('کد پایان', exit_code))
        elif n == 'ShellExecuteW':
            ev.append(('باز کردن', ws(params[1]), ws(params[2])))
        elif n == 'SHGetFolderPathW':
            ev.append(('پوشهٔ ویژه', params[1], ws(params[4])))
        elif n in ('DeleteFileW', 'RemoveDirectoryW'):
            ev.append((n, ws(params[0])))
        elif n in ('exit', 'ExitProcess'):
            ev.append(('خروج', params[0] if params else None))
        return rv

    se.add_api_hook(hook, '*', '*')
    try:
        se.run_module(se.load_module(path))
    except Exception as e:                                   # noqa: BLE001
        ev.append(('خطای شبیه‌ساز', repr(e)[:300]))
    errors = [ep.get('error') for ep in json.loads(se.get_json_report()).get('entry_points', []) if ep.get('error')]
    return ev, written, errors


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--base', required=True)
    ap.add_argument('--new', required=True)
    a = ap.parse_args()
    old_ev, old_files, old_err = run(a.base)
    new_ev, new_files, new_err = run(a.new)
    print('کارهایی که فایل نصب تازه در ویندوزِ شبیه‌سازی‌شده انجام داد:')
    for e in new_ev:
        print('   ' + json.dumps(e, ensure_ascii=False)[:230])
    ok = [True]

    def chk(cond, label):
        ok[0] = ok[0] and bool(cond)
        print(('  ✓ ' if cond else '  ✗ ') + label)

    chk(old_ev == new_ev, 'ترتیب کارها، مسیرها، دستور اجرا و پیام‌ها دقیقاً مثل فایل نصب قبلی است')
    chk(not old_err and not new_err, 'شبیه‌ساز خطایی گزارش نکرد')
    want = {'app\\index.html': ROOT / 'index.html', 'app\\icon-192.png': ROOT / 'icon-192.png', 'app\\icon-512.png': ROOT / 'icon-512.png',
            'app\\manifest.webmanifest': ROOT / 'manifest.webmanifest', 'install.ps1': HERE / 'install.ps1'}
    for tail, src in want.items():
        data = src.read_bytes()
        got = [d for p, d in new_files.items() if p.endswith('SeedAppInstall\\' + tail)]
        chk(len(got) == 1 and got[0] == data, f'پروندهٔ {tail} همان فایلِ مخزن است ({len(data):,} بایت)')
    ico_old = [d for p, d in old_files.items() if p.endswith('icon.ico')]
    ico_new = [d for p, d in new_files.items() if p.endswith('icon.ico')]
    chk(len(ico_new) == 1 and ico_new == ico_old and ico_new[0][:4] == b'\x00\x00\x01\x00', 'آیکون میان‌بر همان آیکون قبلی است')
    f_ev, _, _ = run(a.new, exit_code=3)
    msgs = [e for e in f_ev if e[0] == 'پیام']
    opened = [e for e in f_ev if e[0] == 'باز کردن']
    chk(len(msgs) == 2 and 'کامل نشد (کد 3)' in msgs[1][2] and bool(opened) and opened[0][2].endswith('SeedAppInstall'),
        'اگر اسکریپت نصب با خطا تمام شود: پیام خطا با شمارهٔ کد می‌آید و پوشهٔ موقت باز می‌شود')
    n_ev, _, _ = run(a.new, answers=(7,))
    chk(not any(e[0] in ('پوشه', 'پرونده', 'اجرا') for e in n_ev), 'اگر در پنجرهٔ اول «نه» زده شود: هیچ کاری انجام نمی‌شود')
    print('SHA-256 فایل نصب تازه:', hashlib.sha256(Path(a.new).read_bytes()).hexdigest())
    print('نتیجه: ' + ('همه درست' if ok[0] else 'مشکل دارد'))
    return 0 if ok[0] else 1


if __name__ == '__main__':
    sys.exit(main())
