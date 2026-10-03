// gntfixM4a5 — every class skill's row name on the socket screen at W x H: each seat's 8 pool skills are swapped
// into its 4 slots (two passes) on the path page and the socket screen reports each row name's rendered lines and
// whether it is clipped (ellipsis / line-clamp overflow). Usage: node tools/gntfixM4a5-socknames.mjs [W H]
import { boot, ev, writeJson, BASE, sleep, waitFor, key, shot } from './gntccontent5-lib.mjs';
const W = +(process.argv[2] || 1024), H = +(process.argv[3] || 576);
const { browser, page, errors } = await boot(BASE + `?level=2&seed=7`, { w: W, h: H });
await waitFor(page, () => { const s = window.__echoes.state(); return s.run && s.run.phase === 'combat' && s.run.room === 1; }, { timeout: 90000 });
await sleep(800);
await ev(page, () => window.__echoes.cmd('killAllEnemies'));
await waitFor(page, () => window.__echoes.state().run.phase === 'reward', { timeout: 30000 });
await sleep(1400);
await key(page, 'KeyX');
await waitFor(page, () => window.__echoes.state().run.phase === 'path', { timeout: 10000 });
await sleep(700);
const out = { W, H, rows: [] };
for (const seat of [1, 2, 3]) {
  const pool = await ev(page, (seat) => { const v = window.__echoes.cmd('partyView', seat); return { slots: v.slots, pool: v.pool || null }; }, seat);
  out['pool' + seat] = pool;
}
const pools = { 1: ['heavy_slam', 'brutal_cleave', 'ground_crack', 'whirling_guard', 'taunting_roar', 'shield_wall', 'shoulder_charge', 'iron_stance'], 2: ['flurry', 'lunge_strike', 'blade_storm', 'caltrops', 'fox_step', 'crescent_finisher', 'riposte', 'razor_wake'], 3: ['piercing_shot', 'volley', 'detonating_charge', 'sundering_nova', 'vault_shot', 'pinning_arrow', 'rain_of_arrows', 'kestrel_watch'] };
for (const seat of [1, 2, 3]) {
  for (const half of [0, 1]) {
    const want = pools[seat].slice(half * 4, half * 4 + 4);
    const res = await ev(page, (seat, want) => {
      const E = window.__echoes;
      const log = [];
      for (let i = 0; i < 4; i++) {
        const v = E.cmd('partyView', seat);
        if (v.slots.includes(want[i])) { const j = v.slots.indexOf(want[i]); if (j !== i) log.push(['reorder', E.cmd('partyReorder', seat, j, i)]); continue; }
        log.push([want[i], E.cmd('partySwap', seat, want[i], i)]);
      }
      return { log: log.map((x) => JSON.stringify(x).slice(0, 80)), slots: E.cmd('partyView', seat).slots };
    }, seat, want);
    await key(page, 'KeyB'); await sleep(500);
    await key(page, ['F1', 'F2', 'F3', 'F4'][seat]); await sleep(600);
    const names = await ev(page, () => {
      const pg = document.querySelector('#socket-screen .nd-page');
      const sc = pg.getBoundingClientRect().height / pg.offsetHeight;
      return [...pg.querySelectorAll('.nd-rname')].map((n) => { const cs = getComputedStyle(n); const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.1; return { name: n.textContent, lines: Math.round(n.clientHeight / lh), clipX: n.scrollWidth > n.clientWidth + 1, clipY: n.scrollHeight > n.clientHeight + 3, realPx: +(parseFloat(cs.fontSize) * sc).toFixed(1) }; });
    });
    await shot(page, `gntfixM4a5-socknames-s${seat}-${half}-${W}x${H}`);
    await key(page, 'Escape'); await sleep(400);
    out.rows.push({ seat, half, slots: res.slots, log: res.log, names });
    console.log(seat, half, JSON.stringify(res.slots), JSON.stringify(names.map((n) => [n.name, n.lines, n.clipX || n.clipY ? 'CLIP' : 'ok'])));
  }
}
out.errors = errors;
out.clipped = out.rows.flatMap((r) => r.names).filter((n) => n.clipX || n.clipY).length;
writeJson(`gntfixM4a5-socknames-${W}x${H}.json`, out);
console.log('clipped', out.clipped, 'errors', errors.length);
await browser.close();
