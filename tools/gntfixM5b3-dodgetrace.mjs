// gntfixM5b3-dodgetrace.mjs — Chrome trace of a guest's first dodge (fix-M5b-r3):
// the longest events of every process/thread in the 600 ms after the key.
// Host + 1 guest (own browsers, no conditioner), room 1 combat. The guest's
// CPU profiler runs around its first --n dodges; per dodge the tool prints
// the rendered-frame gap after the key and the heaviest JS frames (self and
// inclusive time) sampled in that window.
// node tools/gntfixM5b3-dodgeprof.mjs --port 7825 --base http://127.0.0.1:4307/ [--n 3] [--out name.json]
import { args, startServer, bootSession, waitFor, sleep, writeJson, closeClient } from './gntfixM5b3-lib.mjs';

const A = args();
const port = Number(A.port || 7825);
const base = A.base || 'http://127.0.0.1:4307/';
const n = Number(A.n || 3);
const out = { tool: 'gntfixM5b3-dodgeprof', dodges: [] };
const srv = await startServer(port, ['--admin']);
let cl = [];
try {
  const s = await bootSession({ base, port, n: 2, names: ['PHost', 'PGuest'], w: 960, h: 540 });
  cl = s.cl;
  const [H, G] = cl;
  out.version = await H.page.evaluate(() => window.__echoes.version);
  await H.page.evaluate(() => window.__echoes.cmd('startCampaign', { level: 1 }));
  await waitFor(H.page, () => window.__echoes.state().run && window.__echoes.state().run.phase === 'combat', { timeout: 30000 });
  await H.page.evaluate(() => {
    const E = window.__echoes;
    window.__pkeep = setInterval(() => {
      try {
        for (const m of E.state().party || []) if (!m.downed && m.hp < m.maxHp * 0.7) E.cmd('setHp', m.id, m.maxHp);
      } catch {
        /* */
      }
    }, 400);
  });
  await G.page.evaluate(() => {
    window.__pf = [];
    window.__pkey = null;
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && !e.repeat) window.__pkey = e.timeStamp;
    }, true);
    const f = (t) => {
      window.__pf.push(t);
      if (window.__pf.length > 2000) window.__pf.splice(0, 1000);
      requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
  });
  // --gesture: a real player's first user gesture happens long before the
  // first dodge (title / lobby); give the page one (an unbound key) first so
  // the audio engine's unlock is not charged to the dodge.
  if (A.gesture) {
    await G.page.keyboard.press('KeyL');
    out.gesture = true;
  }
  await sleep(4000);
  const path = await import('node:path');
  for (let i = 0; i < n; i++) {
    await G.page.mouse.move(700, 270);
    await sleep(1500);
    const tf = path.join(process.cwd(), 'captures', 'gntfixM5b3-dodgetrace-' + i + '.trace.json');
    await G.page.tracing.start({ path: tf, categories: ['toplevel', 'gpu', 'disabled-by-default-gpu.service', 'disabled-by-default-devtools.timeline', 'blink', 'cc', 'viz', 'v8', 'devtools.timeline', 'disabled-by-default-gpu.device'] });
    await G.page.evaluate(() => { window.__pf.length = 0; });
    const t0 = Date.now();
    await G.page.keyboard.press('Space');
    await sleep(1000);
    await G.page.tracing.stop();
    const fr = await G.page.evaluate(() => ({ key: window.__pkey, frames: window.__pf.slice() }));
    let gap = 0; let gapAt = null;
    for (let k = 1; k < fr.frames.length; k++) { const d = fr.frames[k] - fr.frames[k - 1]; if (d > gap) { gap = d; gapAt = fr.frames[k - 1] - fr.key; } }
    const tr = JSON.parse((await import('node:fs')).readFileSync(tf, 'utf8'));
    const evs = (tr.traceEvents || tr).filter((e) => e.ph === 'X' && e.dur > 15000);
    const names = new Map();
    for (const e of (tr.traceEvents || tr)) if (e.ph === 'M' && e.name === 'thread_name') names.set(e.pid + ':' + e.tid, e.args.name);
    const top = evs.sort((x, y) => y.dur - x.dur).slice(0, 40).map((e) => Math.round(e.dur / 1000) + 'ms ' + (names.get(e.pid + ':' + e.tid) || e.tid) + ' ' + e.name + (e.args && e.args.data && e.args.data.url ? ' ' + String(e.args.data.url).slice(-40) : ''));
    out.dodges.push({ i, gapMs: Math.round(gap), gapAfterKeyMs: gapAt !== null ? Math.round(gapAt) : null, top });
    console.log(JSON.stringify({ i, gap: Math.round(gap), at: gapAt !== null ? Math.round(gapAt) : null }));
    for (const x of top.slice(0, 25)) console.log('  ' + x);
    await sleep(1500);
  }
} catch (e) {
  out.crash = String(e.stack || e);
  console.error(e);
} finally {
  out.pageErrors = Object.fromEntries(cl.map((c) => [c.tag, c.errors]));
  writeJson(A.out || 'gntfixM5b3-dodgetrace.json', out);
  console.log('pageErrors', JSON.stringify(out.pageErrors));
  try {
    srv.proc.kill();
  } catch {
    /* */
  }
  await Promise.all(cl.map(closeClient));
}
