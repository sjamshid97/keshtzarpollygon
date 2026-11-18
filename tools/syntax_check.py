#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""بررسی نحوی: اسکریپت‌های داخل index.html و demo.html و فایل sw.js را با node --check می‌سنجد."""
import re, subprocess, sys, tempfile
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
bad = 0
for name in ('index.html', 'demo.html'):
    text = (ROOT / name).read_text(encoding='utf-8')
    for n, m in enumerate(re.finditer(r'<script>(.*?)</script>', text, re.S), 1):
        body = m.group(1)
        if not body.strip():
            continue
        line0 = text[:m.start(1)].count('\n')
        with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False, encoding='utf-8') as f:
            f.write('\n' * line0 + body)           # شماره‌خط‌ها مثل فایل اصلی بماند
        r = subprocess.run(['node', '--check', f.name], capture_output=True, text=True)
        if r.returncode:
            bad += 1
            print(f'✗ {name} اسکریپت {n}:\n' + r.stderr.replace(f.name, name)[:1200])
r = subprocess.run(['node', '--check', str(ROOT / 'sw.js')], capture_output=True, text=True)
if r.returncode:
    bad += 1
    print('✗ sw.js:\n' + r.stderr[:1200])
print('نحو درست است.' if not bad else f'{bad} خطای نحوی')
sys.exit(1 if bad else 0)
