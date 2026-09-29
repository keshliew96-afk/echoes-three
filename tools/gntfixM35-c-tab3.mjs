// gntfixM35 copy of tools/gntcaudio5-tab3.mjs (round-5 audio critic probe, logic unchanged): own port 4303 + outputs under captures/gntfixM35/ via tools/gntfixM35-lib.mjs.
// Audio tab value operations: keys (slider steps, curve toggle, mute, test), mouse (click/drag slider, click curve/mute/test); reload persistence.
import { bootTap, out, sleep, BASE } from './gntfixM35-lib.mjs';
const { browser, page, errors } = await bootTap('fresh=1');
await page.waitForFunction(() => window.__echoes.app.state === 'title', { timeout: 180000 });
await sleep(2500);
const log = [];
const F = async () => page.evaluate(() => { const fo = window.__echoes.app.focus(); return fo && fo.id; });
const A = async () => page.evaluate(() => { const E = window.__echoes, S = E.settings; const o = {}; for (const c of ['master', 'music', 'sfx']) o[c] = `${S.get(`audio.${c}.level`)}|${S.get(`audio.${c}.mode`)}|${S.get(`audio.${c}.muted`) ? 'MUTED' : 'on'}|${E.audio.busGain(c).db}dB`; return o; });
const readout = async (id) => page.evaluate((id) => { const all = [...document.querySelectorAll('*')].filter((el) => el.children.length === 0 && /%\s*·\s*[−-]?[\d.∞]+\s*dB|Muted|muted/.test(el.textContent || '')); return all.map((e) => e.textContent.trim()).slice(0, 8).join(' / '); }, id);
const act = async (label, fn, wait = 350) => {
  await page.evaluate(() => { window.__echoes.audio.meterReset(); window.__gntCL = window.__echoes.audio.cueLog(400).length; });
  await fn(); await sleep(wait);
  const cues = await page.evaluate(() => window.__echoes.audio.cueLog(400).slice(window.__gntCL).map((c) => c.cue + '@' + c.bus).join(','));
  const pk = await page.evaluate(() => { const m = window.__echoes.audio.meters(); return `ui ${m.ui.peakDb} sfx ${m.sfx.peakDb} music ${m.music.peakDb} amb ${m.ambient.peakDb}`; });
  const row = { label, focus: await F(), cues, pk, ...(await A()), readout: await readout() };
  log.push(row); return row;
};
const titleItems = await page.evaluate(() => (window.__echoes.app.focusables() || []).map((f) => f.label));
for (let i = 0; i < titleItems.indexOf('Settings'); i++) await page.keyboard.press('ArrowDown');
await page.keyboard.press('Enter'); await sleep(900); await page.keyboard.press('KeyE'); await sleep(700);
await act('start (Master focused)', async () => {});
for (let i = 0; i < 3; i++) await act('Master ArrowLeft', () => page.keyboard.press('ArrowLeft'));
await act('Master ArrowRight', () => page.keyboard.press('ArrowRight'));
await act('Master End', () => page.keyboard.press('End'));
await act('Master Home', () => page.keyboard.press('Home'));
await act('Master ArrowRight x', () => page.keyboard.press('ArrowRight'));
// to Master curve: Down -> Mute, Left -> Curve
await act('Down', () => page.keyboard.press('ArrowDown'));
await act('Left (to Curve?)', () => page.keyboard.press('ArrowLeft'));
await act('Enter on Curve', () => page.keyboard.press('Enter'));
await page.screenshot({ path: 'captures/gntfixM35/c-tab3-linear.png' });
await act('Enter on Curve again', () => page.keyboard.press('Enter'));
await act('Right (to Mute)', () => page.keyboard.press('ArrowRight'));
await act('Enter Mute', () => page.keyboard.press('Enter'));
await page.screenshot({ path: 'captures/gntfixM35/c-tab3-muted.png' });
await act('Enter Mute again', () => page.keyboard.press('Enter'));
await act('Right (to Test)', () => page.keyboard.press('ArrowRight'));
await act('Enter Test (master)', () => page.keyboard.press('Enter'), 900);
// SFX slider preview by keys
await act('Down -> Music', () => page.keyboard.press('ArrowDown'));
await act('Music ArrowLeft', () => page.keyboard.press('ArrowLeft'));
await act('Down', () => page.keyboard.press('ArrowDown'));
await act('Down -> SFX', () => page.keyboard.press('ArrowDown'));
await act('SFX ArrowLeft', () => page.keyboard.press('ArrowLeft'), 600);
// mouse: rows from the focusables rects
const rects = await page.evaluate(() => Object.fromEntries((window.__echoes.app.focusables() || []).map((f) => [f.id, f.rect])));
const mus = rects['au-music-level'];
// slider track inside the row: from the frame, track spans x 198..782 at y ~ row.y+23 for Music (frame: track 198-782, y 476)
const trackX0 = 198, trackX1 = 782; const ty = Math.round(mus.y + 23);
await act('mouse click Music track at 25%', () => page.mouse.click(trackX0 + (trackX1 - trackX0) * 0.25, ty));
await act('mouse drag Music thumb to 90%', async () => { const x = trackX0 + (trackX1 - trackX0) * 0.25; await page.mouse.move(x, ty); await page.mouse.down(); for (let i = 1; i <= 10; i++) { await page.mouse.move(x + ((trackX1 - trackX0) * 0.65 * i) / 10, ty); await sleep(30); } await page.mouse.up(); });
const mc = rects['au-music-curve']; await act('mouse click Music Curve', () => page.mouse.click(mc.x + mc.w / 2, mc.y + mc.h / 2));
const mm = rects['au-music-mute']; await act('mouse click Music Mute', () => page.mouse.click(mm.x + mm.w / 2, mm.y + mm.h / 2));
await page.screenshot({ path: 'captures/gntfixM35/c-tab3-mouse.png' });
const mt = rects['au-music-test']; await act('mouse click Music Test (while muted)', () => page.mouse.click(mt.x + mt.w / 2, mt.y + mt.h / 2), 900);
const st = rects['au-sfx-test']; await act('mouse click SFX Test', () => page.mouse.click(st.x + st.w / 2, st.y + st.h / 2), 900);
const before = await A();
const storage = await page.evaluate(() => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (/setting/i.test(k)) o[k] = localStorage.getItem(k).slice(0, 600); } return o; });
// reload (no fresh) and re-read
await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => !!window.__echoes && window.__echoes.audio && window.__echoes.audio.state === 'running', { timeout: 180000 });
await sleep(2000);
const after = await A();
const res = { log, before, after, storage, errors };
console.log(out('tab3', res));
for (const l of log) console.log(`${l.label} | ${l.focus} | ${l.cues} | M ${l.master} | Mu ${l.music} | S ${l.sfx} | ${l.pk} | ${l.readout}`);
console.log('before', JSON.stringify(before)); console.log('after ', JSON.stringify(after)); console.log('storage keys', Object.keys(storage), 'errors', errors);
await browser.close();
