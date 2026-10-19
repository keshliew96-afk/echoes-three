// gntfixM5b6-critfirstkey.mjs — verbatim copy of the net critic's tools/gntcnet6-firstkey.mjs (outputs renamed gntfixM5b6-critfirstkey*). Original header: net critic r6: on a guest's swap card, does every REAL W / S press move the
// Replaces mark? Leg COLD: the guest page never received a key before the page (API-driven so far).
// Leg WARM: the guest walked with real keys during the room. Host + Tank guest, own browsers, own server.
// Per press: the mark before / after (sim card.replace on the guest) and the Replaces tile highlighted in the DOM.
// node tools/gntcnet6-firstkey.mjs --port 7847
import { openClient, closeClient, sleep, writeJson, startServer, PREVIEW, CAP } from './gntcnet6-lib.mjs';
import path from 'node:path';

const A = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => { if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]); return acc; }, []));
const port = Number(A.port || 7847);
const out = { tool: 'gntcnet6-firstkey', legs: {}, errors: {} };
const ev = (c, fn, arg) => c.page.evaluate(fn, arg);
async function waitOn(c, fn, timeout = 40000) { const t0 = Date.now(); while (Date.now() - t0 < timeout) { try { const v = await c.page.evaluate(fn); if (v) return v; } catch { /* */ } await sleep(80); } throw new Error(c.tag + ' timeout ' + String(fn).slice(0, 100)); }
const mark = (c) => ev(c, () => { const E = window.__echoes; const s = E.net.seat; const v = E.state().run; const k = v.party && v.party.cards[s]; const tiles = [...document.querySelectorAll('[data-slot]')].filter((e) => e.offsetParent); const dom = tiles.findIndex((e) => /replace/i.test(e.textContent || '')); return { replace: k ? k.replace : null, dom, domSlot: dom >= 0 ? Number(tiles[dom].dataset.slot) : null, opened: v.party ? v.party.openedTick : null, tick: E.tick, focus: document.activeElement ? (document.activeElement.tagName + '.' + String(document.activeElement.className).slice(0, 30)) : null, hasFocus: document.hasFocus() }; });
async function leg(name, warm) {
  const srv = await startServer(port, ['--admin']);
  const cl = [];
  try {
    const url = (nm) => PREVIEW + `?menu=0&seed=11&netname=${nm}&net=${encodeURIComponent(`ws://127.0.0.1:${port}/echoes`)}`;
    cl.push(await openClient(url('Host'), { w: 1280, h: 720, tag: 'Host' }));
    cl.push(await openClient(url('Fox'), { w: 1280, h: 720, tag: 'Fox' }));
    const [H, F] = cl;
    await Promise.all(cl.map((c) => waitOn(c, () => window.__echoes.tick > 240, 120000)));
    const code = await ev(H, async () => (await window.__echoes.net.host({ visibility: 'private' })).code);
    await ev(F, async (c) => { const n = window.__echoes.net; await n.join(c); n.setReady(true); return 1; }, code);
    await sleep(400);
    await ev(H, () => window.__echoes.net.start());
    await waitOn(F, () => window.__echoes.net.session.status().synced);
    if (A.cond) { const pid = await ev(F, () => window.__echoes.net.peerId); await fetch('http://127.0.0.1:' + port + '/admin/conditioner', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ target: pid, up: A.cond, down: A.cond }) }); }
    await ev(H, () => window.__echoes.cmd('startCampaign', { level: 1 }));
    await waitOn(H, () => window.__echoes.state().run.phase === 'combat');
    await waitOn(F, () => window.__echoes.state().run.phase === 'combat');
    if (warm) { await F.page.keyboard.down('KeyD'); await sleep(600); await F.page.keyboard.up('KeyD'); await F.page.keyboard.down('KeyA'); await sleep(600); await F.page.keyboard.up('KeyA'); }
    await sleep(1000);
    await ev(H, () => window.__echoes.cmd('killAllEnemies'));
    await waitOn(F, () => { const v = window.__echoes.state().run; return v.phase === 'reward' && !!v.party; });
    await sleep(2500);
    const seq = [];
    seq.push({ key: null, ...(await mark(F)) });
    if (A.enterAfter) {
      const before = await ev(F, () => window.__echoes.cmd('partyView', window.__echoes.net.seat).slots);
      const m0 = await mark(F);
      await F.page.keyboard.press('KeyS'); await sleep(Number(A.enterAfter)); const m1 = await mark(F); await F.page.keyboard.press('Enter');
      await sleep(1500);
      const hostCard = await ev(H, (q) => { const k = window.__echoes.state().run.party.cards[q]; return { replace: k.replace, decided: k.decided, choice: k.choice }; }, await ev(F, () => window.__echoes.net.seat));
      await ev(H, () => window.__echoes.content.world().runSystem().partyPick(0, 'leave'));
      await waitOn(H, () => window.__echoes.state().run.phase !== 'reward');
      await sleep(1200);
      const after = await ev(F, () => window.__echoes.cmd('partyView', window.__echoes.net.seat).slots);
      const replacedSlot = after.findIndex((x, i) => x !== before[i]);
      out.legs[name] = { enterAfter: Number(A.enterAfter), before, after, markBefore: m0.replace, markAtEnter: m1.replace, domAtEnter: m1.domSlot, intended: (m0.replace + 1) % 4, replacedSlot, hostCard };
      console.log(name, JSON.stringify(out.legs[name]));
      return;
    }
    const GAP = Number(A.gap || 450);
    for (const k of ['KeyS', 'KeyS', 'KeyS', 'KeyW', 'ArrowDown', 'ArrowUp']) {
      await F.page.keyboard.press(k);
      await sleep(GAP);
      seq.push({ key: k, ...(await mark(F)) });
    }
    await F.page.screenshot({ path: path.join(CAP, `gntfixM5b6-critfirstkey-${name}.png`) });
    await sleep(1500); const fin = await mark(F); out.final = out.final || {}; out.final[name] = fin;
    const moves = seq.slice(1).map((s, i) => s.replace !== seq[i].replace);
    out.legs[name] = { seq, moves, dropped: moves.filter((m) => !m).length };
    console.log(name, 'moves', JSON.stringify(moves), 'marks', seq.map((s) => s.replace).join(' -> '), 'dom', seq.map((s) => s.domSlot).join(' -> '), 'final', fin.replace, fin.domSlot, 'focus', seq[0].focus, 'hasFocus', seq[0].hasFocus);
  } finally {
    for (const c of cl) out.errors[name + ':' + c.tag] = c.errors;
    for (const c of cl) await closeClient(c);
    srv.proc.kill();
    await sleep(500);
  }
}
try {
  if (A.legs !== 'warm') await leg('cold', false);
  await leg('warm', true);
} catch (e) { out.crash = String(e.stack || e); console.log('CRASH', out.crash); }
finally { writeJson('gntfixM5b6-critfirstkey' + (A.gap ? '-gap' + A.gap : '') + (A.cond ? '-cond' : '') + (A.enterAfter ? '-enter' + A.enterAfter : '') + '.json', out); console.log('errors', JSON.stringify(out.errors)); }
