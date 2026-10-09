// VFX lab (docs/gauntlet/design-VFX.md §10) — a review panel for the combat
// effects, opened with ?vfxlab=1 on any build (the deployed game included).
// Every button drives the real game through the same harness commands the
// probes use (__echoes.cmd), so what plays is exactly what a run plays, at
// the real frame rate:
//
//   Rooms    jump to a live Act I / II / III / IV room (enemies cleared) or to
//            either boss of an act
//   Party    equip one of the class skill sets and play it as a reel: each
//            skill fires at a cluster of training targets in front of the
//            party, one after another (the Healer's through its own keys)
//   Enemies  spawn a pair of one enemy type in front of the party; they
//            fight, telegraph, hit and die as in a run
//   Boss     force the add phase / enrage, or end the fight
//   Relics   an elite's relic drop, Spore Sac, a major curse, Short Fuse
//   Affixes  an elite with one of the eight named powers (or two), in front
//            of the party, so its plate, aura, telegraph and burst play
//   Floors   a slick floor patch (wet stone / grave frost) under the party
//            with boars charging across it, or a whole room that carries
//            the floor (Flooded Cellar, Bell Tower)
//   Sound    each boss's sting, phase and fall stings and its boss groove;
//            each event room, room objective and slide cue
//   Hit      a light / heavy / over-time / downed hit on your character
//
// Off unless the URL asks for it; touches nothing else in the UI.
const HEALER_SETS = [
  ['spirit_bolt', 'mending_bolt', 'nova_bloom', 'sanctuary'],
  ['bell_toll', 'pale_lance', 'rootsnare', 'mending_tide'],
  ['restorative_wave', 'guardian_bond', 'lantern_flurry', 'hearthsong'],
  ['lantern_ward', 'dawn_brand', 'swift_mend', 'spirit_bolt'],
];
const CLASS_SETS = {
  tank: [
    ['heavy_slam', 'ground_crack', 'taunting_roar', 'shoulder_charge'],
    ['brutal_cleave', 'whirling_guard', 'shield_wall', 'iron_stance'],
    ['earthshatter', 'rallying_cry', 'earthen_grasp', 'heavy_slam'],
  ],
  swordsman: [
    ['flurry', 'blade_storm', 'crescent_finisher', 'fox_step'],
    ['lunge_strike', 'caltrops', 'riposte', 'razor_wake'],
    ['moonfang', 'blade_dance', 'crimson_edge', 'flurry'],
  ],
  archer: [
    ['piercing_shot', 'volley', 'rain_of_arrows', 'detonating_charge'],
    ['sundering_nova', 'pinning_arrow', 'vault_shot', 'kestrel_watch'],
    ['hunters_mark', 'barbed_trap', 'feather_fan', 'piercing_shot'],
  ],
};
const ENEMIES = [
  ['Act I', 1, ['boar', 'mantis', 'quillback', 'toad', 'moth', 'ram', 'mole', 'wasp', 'thornling']],
  ['Act II', 2, ['rotcap', 'snail', 'crab', 'lamprey']],
  ['Act III', 3, ['crow', 'brood', 'knight', 'gravewisp', 'keener', 'sexton']],
  ['Act IV', 4, ['husk', 'lancer', 'geode', 'censer', 'bloom', 'siphon']],
];
// Each act's two bosses: [label, act, boss kind].
const BOSSES = [
  ['Stag', 1, 'stag'],
  ['Thornmother', 1, 'thornmother'],
  ['Heron', 2, 'heron'],
  ['Millwheel', 2, 'millwheel'],
  ['Wyrm', 3, 'wyrm'],
  ['Lich Ram', 3, 'lichram'],
  ['Cantor', 4, 'cantor'],
  ['Colossus', 4, 'colossus'],
];

export function mountVfxLab() {
  const X = () => window.__echoes;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const panel = document.createElement('div');
  panel.id = 'vfxlab';
  panel.style.cssText = [
    'position:fixed', 'top:64px', 'right:10px', 'z-index:9999', 'width:236px', 'max-height:calc(100vh - 90px)', 'overflow:auto',
    'background:rgba(18,16,14,0.86)', 'color:#F4EFE6', 'font:12px/1.35 system-ui,sans-serif', 'border:1px solid #4E463F',
    'border-radius:6px', 'padding:8px 9px', 'user-select:none',
  ].join(';');
  const status = document.createElement('div');
  status.style.cssText = 'color:#D9B872;margin:4px 0 6px;min-height:15px';
  const head = document.createElement('div');
  head.innerHTML = '<b>VFX lab</b> <span style="opacity:.6">(?vfxlab=1)</span>';
  const hide = document.createElement('button');
  hide.textContent = 'hide';
  hide.style.cssText = 'float:right;font-size:11px';
  head.appendChild(hide);
  panel.appendChild(head);
  panel.appendChild(status);
  const body = document.createElement('div');
  panel.appendChild(body);
  hide.onclick = () => {
    body.style.display = body.style.display === 'none' ? '' : 'none';
    hide.textContent = body.style.display === 'none' ? 'show' : 'hide';
  };
  const say = (t) => (status.textContent = t);
  let busy = false;
  const section = (title) => {
    const h = document.createElement('div');
    h.textContent = title;
    h.style.cssText = 'margin:8px 0 3px;opacity:.7;text-transform:uppercase;letter-spacing:.06em;font-size:10px';
    body.appendChild(h);
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;flex-wrap:wrap;gap:3px';
    body.appendChild(row);
    return row;
  };
  const button = (row, label, fn, title = '') => {
    const b = document.createElement('button');
    b.textContent = label;
    b.title = title;
    b.style.cssText = 'font-size:11px;padding:2px 5px;cursor:pointer;background:#33302B;color:#F4EFE6;border:1px solid #6B6157;border-radius:3px';
    b.onclick = async (e) => {
      e.preventDefault();
      b.blur(); // keep the game's keys live
      if (busy) return;
      busy = true;
      try {
        await fn();
      } catch (err) {
        say(`error: ${err && err.message ? err.message : err}`);
      } finally {
        busy = false;
      }
    };
    row.appendChild(b);
    return b;
  };

  // ---------------------------------------------------------------- rooms --
  const run = () => X().state().run || {};
  async function room(act, n, boss = null) {
    say(`entering Act ${act} room ${n}...`);
    // A live run keeps its act (and its boss): switching acts, or asking for
    // a particular boss, abandons it and starts anew.
    if (run().active && (run().act !== act || boss)) {
      X().cmd('abandonRun', 'quit');
      await wait(300);
    }
    if (!run().active) {
      X().cmd('startRun', boss ? { act, boss } : { act });
      for (let i = 0; i < 100 && run().phase !== 'combat'; i++) await wait(100);
    }
    X().cmd('skipToRoom', n, { act });
    for (let i = 0; i < 100 && !(run().phase === 'combat' && run().room === n); i++) await wait(100);
    await wait(600);
    if (n !== 8) X().cmd('killAllEnemies');
    say(`Act ${act} room ${n}`);
  }
  async function ensureCombat(act = 1) {
    const r = run();
    if (!(r.active && r.phase === 'combat' && r.room !== 8)) await room(act, 3);
    else X().cmd('killAllEnemies');
  }
  const front = () => {
    const p = X().content.world().player;
    return { x: p ? p.x : 0, z: p ? p.z - 2.2 : -2.2 };
  };
  function targets() {
    const f = front();
    for (const [dx, dz] of [[-0.9, 0], [0, -0.5], [0.9, 0]]) X().cmd('spawn', 'dummy', f.x + dx, f.z + dz);
    return f;
  }
  const rooms = section('Rooms');
  for (const a of [1, 2, 3, 4]) button(rooms, `Act ${['I', 'II', 'III', 'IV'][a - 1]} room`, () => room(a, 3));
  for (const [label, a, kind] of BOSSES) button(rooms, label, () => room(a, 8, kind), `Act ${a} boss room: ${label}`);

  // Act IV bosses (docs/ACT_IV_BOSSES.md): jump the fight to a beat. The HP
  // cuts go through the run's own bossHp hook, so each verse / enrage plays
  // exactly as it would in a fight.
  const act4 = section('Act IV bosses');
  async function act4Boss(kind) {
    const b = run().boss;
    if (!(run().active && run().room === 8 && b && b.kind === kind && b.active)) await room(4, 8, kind);
  }
  const bossCut = async (kind, pct, msg) => {
    await act4Boss(kind);
    X().cmd('bossHp', pct);
    say(msg);
  };
  button(act4, 'Cantor verse I', () => bossCut('cantor', 0.74, 'Cantor: the Wood verse (boars, mantis)'), 'cut to 74%: the first verse and its adds');
  button(act4, 'verse II', () => bossCut('cantor', 0.49, 'Cantor: the Mill verse (echoing notes, Echo Step)'), 'cut to 49%');
  button(act4, 'verse III', () => bossCut('cantor', 0.24, 'Cantor: the Barrow verse (Heart Pulse)'), 'cut to 24%');
  button(act4, 'step', async () => {
    await bossCut('cantor', 0.49, 'Cantor: crowd it to make it step');
    const b = run().boss;
    if (b) X().cmd('teleport', b.x, b.z + 1.6);
  }, 'stand next to it in the Second Verse');
  button(act4, 'Colossus enrage', () => bossCut('colossus', 0.39, 'Colossus: enraged (faster fissures, burst shards)'), 'cut to 39%');
  button(act4, 'burst', async () => {
    await act4Boss('colossus');
    const b = run().boss;
    if (b) X().cmd('teleport', b.x, b.z + 1.8);
    say('Colossus: stand close for a Geode Burst');
  }, 'stand next to it');

  // ---------------------------------------------------------------- party --
  function seatOf(cls) {
    const w = X().content.world();
    for (const e of w.entities()) if (e.classId === cls && e.partyIndex !== undefined) return e.partyIndex;
    return null;
  }
  async function classReel(cls, set) {
    await ensureCombat(run().act || 1);
    const seat = seatOf(cls);
    if (seat == null) return say(`no ${cls} in the party`);
    set.forEach((id, k) => X().cmd('partySwap', seat, id, k));
    for (let k = 0; k < set.length; k++) {
      X().cmd('killAllEnemies');
      const f = targets();
      say(`${cls}: ${set[k].replace(/_/g, ' ')}`);
      await wait(250);
      X().cmd('partyCast', seat, k, { x: f.x, z: f.z });
      await wait(1500);
    }
    say(`${cls} reel done`);
  }
  async function healerReel(set) {
    await ensureCombat(run().act || 1);
    set.forEach((id, k) => X().cmd('partySwap', 0, id, k));
    for (let k = 0; k < set.length; k++) {
      X().cmd('killAllEnemies');
      targets();
      for (const m of (X().state().party || []).slice(1)) X().cmd('setHp', m.id, 0.5);
      say(`healer: ${set[k].replace(/_/g, ' ')}`);
      await wait(250);
      const code = `Digit${k + 1}`;
      window.dispatchEvent(new KeyboardEvent('keydown', { code, key: String(k + 1), bubbles: true }));
      await wait(120);
      window.dispatchEvent(new KeyboardEvent('keyup', { code, key: String(k + 1), bubbles: true }));
      await wait(1500);
    }
    say('healer reel done');
  }
  const party = section('Party skills (reels)');
  for (const cls of ['tank', 'swordsman', 'archer']) CLASS_SETS[cls].forEach((set, i) => button(party, `${cls[0].toUpperCase()}${cls.slice(1)} ${'ABC'[i]}`, () => classReel(cls, set), set.join(', ')));
  HEALER_SETS.forEach((set, i) => button(party, `Healer ${'ABCD'[i]}`, () => healerReel(set), set.join(', ')));

  // -------------------------------------------------------------- enemies --
  for (const [title, act, kinds] of ENEMIES) {
    const row = section(`Enemies, ${title}`);
    for (const k of kinds)
      button(row, k, async () => {
        if (run().act !== act || run().room === 8 || run().phase !== 'combat') await room(act, 3);
        X().cmd('killAllEnemies');
        const f = front();
        // Husks surge on one shared heartbeat: show a pack of four.
        if (k === 'husk') {
          for (const dx of [-1.8, -0.6, 0.6, 1.8]) X().cmd('spawn', 'husk', f.x + dx, f.z - 2.4);
          return say('husk x4: watch the veins swell and the pack surge on the beat');
        }
        // A censer only mends with kin in reach: hang it behind two husks.
        if (k === 'censer') {
          X().cmd('spawn', 'husk', f.x - 0.8, f.z - 1.6);
          X().cmd('spawn', 'husk', f.x + 0.8, f.z - 1.6);
          X().cmd('spawn', 'censer', f.x, f.z - 3.4);
          return say('censer + 2 husks: hit the husks, watch it gather and mend');
        }
        // Blooms root near the party and pulse on every second heartbeat.
        if (k === 'bloom') {
          X().cmd('spawn', 'bloom', f.x - 1.2, f.z - 2.2);
          X().cmd('spawn', 'bloom', f.x + 1.2, f.z - 2.2);
          return say('bloom x2: they root, then open and pulse together on the beat');
        }
        // A Sexton buries snares toward you: stand still and walk onto one.
        if (k === 'sexton') {
          X().cmd('spawn', 'sexton', f.x, f.z - 3.6);
          return say('sexton: watch it kneel and bury a snare, then step on it');
        }
        // A wisp only acts with someone to ward: pair it with a Barrow Ram.
        X().cmd('spawn', k === 'gravewisp' ? 'ram' : k, f.x - 1.1, f.z - 1.6);
        X().cmd('spawn', k, f.x + 1.1, f.z - 1.6);
        say(`${k} x2: watch them attack and die`);
      });
  }

  // --------------------------------------------------------------- relics --
  // Relics slice 2, through the real sim: relics on for the live room, then
  // an elite that drops a relic when killed, Spore Sac on a Rotcap pack, a
  // major curse and Short Fuse laid on the room the party stands in.
  const rel2 = section('Relics and curses');
  async function relicRoom(act) {
    await ensureCombat(act);
    X().cmd('relics', true);
  }
  button(rel2, 'Elite drop', async () => {
    await relicRoom(3);
    X().cmd('relicDropNext');
    const f = front();
    X().cmd('spawn', 'knight', f.x, f.z - 1.4);
    say('kill the Barrow Knight: it drops a relic');
  }, 'a Barrow Knight (always Elite) that drops a relic');
  button(rel2, 'Spore Sac', async () => {
    await relicRoom(2);
    X().cmd('relicGrant', 'spore_sac');
    const f = front();
    for (const dx of [-1.4, 0, 1.4]) X().cmd('spawn', 'rotcap', f.x + dx, f.z - 1.6);
    X().cmd('spawn', 'boar', f.x, f.z - 2.6);
    say('Spore Sac: Rotcaps die with no burst, kills slow');
  }, 'Spore Sac on three Rotcaps and a boar');
  button(rel2, 'Major curse', async () => {
    await relicRoom(1);
    X().cmd('relicCurseHere', 'hunted');
    say('a major curse binds the party');
  }, 'Hunted laid on this room');
  button(rel2, 'Short Fuse', async () => {
    await relicRoom(1);
    X().cmd('relicCurseHere', 'short_fuse');
    const f = front();
    X().cmd('spawn', 'wasp', f.x - 1.2, f.z - 2.2);
    X().cmd('spawn', 'mantis', f.x + 1.2, f.z - 2.2);
    say('Short Fuse: telegraphs 20% shorter');
  }, 'Short Fuse on this room, with wasps and a mantis');

  // ------------------------------------------------------ synergy relics --
  // RELICS batch 3 (docs/RELICS.md "Batch 3"): each relic granted, then its
  // trigger driven through the real pipeline (a party hit, heal or status).
  const rel3 = section('Synergy relics');
  const idOf = (r) => (r && typeof r === 'object' ? r.id : r);
  const seatBody = (i) => X().content.world().entities().find((e) => e.partyIndex === i) ?? null;
  async function relicFoes(id, n = 1, dx = 1.0, kind = 'boar') {
    await relicRoom(1);
    X().cmd('relicGrant', id);
    const f = front();
    const ids = [];
    for (let i = 0; i < n; i++) ids.push(idOf(X().cmd('spawn', kind, f.x + (i - (n - 1) / 2) * dx, f.z - 0.6)));
    await wait(120);
    return ids;
  }
  button(rel3, "Warden's Oath", async () => {
    const ids = await relicFoes('wardens_oath', 3);
    const tank = seatBody(1);
    if (tank) tank.hp = Math.max(1, tank.maxHp * 0.4);
    for (const id of ids) X().cmd('relicStatus', id, 'taunt', 1, 120, 1);
    say("Warden's Oath: three taunts heal the Tank");
  }, 'three enemies taunted by the Tank');
  button(rel3, 'Fox Ribbon', async () => {
    const [id] = await relicFoes('fox_ribbon', 1);
    const sw = seatBody(2);
    X().cmd('relicHit', id, sw ? sw.id : null, 20, true);
    say('Fox Ribbon: a Swordsman crit cuts again');
  }, 'a Swordsman critical hit on a boar');
  button(rel3, "Fletcher's Knot", async () => {
    const [a] = await relicFoes('fletchers_knot', 2, 2.2);
    const ar = seatBody(3);
    X().cmd('relicStatus', a, 'exposed', 0.3, 180, 3);
    await wait(60);
    X().cmd('relicHit', a, ar ? ar.id : null, 20, false);
    say("Fletcher's Knot: the arrow glances to the next boar");
  }, 'an Archer hit on an exposed boar, with a second one beside it');
  button(rel3, 'Mercy Bell', async () => {
    await relicFoes('mercy_bell', 0);
    const tank = seatBody(1);
    const h = seatBody(0);
    if (tank) X().cmd('relicHeal', tank.id, h ? h.id : null, 45);
    say("Mercy Bell: the Healer's overheal becomes a shield");
  }, 'a Healer heal on a Tank at full health');
  button(rel3, 'Kindling Coal', async () => {
    X().cmd('relicGrant', 'ember_tooth');
    const ids = await relicFoes('kindling_coal', 4, 0.7);
    const tank = seatBody(1);
    X().cmd('relicHit', ids[1], tank ? tank.id : null, 12, true);
    say('Kindling Coal (with Ember Tooth): a crit flares through the pack');
  }, 'a critical hit inside a pack of four');
  button(rel3, 'Sun Chalice', async () => {
    const [id] = await relicFoes('sun_chalice', 1);
    const h = seatBody(0);
    if (h) {
      h.hp = Math.max(1, h.maxHp * 0.4);
      X().cmd('relicHeal', h.id, h.id, 30);
    }
    say('Sun Chalice: the heal sears the nearest enemy');
    void id;
  }, 'a heal on the wounded Healer, a boar nearby');
  button(rel3, 'Cinder Pact', async () => {
    await relicRoom(1);
    X().cmd('relicGrant', 'cinder_pact');
    X().cmd('relicCurseHere', 'sharp_fangs');
    say('Cinder Pact: a cursed room burns back');
  }, 'Sharp Fangs laid on this room with the pact held');
  button(rel3, 'Bounty Writ', async () => {
    const [id] = await relicFoes('bounty_writ', 1, 1, 'knight');
    X().cmd('setHp', id, 0.02);
    const tank = seatBody(1);
    X().cmd('relicHit', id, tank ? tank.id : null, 30, false);
    say('Bounty Writ: an elite pays its bounty');
  }, 'a Barrow Knight (always Elite) killed by the Tank');
  button(rel3, "Huntsman's Horn", async () => {
    await relicRoom(1);
    X().cmd('relicGrant', 'huntsmans_horn');
    X().cmd('relicRoomEnter', 'hunt');
    say("Huntsman's Horn: a Hunt room opens");
  }, "the horn's call on entering a Hunt room");
  button(rel3, "Pilgrim's Lamp", async () => {
    await relicRoom(1);
    X().cmd('relicGrant', 'pilgrims_lamp');
    for (const i of [0, 1, 2, 3]) {
      const b = seatBody(i);
      if (b) b.hp = Math.max(1, b.maxHp * 0.5);
    }
    X().cmd('relicRoomEnter', 'event');
    say("Pilgrim's Lamp: an event room lights up");
  }, 'the lamp on entering an event room, the party at half health');

  // -------------------------------------------------------------- affixes --
  // ELITE AFFIXES (docs/ELITE_AFFIXES.md): one elite per power, spawned with
  // that power forced, so each warning and burst can be reviewed.
  const aff = section('Elite affixes');
  const AFFIX_DEMO = { molten: 'boar', frozen: 'ram', vampiric: 'boar', warded: 'knight', blinking: 'mantis', splitting: 'boar', hasted: 'boar', thorned: 'ram' };
  for (const [id, kind] of Object.entries(AFFIX_DEMO)) {
    button(aff, id[0].toUpperCase() + id.slice(1), async () => {
      await ensureCombat(id === 'warded' ? 3 : 1);
      const f = front();
      X().cmd('spawn', kind, f.x, f.z - 2.6, { elite: true, affixes: [id] });
      say(`${id}: a ${kind} elite with that power`);
    }, `an elite ${kind} that is ${id}`);
  }
  button(aff, 'Two powers', async () => {
    await ensureCombat(2);
    const f = front();
    X().cmd('spawn', 'crab', f.x - 1.2, f.z - 2.6, { elite: true, affixes: ['molten', 'hasted'] });
    X().cmd('spawn', 'boar', f.x + 1.2, f.z - 2.6, { elite: true, affixes: ['frozen', 'warded'] });
    say('two elites with two powers each');
  }, 'Molten + Hasted crab, Frozen + Warded boar');

  // ------------------------------------------------------------ champions --
  // CHAMPION ROOMS (docs/CHAMPIONS.md): each act's champion spawned in front
  // of the party in its own land (crown, sigil, both moves, the rage below
  // half health and its fall all play live).
  const champ = section('Champions');
  for (const [act, kind, name] of [[1, 'briar_knight', 'Briar Knight'], [2, 'sluice_warden', 'Sluice Warden'], [3, 'bone_reeve', 'Bone Reeve'], [4, 'hollow_choir', 'Hollow Choir']]) {
    button(champ, name, async () => {
      await ensureCombat(act);
      const f = front();
      X().cmd('spawn', kind, f.x, f.z - 3.6);
      say(`the ${name}: two telegraphed moves, rages below half health`);
    }, `the ${name} in its own land`);
  }

  // --------------------------------------------------------------- floors --
  // Slick floor (docs/SLICK_FLOOR.md): a patch laid where the party stands,
  // with two boars charging across it so the enemy slide reads too.
  const floors = section('Slick floor');
  async function slickHere(act, skin) {
    await ensureCombat(act);
    const p = X().content.world().player;
    const x = p ? p.x : 0;
    const z = p ? p.z : 0;
    X().cmd('spawnHazard', 'slip', x, z - 0.6, { r: 1.8, skin });
    X().cmd('spawn', 'boar', x - 2.2, z - 4.2);
    X().cmd('spawn', 'boar', x + 2.2, z - 4.2);
    say(`${skin === 'frost' ? 'grave frost' : skin === 'glass' ? 'heart crystal' : 'wet stone'} under the party: walk, stop, dodge on it`);
  }
  button(floors, 'Wet stone', () => slickHere(2, 'wet'), 'a wet flagstone patch (Act II) under the party, two boars');
  button(floors, 'Grave frost', () => slickHere(3, 'frost'), 'a grave frost patch (Act III) under the party, two boars');
  button(floors, 'Heart crystal', () => slickHere(4, 'glass'), 'a heart crystal patch (Act IV) under the party, two boars');
  for (const [label, act, id] of [['Flooded Cellar', 2, 13], ['Bell Tower', 3, 14]])
    button(floors, label, async () => {
      await ensureCombat(act);
      X().cmd('setLayout', id);
      say(`${label}: the room's own slick floor`);
    }, `layout ${id} placed in this room`);

  // ----------------------------------------------------------------- boss --
  const boss = section('Boss');
  button(boss, 'Add phase / enrage', () => {
    X().cmd('bossHp', 0.45);
    say('boss at 45%');
  });
  button(boss, 'Kill boss', () => {
    X().cmd('killBoss');
    say('boss death');
  });

  // -------------------------------------------------------- boss identity --
  // Each boss's own stings and groove, without fighting it (the boss room
  // buttons above show its medal on the live banner and play its beats).
  const audio = () => X().app.service('audio');
  const THEME = { 1: 'wood', 2: 'mill', 3: 'barrow', 4: 'heart' };
  for (const [label, a, kind] of BOSSES) {
    const row = section(`Sound, ${label}`);
    for (const [part, name] of [['sting', 'Sting'], ['phase', 'Phase'], ['fall', 'Fall']]) {
      button(row, name, () => {
        audio().play(`bx_${kind}_${part}`);
        say(`${label}: ${name.toLowerCase()} sting`);
      }, `bx_${kind}_${part}`);
    }
    button(row, 'Groove', () => {
      const au = audio();
      au.music.setBoss(kind);
      au.debug.setMusic('boss', { theme: THEME[a], intensity: 1 });
      say(`${label}: boss groove (Release to hand back)`);
    }, 'its boss music at full intensity');
  }
  // Event rooms, room objectives and the slick floor slide
  // (src/audio/encountercues.js): each cue on its own, without walking a
  // run to the room.
  const ENC_SOUNDS = [
    ['Sound, event rooms', [
      ['Enter', 'ev_enter'], ['Card', 'ev_open'], ['Leave', 'ev_leave'],
      ['Shrine', 'ev_shrine'], ['Well', 'ev_well'], ['Chest', 'ev_ambush'], ['Pilgrim', 'ev_pilgrim'],
      ['Altar', 'ev_altar'], ['Spirit', 'ev_spirit'], ['Cache', 'ev_cache'], ['Spring', 'ev_spring'], ['Chest won', 'ev_chest'],
    ]],
    ['Sound, objectives', [
      ['Hunt horn', 'ob_horn'], ['Winded', 'ob_winded'], ['Escape', 'ob_escape'], ['Purge', 'ob_purge'],
      ['Nest', 'ob_nest'], ['Nest births', 'ob_pulse'], ['Nest bursts', 'ob_burst'], ['Rooted', 'ob_rooted'], ['Won', 'ob_won'],
    ]],
    // CHAMPION ROOMS (src/audio/championcues.js).
    ['Sound, champion stings', [
      ['Briar Knight', 'ch_briar_knight_sting'], ['Sluice Warden', 'ch_sluice_warden_sting'], ['Bone Reeve', 'ch_bone_reeve_sting'], ['Hollow Choir', 'ch_hollow_choir_sting'],
      ['Rage', 'ch_briar_knight_rage'], ['Fall', 'ch_fall'], ['Chest', 'ch_chest'], ['Crown door', 'ch_crown'],
    ]],
    ['Sound, champion moves', [
      ['Tell', 'ch_tell'], ['Bramble Charge', 'ch_bramble_charge'], ['Charge stops', 'ch_charge_stop'], ['Thorn Ring', 'ch_thorn_ring'],
      ['Floodgate', 'ch_floodgate'], ['Undertow', 'ch_undertow'], ['Reaping Sweep', 'ch_reaping_sweep'], ['Grave Lance', 'ch_grave_lance'],
      ['Shard Hymn', 'ch_shard_hymn'], ['Discord', 'ch_discord'],
    ]],
    // SHOP REFRESH (src/audio/cues.js): the peddler's riffle beside the buy.
    ['Sound, shop', [['Buy', 'purchase'], ['Refresh', 'shop_refresh'], ['Too dear', 'deny']]],
  ];
  for (const [title, list] of ENC_SOUNDS) {
    const row = section(title);
    for (const [name, id] of list)
      button(row, name, () => {
        audio().play(id);
        say(`${title.slice(7)}: ${name.toLowerCase()}`);
      }, id);
  }
  const slideRow = section('Sound, slide');
  for (const [name, skin] of [['Wet', 'wet'], ['Frost', 'frost'], ['Glass', 'glass']])
    button(slideRow, name, async () => {
      // A second of grains at a running pace, as a slide plays them.
      for (let i = 0; i < 9; i++) {
        audio().play(`sl_${skin}`, { gainDb: -3 + i * 0.3, pitch: 1 });
        await wait(115);
      }
      say(`slide on ${skin === 'wet' ? 'wet stone' : skin === 'frost' ? 'grave frost' : 'heart crystal'} (the Slick floor row plays it live)`);
    }, `sl_${skin}`);

  // Hit feedback (docs/HIT_FEEDBACK.md): a hit on your own character from
  // the upper left, played through the real layer (edge pulse, arc, rig
  // flash, kick, sound) without touching the sim; Live hits lets two boars
  // and a mantis at the party so real blows land.
  const hitRow = section('Hit feedback');
  for (const [name, tier] of [['Light', 'light'], ['Heavy', 'heavy'], ['Over time', 'soft'], ['Downed', 'down']])
    button(hitRow, name, async () => {
      await ensureCombat(1);
      if (tier === 'soft') {
        for (let i = 0; i < 6; i++) {
          X().content.hitPreview('soft');
          await wait(250);
        }
      } else if (!X().content.hitPreview(tier)) {
        say('hit feedback is off (Settings > Gameplay)');
        return;
      }
      say(`hit feedback: ${name.toLowerCase()} hit`);
    }, `a ${name.toLowerCase()} hit on your character`);
  button(hitRow, 'Live hits', async () => {
    await ensureCombat(1);
    const p = X().content.world().player;
    const x = p ? p.x : 0;
    const z = p ? p.z : 0;
    X().cmd('spawn', 'boar', x - 2.4, z - 2.2);
    X().cmd('spawn', 'boar', x + 2.4, z + 1.6);
    X().cmd('spawn', 'mantis', x + 2.6, z - 2.4);
    say('two boars and a mantis at the party: real hits');
  }, 'enemies that reach the party');

  const rel = section('Music');
  button(rel, 'Release', () => {
    const au = audio();
    au.music.setBoss(null);
    au.music.release();
    say('music follows the game again');
  });

  document.body.appendChild(panel);
  return panel;
}
