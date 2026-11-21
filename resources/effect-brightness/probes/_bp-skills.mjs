// LOCAL brightness per skill: lockstep virtual time, peak blown area after each cast.
import puppeteer from 'puppeteer';
import { writeFileSync, mkdirSync } from 'fs';
const argv = process.argv.slice(2);
const opt = (k, d) => (argv.includes('--' + k) ? argv[argv.indexOf('--' + k) + 1] : d);
const OUT = opt('out', '/tmp/bp'); mkdirSync(OUT, { recursive: true });
const CLS = opt('cls', 'tank'); const FR = Number(opt('ticks', 60));
const W = Number(opt('w', 960)), H = Number(opt('h', 540));
const ONLY = opt('only', null);
const SKILLS = {
  tank: 'heavy_slam,brutal_cleave,ground_crack,whirling_guard,taunting_roar,shield_wall,shoulder_charge,iron_stance,earthshatter,rallying_cry,earthen_grasp',
  swordsman: 'flurry,lunge_strike,blade_storm,caltrops,fox_step,crescent_finisher,riposte,razor_wake,moonfang,blade_dance,crimson_edge',
  archer: 'piercing_shot,volley,detonating_charge,sundering_nova,vault_shot,pinning_arrow,rain_of_arrows,kestrel_watch,hunters_mark,barbed_trap,feather_fan',
  tidecaller: 'riverbolt,undertow,breaker,tidepool,torrent,whirlpool,ripple_step,bubble_ward,crashing_wave,rain_squall,maelstrom',
  bellwright: 'hang_bell,peal,clapper,hum,great_bell,knell,bell_swing,wing_hop,vesper_chime,tuning_fork,carillon',
  duskwing: 'dusk_dive,blood_bite,nightfall,night_wings,echo_screech,talon_rake,bat_swarm,shadow_veil,flit,blood_scent,blood_moon',
  healer: 'mending_bolt,swift_mend,nova_bloom,sanctuary,spirit_bolt,warding_aura,guardian_bond,restorative_wave,lantern_flurry,pale_lance,bell_toll,rootsnare,dewfall,kindred_shield,mending_tide,hearthsong,quiet_hearth,lantern_ward,dawn_brand',
}[CLS].split(',').filter((s) => !ONLY || ONLY.split(',').includes(s));
const LINEUP = { tank: ['healer', 'tank', 'swordsman', 'archer'], swordsman: ['healer', 'tank', 'swordsman', 'archer'], archer: ['healer', 'tank', 'swordsman', 'archer'], healer: ['healer', 'tank', 'swordsman', 'archer'],
  tidecaller: ['healer', 'tank', 'swordsman', 'tidecaller'], bellwright: ['healer', 'tank', 'swordsman', 'bellwright'], duskwing: ['healer', 'tank', 'swordsman', 'duskwing'] }[CLS];
const SEAT = LINEUP.indexOf(CLS);
const browser = await puppeteer.launch({ headless: true, executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', protocolTimeout: 900000,
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', `--window-size=${W},${H}`] });
const page = await browser.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
const errors = []; page.on('pageerror', (e) => errors.push(String(e.message || e)));
await page.evaluateOnNewDocument(() => {
  const raf = window.requestAnimationFrame.bind(window);
  const S = { on: false, peak: 0, at: -1, n: 0, sum: 0, img: null, nob: null }; window.__bp = S;
  const c2 = document.createElement('canvas'); let g = null;
  S.measure = () => { const gl = document.querySelector('canvas'); const w = 320, h = Math.round((320 * gl.height) / gl.width); if (!g || c2.height !== h) { c2.width = w; c2.height = h; g = c2.getContext('2d', { willReadFrequently: true }); }
    g.drawImage(gl, 0, 0, w, h); const d = g.getImageData(0, 0, w, h).data; let b = 0, n = 0; const y0 = Math.round(h * 0.09), y1 = Math.round(h * 0.88);
    for (let y = y0; y < y1; y++) for (let x = 0; x < w; x++) { const k = (y * w + x) * 4; n++; if (0.2126 * d[k] + 0.7152 * d[k + 1] + 0.0722 * d[k + 2] >= 240) b++; } return b / n; };
  S.grab = () => { const gl = document.querySelector('canvas'); const c = document.createElement('canvas'); c.width = gl.width; c.height = gl.height; c.getContext('2d').drawImage(gl, 0, 0); return c.toDataURL('image/jpeg', 0.85); };
  S.start = () => { S.on = true; S.peak = 0; S.at = -1; S.n = 0; S.sum = 0; S.img = null; S.nob = null; S.t0 = window.__echoes.tick; };
  window.requestAnimationFrame = (cb) => raf((t) => { cb(t); if (S.on) { try { const f = S.measure(); S.n++; S.sum += f; if (f > S.peak) { S.peak = f; S.at = window.__echoes.tick - S.t0; S.img = S.grab();
      const st = window.__echoes.__stage; if (st) { st.bloomPass.enabled = false; st.render(); S.nob = S.measure(); st.bloomPass.enabled = true; st.render(); } } } catch (e) { S.err = String(e); } } });
});
await page.goto(`http://127.0.0.1:5199/?menu=0&seed=7&audio=0&rill=1&tolly=1&sable=1`, { waitUntil: 'domcontentloaded', timeout: 600000 });
await page.waitForFunction(() => window.__echoes && window.__echoes.tick > 60, { timeout: 600000, polling: 500 });
const cmd = (name, ...args) => page.evaluate((n, a) => window.__echoes.cmd(n, ...a), name, args);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
console.log('start', JSON.stringify(await cmd('startCampaign', { level: 1, lineup: LINEUP })));
await page.waitForFunction(() => window.__echoes.cmd('runState').phase === 'combat', { timeout: 300000, polling: 250 });
await cmd('partyMode', 'manual'); await cmd('autopilot', false);
async function clearRoom() { for (let i = 0; i < 400; i++) { const v = await cmd('runState'); if (!v.combatActive) return v.phase; await cmd('killAllEnemies'); await sleep(250); } console.log('clearRoom timeout', (await cmd('runState')).phase); }
async function nextRoom() { const next = ((await cmd('runState')).room || 1) + 1; await cmd('skipToRoom', next);
  await page.waitForFunction((n) => { const v = window.__echoes.cmd('runState'); return v.phase === 'combat' && v.room === n; }, { timeout: 300000, polling: 250 }, next); await sleep(800); await cmd('killAllEnemies'); await sleep(500); }
const me = () => page.evaluate((s) => { const p = window.__echoes.state().party.find((q) => q.partyIndex === s); return p ? { x: p.x, z: p.z } : null; }, SEAT);
// lockstep window
async function windowMeasure(label, fire, n = FR) {
  await page.evaluate(() => __bp.start()); const t0 = await page.evaluate(() => __echoes.tick);
  await page.waitForFunction((t) => __echoes.tick >= t + 8, { timeout: 120000, polling: 100 }, t0);
  const base = await page.evaluate(() => __bp.peak);
  await page.evaluate(() => __bp.start());
  const fired = await fire(); const t1 = await page.evaluate(() => __echoes.tick);
  await page.waitForFunction((t, n) => __echoes.tick >= t + n, { timeout: 300000, polling: 100 }, t1, n);
  const r = await page.evaluate(() => { __bp.on = false; return { peak: __bp.peak, at: __bp.at, n: __bp.n, mean: __bp.sum / Math.max(1, __bp.n), img: __bp.img, nob: __bp.nob, err: __bp.err }; });
  if (r.img) writeFileSync(`${OUT}/${CLS}-${label}.jpg`, Buffer.from(r.img.split(',')[1], 'base64'));
  const row = { cls: CLS, label, base: +base.toFixed(4), peak: +r.peak.toFixed(4), noBloomAtPeak: r.nob === null ? null : +r.nob.toFixed(4), mean: +r.mean.toFixed(4), atTick: r.at, frames: r.n, fired: JSON.stringify(fired).slice(0, 60) };
  console.log(JSON.stringify(row)); return row;
}
const rows = [];
async function pack() { const p = await me(); const ids = []; for (const [dx, dz] of [[0, -2.6], [-0.8, -3.2], [0.8, -3.2], [-0.4, -3.9], [0.4, -3.9]]) ids.push(await cmd('spawn', 'dummy', p.x + dx, p.z + dz, {})); return { p, ids }; }
// basic hits + kill flare + keg
await clearRoom(); await nextRoom();
{ const { p, ids } = await pack(); rows.push(await windowMeasure('basic-hits', async () => 'idle', 120));
  rows.push(await windowMeasure('kill-flare', async () => cmd('setHp', ids[0], 0), 30));
  if (CLS === 'tank') { const k = await cmd('spawnInteractable', 'keg', p.x + 1.5, p.z - 2); rows.push(await windowMeasure('keg-blast', async () => cmd('armKeg', k), 90)); } }
// skills, 4 per room
for (let g = 0; g < SKILLS.length; g += 4) {
  const grp = SKILLS.slice(g, g + 4);
  await clearRoom();
  if (CLS === 'healer') { for (const id of grp) await cmd('giveSkill', id); }
  else for (const [k, id] of grp.entries()) { const r = await cmd('partySwap', SEAT, id, k); if (r && r.denied && r.denied !== 'owned') console.log('swap', id, JSON.stringify(r)); }
  await nextRoom();
  for (const [k, id] of grp.entries()) {
    const { p } = await pack();
    rows.push(await windowMeasure(id, async () => CLS === 'healer'
      ? page.evaluate((k) => { const ev = new KeyboardEvent('keydown', { code: 'Digit' + (k + 1), key: String(k + 1), bubbles: true }); window.dispatchEvent(ev); setTimeout(() => window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Digit' + (k + 1), key: String(k + 1), bubbles: true })), 0); return 'key' + (k + 1); }, k)
      : cmd('partyCast', SEAT, k, { x: p.x, z: p.z - 3.2 })));
    await cmd('killAllEnemies'); await sleep(300);
  }
}
writeFileSync(`${OUT}/${CLS}.json`, JSON.stringify({ rows, errors }, null, 1));
console.log(JSON.stringify({ errors: errors.slice(0, 5) }));
await browser.close();
