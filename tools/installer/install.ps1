# ============================================================
#  نصب «دفترچهٔ مختصات قطعات — بذر گواهی‌شده» روی ویندوز
#  - برنامه را در LOCALAPPDATA\SeedCoordinates کپی می‌کند (بدون نیاز به دسترسی مدیر)
#  - میان‌بر دسکتاپ و منوی استارت می‌سازد که با کروم/اِج در حالت
#    «برنامه» (بدون نوار آدرس) باز می‌شود
#  - هیچ اینترنتی لازم نیست
#  - داده‌های کاربر داخل مرورگر است؛ این اسکریپت به آن دست نمی‌زند
#  - گزارش کار در فایل install-log.txt کنار برنامه نوشته می‌شود
#
#  کد پایان:  0 = نصب شد  ·  1 = خطای پیش‌بینی‌نشده  ·  5 = فایل‌ها کپی شد ولی میان‌بر دسکتاپ ساخته نشد
#
#  این فایل باید با «UTF-8 همراه BOM» و پایان خط CRLF ذخیره شود
#  (tools/installer/build_installer.py خودش این را بررسی می‌کند).
# ============================================================
param([switch]$Uninstall)

$ErrorActionPreference = 'Stop'
$appName   = 'دفترچهٔ مختصات قطعات — بذر گواهی‌شده'
$shortName = 'دفترچهٔ مختصات قطعات'
$plainName = 'Seed Coordinates'
$dest      = Join-Path $env:LOCALAPPDATA 'SeedCoordinates'
$desktop   = [Environment]::GetFolderPath('Desktop')
$startMenu = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs'
$logFile   = Join-Path $dest 'install-log.txt'

function Show($msg, $color = 'Green') { Write-Host $msg -ForegroundColor $color }

function Log($msg) {
  try {
    $line = (Get-Date -Format 'yyyy-MM-dd HH:mm:ss') + '  ' + $msg
    Add-Content -LiteralPath $logFile -Value $line -Encoding UTF8
  } catch { }
}

function Get-Browser {
  $cands = @(
    (Join-Path $env:ProgramFiles 'Google\Chrome\Application\chrome.exe'),
    (Join-Path ${env:ProgramFiles(x86)} 'Google\Chrome\Application\chrome.exe'),
    (Join-Path $env:LOCALAPPDATA 'Google\Chrome\Application\chrome.exe'),
    (Join-Path $env:ProgramFiles 'Microsoft\Edge\Application\msedge.exe'),
    (Join-Path ${env:ProgramFiles(x86)} 'Microsoft\Edge\Application\msedge.exe')
  )
  foreach ($c in $cands) { if ($c -and (Test-Path -LiteralPath $c)) { return $c } }
  return $null
}

# اگر از قبل میان‌برِ همین برنامه روی این کامپیوتر هست، برنامه با همان مرورگرِ قبلی باز می‌شود.
# دلیل: پروژه‌ها و بازدیدها داخل همان مرورگر ذخیره شده‌اند؛ با مرورگر دیگر، دفترچه خالی دیده می‌شود.
# خروجی: مسیر مرورگر قبلی ، یا 'default' اگر میان‌بر قبلی خودِ فایل برنامه را باز می‌کرد ، یا $null اگر چیزی پیدا نشد.
# میان‌بر قبلی فقط خوانده می‌شود (از روی یک رونوشتِ موقت) و هیچ تغییری نمی‌کند.
function Get-PreviousLauncher {
  foreach ($folder in @($desktop, $startMenu)) {
    foreach ($n in @($plainName, $shortName)) {
      $copy = $null
      try {
        $p = Join-Path $folder ($n + '.lnk')
        if (Test-Path -LiteralPath $p) {
          $copy = Join-Path $env:TEMP ('SeedCoordinates-old-' + [Guid]::NewGuid().ToString('N').Substring(0, 8) + '.lnk')
          Copy-Item -LiteralPath $p -Destination $copy -Force
          $old = (New-Object -ComObject WScript.Shell).CreateShortcut($copy)
          $t = [string]$old.TargetPath
          $a = [string]$old.Arguments
          Log ('previous shortcut [' + $p + '] target [' + $t + '] arguments [' + $a + ']')
          if (($t -match '\\(chrome|msedge)\.exe$') -and ($a -match 'SeedCoordinates') -and (Test-Path -LiteralPath $t)) { return $t }
          if ($t -match '\\SeedCoordinates\\index\.html$') { return 'default' }
        }
      } catch {
        Log ('previous shortcut: could not read: ' + $_.Exception.Message)
      } finally {
        if ($copy) { try { Remove-Item -LiteralPath $copy -Force } catch { } }
      }
    }
  }
  return $null
}

# میان‌بر اول با یک نام سادهٔ انگلیسی ساخته می‌شود و بعد نامش فارسی می‌شود.
# دلیل: ابزار میان‌برسازِ ویندوز (WScript.Shell) هنگام «ذخیره» نام فارسی را نمی‌پذیرد
# (نصبِ نسخهٔ ۲٫۵٫۱ همین‌جا متوقف شد)، ولی تغییر نامِ فایلِ ساخته‌شده مشکلی ندارد.
# اگر نام فارسی نشد، نام انگلیسی می‌ماند (همان نامی که روی کامپیوتر کاربر کار کرده است).
# خروجی: مسیر میان‌بر، یا $null اگر اصلاً ساخته نشد. هیچ خطایی نصب را متوقف نمی‌کند.
function New-AppShortcut($folder, $name, $fallbackName, $target, $argLine, $icon) {
  $made = $null
  $temp = Join-Path $folder ('SeedCoordinates-new-' + [Guid]::NewGuid().ToString('N').Substring(0, 8) + '.lnk')
  try {
    if (-not (Test-Path -LiteralPath $folder)) { New-Item -ItemType Directory -Force -Path $folder | Out-Null }
    $sh = New-Object -ComObject WScript.Shell
    $sc = $sh.CreateShortcut($temp)
    $sc.TargetPath = $target
    if ($argLine) { $sc.Arguments = $argLine }
    if ($icon -and (Test-Path -LiteralPath $icon)) { $sc.IconLocation = $icon }
    $sc.WorkingDirectory = $dest
    $sc.Description = 'Seed Coordinates Notebook'
    $sc.Save()
    $made = $temp
  } catch {
    Log ('shortcut: create failed in [' + $folder + ']: ' + $_.Exception.Message)
    return $null
  }
  foreach ($n in @($name, $fallbackName)) {
    $final = Join-Path $folder ($n + '.lnk')
    try {
      if (Test-Path -LiteralPath $final) { Remove-Item -LiteralPath $final -Force }
      [System.IO.File]::Move($temp, $final)
      $made = $final
      Log ('shortcut: ok [' + $final + ']')
      break
    } catch {
      Log ('shortcut: rename to [' + $n + '] failed: ' + $_.Exception.Message)
    }
  }
  return $made
}

# ---------------- حذف ----------------
if ($Uninstall) {
  $sure = $false
  try {
    Add-Type -AssemblyName System.Windows.Forms
    $answer = [System.Windows.Forms.MessageBox]::Show(
      "برنامهٔ «$shortName» از این کامپیوتر حذف شود؟`n`nپروژه‌ها و بازدیدهای شما داخل مرورگر می‌ماند و پاک نمی‌شود.",
      'حذف برنامه',
      [System.Windows.Forms.MessageBoxButtons]::YesNo,
      [System.Windows.Forms.MessageBoxIcon]::Warning)
    $sure = ($answer -eq [System.Windows.Forms.DialogResult]::Yes)
  } catch { $sure = $false }
  if (-not $sure) { exit 0 }
  # پوشهٔ برنامه «پوشهٔ جاریِ» همین پنجره است و تا وقتی چنین باشد ویندوز اجازهٔ حذفش را نمی‌دهد
  try { [System.IO.Directory]::SetCurrentDirectory($env:SystemRoot) } catch { }
  try { Set-Location -LiteralPath $env:SystemRoot } catch { }
  $left = 0
  foreach ($p in @(
      (Join-Path $desktop "$shortName.lnk"),
      (Join-Path $desktop "$plainName.lnk"),
      (Join-Path $desktop "حذف-$shortName.lnk"),
      (Join-Path $startMenu "$shortName.lnk"),
      (Join-Path $startMenu "$plainName.lnk"),
      (Join-Path $startMenu "حذف $shortName.lnk"),
      (Join-Path $startMenu "Uninstall $plainName.lnk")
    )) {
    try { if (Test-Path -LiteralPath $p) { Remove-Item -LiteralPath $p -Force } } catch { $left = $left + 1 }
  }
  try { if (Test-Path -LiteralPath $dest) { Remove-Item -LiteralPath $dest -Recurse -Force } } catch { $left = $left + 1 }
  $done = 'برنامه حذف شد.'
  if ($left -gt 0) { $done = 'برنامه حذف شد، ولی چند فایل باقی ماند. اگر برنامه باز است آن را ببندید و دوباره امتحان کنید.' }
  try {
    [System.Windows.Forms.MessageBox]::Show(
      "$done`n`nپروژه‌ها و بازدیدهای شما داخل مرورگر است و پاک نشده.",
      'حذف برنامه',
      [System.Windows.Forms.MessageBoxButtons]::OK,
      [System.Windows.Forms.MessageBoxIcon]::Information) | Out-Null
  } catch { }
  exit 0
}

# ---------------- نصب ----------------
$src = Join-Path $PSScriptRoot 'app'
if (-not (Test-Path -LiteralPath (Join-Path $src 'index.html'))) {
  Show "`n❌ پوشهٔ app پیدا نشد. فایل نصب را دوباره اجرا کنید." 'Red'
  exit 1
}

Show "`n=== نصب $appName ===" 'Cyan'
New-Item -ItemType Directory -Force -Path $dest | Out-Null
Log '---- install start ----'

# میان‌بر قبلی پیش از هر تغییری خوانده می‌شود
$previous = $null
try { $previous = Get-PreviousLauncher } catch { Log ('previous shortcut: ' + $_.Exception.Message) }

Copy-Item (Join-Path $src '*') $dest -Recurse -Force
# یک نسخه از همین اسکریپت کنار برنامه می‌ماند تا «حذف برنامه» همیشه کار کند
try { Copy-Item -LiteralPath $PSCommandPath -Destination (Join-Path $dest 'uninstall.ps1') -Force } catch { }
Log ('files copied to [' + $dest + ']')
Show "✅ فایل‌ها کپی شد:  $dest"

$html = Join-Path $dest 'index.html'
$fileUrl = 'file:///' + ($html -replace '\\', '/')
$icon = Join-Path $dest 'icon.ico'
$desktopLink = $null

try {
  $found = Select-String -LiteralPath $html -Pattern "const APP_VERSION = '([0-9.]+)'" | Select-Object -First 1
  if ($found) { Log ('app version [' + $found.Matches[0].Groups[1].Value + ']') }
} catch { }

# از این‌جا به بعد فقط میان‌برهاست. فایل‌های برنامه کپی شده‌اند و میان‌برِ قبلی (اگر بود) همچنان کار می‌کند.
try {
  $browser = $null
  try { $browser = Get-Browser } catch { Log ('browser search: ' + $_.Exception.Message) }
  if ($previous -eq 'default') {
    $browser = $null
    Log 'launcher: same as the previous shortcut (opens index.html with the default browser)'
  } elseif ($previous) {
    $browser = $previous
    Log 'launcher: same browser as the previous shortcut'
  }

  if ($browser) {
    Show "✅ مرورگر: $browser"
    Log ('browser [' + $browser + ']')
    $argLine = "--app=`"$fileUrl`" --window-size=1400,950"
    $desktopLink = New-AppShortcut $desktop $shortName $plainName $browser $argLine $icon
    $menuLink = New-AppShortcut $startMenu $shortName $plainName $browser $argLine $icon
  } else {
    Log 'browser: none chosen; the shortcut opens index.html with the default browser'
    $desktopLink = New-AppShortcut $desktop $shortName $plainName $html '' $icon
    $menuLink = New-AppShortcut $startMenu $shortName $plainName $html '' $icon
    Show "⚠ میان‌بر ساده ساخته شد (با مرورگر پیش‌فرض باز می‌شود)." 'Yellow'
  }

  # «حذف برنامه» فقط در منوی استارت (نه روی دسکتاپ، تا اشتباهی زده نشود)؛ پیش از حذف هم می‌پرسد
  $unArgs = "-NoProfile -ExecutionPolicy Bypass -File `"$dest\uninstall.ps1`" -Uninstall"
  $psExe = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
  if (-not (Test-Path -LiteralPath $psExe)) { $psExe = 'powershell.exe' }
  $unLink = New-AppShortcut $startMenu ('حذف ' + $shortName) ('Uninstall ' + $plainName) $psExe $unArgs $icon

  $wanted = Join-Path $desktop ($shortName + '.lnk')
  if ($desktopLink -and ($desktopLink -ne $wanted)) {
    # میان‌بر با نام دیگری ساخته شد. پنجرهٔ پایانیِ نصب فقط نام فارسی را می‌شناسد، پس برنامه همین‌جا باز می‌شود.
    Show "⚠ نام فارسی برای میان‌بر پذیرفته نشد؛ میان‌بر با نام «$plainName» روی دسکتاپ است." 'Yellow'
    try { Start-Process -FilePath $desktopLink } catch { Log ('open failed: ' + $_.Exception.Message) }
  }
} catch {
  Log ('shortcuts: unexpected error: ' + $_.Exception.Message)
}

if (-not $desktopLink) {
  Log '---- install incomplete: files copied, but no desktop shortcut (exit 5) ----'
  Show "`n⚠ فایل‌های برنامه کپی شد، ولی میان‌بر دسکتاپ ساخته نشد." 'Yellow'
  exit 5
}

Log '---- install done ----'
Show "`n🎉 تمام شد! آیکون «$shortName» روی دسکتاپ است." 'Green'
Show "برنامه بدون اینترنت باز می‌شود و داده‌ها روی همین کامپیوتر (داخل مرورگر) می‌مانند."
Show "`n📌 برای امنیت داده: هر چند وقت یک‌بار در برنامه «پشتیبان کامل (با عکس و امضا)» بگیرید." 'Cyan'
exit 0
