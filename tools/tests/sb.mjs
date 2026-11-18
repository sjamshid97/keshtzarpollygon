// شبیه‌ساز کوچک سرور همگام‌سازی (Supabase) برای آزمایش.
// فقط همان چند درخواستی را جواب می‌دهد که برنامه می‌فرستد؛ به اینترنت وصل نمی‌شود.
import http from 'http';
export async function fakeSupabase() {
  const S = { rows: new Map(), hist: [], log: [], id: 0, down: false };
  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*',
    'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS', 'access-control-expose-headers': '*' };
  const send = (r, code, obj) => { r.writeHead(code, { ...cors, 'content-type': 'application/json' }); r.end(JSON.stringify(obj)); };
  const srv = http.createServer((q, r) => { const u = new URL(q.url, 'http://x'); const chunks = [];
    q.on('data', c => chunks.push(c)); q.on('end', () => { const body = Buffer.concat(chunks).toString('utf8');
      if (S.down) { q.socket.destroy(); return; }
      if (q.method === 'OPTIONS') { r.writeHead(204, cors); return r.end(); }
      const p = u.pathname, key = (u.searchParams.get('key') || '').replace(/^eq\./, '');
      if (p === '/rest/v1/seed_sync') {
        if (q.method === 'GET') { if (!key) return send(r, 200, [...S.rows.values()].slice(0, 1).map(x => ({ key: x.key })));
          const row = S.rows.get(key); return send(r, 200, row ? [row] : []); }
        if (q.method === 'POST') { const arr = JSON.parse(body); const it = Array.isArray(arr) ? arr[0] : arr;
          if (S.rows.has(it.key)) return send(r, 409, { message: 'duplicate key' });
          S.rows.set(it.key, it); S.hist.push({ id: ++S.id, key: it.key, data: it.data }); S.log.push('POST ' + (it.data.device || '')); return send(r, 201, [it]); }
        if (q.method === 'PATCH') { const row = S.rows.get(key); const want = (u.searchParams.get('updated_at') || '').replace(/^eq\./, '');
          if (!row || Date.parse(row.updated_at) !== Date.parse(want)) { S.log.push('PATCH رد شد'); return send(r, 200, []); }
          const b = JSON.parse(body); const nr = { key, data: b.data, updated_at: b.updated_at };
          S.rows.set(key, nr); S.hist.push({ id: ++S.id, key, data: b.data }); S.log.push('PATCH ' + (b.data.device || '')); return send(r, 200, [nr]); }
        if (q.method === 'DELETE') return send(r, 204, []);
      }
      if (p === '/rest/v1/seed_sync_history') return send(r, 200, S.hist.filter(h => h.key === key).slice(-8).reverse().map(h => ({ id: h.id, data: h.data })));
      if (p.startsWith('/rest/v1/rpc/')) return send(r, 200, {});
      if (p === '/rest/v1/seed_heartbeat') return send(r, 200, []);
      if (p === '/auth/v1/health') return send(r, 200, { ok: true });
      send(r, 404, { message: 'not found ' + p }); }); });
  await new Promise(ok => srv.listen(0, '127.0.0.1', ok));
  S.url = 'http://127.0.0.1:' + srv.address().port; S.close = () => srv.close(); S.row = k => S.rows.get(k);
  /* پیوند راه‌اندازی یک دستگاه با همین سرور */
  S.link = (key, auto = true) => 'index.html?srv=' + encodeURIComponent(S.url) + '&tok=anon-test&skey=' + encodeURIComponent(key) + (auto ? '&auto=1' : '');
  return S;
}
