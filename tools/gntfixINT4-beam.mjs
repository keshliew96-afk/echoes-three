#!/usr/bin/env node
// fix-INT-r4 J4-F1: the Swift Mend bond arc still draws after it is warmed at boot and reused from the pool.
// ?menu=0&seed=7 boot -> startRun -> an ally at 40% hp -> Digit2 (Swift Mend) -> the frame with a live beam is
// captured (captures/gntfixINT4-beam-<tag>.png) with skillfx.beams, the arc ribbons' visibility / parent / scale.
//   node tools/gntfixINT4-beam.mjs [--url http://127.0.0.1:4310] [--tag x]
import { launchEchoes, openEchoes } from './gnt-arch-browser.mjs';
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const base = arg('url', 'http://127.0.0.1:4310'); const tag = arg('tag', 'x');
const sleep = (t) => new Promise((r) => setTimeout(r, t));
const browser = await launchEchoes({ gpu: true });
let fails = 0;
try {
  const { page, errors } = await openEchoes(browser, `${base}/?menu=0&seed=7&fresh=1`);
  await page.waitForFunction(() => window.__echoes.tick > 240 && window.__echoes.state().gl.warmupPending === 0, { timeout: 120000 });
  await page.evaluate(() => window.__echoes.cmd('startRun'));
  await page.waitForFunction(() => window.__echoes.state().run.phase === 'combat', { timeout: 20000 });
  await sleep(600);
  let got = null;
  for (let i = 0; i < 12 && !got; i++) {
    await page.evaluate(() => { const E = window.__echoes; const s = E.state(); for (const m of s.party) if (!m.downed) E.cmd('setHp', m.id, m.partyIndex > 0 ? Math.round(m.maxHp * 0.2) : m.maxHp); });
    const aim = await page.evaluate(() => { const E = window.__echoes; const a = E.state().party.find((m) => m.partyIndex > 0 && !m.downed); const q = a && E.hud.project(a.x, 0.5, a.z); return q && q.onScreen ? { x: q.x, y: q.y } : null; });
    if (aim) await page.mouse.move(aim.x, aim.y);
    await sleep(60);
    await page.keyboard.press('Digit2');
    for (let k = 0; k < 20; k++) {
      await sleep(15);
      const st = await page.evaluate(() => {
        const s = window.__echoes.state(); const beams = s.skillfx ? s.skillfx.beams : 0;
        if (!beams) return null;
        const scene = window.__arenaProbe.stage.scene; const arcs = [];
        scene.traverse((o) => { if (o.name === 'arcCore' || o.name === 'arcGlow' || o.name === 'arcInk') { let vis = true; for (let x = o; x; x = x.parent) if (!x.visible) vis = false; arcs.push({ name: o.name, vis, parentScale: o.parent && o.parent.scale.x, parentY: o.parent && o.parent.position.y, culled: o.frustumCulled, opacity: +o.material.opacity.toFixed(2) }); } });
        return { beams, arcs };
      });
      if (st) { got = st; break; }
    }
    if (!got) await sleep(900);
  }
  if (!got) console.log('DEBUG', JSON.stringify(await page.evaluate(() => { const E = window.__echoes; return { casts: E.events.filter((e) => /skill_cast|intent_denied|full_heal|heal/.test(e.type)).slice(-8).map((e) => ({ t: e.type, skill: e.skill, shape: e.shape, targets: e.targets, reason: e.reason, kind: e.kind })), skills: (E.state().build || {}).skills && E.state().build.skills.map((k) => k && k.id), slots: E.hud && E.hud.slots ? 1 : 0 }; })));
  await page.screenshot({ path: `captures/gntfixINT4-beam-${tag}.png` });
  const ok = !!got && got.arcs.length >= 3 && got.arcs.every((a) => a.vis && a.parentScale === 1 && a.parentY === 0 && a.culled === false);
  if (!ok) fails++;
  console.log(`${ok ? 'PASS' : 'FAIL'} B1 a Swift Mend beam draws its arc from the pool (visible, unparked, never culled) ${JSON.stringify(got)}`);
  if (errors.length) fails++;
  console.log(`${errors.length ? 'FAIL' : 'PASS'} B2 0 page errors ${JSON.stringify(errors.slice(0, 3))}`);
} finally { await browser.close(); }
process.exit(fails ? 1 : 0);
