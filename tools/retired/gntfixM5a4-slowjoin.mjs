// gntfixM5a4-slowjoin.mjs — fix-M5a r4 (NET4-F1 companion): a guest whose host never sends the
// world sees "Joining…" turn into "Still joining…" with the way out after 8 s, and the banner
// clears the moment the world arrives. The guest's DOWN link drops every unreliable packet
// (snapshots) through the server conditioner, then the conditioner is lifted.
// node tools/gntfixM5a4-slowjoin.mjs --port 7896   (GNTCNET4_BASE = the page)
import { openClient, closeClient, writeJson, sleep, waitFor, PREVIEW, WS, admin } from './gntcnet4-lib.mjs';
const A = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => { if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]); return acc; }, []));
const port = Number(A.port || 7896);
const out = { tool: 'gntfixM5a4-slowjoin', base: PREVIEW, port, trail: [] };
const H = await openClient(PREVIEW + `?net=${encodeURIComponent(WS(port))}&netname=SlowHost`, { tag: 'H' });
const G = await openClient(PREVIEW + `?net=${encodeURIComponent(WS(port))}&netname=SlowGuest`, { tag: 'G' });
const banner = (p) => p.evaluate(() => { const E = window.__echoes; let hud = null; try { hud = E.net.session.hudDebug ? E.net.session.hudDebug() : null; } catch { /* */ } const b = document.querySelector('#nt-hud .nt-banner'); const vis = b && !b.classList.contains('nt-off'); return { net: E.net.state, synced: (() => { try { return E.net.session.debugGuest().synced; } catch { return null; } })(), banner: vis ? b.innerText.replace(/\s+/g, ' ').trim() : null, hud }; });
try {
  for (const p of [H.page, G.page]) {
    await waitFor(p, () => window.__echoes && window.__echoes.app && (window.__echoes.app.state === 'title' || /press any key/i.test(document.body.innerText || '')), { timeout: 120000 });
    await sleep(400);
    if (await p.evaluate(() => window.__echoes.app.state !== 'title')) await p.keyboard.press('Enter');
    await waitFor(p, () => window.__echoes.app.state === 'title', { timeout: 20000 });
  }
  const code = await H.page.evaluate(async () => (await window.__echoes.net.host({ visibility: 'private' })).code);
  await G.page.evaluate(async (c) => { await window.__echoes.net.join(c); window.__echoes.net.setReady(true); }, code);
  const gPeer = await G.page.evaluate(() => window.__echoes.net.peerId);
  out.cond = await admin(port, '/admin/conditioner', { target: gPeer, up: 'off', down: 'loss100' });
  await sleep(300);
  const t0 = Date.now();
  await H.page.evaluate(() => window.__echoes.net.start());
  for (let k = 0; k < 12; k++) { await sleep(1000); out.trail.push({ s: Math.round((Date.now() - t0) / 100) / 10, g: await banner(G.page) }); }
  // Esc -> the pause menu names Leave Session
  await G.page.keyboard.press('Escape');
  await sleep(700);
  out.pauseText = await G.page.evaluate(() => (document.body.innerText || '').match(/Leave Session/i) ? 'has Leave Session' : 'NO Leave Session');
  await G.page.keyboard.press('Escape');
  out.lift = await admin(port, '/admin/conditioner', { target: gPeer, up: 'off', down: 'off' });
  const tl = Date.now();
  const s = await waitFor(G.page, () => window.__echoes.net.session.debugGuest().synced, { timeout: 15000 });
  out.syncedAfterLiftMs = s.ok ? Date.now() - tl : null;
  await sleep(600);
  out.after = await banner(G.page);
  out.pageErrors = { host: H.errors, guest: G.errors };
  const slowAt = out.trail.find((x) => x.g.banner && /Still joining/.test(x.g.banner));
  out.summary = { firstBanner: out.trail[0].g.banner, slowAtS: slowAt ? slowAt.s : null, slowText: slowAt ? slowAt.g.banner : null, pause: out.pauseText, syncedAfterLiftMs: out.syncedAfterLiftMs, bannerAfter: out.after.banner, pageErrors: H.errors.length + G.errors.length };
  console.log(JSON.stringify(out.summary));
} catch (e) { out.crash = String(e.stack || e); console.error(e); }
finally { writeJson('gntfixM5a4-slowjoin.json', out); await closeClient(H); await closeClient(G); }
