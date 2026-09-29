// gntfixM35 copy of tools/gntcaudio5-music.mjs (round-5 audio critic probe, logic unchanged): own port 4303 + outputs under captures/gntfixM35/ via tools/gntfixM35-lib.mjs.
// G3.5 music states + crossfades with REAL input: title (menu) -> camp -> portal (Begin Run) -> combat -> boss -> level clear card -> Level 2 -> pause -> Quit to Lobby -> camp.
import { bootTap, out, sleep, startSampler, stopSampler, gaps } from './gntfixM35-lib.mjs';
const { browser, page, errors, consoleLines } = await bootTap('fresh=1');
const log = [];
const st = async () => page.evaluate(() => { const E = window.__echoes; return { app: E.app.state, stack: E.app.stack().join('>'), focus: E.app.focus() && E.app.focus().label, music: E.audio.music().state, theme: E.audio.music().theme, scene: E.state().scene, phase: E.state().run?.phase, room: E.state().run?.room, camp: E.campaign?.state()?.transitionState, level: E.campaign?.state()?.level }; });
await page.waitForFunction(() => window.__echoes.app.state === 'title', { timeout: 180000 });
await startSampler(page);
await sleep(4000);
log.push(['title', await st()]);
// choose the first title item with real Enter presses until we're playing
for (let i = 0; i < 6; i++) { const s = await st(); log.push(['press Enter @', s]); if (s.app === 'playing') break; await page.keyboard.press('Enter'); await sleep(1800); }
await sleep(5000);
log.push(['camp', await st()]);
// walk to the portal (hold W), press E
await page.keyboard.down('KeyW'); await sleep(3500); await page.keyboard.up('KeyW');
await page.keyboard.press('KeyE'); await sleep(1500);
log.push(['after E', await st()]);
for (let i = 0; i < 4; i++) { const s = await st(); if (s.phase === 'combat' || (s.room && s.room >= 1)) break; await page.keyboard.down('KeyW'); await sleep(1200); await page.keyboard.up('KeyW'); await page.keyboard.press('KeyE'); await sleep(1500); log.push(['retry E', await st()]); }
await page.evaluate(() => window.__echoes.cmd('autopilot', true));
await sleep(12000);
log.push(['combat', await st()]);
await page.evaluate(() => window.__echoes.cmd('skipToRoom', 8));
await sleep(9000);
log.push(['boss', await st()]);
await page.evaluate(() => { const E = window.__echoes; E.cmd('bossHp', 0.02, true); });
await sleep(3000);
await page.evaluate(() => { const E = window.__echoes; try { E.cmd('killBoss'); } catch {} E.cmd('killAllEnemies'); });
await sleep(1500); log.push(['boss killed', await st()]);
await sleep(8000); log.push(['after card', await st()]);
await sleep(10000); log.push(['L2 combat', await st()]);
await page.evaluate(() => window.__echoes.cmd('autopilot', false));
// pause -> Quit to Lobby by real keys (Esc, then navigate to the item)
await page.keyboard.press('Escape'); await sleep(1500);
const pauseItems = await page.evaluate(() => (window.__echoes.app.focusables() || []).map((f) => f.label || f.id));
log.push(['paused', await st(), pauseItems]);
const idx = pauseItems.findIndex((l) => /lobby/i.test(String(l)));
const cur = pauseItems.findIndex((l) => l === (log[log.length - 1][1].focus));
for (let i = 0; i < Math.max(0, idx - Math.max(0, cur)); i++) { await page.keyboard.press('ArrowDown'); await sleep(250); }
log.push(['focus before quit', await st()]);
await page.keyboard.press('Enter'); await sleep(1200);
log.push(['confirm?', await st(), await page.evaluate(() => (window.__echoes.app.focusables() || []).map((f) => f.label || f.id))]);
// confirm dialog: pick the confirming action
const conf = await page.evaluate(() => (window.__echoes.app.focusables() || []).map((f) => f.label || f.id));
const qi = conf.findIndex((l) => /quit|leave|yes|abandon/i.test(String(l)));
const fi = conf.findIndex((l) => l === (log[log.length - 1][1].focus));
if (qi >= 0 && fi >= 0 && qi !== fi) { for (let i = 0; i < Math.abs(qi - fi); i++) { await page.keyboard.press(qi > fi ? 'ArrowRight' : 'ArrowLeft'); await sleep(250); } }
log.push(['focus on confirm', await st()]);
await page.keyboard.press('Enter'); await sleep(8000);
log.push(['after quit', await st()]);
const rows = await stopSampler(page);
const mu = await page.evaluate(() => window.__echoes.audio.music());
const res = { log, transitions: mu.transitions, gaps: gaps(rows), rowsN: rows.length, errors, rows };
console.log(out('music', res));
for (const l of log) console.log(JSON.stringify(l));
console.log('transitions', JSON.stringify(mu.transitions));
console.log('gaps', JSON.stringify(res.gaps), 'errors', errors.length);
await browser.close();
