#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""بررسی اسکریپت PowerShell نصاب بدون ویندوز.

دو کار می‌کند:
  ۱) نحو: اسکریپت با تجزیه‌گر tree-sitter خوانده می‌شود و هر جای ناخوانا گزارش می‌شود.
  ۲) نام‌ها: هر متغیر باید جایی مقدار گرفته باشد؛ هر فرمان، هر پارامترِ فرمان، هر نوع و هر عضو
     باید در فهرستِ «شناخته‌شده برای Windows PowerShell 5.1» پایین باشد. این جلوی غلط تایپی را می‌گیرد.

این بررسی اسکریپت را «اجرا» نمی‌کند؛ رفتار واقعی فقط روی ویندوز واقعی دیده می‌شود.

نیاز:  pip install tree-sitter tree-sitter-powershell
اجرا:   python3 tools/installer/ps_check.py tools/installer/install.ps1
"""
import re
import sys
import unicodedata
from pathlib import Path

try:
    import tree_sitter_powershell as tsp
    from tree_sitter import Language, Parser
except ImportError:
    print('برای این بررسی لازم است:  pip install tree-sitter tree-sitter-powershell')
    sys.exit(2)

# فرمان‌های Windows PowerShell 5.1 که اسکریپت اجازه دارد به کار ببرد، با پارامترهای نام‌دارِ مجاز
CMDLETS = {
    'write-host': {'foregroundcolor'},
    'get-date': {'format'},
    'add-content': {'literalpath', 'value', 'encoding'},
    'join-path': set(),
    'test-path': {'literalpath'},
    'new-item': {'itemtype', 'force', 'path'},
    'out-null': set(),
    'new-object': {'comobject'},
    'remove-item': {'literalpath', 'force', 'recurse'},
    'copy-item': {'literalpath', 'destination', 'force', 'recurse'},
    'add-type': {'assemblyname'},
    'select-string': {'literalpath', 'pattern'},
    'select-object': {'first'},
    'start-process': {'filepath', 'argumentlist'},
    'set-location': {'literalpath'},
}
AUTO_VARS = {'_', 'null', 'true', 'false', 'psscriptroot', 'pscommandpath', 'erroractionpreference'}
ENV_VARS = {'localappdata', 'appdata', 'programfiles', 'programfiles(x86)', 'temp', 'systemroot'}
TYPES = {'switch', 'string', 'environment', 'guid', 'system.io.file', 'system.io.directory',
         'system.windows.forms.messagebox', 'system.windows.forms.messageboxbuttons',
         'system.windows.forms.messageboxicon', 'system.windows.forms.dialogresult'}
MEMBERS = {
    # روش‌ها
    'getfolderpath', 'newguid', 'tostring', 'substring', 'move', 'setcurrentdirectory', 'show', 'createshortcut', 'save',
    # ویژگی‌های میان‌بر (WshShortcut)
    'targetpath', 'arguments', 'iconlocation', 'workingdirectory', 'description',
    # خطا و نتیجهٔ جست‌وجو
    'exception', 'message', 'matches', 'groups', 'value',
    # مقدارهای شمارشی
    'yesno', 'ok', 'warning', 'information', 'yes',
}
COLORS = {'green', 'red', 'cyan', 'yellow'}


def parse(src):
    return Parser(Language(tsp.language())).parse(src)


def text(src, n):
    return src[n.start_byte:n.end_byte].decode('utf-8', 'replace')


def analyse(src):
    """→ فهرست مشکل‌ها: (خط، توضیح)"""
    tree = parse(src)
    bad = []
    funcs, assigned, used, commands = set(), set(), [], []

    def line(n):
        return n.start_point[0] + 1

    def varname(n):
        s = text(src, n).lstrip('$')
        if s.startswith('{') and s.endswith('}'):
            s = s[1:-1]
        return s.lower()

    def walk(n, in_left=False):
        if n.type == 'ERROR' or n.is_missing:
            bad.append((line(n), 'نحو: ' + repr(text(src, n)[:70])))
        if n.type == 'function_statement':
            for ch in n.children:
                if ch.type == 'function_name':
                    funcs.add(text(src, ch).lower())
        if n.type == 'variable':
            name = varname(n)
            if in_left:
                assigned.add(name)
            else:
                used.append((name, line(n)))
        if n.type in ('script_parameter', 'foreach_statement'):
            for ch in n.children:
                if ch.type == 'variable':
                    assigned.add(varname(ch))
        if n.type == 'command':
            name, params = '', []
            for ch in n.children:
                if ch.type == 'command_name':
                    name = text(src, ch)
                if ch.type == 'command_elements':
                    params = [(text(src, x).lstrip('-').lower(), line(x)) for x in ch.children if x.type == 'command_parameter']
            commands.append((name, params, line(n)))
        if n.type == 'type_literal':
            t = text(src, n).strip('[]').lower()
            if t not in TYPES:
                bad.append((line(n), 'نوع ناشناخته: [' + t + ']'))
        if n.type == 'member_name':
            m = text(src, n).lower()
            if m not in MEMBERS:
                bad.append((line(n), 'عضو ناشناخته: .' + text(src, n)))
        for ch in n.children:
            walk(ch, in_left or n.type == 'left_assignment_expression')

    walk(tree.root_node)
    # متغیرهای داخل رشته‌های دوگیومه‌ای را tree-sitter جدا نمی‌کند؛ خودمان پیدا می‌کنیم
    def strings(n):
        if n.type == 'expandable_string_literal':
            s = text(src, n)
            for m in re.finditer(r'(?<!`)\$(\{[^}]+\}|[A-Za-z_][A-Za-z0-9_]*)(:?)', s):
                name = m.group(1).strip('{}').lower()
                used.append((name, line(n)))
                if m.group(2):
                    bad.append((line(n), 'متغیرِ چسبیده به «:» داخل رشته (PowerShell آن را نامِ درایو می‌خواند): ' + m.group(0)))
            if re.search(r'(?<!`)\$\(', s):
                bad.append((line(n), 'عبارتِ $( ) داخل رشته: این بررسی آن را نمی‌بیند؛ ساده‌ترش کنید'))
            # حرف فارسی هم برای PowerShell «حرف» است: "$nameرا" یعنی متغیری به نام nameرا (که خالی است)
            for m in re.finditer(r'(?<!`)\$[A-Za-z_][A-Za-z0-9_]*(.)', s, re.S):
                ch = m.group(1)
                if ord(ch) > 127 and unicodedata.category(ch) in ('Lu', 'Ll', 'Lt', 'Lm', 'Lo', 'Nd'):
                    bad.append((line(n), 'متغیرِ چسبیده به حرفِ غیرلاتین داخل رشته (نامش عوض می‌شود): ' + m.group(0)))
        for ch in n.children:
            strings(ch)

    strings(tree.root_node)
    for name, ln in used:
        if name.startswith('env:'):
            if name[4:] not in ENV_VARS:
                bad.append((ln, 'متغیر محیطی ناشناخته: $' + name))
        elif name not in assigned and name not in AUTO_VARS:
            bad.append((ln, 'متغیری که هیچ‌جا مقدار نگرفته: $' + name))
    for name, params, ln in commands:
        low = name.lower()
        if low in funcs:
            if params:
                bad.append((ln, 'تابعِ داخلی با پارامتر نام‌دار صدا زده شده: ' + name))
            continue
        if low not in CMDLETS:
            bad.append((ln, 'فرمان ناشناخته: ' + name))
            continue
        for p, pl in params:
            if p not in CMDLETS[low]:
                bad.append((pl, f'پارامتر ناشناخته برای {name}: -{p}'))
    # رنگ‌های Write-Host
    for m in re.finditer(rb"\}\s*'([A-Za-z]+)'\s*$|\" '([A-Za-z]+)'\s*$", src, re.M):
        col = (m.group(1) or m.group(2)).decode().lower()
        if col not in COLORS:
            bad.append((src[:m.start()].count(b'\n') + 1, 'رنگ ناشناخته: ' + col))
    return sorted(set(bad))


def selftest():
    """بررسی‌کننده باید اشتباه‌های ساختگی را بگیرد؛ وگرنه «درست است» گفتنش ارزشی ندارد."""
    good = "$a = 'x'\r\nfunction F($p) { Write-Host $p -ForegroundColor 'Green' }\r\nif ($a) { F $a }\r\n"
    cases = {
        'آکولاد بسته‌نشده': "$a = 1\r\nif ($a) { Write-Host $a\r\n",
        'گیومهٔ بسته‌نشده': "$a = 'x\r\nWrite-Host $a\r\n",
        'غلط تایپی در نام متغیر': "$dest = 'x'\r\nWrite-Host $dset\r\n",
        'فرمان ناشناخته': "$a = 1\r\nWrite-Hots $a\r\n",
        'پارامتر ناشناخته': "$a = 'x'\r\nTest-Path -LitralPath $a\r\n",
        'عضو ناشناخته': "$a = 'x'\r\n$b = $a.Substrng(0, 1)\r\n",
        'نوع ناشناخته': "$b = [System.IO.Fil]::Move('a', 'b')\r\n",
        'متغیر چسبیده به دونقطه': "$a = 'x'\r\n$b = \"نتیجه $a: خوب\"\r\n",
        'متغیر ناشناخته داخل رشته': "$a = 'x'\r\n$b = \"سلام $nam\"\r\n",
        'متغیر چسبیده به حرف فارسی': "$a = 'x'\r\n$b = \"$aرا ببینید\"\r\n",
    }
    ok = not analyse(good.encode())
    for label, code in cases.items():
        if not analyse(code.encode()):
            print('  ✗ خودآزمایی: این اشتباه گرفته نشد → ' + label)
            ok = False
    return ok


def check(path):
    data = Path(path).read_bytes()
    bom = data.startswith(b'\xef\xbb\xbf')
    src = data[3:] if bom else data
    crlf = src.count(b'\r\n')
    lf = src.count(b'\n') - crlf
    print(f'{path}: {len(src)} بایت · BOM={"دارد" if bom else "ندارد"} · خط‌های CRLF={crlf} · LF تنها={lf}')
    bad = analyse(src)
    for ln, what in bad:
        print(f'  ✗ خط {ln}: {what}')
    if not bom:
        print('  ✗ فایل باید با BOM ذخیره شود، وگرنه PowerShell ویندوز متن فارسی را خراب می‌خواند.')
    if lf:
        print('  ✗ پایان خط‌ها باید CRLF باشد.')
    # نویسه‌هایی که PowerShell به‌جای گیومه یا خط تیره می‌خواند و بیرون از رشته دردسر می‌سازند
    odd = sorted({ch for ch in src.decode('utf-8') if ch in '\u2018\u2019\u201a\u201b\u201c\u201d\u201e'})
    if odd:
        print('  ✗ گیومهٔ «خمیده» در فایل هست (PowerShell آن را گیومهٔ واقعی حساب می‌کند): ' + ' '.join(odd))
    ok = not bad and bom and lf == 0 and not odd
    print('  ✓ نحو و نام‌ها درست است.' if ok else '  ✗ اسکریپت مشکل دارد.')
    return ok


if __name__ == '__main__':
    if not selftest():
        print('✗ خودآزماییِ بررسی‌کننده ناموفق بود؛ به نتیجه‌اش اعتماد نکنید.')
        sys.exit(1)
    print('خودآزماییِ بررسی‌کننده: ۱۰ اشتباه ساختگی همه گرفته شد ✓')
    files = sys.argv[1:] or ['tools/installer/install.ps1']
    sys.exit(0 if all([check(f) for f in files]) else 1)
