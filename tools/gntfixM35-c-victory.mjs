// gntfixM35 copy of tools/gntcaudio5-victory.mjs (round-5 audio critic probe, logic unchanged): own port 4303 + outputs under captures/gntfixM35/ via tools/gntfixM35-lib.mjs.
// Campaign victory music: ?level=3, boss killed immediately (party kept alive), victory stinger -> camp.
import { bootTap, out, sleep, startSampler, stopSampler } from './gntfixM35-lib.mjs';
const { browser, page, errors } = await bootTap('level=3&seed=7');
await page.waitForFunction(() => window.__echoes.audio.state === 'running' && window.__echoes.tick > 120, { timeout: 180000 });
await sleep(3000);
await page.evaluate(() => { const S = window.__echoes.settings; for (const c of ['sfx', 'ambient', 'ui']) S.set(`audio.${c}.muted`, true); window.__gntTap.reset(); });
await startSampler(page);
const log = [];
const st = async (label) => { const s = await page.evaluate(() => { const E = window.__echoes, A = E.audio; const c = E.campaign?.state(); const r = E.state().run; return { music: A.music().state, theme: A.music().theme, bpm: A.music().bpm, stinger: A.music().stinger, bed: A.ambient().bed, phase: r?.phase, room: r?.room, boss: r?.boss && Math.round((r.boss.pct || 0) * 100), level: c?.level, cleared: c?.levelsCleared, ts: c?.transitionState, card: c?.card && (c.card.kind || c.card.type), app: E.app.state, stack: E.app.stack().join('>'), party: (E.state().party || []).map((p) => Math.round(p.hp)).join(',') }; }); log.push([label, s]); return s; };
await page.evaluate(() => window.__echoes.cmd('skipToRoom', 8)); await sleep(3500); await st('L3 boss');
await page.evaluate(() => { const E = window.__echoes; for (const p of E.state().party || []) { try { E.cmd('setHp', p.id, 1); } catch {} } E.cmd('bossHp', 0.01, true); });
await sleep(400);
await page.evaluate(() => { const E = window.__echoes; try { E.cmd('killBoss'); } catch (e) {} E.cmd('killAllEnemies'); });
for (let i = 0; i < 24; i++) { await sleep(1000); const s = await st('+' + (i + 1) + 's'); if (s.stack && i % 4 === 3) { await page.keyboard.press('Enter'); log.push(['pressed Enter']); } }
const rows = await stopSampler(page);
const dest = await page.evaluate(() => window.__gntTap.series(0));
let longest = 0, cur = 0; for (let i = 1; i < dest.length; i++) { const dt = dest[i][0] - dest[i - 1][0]; if (dest[i][1] < -50) { cur += dt * 1000; longest = Math.max(longest, cur); } else cur = 0; }
const mu = await page.evaluate(() => window.__echoes.audio.music());
const shot = 'captures/gntfixM35/c-victory.png';
const res = { log, transitions: mu.transitions, destLongestBelow50Ms: Math.round(longest), destBlocks: dest.length, errors, rows };
console.log(out('victory', res));
for (const l of log) console.log(l[0], JSON.stringify(l[1] || ''));
console.log(JSON.stringify(mu.transitions), 'longest<-50', Math.round(longest), 'errors', errors);
await browser.close();
