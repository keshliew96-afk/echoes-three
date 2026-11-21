import { build, hashState } from './sim.mjs';
const drv = (world, tick) => { if (tick % 240) return; world.cmd('killAllEnemies'); const r = world.runSystem().view(); if (r.phase === 'reward') world.runSystem().takeReward(); if (r.phase === 'path') world.cmd('pathChoose', 0); if (r.phase === 'shop') world.cmd('shopAdvance'); };
for (const [lvl, room, opts] of [[1, 2, {}], [3, 4, {}], [4, 5, { endless: false }], [1, 3, { endless: true }]]) {
  const s = build({ seed: 11 + lvl }); s.world.runSystem().startCampaign({ level: lvl, harness: true, ...opts }); s.stepN(10); s.world.cmd('skipToRoom', room); s.stepN(300, 3, drv);
  const A = s.io.capture();
  const seq = (w) => { const h = []; for (let i = 0; i < 12; i++) { w.stepN(120, 3, drv); h.push(hashState(w.io.capture())); } return h; };
  const h1 = seq(s);
  const f = build({ seed: 999 }); const r = f.io.apply(A); const h2 = seq(f);
  const div = h1.findIndex((x, i) => x !== h2[i]);
  console.log(`L${lvl} room ${room}${opts.endless ? ' endless' : ''}: apply ${r.ok}, phase ${A.systems.run.phase}, relics ${!!A.systems.run.relics}, enc ${!!A.systems.run.encounters}, vaults ${!!A.systems.run.vaults}; first divergence chunk: ${div}`);
}
