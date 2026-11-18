#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""ساخت فایل نصب ویندوز (EXE) برای «دفترچهٔ مختصات قطعات»

فایل نصب یک برنامهٔ کوچک است که این‌ها را در خودش دارد و هنگام اجرا بیرون می‌ریزد:
    101  index.html              خودِ برنامه
    102  icon.ico                آیکون میان‌بر
    103  icon-192.png
    104  icon-512.png
    105  manifest.webmanifest
    106  install.ps1             اسکریپت نصب (همین پوشه)

این ابزار «بدنهٔ اجرایی» را از فایل نصبِ نسخهٔ قبلی برمی‌دارد (همان که روی ویندوز واقعی
اجرا شده است) و فقط محتوای داخلش را با فایل‌های نسخهٔ تازه عوض می‌کند. بدنهٔ اجرایی در
مخزن نگه‌داری نمی‌شود؛ فایل نصب قبلی را باید با --base بدهید.

اجرا:
    python3 tools/installer/build_installer.py --base مسیر/فایل-نصب-قبلی.exe --out پوشهٔ-خروجی
    python3 tools/installer/build_installer.py --base مسیر/فایل-نصب-قبلی.exe --extract پوشه      (فقط بیرون‌ریختنِ محتوا)
"""
import argparse
import hashlib
import re
import struct
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
HERE = Path(__file__).resolve().parent

RT_ICON, RT_RCDATA, RT_GROUP_ICON, RT_VERSION, RT_MANIFEST = 3, 10, 14, 16, 24


def align(n, a):
    return (n + a - 1) // a * a


class PE:
    def __init__(self, data):
        self.b = bytearray(data)
        b = self.b
        if b[:2] != b'MZ':
            raise SystemExit('فایل پایه یک برنامهٔ ویندوزی نیست.')
        self.pe = struct.unpack_from('<I', b, 0x3c)[0]
        if b[self.pe:self.pe + 4] != b'PE\0\0':
            raise SystemExit('سرآیند PE پیدا نشد.')
        self.nsec = struct.unpack_from('<H', b, self.pe + 6)[0]
        self.optsz = struct.unpack_from('<H', b, self.pe + 20)[0]
        self.opt = self.pe + 24
        magic = struct.unpack_from('<H', b, self.opt)[0]
        if magic != 0x20b:
            raise SystemExit('فقط برنامهٔ ۶۴بیتی (PE32+) پشتیبانی می‌شود.')
        self.sec_align, self.file_align = struct.unpack_from('<II', b, self.opt + 32)
        self.dd = self.opt + 112                      # جدول «پوشه‌های داده»
        self.sec_off = self.opt + self.optsz
        self.secs = []
        for i in range(self.nsec):
            o = self.sec_off + i * 40
            name = bytes(b[o:o + 8]).rstrip(b'\0').decode('latin1')
            vsz, va, rsz, rptr = struct.unpack_from('<IIII', b, o + 8)
            self.secs.append({'name': name, 'o': o, 'vsz': vsz, 'va': va, 'rsz': rsz, 'rptr': rptr})

    def sec(self, name):
        for s in self.secs:
            if s['name'] == name:
                return s
        raise SystemExit(f'بخش {name} در فایل پایه نیست.')

    def rva2off(self, rva):
        for s in self.secs:
            if s['va'] <= rva < s['va'] + max(s['vsz'], s['rsz']):
                return s['rptr'] + (rva - s['va'])
        raise SystemExit(f'نشانیِ {rva:#x} در هیچ بخشی نیست.')


def read_resources(pe):
    """درخت منابع → {نوع: {نام: {زبان: بایت‌ها}}} (فقط شناسهٔ عددی)"""
    b = pe.b
    rs = pe.sec('.rsrc')
    base = rs['rptr']
    tree = {}

    def entries(off):
        nn, ni = struct.unpack_from('<HH', b, base + off + 12)
        if nn:
            raise SystemExit('منبع با نام متنی در فایل پایه هست؛ این ابزار فقط شناسهٔ عددی را می‌شناسد.')
        for i in range(ni):
            ident, d = struct.unpack_from('<II', b, base + off + 16 + i * 8)
            yield ident, d

    for t, d1 in entries(0):
        for n, d2 in entries(d1 & 0x7fffffff):
            for lang, d3 in entries(d2 & 0x7fffffff):
                rva, size, _cp, _ = struct.unpack_from('<IIII', b, base + d3)
                off = pe.rva2off(rva)
                tree.setdefault(t, {}).setdefault(n, {})[lang] = bytes(b[off:off + size])
    return tree


def build_rsrc(tree, rva):
    """درخت منابع → بایت‌های بخش .rsrc که در نشانیِ مجازی rva می‌نشیند.

    چیدمان دقیقاً همان چیدمان فایل نصب قبلی است: پوشهٔ ریشه؛ بعد برای هر «نوع» پوشهٔ خودش و
    بلافاصله پوشه‌های «زبانِ» زیرمجموعه‌اش؛ بعد همهٔ مدخل‌های داده؛ بعد خودِ داده‌ها (هم‌تراز ۸ بایت).
    """
    types = sorted(tree)
    n_langs = sum(len(tree[t][n]) for t in types for n in tree[t])
    dir_size = 16 + 8 * len(types)
    for t in types:
        dir_size += 16 + 8 * len(tree[t]) + sum(16 + 8 * len(tree[t][n]) for n in tree[t])
    entries_off = dir_size
    data_off = align(entries_off + 16 * n_langs, 8)
    out = bytearray(data_off)
    blobs = bytearray()

    def put_dir(off, count):
        struct.pack_into('<IIHHHH', out, off, 0, 0, 0, 0, 0, count)

    pos = 16 + 8 * len(types)                             # جای پوشهٔ نوعِ بعدی
    pos_entry = entries_off
    put_dir(0, len(types))
    for ti, t in enumerate(types):
        names = sorted(tree[t])
        struct.pack_into('<II', out, 16 + 8 * ti, t, 0x80000000 | pos)
        put_dir(pos, len(names))
        pos_lang = pos + 16 + 8 * len(names)
        for ni, n in enumerate(names):
            langs = sorted(tree[t][n])
            struct.pack_into('<II', out, pos + 16 + 8 * ni, n, 0x80000000 | pos_lang)
            put_dir(pos_lang, len(langs))
            for li, lang in enumerate(langs):
                struct.pack_into('<II', out, pos_lang + 16 + 8 * li, lang, pos_entry)
                blob = tree[t][n][lang]
                struct.pack_into('<IIII', out, pos_entry, rva + data_off + len(blobs), len(blob), 0, 0)
                blobs += blob + b'\0' * (align(len(blob), 8) - len(blob))
                pos_entry += 16
            pos_lang += 16 + 8 * len(langs)
        pos = pos_lang
    assert pos == entries_off and pos_entry == entries_off + 16 * n_langs
    return bytes(out + blobs)


def checksum(data, at):
    """جمع‌آزمای استاندارد فایل‌های PE"""
    b = bytearray(data)
    b[at:at + 4] = b'\0\0\0\0'
    if len(b) % 2:
        b += b'\0'
    total = 0
    for (w,) in struct.iter_unpack('<H', b):
        total += w
        total = (total & 0xffff) + (total >> 16)
    total = (total & 0xffff) + (total >> 16)
    return (total + len(data)) & 0xffffffff


def patch_version(blob, version):
    """شمارهٔ نسخه در مشخصات فایل (همان طول؛ مثل 2.5.1.0 → 2.6.2.0)"""
    parts = [int(x) for x in version.split('.')] + [0]
    b = bytearray(blob)
    i = bytes(b).find(struct.pack('<I', 0xFEEF04BD))
    if i < 0:
        raise SystemExit('مشخصات نسخه در فایل پایه پیدا نشد.')
    ms, ls = (parts[0] << 16) | parts[1], (parts[2] << 16) | parts[3]
    struct.pack_into('<IIII', b, i + 8, ms, ls, ms, ls)
    new = ('.'.join(str(x) for x in parts)).encode('utf-16le')
    text = bytes(b)
    found = 0
    for m in re.finditer(rb'(?:\d\x00)+(?:\.\x00(?:\d\x00)+){3}', text):
        if len(m.group()) == len(new):
            b[m.start():m.end()] = new
            found += 1
    if found < 2:
        raise SystemExit('رشتهٔ نسخه در مشخصات فایل پایه شکل دیگری دارد.')
    return bytes(b)


def build(base_path, version, files):
    pe = PE(Path(base_path).read_bytes())
    rs, rl = pe.sec('.rsrc'), pe.sec('.reloc')
    if pe.secs[-1] is not rl or pe.secs[-2] is not rs:
        raise SystemExit('انتظار می‌رفت دو بخشِ آخرِ فایل پایه .rsrc و .reloc باشند.')
    if rl['rptr'] + rl['rsz'] != len(pe.b):
        raise SystemExit('فایل پایه بعد از آخرین بخش، دادهٔ اضافه دارد.')
    tree = read_resources(pe)
    for rid, data in files.items():
        if rid not in tree.get(RT_RCDATA, {}):
            raise SystemExit(f'منبع {rid} در فایل پایه نیست.')
        lang = next(iter(tree[RT_RCDATA][rid]))
        tree[RT_RCDATA][rid] = {lang: data}
    for n in tree[RT_VERSION]:
        for lang in tree[RT_VERSION][n]:
            tree[RT_VERSION][n][lang] = patch_version(tree[RT_VERSION][n][lang], version)
    new_rsrc = build_rsrc(tree, rs['va'])
    reloc_data = bytes(pe.b[rl['rptr']:rl['rptr'] + rl['rsz']])

    b = bytearray(pe.b[:rs['rptr']])
    raw = align(len(new_rsrc), pe.file_align)
    b += new_rsrc + b'\0' * (raw - len(new_rsrc))
    new_reloc_ptr = len(b)
    b += reloc_data
    new_reloc_va = align(rs['va'] + len(new_rsrc), pe.sec_align)
    # سرآیند بخش‌ها
    struct.pack_into('<IIII', b, rs['o'] + 8, len(new_rsrc), rs['va'], raw, rs['rptr'])
    struct.pack_into('<IIII', b, rl['o'] + 8, rl['vsz'], new_reloc_va, rl['rsz'], new_reloc_ptr)
    # پوشه‌های داده: منابع (۲) و جابه‌جایی‌ها (۵)
    struct.pack_into('<II', b, pe.dd + 2 * 8, rs['va'], len(new_rsrc))
    old_reloc_dir = struct.unpack_from('<II', pe.b, pe.dd + 5 * 8)
    if old_reloc_dir[0] != rl['va']:
        raise SystemExit('جدول جابه‌جایی‌ها در فایل پایه جای دیگری است.')
    struct.pack_into('<II', b, pe.dd + 5 * 8, new_reloc_va, old_reloc_dir[1])
    # اندازهٔ تصویر در حافظه و اندازهٔ دادهٔ مقداردهی‌شده
    struct.pack_into('<I', b, pe.opt + 56, align(new_reloc_va + rl['vsz'], pe.sec_align))
    old_init = struct.unpack_from('<I', pe.b, pe.opt + 8)[0]
    struct.pack_into('<I', b, pe.opt + 8, old_init - rs['rsz'] + raw)
    struct.pack_into('<I', b, pe.opt + 64, checksum(b, pe.opt + 64))
    return bytes(b)


def verify(exe, files, version):
    """فایل ساخته‌شده را دوباره می‌خواند و همه‌چیز را کنترل می‌کند"""
    pe = PE(exe)
    tree = read_resources(pe)
    for rid, data in files.items():
        got = next(iter(tree[RT_RCDATA][rid].values()))
        if got != data:
            raise SystemExit(f'منبع {rid} بعد از ساخت با فایل اصلی یکی نیست.')
    prev = 0
    for s in pe.secs:                                   # بخش‌ها باید پشت‌سرهم و بی‌فاصله باشند
        if prev and s['va'] != prev:
            raise SystemExit(f'بخش {s["name"]} در نشانیِ درست نیست.')
        prev = align(s['va'] + s['vsz'], pe.sec_align)
    if struct.unpack_from('<I', pe.b, pe.opt + 56)[0] != prev:
        raise SystemExit('اندازهٔ تصویر (SizeOfImage) درست نیست.')
    last = pe.secs[-1]
    if last['rptr'] + last['rsz'] != len(exe):
        raise SystemExit('طول فایل با جدول بخش‌ها نمی‌خواند.')
    if struct.unpack_from('<I', pe.b, pe.opt + 64)[0] != checksum(exe, pe.opt + 64):
        raise SystemExit('جمع‌آزمای فایل درست نیست.')
    ver = next(iter(next(iter(tree[RT_VERSION].values())).values()))
    if (version + '.0').encode('utf-16le') not in ver:
        raise SystemExit('شمارهٔ نسخه در مشخصات فایل نیست.')
    return tree


def main():
    ap = argparse.ArgumentParser(description='ساخت فایل نصب ویندوز')
    ap.add_argument('--base', required=True, help='فایل نصبِ نسخهٔ قبلی (بدنهٔ اجرایی از آن برداشته می‌شود)')
    ap.add_argument('--out', default=str(ROOT / 'windows-installer'), help='پوشهٔ خروجی')
    ap.add_argument('--name', default='00-windows-v{v}.exe', help='نام فایل خروجی؛ {v} = شمارهٔ نسخه')
    ap.add_argument('--extract', metavar='پوشه', help='فقط محتوای فایل پایه را در این پوشه بیرون بریز (برای آزمایشِ «نصب روی نسخهٔ قبلی») و تمام')
    a = ap.parse_args()

    if a.extract:
        tree = read_resources(PE(Path(a.base).read_bytes()))
        names = {101: 'index.html', 102: 'icon.ico', 103: 'icon-192.png', 104: 'icon-512.png', 105: 'manifest.webmanifest', 106: 'install.ps1'}
        out_dir = Path(a.extract)
        out_dir.mkdir(parents=True, exist_ok=True)
        for rid, name in names.items():
            data = next(iter(tree[RT_RCDATA][rid].values()))
            (out_dir / name).write_bytes(data)
            print(f'  {name}: {len(data):,} بایت')
        m = re.search(rb"const APP_VERSION = '([0-9.]+)'", next(iter(tree[RT_RCDATA][101].values())))
        print(f'بیرون ریخته شد در {out_dir} — نسخهٔ برنامهٔ داخل فایل پایه: {m.group(1).decode() if m else "نامعلوم"}')
        return 0

    index = (ROOT / 'index.html').read_bytes()
    m = re.search(rb"const APP_VERSION = '([0-9.]+)'", index)
    if not m:
        raise SystemExit('شمارهٔ نسخه در index.html پیدا نشد.')
    version = m.group(1).decode()
    ps = (HERE / 'install.ps1').read_bytes()
    if not ps.startswith(b'\xef\xbb\xbf') or b'\n' in ps.replace(b'\r\n', b''):
        raise SystemExit('install.ps1 باید UTF-8 با BOM و پایان خط CRLF باشد.')
    base_bytes = Path(a.base).read_bytes()
    base_tree = read_resources(PE(base_bytes))
    # خودآزمایی: فایل پایه از روی محتوای خودش دوباره ساخته می‌شود و باید بایت‌به‌بایت همان شود.
    # این نشان می‌دهد چیدمانی که این ابزار می‌سازد دقیقاً همان چیدمانِ فایل نصبِ قبلی است.
    vblob = next(iter(next(iter(base_tree[RT_VERSION].values())).values()))
    vi = vblob.find(struct.pack('<I', 0xFEEF04BD))
    ms, ls = struct.unpack_from('<II', vblob, vi + 8)
    base_version = f'{ms >> 16}.{ms & 0xffff}.{ls >> 16}'
    same = {rid: next(iter(v.values())) for rid, v in base_tree[RT_RCDATA].items()}
    if build(a.base, base_version, same) != base_bytes:
        raise SystemExit('خودآزمایی ناموفق: بازسازیِ فایل پایه با خودش یکی نشد؛ فایل نصب ساخته نشد.')
    print(f'خودآزمایی: فایل پایه (نسخهٔ {base_version}) بایت‌به‌بایت بازسازی شد ✓')
    files = {
        101: index,
        102: next(iter(base_tree[RT_RCDATA][102].values())),          # آیکون میان‌بر از فایل پایه
        103: (ROOT / 'icon-192.png').read_bytes(),
        104: (ROOT / 'icon-512.png').read_bytes(),
        105: (ROOT / 'manifest.webmanifest').read_bytes(),
        106: ps,
    }
    exe = build(a.base, version, files)
    verify(exe, files, version)
    out_dir = Path(a.out)
    out_dir.mkdir(parents=True, exist_ok=True)
    out = out_dir / a.name.format(v=version)
    out.write_bytes(exe)
    print(f'ساخته شد: {out}')
    print(f'  نسخهٔ برنامهٔ داخل آن: {version}')
    print(f'  اندازه: {len(exe):,} بایت')
    print(f'  SHA-256: {hashlib.sha256(exe).hexdigest()}')
    print(f'  SHA-256 فایل index.html داخل آن: {hashlib.sha256(index).hexdigest()}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
