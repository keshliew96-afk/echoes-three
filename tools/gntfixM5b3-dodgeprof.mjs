// gntfixM5b3-dodgeprof.mjs — where does a guest's first dodge stall? (fix-M5b-r3)
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
  const cdp = await G.page.target().createCDPSession();
  await cdp.send('Profiler.enable');
  await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
  for (let i = 0; i < n; i++) {
    await G.page.mouse.move(700, 270);
    await sleep(1500);
    await cdp.send('Profiler.start');
    await G.page.evaluate(() => {
      window.__pf.length = 0;
    });
    await G.page.keyboard.press('Space');
    await sleep(1200);
    const { profile } = await cdp.send('Profiler.stop');
    const fr = await G.page.evaluate(() => ({ key: window.__pkey, frames: window.__pf.slice() }));
    let gap = 0;
    let gapAt = null;
    for (let k = 1; k < fr.frames.length; k++) {
      const d = fr.frames[k] - fr.frames[k - 1];
      if (d > gap) {
        gap = d;
        gapAt = fr.frames[k - 1] - fr.key;
      }
    }
    // self / inclusive time per function
    const byId = new Map(profile.nodes.map((nd) => [nd.id, nd]));
    const parent = new Map();
    for (const nd of profile.nodes) for (const c of nd.children || []) parent.set(c, nd.id);
    const self = new Map();
    const incl = new Map();
    const dts = profile.timeDeltas;
    for (let k = 0; k < profile.samples.length; k++) {
      const dt = (dts[k + 1] ?? dts[k]) / 1000;
      const nd = byId.get(profile.samples[k]);
      const key = (x) => `${x.callFrame.functionName || '(anon)'} ${String(x.callFrame.url).split('/').pop()}:${x.callFrame.lineNumber}`;
      self.set(key(nd), (self.get(key(nd)) || 0) + dt);
      const seen = new Set();
      let cur = nd.id;
      while (cur !== undefined) {
        const x = byId.get(cur);
        const kk = key(x);
        if (!seen.has(kk)) {
          incl.set(kk, (incl.get(kk) || 0) + dt);
          seen.add(kk);
        }
        cur = parent.get(cur);
      }
    }
    const top = (m, k) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, k).map(([f, ms]) => `${Math.round(ms)}ms ${f}`);
    const row = { i, gapMs: Math.round(gap), gapAfterKeyMs: gapAt !== null ? Math.round(gapAt) : null, topSelf: top(self, 12), topIncl: top(incl, 40) };
    out.dodges.push(row);
    console.log(JSON.stringify({ i, gap: row.gapMs, at: row.gapAfterKeyMs }));
    console.log(' self:', row.topSelf.slice(0, 10).join(' | '));
    await sleep(1500);
  }
} catch (e) {
  out.crash = String(e.stack || e);
  console.error(e);
} finally {
  out.pageErrors = Object.fromEntries(cl.map((c) => [c.tag, c.errors]));
  writeJson(A.out || 'gntfixM5b3-dodgeprof.json', out);
  console.log('pageErrors', JSON.stringify(out.pageErrors));
  try {
    srv.proc.kill();
  } catch {
    /* */
  }
  await Promise.all(cl.map(closeClient));
}
