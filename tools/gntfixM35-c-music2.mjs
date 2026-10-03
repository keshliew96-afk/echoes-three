// gntfixM35 copy of tools/gntcaudio5-music2.mjs (round-5 audio critic probe, logic unchanged): own port 4303 + outputs under captures/gntfixM35/ via tools/gntfixM35-lib.mjs.
// G3.5 part 2 with an ISOLATED music mix at the destination (sfx/ambient/ui muted): Level 2 -> 3 transition,
// campaign victory -> camp, defeat -> camp; stingers, themes, beds; every 2048-sample block checked for gaps.
import { bootTap, out, sleep, startSampler, stopSampler } from './gntfixM35-lib.mjs';
const { browser, page, errors } = await bootTap('level=2&seed=7');
await page.waitForFunction(() => window.__echoes.audio.state === 'running' && window.__echoes.tick > 120, { timeout: 180000 });
await sleep(3000);
const log = [];
const st = async (label) => { const s = await page.evaluate(() => { const E = window.__echoes, A = E.audio; const c = E.campaign?.state(); return { t: performance.now(), music: A.music().state, theme: A.music().theme, bpm: A.music().bpm, scale: A.music().scale, bed: (typeof A.ambient === 'function' ? A.ambient() : A.ambient), phase: E.state().run?.phase, room: E.state().run?.room, level: c?.level, card: c?.card ? (c.card.kind || c.card.type || JSON.stringify(c.card).slice(0, 80)) : null, ts: c?.transitionState, app: E.app.state, stack: E.app.stack().join('>') }; }); log.push([label, s]); return s; };
await page.evaluate(() => { const S = window.__echoes.settings; for (const c of ['sfx', 'ambient', 'ui']) S.set(`audio.${c}.muted`, true); window.__gntTap.reset(); });
await startSampler(page);
await st('L2 start');
await page.evaluate(() => window.__echoes.cmd('skipToRoom', 8)); await sleep(6000); await st('L2 boss');
await page.evaluate(() => { const E = window.__echoes; E.cmd('bossHp', 0.02, true); }); await sleep(1500);
await page.evaluate(() => { const E = window.__echoes; try { E.cmd('killBoss'); } catch {} E.cmd('killAllEnemies'); });
for (let i = 0; i < 14; i++) { await sleep(1000); await st('L2->L3 +' + (i + 1) + 's'); }
await page.evaluate(() => window.__echoes.cmd('skipToRoom', 8)); await sleep(6000); await st('L3 boss');
await page.evaluate(() => { const E = window.__echoes; E.cmd('bossHp', 0.02, true); }); await sleep(1500);
await page.evaluate(() => { const E = window.__echoes; try { E.cmd('killBoss'); } catch {} E.cmd('killAllEnemies'); });
for (let i = 0; i < 20; i++) { await sleep(1000); const s = await st('final +' + (i + 1) + 's'); if (i > 3 && s.stack.includes('') && s.music === 'camp' && s.phase !== 'transit' && i > 12) break; }
// press Enter in case the victory screen waits for input
const stackNow = (await st('before enter')).stack; if (stackNow) { await page.keyboard.press('Enter'); await sleep(4000); await st('after enter'); }
await sleep(4000); await st('camp after victory');
// defeat: start Level 1 via the harness, zero the party's HP
await page.evaluate(() => window.__echoes.cmd('startRun', { level: 1 })); await sleep(5000); await st('L1 run');
await page.evaluate(() => { const E = window.__echoes; for (const p of E.state().party || []) { try { E.cmd('setHp', p.id, 0); } catch {} } });
for (let i = 0; i < 16; i++) { await sleep(1000); await st('defeat +' + (i + 1) + 's'); }
const s2 = await st('before enter2'); if (s2.stack) { await page.keyboard.press('Enter'); await sleep(4000); await st('after enter2'); }
await sleep(3000); await st('end');
const rows = await stopSampler(page);
const dest = await page.evaluate(() => window.__gntTap.series(0));
const mu = await page.evaluate(() => window.__echoes.audio.music());
// dest gaps: consecutive blocks under -50 dBFS (isolated music), and block-time discontinuities
let longest = 0, cur = 0, curStart = null, at = null, disc = 0; const runs = [];
for (let i = 1; i < dest.length; i++) { const dt = dest[i][0] - dest[i - 1][0]; if (dt > 0.1) disc++; if (dest[i][1] < -50) { if (!cur) curStart = dest[i][0]; cur += dt * 1000; if (cur > longest) { longest = cur; at = curStart; } } else { if (cur > 200) runs.push([curStart, Math.round(cur)]); cur = 0; } }
const res = { log, transitions: mu.transitions, destBlocks: dest.length, destLongestBelow50Ms: Math.round(longest), at, runs, disc, errors, rows, destHead: dest.filter((_, i) => i % 200 === 0) };
console.log(out('music2', res));
for (const l of log) console.log(l[0], JSON.stringify(l[1]));
console.log('transitions', JSON.stringify(mu.transitions));
console.log('dest', dest.length, 'longest<-50', Math.round(longest), 'at', at, 'runs', JSON.stringify(runs), 'disc', disc, 'errors', errors);
await browser.close();
