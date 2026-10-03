// Save critic r5 in-page helpers (serialised into the page with Function.toString).
export function install() {
  const E = window.__echoes;
  const S = E.sim;
  const canon = (v) => {
    if (v === null) return 'null';
    const t = typeof v;
    if (t === 'number') {
      if (Number.isNaN(v)) return '"#NaN"';
      if (v === Infinity) return '"#Inf"';
      if (v === -Infinity) return '"#-Inf"';
      if (Object.is(v, -0)) return '"#-0"';
      return String(v);
    }
    if (t === 'string') return JSON.stringify(v);
    if (t === 'boolean') return String(v);
    if (Array.isArray(v)) return '[' + v.map((x) => (x === undefined ? '"#undef"' : canon(x))).join(',') + ']';
    if (t === 'object') {
      return '{' + Object.keys(v).filter((k) => v[k] !== undefined).sort().map((k) => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}';
    }
    return '"#' + t + '"';
  };
  const sha = async (s) => {
    const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
    return [...new Uint8Array(b)].slice(0, 12).map((x) => x.toString(16).padStart(2, '0')).join('');
  };
  const H = {
    E, S, canon, sha,
    cmd: (...a) => E.cmd(...a),
    step: (n, script = null) => S.stepN(n, script),
    st: () => E.state(),
    world: () => E.content.world(),
    ents: () => (E.content && E.content.world ? E.content.world().entities() : []),
    player: () => E.content.world().player,
    until(pred, max = 1200, script = null) {
      for (let i = 0; i < max; i++) {
        if (pred()) return i;
        S.stepN(1, script);
      }
      return pred() ? max : -1;
    },
    // Campaign at level L, clear room 1 to the reward page, build an inventory (socketed node + bench node).
    prep(level = 1) {
      H.cmd('startCampaign', { level });
      H.until(() => H.st().run.phase === 'combat' && H.st().enemies.length > 0, 900);
      H.until(() => { H.cmd('killAllEnemies'); return H.st().run.phase === 'reward'; }, 1500);
      H.cmd('grantNode', 'echo');
      H.cmd('grantNode', 'resonance');
      const s1 = H.cmd('socket', 'mending_bolt', 'echo');
      return s1;
    },
    kinds() {
      const out = {};
      for (const e of H.ents()) out[e.kind] = (out[e.kind] || 0) + 1;
      return out;
    },
    async digest() {
      const t = E.save.capture();
      const c = canon(t);
      return { my: await sha(c), game: E.save.hash(), tick: E.tick, bytes: c.length };
    },
    summary() {
      const s = E.state();
      const cs = E.campaign.state();
      const tree = E.save.capture();
      return {
        tick: E.tick,
        seed: s.seed,
        rng: tree.rng,
        rngDraws: s.rngDraws,
        phase: s.run.phase,
        room: s.run.room,
        act: s.run.act,
        mode: s.run.mode,
        wallet: s.wallet,
        party: s.party.map((p) => ({ id: p.id, cls: p.classId || p.kind, hp: p.hp, x: p.x, z: p.z, downed: p.downed })),
        skills: s.skills.map((k) => (k ? { id: k.id, rem: k.remainingTicks } : null)),
        sockets: s.build.skills.map((k) => ({ id: k.id, sockets: k.sockets.map((n) => (n ? (n.id || n.nodeId || JSON.stringify(n).slice(0, 40)) : null)), res: k.resonance })),
        bench: (s.build.bench || []).map((n) => (n && (n.id || n.nodeId)) || n),
        enemies: (s.enemies || []).map((e) => ({ id: e.id, t: e.etype || e.type || e.kind, hp: e.hp, x: e.x, z: e.z })),
        projectiles: (s.projectiles || []).length,
        eshots: (s.eshots || []).length,
        zones: (s.zones || []).length,
        azones: (s.azones || []).length,
        kinds: H.kinds(),
        campaign: { active: cs.active, phase: cs.phase, level: cs.level, startLevel: cs.startLevel, index: cs.index, levelsCleared: cs.levelsCleared, card: cs.card, transitionState: cs.transitionState },
        boss: s.run.boss,
        reward: s.run.reward ? JSON.stringify(s.run.reward).slice(0, 300) : null,
        shop: s.run.shop ? JSON.stringify(s.run.shop).slice(0, 300) : null,
        playerStatus: (() => { try { return H.player().status || null; } catch (e) { return null; } })(),
        profileHS: (() => { try { const p = E.save.profile(); return { n: p.highScores.length, best: p.records.bestScore }; } catch (e) { return null; } })(),
      };
    },
    // Continuation: n ticks with scripted input seed, digest every `every` ticks, every non-sound event.
    async cont(n = 600, seed = 3, every = 60) {
      const evs = [];
      const off = E.on('*', (e) => { if (e && e.type !== 'sound') evs.push(JSON.stringify(e)); });
      const rows = [];
      const t0 = E.tick;
      for (let i = 0; i < n / every; i++) {
        S.stepN(every, seed);
        const d = await H.digest();
        rows.push({ tick: E.tick, my: d.my, game: d.game });
      }
      if (typeof off === 'function') off();
      window.__gcs5lastEvents = evs;
      const types = {};
      for (const s of evs) { const t = JSON.parse(s).type; types[t] = (types[t] || 0) + 1; }
      return { fromTick: t0, toTick: E.tick, rows, evCount: evs.length, evSha: await sha(evs.join('\n')), types, evSample: evs.slice(0, 3) };
    },
  };
  window.__gcs5 = H;
  return true;
}

function killStag(H) {
  return H.until(() => {
    try { H.cmd('killBoss'); } catch (e) { /* not a command */ }
    H.cmd('killAllEnemies');
    return H.st().run.phase === 'transit';
  }, 900);
}

// Moment builders (run in page after install(); the caller boots with ?freeze=1).
export const MOMENTS = {
  camp: () => {
    const H = window.__gcs5;
    H.S.freeze();
    H.step(300, 2); // walk around camp with scripted input
    return { phase: H.st().run.phase, kinds: H.kinds() };
  },
  combat: () => {
    const H = window.__gcs5;
    H.S.freeze();
    H.prep(1);
    H.cmd('skipToRoom', 2);
    H.until(() => H.st().run.phase === 'combat' && H.st().enemies.length > 0, 900);
    H.cmd('giveSkill', 'sanctuary');
    H.cmd('giveSkill', 'spirit_bolt');
    H.cmd('iframe', H.player().id, 100000);
    const w = H.until(() => {
      const k = H.kinds();
      const s = H.st();
      return (k.zone || 0) > 0 && ((k.bolt || 0) + (k.skillbolt || 0)) > 0 && s.enemies.length > 0 && s.run.phase === 'combat';
    }, 1500, 1);
    return { waited: w, phase: H.st().run.phase, kinds: H.kinds() };
  },
  reward: () => {
    const H = window.__gcs5;
    H.S.freeze();
    H.cmd('startCampaign', { level: 1 });
    H.until(() => H.st().run.phase === 'combat' && H.st().enemies.length > 0, 600);
    const w = H.until(() => { H.cmd('killAllEnemies'); return H.st().run.phase === 'reward'; }, 1500);
    H.step(20);
    return { waited: w, phase: H.st().run.phase, reward: H.st().run.reward };
  },
  shop: () => {
    const H = window.__gcs5;
    H.S.freeze();
    H.prep(1);
    H.cmd('skipToRoom', 7);
    const w = H.until(() => H.st().run.phase === 'shop', 600);
    H.step(10);
    return { waited: w, phase: H.st().run.phase, room: H.st().run.room, wallet: H.st().wallet, shop: H.st().run.shop };
  },
  boss: () => {
    const H = window.__gcs5;
    H.S.freeze();
    H.prep(1);
    H.cmd('skipToRoom', 8);
    H.until(() => H.st().run.phase === 'combat' && H.st().run.boss && H.st().run.boss.active, 600);
    H.step(60);
    H.cmd('iframe', H.player().id, 100000);
    H.cmd('bossHp', 0.7);
    const w = H.until(() => H.st().enemies.length >= 2, 600, 1);
    return { waited: w, phase: H.st().run.phase, boss: H.st().run.boss, enemies: H.st().enemies.length };
  },
  card: () => {
    const H = window.__gcs5;
    H.S.freeze();
    H.prep(1);
    H.cmd('skipToRoom', 8);
    H.until(() => H.st().run.phase === 'combat' && H.st().run.boss && H.st().run.boss.active, 600);
    H.step(30);
    const w = H.until(() => {
      try { H.cmd('killBoss'); } catch (e) { /* ignore */ }
      H.cmd('killAllEnemies');
      return H.st().run.phase === 'transit';
    }, 900);
    H.step(40);
    return { waited: w, phase: H.st().run.phase, camp: H.E.campaign.state() };
  },
  l2mid: () => {
    const H = window.__gcs5;
    H.S.freeze();
    H.prep(1);
    H.cmd('giveSkill', 'sanctuary');
    H.cmd('skipToRoom', 8);
    H.until(() => H.st().run.phase === 'combat' && H.st().run.boss && H.st().run.boss.active, 600);
    H.step(30);
    H.until(() => {
      try { H.cmd('killBoss'); } catch (e) { /* ignore */ }
      H.cmd('killAllEnemies');
      return H.st().run.phase === 'transit';
    }, 900);
    H.step(40);
    H.cmd('campaignAdvance');
    const w = H.until(() => H.st().run.phase === 'combat' && H.st().run.act === 2 && H.st().enemies.length > 0, 1500);
    H.cmd('iframe', H.player().id, 100000);
    H.step(90, 1);
    return { waited: w, phase: H.st().run.phase, act: H.st().run.act, camp: H.E.campaign.state(), kinds: H.kinds() };
  },
  l3content: () => {
    const H = window.__gcs5;
    H.S.freeze();
    H.prep(3);
    H.cmd('socket', 'swift_mend', 'resonance');
    H.cmd('skipToRoom', 2);
    H.until(() => H.st().run.phase === 'combat' && H.st().enemies.length > 0, 900);
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
    const keg = H.cmd('spawnInteractable', 'keg', p.x - 2.4, p.z + 1.2);
    H.cmd('armKeg', keg);
    H.cmd('setStatus', p.id, 'haste', 0.25, 900);
    H.step(20);
    const echo = H.cmd('echoArm', 'mending_bolt');
    return { mole, bur, rock, rubbleAt, grave, elite, echo, keg, kinds: H.kinds(), phase: H.st().run.phase };
  },
  act1haz: () => {
    const H = window.__gcs5;
    H.S.freeze();
    H.cmd('startCampaign', { level: 1 });
    H.until(() => H.st().run.phase === 'combat' && H.st().enemies.length > 0, 900);
    H.step(40, 5);
    const p = H.player();
    H.cmd('iframe', p.id, 100000);
    const br = H.cmd('spawnHazard', 'bramble', p.x, p.z, { r: 1.4 });
    const slowAt = H.until(() => !!(p.status && p.status.slow), 120);
    const bar = H.cmd('spawnInteractable', 'barricade', p.x + 2.2, p.z + 0.4);
    const barHp = H.cmd('setHp', bar, 0.5);
    const keg = H.cmd('spawnInteractable', 'keg', p.x - 2.4, p.z + 1.2);
    const arm = H.cmd('armKeg', keg);
    H.step(9);
    return { br, slowAt, slow: p.status && p.status.slow, bar, barHp, keg, arm, kinds: H.kinds(), phase: H.st().run.phase };
  },
  act2haz: () => {
    const H = window.__gcs5;
    H.S.freeze();
    H.cmd('startCampaign', { level: 2 });
    H.until(() => H.st().run.phase === 'combat' && H.st().enemies.length > 0, 900);
    H.step(25, 5);
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
    H.step(5);
    const sluice = H.ents().find((e) => e.id === sl);
    return { mill, mill2, sl, used, sluiceCd: sluice ? sluice.cooldownUntilTick : null, toad, slickAt, puff, haste, kinds: H.kinds(), phase: H.st().run.phase, hazards: H.E.content.hazards ? H.E.content.hazards() : null };
  },
};

// ---- PARTY moments (round 5): the four builds, the swap offer, the party shop.
MOMENTS.hswap = () => {
  // Healer holds 4 skills (a node socketed on sanctuary) -> a skill reward is a SWAP offer; the player moved
  // the Replaces selector off the suggestion (slot 3) to slot 2 (index 2 = sanctuary, which carries a node);
  // the Tank's card is decided by hand (take, replacing slot 0), the others left as the mode pre-decides.
  const H = window.__gcs5;
  H.S.freeze();
  H.cmd('startCampaign', { level: 1 });
  H.until(() => H.st().run.phase === 'combat' && H.st().enemies.length > 0, 900);
  H.cmd('giveSkill', 'sanctuary');
  H.cmd('giveSkill', 'spirit_bolt');
  H.until(() => { H.cmd('killAllEnemies'); return H.st().run.phase === 'reward'; }, 1500);
  H.step(10);
  H.cmd('grantNode', 'echo');
  const sock = H.cmd('socket', 'sanctuary', 'echo');
  const rep = H.cmd('draftReplace', 2);
  const tank = H.cmd('partyPick', 1, 'take', 0);
  H.step(5);
  return { sock, rep, tank, reward: H.st().run.reward, pages: JSON.stringify(H.E.save.capture().systems.run.partyPages).slice(0, 900) };
};
MOMENTS.built4 = () => {
  // four max-stress builds (partyStress = ?partygrant=max on the live run), mid-combat in room 3 with casts in flight.
  const H = window.__gcs5;
  H.S.freeze();
  H.cmd('startCampaign', { level: 1 });
  H.until(() => H.st().run.phase === 'combat' && H.st().enemies.length > 0, 900);
  H.until(() => { H.cmd('killAllEnemies'); return H.st().run.phase === 'reward'; }, 1500);
  H.step(5);
  const stress = H.cmd('partyStress');
  H.cmd('draftTake');
  H.step(30);
  H.cmd('skipToRoom', 3);
  H.until(() => H.st().run.phase === 'combat' && H.st().enemies.length > 0, 900);
  H.cmd('iframe', H.player().id, 100000);
  H.step(150, 1);
  const views = [1, 2, 3].map((s) => { const v = H.cmd('partyView', s); return v ? { cls: v.classId, slots: v.slots, filled: v.filled, bench: (v.bench || []).length } : null; });
  return { stress: JSON.stringify(stress).slice(0, 300), views, kinds: H.kinds(), phase: H.st().run.phase, room: H.st().run.room, healer: H.st().build.skills.map((k) => k.id + ':' + k.sockets.filter(Boolean).length) };
};
MOMENTS.pshop = () => {
  // the party shop: four shelves, one ally mark removed, one ally purchase made.
  const H = window.__gcs5;
  H.S.freeze();
  H.prep(1);
  H.cmd('draftTake');
  H.cmd('skipToRoom', 7);
  const w = H.until(() => H.st().run.phase === 'shop', 600);
  H.step(10);
  const purses = [1, 2, 3].map((s) => H.cmd('partyPurse', s));
  const mark = H.cmd('partyShopMark', 1, 0, false);
  const buy = H.cmd('partyBuy', 2, 0);
  H.step(5);
  return { w, purses, mark: JSON.stringify(mark).slice(0, 200), buy: JSON.stringify(buy).slice(0, 200), shop: JSON.stringify(H.E.save.capture().systems.run.partyShop || H.st().run.shop).slice(0, 600) };
};
// Decisions applied identically on every leg AFTER the save/load point (checks the saved in-progress choice).
export const POST = {
  hswap: () => {
    const H = window.__gcs5;
    const a = H.cmd('draftTake');
    H.step(3);
    const s = H.st();
    return { take: JSON.stringify(a).slice(0, 300), skills: s.skills.map((k) => k && k.id), bench: s.build.bench.map((n) => n.node + ':' + (n.provenance || '')), tank: (H.cmd('partyView', 1) || {}).slots, phase: s.run.phase };
  },
};
MOMENTS.card4 = () => {
  // four max-stress builds carried onto the Level-1 cleared card (transit), a partly spent purse on seat 2.
  const H = window.__gcs5;
  H.S.freeze();
  H.cmd('startCampaign', { level: 1 });
  H.until(() => H.st().run.phase === 'combat' && H.st().enemies.length > 0, 900);
  H.until(() => { H.cmd('killAllEnemies'); return H.st().run.phase === 'reward'; }, 1500);
  H.step(5);
  H.cmd('partyStress');
  H.cmd('draftTake');
  H.step(30);
  H.cmd('skipToRoom', 8);
  H.until(() => H.st().run.phase === 'combat' && H.st().run.boss && H.st().run.boss.active, 600);
  H.step(30, 1);
  const w = H.until(() => { try { H.cmd('killBoss'); } catch (e) {} H.cmd('killAllEnemies'); return H.st().run.phase === 'transit'; }, 900);
  H.step(40);
  const views = [1, 2, 3].map((s) => { const v = H.cmd('partyView', s); return v.classId + ':' + v.slots.join('/') + ':' + v.filled + ':p' + v.purse; });
  return { w, phase: H.st().run.phase, card: H.E.campaign.state().card && H.E.campaign.state().card.kind, views };
};
MOMENTS.l3stress = () => {
  // Level-3 start with four max-stress builds, mid-combat room 2 with an elite and hazards.
  const H = window.__gcs5;
  H.S.freeze();
  H.cmd('startCampaign', { level: 3 });
  H.until(() => H.st().run.phase === 'combat' && H.st().enemies.length > 0, 900);
  H.until(() => { H.cmd('killAllEnemies'); return H.st().run.phase === 'reward'; }, 1500);
  H.step(5);
  H.cmd('partyStress');
  H.cmd('draftTake');
  H.step(30);
  H.cmd('skipToRoom', 2);
  H.until(() => H.st().run.phase === 'combat' && H.st().enemies.length > 0, 900);
  const p = H.player();
  H.cmd('iframe', p.id, 100000);
  H.cmd('spawn', 'boar', p.x - 4, p.z + 3, { elite: true });
  H.step(200, 1);
  return { phase: H.st().run.phase, room: H.st().run.room, kinds: H.kinds() };
};
