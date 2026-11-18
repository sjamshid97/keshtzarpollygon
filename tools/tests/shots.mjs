// عکس از چند صفحهٔ برنامه (برای نگاه کردن با چشم). خروجی: tools/tests/out/shots/*.png
// اجرا:  node tools/tests/shots.mjs
import { site, launch, open, sleep, act, type, press, waitDialog, closeDialogs, setFile, downloads, clearDl, txt, OUT, HERE } from './h.mjs';
import fs from 'fs'; import path from 'path';
const dir = path.join(OUT, 'shots'); fs.mkdirSync(dir, { recursive: true });
const font = fs.readFileSync(path.join(HERE, '..', 'node_modules', 'vazirmatn', 'fonts', 'webfonts', 'Vazirmatn-Regular.woff2')).toString('base64');
const st = await site(); const browser = await launch();
const withFont = page => page.addStyleTag({ content: '@font-face{font-family:"VZ";src:url(data:font/woff2;base64,' + font + ') format("woff2")} *{font-family:"VZ",Tahoma,sans-serif !important}' });
for (const [tag, vp] of [['pc', { width: 1280, height: 860 }], ['phone', { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }]]) {
  const page = await open(browser, st, { viewport: vp }); await withFont(page);
  const shot = async name => { await sleep(350); await page.screenshot({ path: path.join(dir, tag + '-' + name + '.png') }); };
  await act(page, 'data:demo'); await closeDialogs(page);
  const [a] = await page.evaluate(() => state.projects[0].plots.map(x => x.id));
  await page.$eval('[data-plot="' + a + '"] [data-act="visit:add"]', e => e.click()); await sleep(300); await page.evaluate(() => visitClose());
  await clearDl(page); await act(page, 'backup:export'); const bk = txt((await downloads(page))[0]);
  await setFile(page, '#importFile', 'پشتیبان.json', bk); await waitDialog(page); await shot('1-restore-dialog'); await press(page, 'alt'); await waitDialog(page); await shot('2-replace-confirm'); await press(page, 'cancel');
  await setFile(page, '#importFile', 'پشتیبان.json', bk); await press(page, 'ok'); await waitDialog(page); await shot('3-restore-result'); await closeDialogs(page);
  await act(page, 'plot:delete', '[data-id="' + a + '"]'); await waitDialog(page); await shot('4-delete-plot'); await press(page, 'cancel');
  await type(page, '[data-plot="' + a + '"] textarea[data-ring="outer"]', '51.528883, 35.151538\n51.527815, 35.150378\n51.528945, 35.149341\n51.530513, 35.150312'); await sleep(500);
  await page.$eval('[data-plot="' + a + '"] .warn-slot', e => e.scrollIntoView({ block: 'center' })); await shot('5-swap-warning');
  await page.evaluate(() => { storageFull = true; showStorageWarning(); window.scrollTo(0, 0); }); await shot('6-storage-full');
  await page.evaluate(() => { storageFull = false; showStorageWarning(); cloudToast('GeoJSON هر قطعه جداگانه دانلود شد (۲ فایل)', 5000); }); await shot('7-toast');
  await page.close();
}
await browser.close(); st.close(); console.log('عکس‌ها در ' + dir);
