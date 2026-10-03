// G2.1 moment builders (shared by the M2 round-trip gate scenarios). Each
// builder runs IN THE PAGE (serialised with Function.toString), freezes the
// realtime loop, and drives the sim to the moment with the PLAN §6.4 setup
// commands (never by waiting for RNG), returning a probe of what is present.
// Usage (in a gntM2-sc-* scenario):  await h.ev(installHelpers);  await h.ev(MOMENTS[name]);
export function installHelpers() {
  const E = window.__echoes;
  const S = E.sim;
  const H = {
    E,
    S,
    cmd: (...a) => E.cmd(...a),
    step: (n, script = null) => S.stepN(n, script),
    st: () => E.state(),
    ents: () => E.content && E.content.world ? E.content.world().entities() : [],
    player: () => E.content.world().player,
    until(pred, max = 1200, script = null) {
      for (let i = 0; i < max; i++) {
        if (pred()) return i;
        S.stepN(1, script);
      }
      return pred() ? max : -1;
    },
    combatRun(act) {
      const r = E.cmd('startRun', { act });
      const n = H.until(() => {
        const v = E.state().run;
        return v && v.phase === 'combat' && E.state().enemies.length > 0;
      }, 1500);
      return { started: !!r, waited: n };
    },
    kinds() {
      const out = {};
      for (const e of H.ents()) out[e.kind] = (out[e.kind] || 0) + 1;
      return out;
    },
  };
  window.__gntM2 = H;
  return Object.keys(H);
}

export const MOMENTS = {
  // (1) camp
  camp: () => {
    const H = window.__gntM2;
    H.S.freeze();
    return { phase: H.st().run.phase, kinds: H.kinds() };
  },
  // (2) mid-combat with projectiles + zones in flight
  combat: () => {
    const H = window.__gntM2;
    H.S.freeze();
    const c = H.combatRun(1);
    H.cmd('giveSkill', 'sanctuary');
    H.cmd('giveSkill', 'spirit_bolt');
    H.cmd('iframe', H.player().id, 100000);
    const w = H.until(() => {
      const k = H.kinds();
      return (k.zone || 0) > 0 && ((k.bolt || 0) + (k.skillbolt || 0)) > 0 && H.st().enemies.length > 0 && H.st().run.phase === 'combat';
    }, 1500, 1);
    return { ...c, waitedForFlight: w, phase: H.st().run.phase, kinds: H.kinds() };
  },
  // (3) reward screen
  reward: () => {
    const H = window.__gntM2;
    H.S.freeze();
    H.combatRun(1);
    const w = H.until(() => {
      H.cmd('killAllEnemies');
      return H.st().run.phase === 'reward';
    }, 1500);
    H.step(20);
    return { waited: w, phase: H.st().run.phase, reward: H.st().run.reward };
  },
  // (4) shop
  shop: () => {
    const H = window.__gntM2;
    H.S.freeze();
    H.cmd('startRun', { act: 1 });
    H.step(5);
    H.cmd('skipToRoom', 7);
    const w = H.until(() => H.st().run.phase === 'shop', 600);
    H.step(10);
    return { waited: w, phase: H.st().run.phase, room: H.st().run.room, wallet: H.st().wallet };
  },
  // (5) boss with adds
  boss: () => {
    const H = window.__gntM2;
    H.S.freeze();
    H.cmd('startRun', { act: 1 });
    H.step(5);
    H.cmd('skipToRoom', 8);
    H.until(() => H.st().run.phase === 'combat' && H.st().run.boss && H.st().run.boss.active, 600);
    H.step(60);
    H.cmd('iframe', H.player().id, 100000);
    H.cmd('bossHp', 0.7);
    const w = H.until(() => H.st().enemies.length >= 2, 600, 1);
    return { waited: w, phase: H.st().run.phase, room: H.st().run.room, boss: H.st().run.boss && { hp: H.st().run.boss.hp, adds: H.st().run.boss.adds }, enemies: H.st().enemies.length };
  },
  // (6) Act I: Bramble slow on the Healer + a damaged barricade + a keg mid-fuse
  act1content: () => {
    const H = window.__gntM2;
    H.S.freeze();
    H.combatRun(1);
    const p = H.player();
    H.cmd('iframe', p.id, 100000);
    const br = H.cmd('spawnHazard', 'bramble', p.x, p.z, { r: 1.4 });
    const slowAt = H.until(() => !!(p.status && p.status.slow), 120);
    const bar = H.cmd('spawnInteractable', 'barricade', p.x + 2.2, p.z + 0.4);
    const barHp = H.cmd('setHp', bar, 0.5);
    const keg = H.cmd('spawnInteractable', 'keg', p.x - 2.4, p.z + 1.2);
    const arm = H.cmd('armKeg', keg);
    H.step(12);
    const k = H.kinds();
    return { bramble: br, slowAt, slow: p.status && p.status.slow, barricade: bar, barHp, keg, arm, kinds: k, phase: H.st().run.phase };
  },
  // (7) Act II: Puffcap swelling mid-telegraph + a millrace surge telegraph +
  // the sluice on cooldown + a toad slick + a haste status
  act2content: () => {
    const H = window.__gntM2;
    H.S.freeze();
    H.combatRun(2);
    const p = H.player();
    H.cmd('iframe', p.id, 100000);
    const mill = H.cmd('spawnHazard', 'millrace', p.x, p.z - 3.2);
    const sl = H.cmd('spawnInteractable', 'sluice', p.x + 0.5, p.z, { laneIds: [mill] });
    const used = H.cmd('interactPress', [0]);
    const toad = H.cmd('spawn', 'toad', p.x + 3.5, p.z + 1.5);
    const slickAt = H.until(() => (H.kinds().slick || 0) > 0, 900);
    const puff = H.cmd('spawnHazard', 'puffcap', p.x - 2.5, p.z + 2.5);
    H.cmd('hazardPhase', puff, 'telegraph');
    const mill2 = H.cmd('spawnHazard', 'millrace', p.x, p.z + 3.4);
    H.cmd('hazardPhase', mill2, 'telegraph');
    const haste = H.cmd('setStatus', p.id, 'haste', 0.25, 900);
    H.step(6);
    const view = H.E.content.hazards ? H.E.content.hazards() : null;
    const sluice = H.ents().find((e) => e.id === sl);
    return { mill, mill2, sluice: sl, used, sluiceCd: sluice ? sluice.cooldownUntilTick : null, toad, slickAt, puff, haste, kinds: H.kinds(), hazards: view, phase: H.st().run.phase };
  },
  // (8) Act III: a burrowed mole mid-tunnel + a Rockfall telegraph with >= 1
  // rubble collider + a Gravefire line mid-sequence + a pending Echo recast +
  // non-zero Resonance counters + an elite alive
  act3content: () => {
    const H = window.__gntM2;
    H.S.freeze();
    H.combatRun(3);
    const p = H.player();
    H.cmd('iframe', p.id, 100000);
    const mole = H.cmd('spawn', 'mole', p.x + 3, p.z + 2);
    H.step(30);
    const bur = H.cmd('burrow', mole, true);
    const rock = H.cmd('spawnHazard', 'rockfall', p.x - 3, p.z - 1);
    H.cmd('hazardPhase', rock, 'telegraph');
    const rubbleAt = H.until(() => (H.kinds().rubble || 0) > 0, 400);
    H.cmd('hazardPhase', rock, 'telegraph');
    const grave = H.cmd('spawnHazard', 'gravefire', p.x + 1, p.z - 3);
    H.cmd('hazardPhase', grave, 'telegraph');
    const elite = H.cmd('spawn', 'boar', p.x - 4, p.z + 3, { elite: true });
    H.cmd('grantNode', 'echo');
    H.cmd('socket', 'mending_bolt', 'echo');
    H.cmd('grantNode', 'resonance');
    H.cmd('socket', 'swift_mend', 'resonance');
    H.cmd('resonance', 'swift_mend', 2);
    H.step(20);
    const echo = H.cmd('echoArm', 'mending_bolt');
    const w = H.E.content.world();
    const b = w.buildSystem();
    return {
      mole,
      burrowed: bur,
      rock,
      rubbleAt,
      grave,
      elite,
      echo,
      resonance: b.resonanceCount('swift_mend'),
      kinds: H.kinds(),
      moleState: (() => {
        const m = H.ents().find((e) => e.id === mole);
        return m ? { burrowed: m.burrowed, mode: m.mode } : null;
      })(),
      hazards: H.E.content.hazards ? H.E.content.hazards() : null,
      phase: H.st().run.phase,
    };
  },
};
