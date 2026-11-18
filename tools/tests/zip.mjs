// خوانندهٔ کوچک فایل ZIP (برای بازکردن فایل‌های Word که برنامه می‌سازد)
import zlib from 'zlib';
export function unzip(buf) {
  let i = buf.length - 22; while (i >= 0 && buf.readUInt32LE(i) !== 0x06054b50) i--;
  if (i < 0) throw new Error('فایل ZIP نیست');
  const n = buf.readUInt16LE(i + 10); let p = buf.readUInt32LE(i + 16); const out = {};
  for (let k = 0; k < n; k++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('فهرست ZIP خراب است');
    const method = buf.readUInt16LE(p + 10), csize = buf.readUInt32LE(p + 20), nlen = buf.readUInt16LE(p + 28), elen = buf.readUInt16LE(p + 30), clen = buf.readUInt16LE(p + 32), off = buf.readUInt32LE(p + 42);
    const name = buf.slice(p + 46, p + 46 + nlen).toString('utf8');
    const ln = buf.readUInt16LE(off + 26), le = buf.readUInt16LE(off + 28); const data = buf.slice(off + 30 + ln + le, off + 30 + ln + le + csize);
    out[name] = method === 0 ? data : zlib.inflateRawSync(data);
    p += 46 + nlen + elen + clen;
  }
  return out;
}
