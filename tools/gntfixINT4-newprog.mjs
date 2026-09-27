#!/usr/bin/env node
// fix-INT-r4 J4-F1 helper: which scene objects own the three.js programs created AFTER the run starts (first-use
// links mid-fight). Title boot (player path) -> camp -> portal E -> Level 1 room 1 fought by real input for --ms;
// programs are diffed by id (renderer.info.programs, via window.__arenaProbe.stage) and every object in the scene
// whose material's current program is new is reported with its parent chain and material settings.
//   node tools/gntfixINT4-newprog.mjs [--url http://127.0.0.1:4312] [--ms 14000]
import { launchEchoes, openEchoes } from './gnt-arch-browser.mjs';
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const base = arg('url', 'http://127.0.0.1:4312'); const ms = Number(arg('ms', 14000));
const sleep = (t) => new Promise((r) => setTimeout(r, t));
async function waitFor(page, body, timeout = 30000) { const t0 = Date.now(); while (Date.now() - t0 < timeout) { try { if (await page.evaluate(`(()=>{try{return !!(${body})}catch(e){return false}})()`)) return; } catch { /* */ } await sleep(100); } }
const browser = await launchEchoes({ gpu: true });
try {
  const { page, errors } = await openEchoes(browser, `${base}/?fresh=1&seed=7&menu=1`);
  await waitFor(page, `window.__echoes.app.state==='title' || (window.__echoes.app.focus()||{}).label==='Press any key or click'`, 90000);
  if (await page.evaluate(() => window.__echoes.app.stack().includes('loading'))) await page.keyboard.press('Enter');
  await waitFor(page, `window.__echoes.app.state==='title'`, 20000); await sleep(1500);
  await page.keyboard.press('Enter');
  await waitFor(page, `window.__echoes.app.state==='playing' && window.__echoes.app.mode==='camp'`, 20000);
  await sleep(3000);
  const portal = await page.evaluate(() => window.__echoes.cmd('campState').portal);
  for (let i = 0; i < 40; i++) {
    const p = await page.evaluate(() => { const q = window.__echoes.state().party[0]; return { x: q.x, z: q.z, in: window.__echoes.cmd('campState').inPortal }; });
    if (p.in) break;
    const dx = portal.x - p.x, dz = portal.z + 0.55 - p.z; const keys = [];
    if (Math.abs(dx) > 0.2) keys.push(dx > 0 ? 'd' : 'a'); if (Math.abs(dz) > 0.2) keys.push(dz > 0 ? 's' : 'w'); if (!keys.length) break;
    for (const k of keys) await page.keyboard.down(k); await sleep(Math.max(80, Math.min(450, (Math.hypot(dx, dz) / 2.4) * 1000))); for (const k of keys) await page.keyboard.up(k); await sleep(150);
  }
  await sleep(1000);
  await page.evaluate(() => { const S = window.__arenaProbe.stage; const R = S.renderer; window.__p0 = new Set(R.info.programs.map((p) => p.id)); window.__builds = []; let any = null; S.scene.traverse((o) => { if (!any && o.material && !Array.isArray(o.material)) any = o.material; }); let proto = Object.getPrototypeOf(any); while (proto && !Object.prototype.hasOwnProperty.call(proto, 'onBeforeCompile')) proto = Object.getPrototypeOf(proto); const orig = proto.onBeforeCompile; const t0 = performance.now(); const wrap = function () { try { const owners = []; S.scene.traverse((o) => { const ms2 = Array.isArray(o.material) ? o.material : [o.material]; if (ms2.includes(this)) { const chain = []; for (let x = o; x; x = x.parent) chain.push(x.name || x.type); owners.push(chain.slice(0, 8).join(' < ')); } }); window.__builds.push({ n0: R.info.programs.length, ms: Math.round(performance.now() - t0), type: this.type, name: this.name, map: !!this.map, mapImg: this.map && this.map.image ? (this.map.image.width + 'x' + this.map.image.height) : null, transparent: this.transparent, blending: this.blending, depthWrite: this.depthWrite, owners: owners.slice(0, 3), ud: Object.keys(this.userData || {}).join(',') }); } catch (e) { window.__builds.push({ err: String(e) }); } return orig.apply(this, arguments); }; wrap.toString = () => orig.toString(); proto.onBeforeCompile = wrap; });
  await page.keyboard.press('e');
  const tEnd = Date.now() + ms; await sleep(250);
  while (Date.now() < tEnd) {
    const t = await page.evaluate(() => { const E = window.__echoes; const st = E.state(); const q = st.party[0]; let best = null, bd = 1e9; for (const e of st.enemies || []) { if (e.hp !== undefined && e.hp <= 0) continue; const d = Math.hypot(e.x - q.x, e.z - q.z); if (d < bd) { bd = d; best = e; } } if (!best) return null; const pr = E.hud.project(best.x, 0.5, best.z); return pr && pr.onScreen ? { x: pr.x, y: pr.y } : null; });
    if (t) await page.mouse.move(t.x, t.y); else await page.mouse.move(900, 380);
    await page.mouse.down({ button: 'right' }); await sleep(300); await page.mouse.up({ button: 'right' });
    for (const k of ['Digit1', 'Digit2', 'Digit3', 'Digit4']) { await page.keyboard.press(k); await sleep(40); }
  }
  const res = await page.evaluate(() => {
    const S = window.__arenaProbe.stage; const R = S.renderer;
    const fresh = R.info.programs.filter((p) => !window.__p0.has(p.id));
    const ids = new Set(fresh.map((p) => p.id));
    const owners = [];
    const seenMat = new Set();
    S.scene.traverse((o) => {
      const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
      for (const m of mats) {
        if (seenMat.has(m)) continue;
        const pr = R.properties.get(m); const prog = pr && pr.currentProgram;
        if (!prog || !ids.has(prog.id)) continue;
        seenMat.add(m);
        const chain = []; for (let x = o; x; x = x.parent) chain.push(x.name || x.type);
        owners.push({ prog: prog.id, progName: prog.name, obj: o.name || o.type, chain: chain.slice(0, 7).join(' < '), mat: { type: m.type, name: m.name, map: !!m.map, alphaMap: !!m.alphaMap, transparent: m.transparent, blending: m.blending, depthWrite: m.depthWrite, depthTest: m.depthTest, side: m.side, vertexColors: m.vertexColors, toneMapped: m.toneMapped, fog: m.fog }, visible: o.visible });
      }
    });
    const B = window.__builds; B.push({ n0: R.info.programs.length }); const made = B.filter((x, i) => i < B.length - 1 && B[i + 1].n0 > x.n0); return { made, builds: [], fresh: fresh.map((p) => ({ id: p.id, name: p.name, key: String(p.cacheKey) })), owners };
  });
  console.log(JSON.stringify(res, null, 1));
  console.log('errors', errors);
} finally { await browser.close(); }
