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
//   Gust     an Act V gust vent laid across the party, its wind-up and gust
//            forced, with a kite in the lane so a flier is shoved too
//   Spurs    an Act IV crystal spur forced under the party (wind-up, burst,
//            the pillar it leaves)
//   Shrines  a campaign room of each land with its shrine beside the party;
//            Offer pays its price (the lab tops up Glint, a key, a tonic)
//            and plays the answer and the blessing
//
// Off unless the URL asks for it; touches nothing else in the UI. The Act V
// rows play in a Level V room with ?act5=1, and in an Act IV room without
// it (the Spire's creatures and hazards exist either way).
import { ACT_IDS } from '../data/levels.js';

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
  // THE TIDECALLER (docs/TIDECALLER.md): her eleven skills in three reels.
  tidecaller: [
    ['riverbolt', 'torrent', 'undertow', 'breaker'],
    ['whirlpool', 'crashing_wave', 'bubble_ward', 'ripple_step'],
    ['rain_squall', 'maelstrom', 'riverbolt', 'tidepool'],
  ],
  // THE BELLWRIGHT (docs/BELLWRIGHT.md): her eleven skills in three reels —
  // three bells hung, the Clapper into a ring, the Peal, the Hum; the Great
  // Bell, the Knell through it, the Carillon, Bell Swing; then bells again,
  // her two wards and Wing Hop.
  bellwright: [
    ['hang_bell', 'clapper', 'peal', 'hum'],
    ['great_bell', 'knell', 'carillon', 'bell_swing'],
    ['hang_bell', 'vesper_chime', 'tuning_fork', 'wing_hop'],
  ],
};
const ENEMIES = [
  ['Act I', 1, ['boar', 'mantis', 'quillback', 'toad', 'moth', 'ram', 'mole', 'wasp', 'thornling']],
  ['Act II', 2, ['rotcap', 'snail', 'crab', 'lamprey']],
  ['Act III', 3, ['crow', 'brood', 'knight', 'gravewisp', 'keener', 'sexton']],
  ['Act IV', 4, ['husk', 'lancer', 'geode', 'censer', 'bloom', 'siphon']],
  // New enemies, Wood and Mill (docs/WOOD_MILL_ENEMIES.md).
  ['Wood, new', 1, ['owl', 'lasher']],
  ['Mill, new', 2, ['leech', 'miller']],
  // Act V, the Still Spire (docs/ACT_V.md).
  ['Act V', 5, ['kite', 'chime', 'gargoyle', 'hanger', 'vane', 'sacristan']],
];
// The room an act's row plays in: Level V only exists behind ?act5=1.
const roomAct = (act) => (ACT_IDS.includes(act) ? act : 4);
// Each act's bosses: [label, act, boss kind].
const BOSSES = [
  ['Stag', 1, 'stag'],
  ['Thornmother', 1, 'thornmother'],
  ['Gloam Wolf', 1, 'gloamwolf'],
  ['Heron', 2, 'heron'],
  ['Millwheel', 2, 'millwheel'],
  ['Mire King', 2, 'mireking'],
  ['Wyrm', 3, 'wyrm'],
  ['Lich Ram', 3, 'lichram'],
  ['Ash Raven', 3, 'ashraven'],
  ['Cantor', 4, 'cantor'],
  ['Colossus', 4, 'colossus'],
  ['Vein Weaver', 4, 'veinweaver'],
  ['The Hush', 5, 'hush'],
  ['Skyhorn', 5, 'skyhorn'],
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
  for (const a of [1, 2, 3, 4, 5]) button(rooms, `Act ${['I', 'II', 'III', 'IV', 'V'][a - 1]} room`, () => room(a, 3));
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

  // Third bosses (docs/THIRD_BOSSES.md): the Wood's and the Mill's.
  const third = section('Third bosses');
  async function thirdBoss(kind, act) {
    const b = run().boss;
    if (!(run().active && run().room === 8 && b && b.kind === kind && b.active)) await room(act, 8, kind);
  }
  const standAt = async (kind, act, dist, msg) => {
    await thirdBoss(kind, act);
    const b = run().boss;
    if (b) X().cmd('teleport', b.x, Math.min(6, b.z + dist));
    say(msg);
  };
  button(third, 'Wolf pounce', () => standAt('gloamwolf', 1, 5, 'Gloam Wolf: stand off for a Pounce'), 'stand 5 u away');
  button(third, 'rend', () => standAt('gloamwolf', 1, 1.8, 'Gloam Wolf: stand at its jaws for a Rend'), 'stand next to it');
  button(third, 'howl', async () => {
    await thirdBoss('gloamwolf', 1);
    X().cmd('bossHp', 0.39);
    say('Gloam Wolf: enraged; the Moon Howl and the Hunt come sooner');
  }, 'cut to 39%');
  button(third, 'Mire King lash', () => standAt('mireking', 2, 4, 'Mire King: stand off for a Tongue Lash'), 'stand 4 u away');
  button(third, 'swallow', () => standAt('mireking', 2, 2.6, 'Mire King: stay in front of it when it gapes'), 'stand in front of it');
  button(third, 'enrage', async () => {
    await thirdBoss('mireking', 2);
    X().cmd('bossHp', 0.39);
    say('Mire King: enraged (wider mire, faster lashes)');
  }, 'cut to 39%');
  // Slice 11: the Barrow's and the Heart's.
  button(third, 'Raven dive', () => standAt('ashraven', 3, 5, 'Ash Raven: stand off for a Carrion Dive'), 'stand 5 u away');
  button(third, 'gust', () => standAt('ashraven', 3, 1.8, 'Ash Raven: stand at its beak for a Wing Gust'), 'stand next to it');
  button(third, 'omen', async () => {
    await thirdBoss('ashraven', 3);
    X().cmd('bossHp', 0.39);
    say('Ash Raven: enraged; keep moving when its Omen follows you (it leaves ash)');
  }, 'cut to 39%');
  button(third, 'Weaver bind', () => standAt('veinweaver', 4, 4, 'Vein Weaver: stand off for a Bind, then pull the thread tight'), 'stand 4 u away');
  button(third, 'slam', () => standAt('veinweaver', 4, 2.0, 'Vein Weaver: crowd it for a Heartbeat Slam'), 'stand next to it');
  button(third, 'enrage', async () => {
    await thirdBoss('veinweaver', 4);
    X().cmd('bossHp', 0.39);
    say('Vein Weaver: enraged (a shorter thread, faster binds)');
  }, 'cut to 39%');

  // Act V bosses (docs/ACT_V_BOSSES.md): the Hush and the Skyhorn.
  const act5 = section('Act V bosses');
  button(act5, 'Hush note', () => standAt('hush', 5, 3, 'The Hush: stand off for a Still Note (it leaves a hush patch from the second stillness)'), 'stand 3 u away');
  button(act5, 'unring', () => standAt('hush', 5, 5, 'The Hush: stand far off for an Unring lane'), 'stand 5 u away');
  button(act5, 'stillness', async () => {
    await thirdBoss('hush', 5);
    X().cmd('bossHp', 0.74);
    say('The Hush: a bell dies; the Great Hush follows (get out of the ring, then hit it while drained)');
  }, 'cut to 74%');
  button(act5, 'Skyhorn rush', () => standAt('skyhorn', 5, 5, 'Skyhorn: stand off with a wall behind you, then step aside'), 'stand 5 u away');
  button(act5, 'toll', () => standAt('skyhorn', 5, 2.0, 'Skyhorn: crowd it for a Horn Toll'), 'stand next to it');
  button(act5, 'leap', async () => {
    await thirdBoss('skyhorn', 5);
    X().cmd('bossHp', 0.49);
    say('Skyhorn: phase two, the Sky Leap (watch the ring)');
  }, 'cut to 49%');
  button(act5, 'enrage', async () => {
    await thirdBoss('skyhorn', 5);
    X().cmd('bossHp', 0.39);
    say('Skyhorn: enraged (a second rush chains after a miss)');
  }, 'cut to 39%');

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
  // Rill joins only through a campaign lineup, and her keys change only
  // between rooms: start a Level 1 campaign with her on seat 3 (if she is
  // not in the party), clear the room, put the set on her keys, walk into
  // the next room, then play it at the training targets.
  // THE BELLWRIGHT joins the same way (Tolly on seat 3).
  async function tideReel(set, cls = 'tidecaller') {
    if (seatOf(cls) == null) {
      say(`starting a campaign with the ${cls} on the team...`);
      if (run().active) {
        X().cmd('abandonRun', 'quit');
        await wait(300);
      }
      X().cmd('startCampaign', { level: 1, lineup: ['healer', 'tank', 'swordsman', cls] });
      for (let i = 0; i < 150 && run().phase !== 'combat'; i++) await wait(100);
    }
    const seat = seatOf(cls);
    if (seat == null) return say(`the ${cls} could not join (no campaign lineup)`);
    X().cmd('partyMode', 'manual');
    for (let i = 0; i < 900 && run().phase === 'combat'; i++) {
      X().cmd('killAllEnemies');
      await wait(100);
    }
    const slots = () => (X().cmd('partyView', seat) || {}).slots || [];
    set.forEach((id, k) => {
      const s = slots();
      if (s[k] === id) return;
      // A skill already on another key moves off it first (a key holds one).
      const j = s.indexOf(id);
      const spare = CLASS_SETS[cls].flat().find((x) => !s.includes(x) && !set.includes(x));
      if (j >= 0 && spare) X().cmd('partySwap', seat, spare, j);
      X().cmd('partySwap', seat, id, k);
    });
    const next = (run().room || 1) + 1;
    X().cmd('skipToRoom', next);
    for (let i = 0; i < 100 && !(run().phase === 'combat' && run().room === next); i++) await wait(100);
    await wait(600);
    for (let k = 0; k < set.length; k++) {
      if (set[k] === 'tidepool' || set[k] === 'hum') {
        const me = X().content.world().entities().find((e) => e.partyIndex === seat);
        if (me) for (const dx of [-1, 1]) X().cmd('spawn', 'dummy', me.x + dx, me.z - 1);
        say(`${cls}: ${set[k]} (passive, pulses on its own)`);
        await wait(3000);
        continue;
      }
      if (set[k] === 'hang_bell') {
        // Three bells in a row in front of her, a dummy under each.
        const me = X().content.world().entities().find((e) => e.partyIndex === seat);
        const f = me ? { x: me.x, z: me.z - 2.4 } : front();
        say(`${cls}: hang bell x3`);
        for (const dx of [-1.6, 0, 1.6]) {
          X().cmd('spawn', 'dummy', f.x + dx, f.z);
          X().cmd('partyCast', seat, k, { x: f.x + dx, z: f.z });
          await wait(700);
        }
        await wait(1200);
        continue;
      }
      // The targets stand 2.2 u in front of Rill herself (her zones reach
      // 4 u), and Ripple Step gets one on top of her to vault from.
      // Bell Swing's targets stand inside its 1.9 u reach.
      const me = X().content.world().entities().find((e) => e.partyIndex === seat);
      const f = me ? { x: me.x, z: me.z - (set[k] === 'bell_swing' ? 1.2 : 2.2) } : front();
      for (const [dx, dz] of [[-0.9, 0], [0, -0.5], [0.9, 0]]) X().cmd('spawn', 'dummy', f.x + dx, f.z + dz);
      if ((set[k] === 'ripple_step' || set[k] === 'wing_hop') && me) X().cmd('spawn', 'dummy', me.x + 0.4, me.z);
      say(`${cls}: ${set[k].replace(/_/g, ' ')}`);
      await wait(250);
      X().cmd('partyCast', seat, k, { x: f.x, z: f.z });
      await wait(set[k] === 'maelstrom' || set[k] === 'rain_squall' || set[k] === 'great_bell' ? 2600 : 1600);
    }
    say(`${cls} reel done`);
  }
  const party = section('Party skills (reels)');
  CLASS_SETS.tidecaller.forEach((set, i) => button(party, `Tidecaller ${'ABC'[i]}`, () => tideReel(set), set.join(', ')));
  CLASS_SETS.bellwright.forEach((set, i) => button(party, `Bellwright ${'ABC'[i]}`, () => tideReel(set, 'bellwright'), set.join(', ')));
  for (const cls of ['tank', 'swordsman', 'archer']) CLASS_SETS[cls].forEach((set, i) => button(party, `${cls[0].toUpperCase()}${cls.slice(1)} ${'ABC'[i]}`, () => classReel(cls, set), set.join(', ')));
  HEALER_SETS.forEach((set, i) => button(party, `Healer ${'ABCD'[i]}`, () => healerReel(set), set.join(', ')));

  // -------------------------------------------------------------- enemies --
  for (const [title, act0, kinds] of ENEMIES) {
    const row = section(`Enemies, ${title}`);
    const act = roomAct(act0);
    for (const k of kinds)
      button(row, k, async () => {
        if (run().act !== act || run().room === 8 || run().phase !== 'combat') await room(act, 3);
        X().cmd('killAllEnemies');
        const f = front();
        // Act V (docs/ACT_V.md): each spawned where its beat reads best.
        if (k === 'kite') {
          X().cmd('spawn', 'kite', f.x - 1.6, f.z - 2.0);
          X().cmd('spawn', 'kite', f.x + 1.6, f.z - 2.6);
          return say('kite x2: they hang and fold, then dive down the lane; hit one while it is grounded (it takes x1.5)');
        }
        if (k === 'chime') {
          X().cmd('spawn', 'chime', f.x - 1.0, f.z - 1.4);
          X().cmd('spawn', 'chime', f.x + 1.2, f.z - 2.4);
          return say('chime x2: they drift in and toll; step out of the ring, or stun one mid-swing to choke it');
        }
        if (k === 'gargoyle') {
          X().cmd('spawn', 'gargoyle', f.x - 1.3, f.z - 2.6);
          X().cmd('spawn', 'gargoyle', f.x + 1.3, f.z - 2.6);
          return say('gargoyle x2: statues; walk within 2.6 u or hit one to wake it; stay 5 u off for 6 s and it settles back to stone');
        }
        if (k === 'vane') {
          X().cmd('spawn', 'vane', f.x - 1.8, f.z - 3.4);
          X().cmd('spawn', 'vane', f.x + 1.8, f.z - 4.2);
          return say('vane x2: they hop on their spindles, swing round into the wind (the lane), then three gust darts fly down it');
        }
        if (k === 'sacristan') {
          X().cmd('spawn', 'sacristan', f.x, f.z - 4.2);
          X().cmd('spawn', 'chime', f.x - 1.4, f.z - 3.0);
          X().cmd('spawn', 'gargoyle', f.x + 1.4, f.z - 3.2);
          return say('sacristan + kin: it rings the pale hush ring (a ward, not a hit); its kin wear the veil and take 40% less for 5 s; stun it mid-ring to choke it');
        }
        if (k === 'hanger') {
          X().cmd('spawn', 'hanger', f.x - 1.4, f.z - 3.0);
          X().cmd('spawn', 'hanger', f.x + 1.4, f.z - 3.6);
          return say('hanger x2: it grips the rope and leans back, swings down the lane (throws you aside), then dangles at the end');
        }
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

  // ---------------------------------------------------------- room relics --
  // RELICS batch 4 (docs/RELICS.md "Batch 4"): the relics of the new rooms,
  // each beat played where the party stands; the two new room curses laid
  // on a live room.
  const rel4 = section('Room relics');
  const ROOM_RELICS = [
    ['shepherds_crook', "Shepherd's Crook", 'the pilgrim brought home'],
    ['vigil_candle', 'Vigil Candle', 'an Escort or Hold room opens'],
    ['warding_chalk', 'Warding Chalk', 'the Hold ring drawn, then mending inside it'],
    ['champions_laurel', "Champion's Laurel", "a champion's chest pays"],
    ['jailers_ring', "Jailer's Ring", 'a key picked up'],
    ['vault_ledger', 'Vault Ledger', 'a vault pile pays twice'],
    ['banner_pennant', 'Banner Pennant', 'an objective room won'],
    ['wanderers_token', "Wanderer's Token", 'an event offer taken'],
    ['geode_heart', 'Geode Heart', 'a cursed room cleared'],
  ];
  for (const [id, label, what] of ROOM_RELICS) {
    button(rel4, label, async () => {
      await relicRoom(1);
      for (const i of [0, 1, 2, 3]) {
        const b = seatBody(i);
        if (b) b.hp = Math.max(1, b.maxHp * 0.6);
      }
      X().cmd('relicDemo', id);
      say(`${label}: ${what}`);
    }, what);
  }
  button(rel4, 'Restless', async () => {
    await relicRoom(1);
    X().cmd('relicCurseHere', 'restless');
    say('Restless: waves come 35% sooner');
  }, 'Restless laid on this room');
  button(rel4, 'Kindred Blood', async () => {
    await relicRoom(1);
    X().cmd('relicCurseHere', 'kindred_blood');
    const f = front();
    const ids = [-1.2, 0, 1.2].map((dx) => idOf(X().cmd('spawn', 'boar', f.x + dx, f.z - 1.6)));
    await wait(200);
    for (const id of ids.slice(1)) X().cmd('setHp', id, 0.5);
    X().cmd('setHp', ids[0], 0.02);
    X().cmd('relicHit', ids[0], seatBody(0)?.id ?? null, 30, false);
    say('Kindred Blood: the fallen heals its kin');
  }, 'Kindred Blood on this room, one of three boars killed');

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

  // ------------------------------------------------------ tonics and bombs --
  // TONICS AND BOMBS (docs/CONSUMABLES.md): a campaign room (the slot is
  // campaign-only), training dummies in front, then each kind used from the
  // Healer's slot, a loose one dropped, the charm against live shots.
  const tonicRow = section('Tonics and bombs');
  async function tonicRoom() {
    const tv = () => X().cmd('tonicState');
    if (!(run().active && run().phase === 'combat' && tv())) {
      if (run().active) {
        X().cmd('abandonRun', 'quit');
        await wait(300);
      }
      X().cmd('startCampaign', { level: 1 });
      for (let i = 0; i < 150 && run().phase !== 'combat'; i++) await wait(100);
      await wait(400);
    }
    X().cmd('killAllEnemies');
    return !!tv();
  }
  for (const [id, label] of [['mend_tonic', 'Mending Tonic'], ['haste_draught', 'Haste Draught'], ['ward_flask', 'Ward Flask'], ['fire_bomb', 'Fire Bomb'], ['frost_bomb', 'Frost Bomb'], ['bell_charm', 'Bell Charm']]) {
    button(tonicRow, label, async () => {
      if (!(await tonicRoom())) return say('no tonics here (campaign only)');
      const f = targets();
      if (id === 'bell_charm') {
        // Two mantises a few steps off so there are shots to shatter.
        X().cmd('spawn', 'mantis', f.x - 2.5, f.z - 2.5);
        X().cmd('spawn', 'mantis', f.x + 2.5, f.z - 2.5);
        await wait(2600);
      }
      X().cmd('tonicGive', 0, id);
      X().cmd('tonicUse', 0, f.x, f.z);
      say(`${label} used from the Healer's slot`);
    }, `use a ${label} in a campaign room`);
  }
  button(tonicRow, 'Drop one', async () => {
    if (!(await tonicRoom())) return say('no tonics here (campaign only)');
    const f = front();
    const ids = ['mend_tonic', 'haste_draught', 'ward_flask', 'fire_bomb', 'frost_bomb', 'bell_charm'];
    X().cmd('tonicDrop', ids[Math.floor(Math.random() * ids.length)], f.x, f.z);
    say('a loose one lands in front of the party (walk over it)');
  }, 'a loose tonic falls in front of the party');

  // ------------------------------------------------------- relics batch 5 --
  // RELICS batch 5 (docs/RELICS.md "Batch 5"): each new relic's beat through
  // its real proc in a campaign room (tonics on), training dummies in front
  // where it strikes, then the two new room curses laid on the live room.
  const rel5 = section('Relics batch 5');
  const BATCH5 = [
    ['brewers_satchel', "Brewer's Satchel", 'a tonic shared with the party'],
    ['bottomless_flask', 'Bottomless Flask', 'the flask pours, then refills 1.5 s later (10 s in play)'],
    ['twin_fuse', 'Twin Fuse', 'the fuse lit in the crater, then the second burst'],
    ['votive_ribbon', 'Votive Ribbon', 'a shrine offering tied with the ribbon'],
    ['stormglass', 'Stormglass', 'a gust down a lane in front, striking what stands in it'],
    ['trophy_cord', 'Trophy Cord', 'a champion felled, its trophy knotted on'],
    ['oathkeepers_brand', "Oathkeeper's Brand", 'a room opens under a sworn vow'],
    ['tenor_bell', 'Tenor Bell', 'the tenth kill rings the great bell over the room'],
  ];
  for (const [id, label, what] of BATCH5) {
    button(rel5, label, async () => {
      if (!(await tonicRoom())) return say('no relics here (campaign only)');
      for (const i of [0, 1, 2, 3]) {
        const b = seatBody(i);
        if (b) b.hp = Math.max(1, b.maxHp * 0.6);
      }
      if (id === 'stormglass' || id === 'tenor_bell' || id === 'twin_fuse') {
        const f = front();
        for (const dx of [-3, -1.5, 0, 1.5, 3]) X().cmd('spawn', 'dummy', f.x + dx, f.z);
        await wait(150);
      }
      X().cmd('relicDemo', id);
      say(`${label}: ${what}`);
    }, what);
  }
  button(rel5, 'Corked', async () => {
    if (!(await tonicRoom())) return say('no relics here (campaign only)');
    X().cmd('tonicGive', 0, 'fire_bomb');
    X().cmd('relicCurseHere', 'corked');
    await wait(400);
    X().cmd('tonicUse', 0);
    say('Corked: the slot is sealed (the press is refused)');
  }, 'Corked on this room, then a refused bomb');
  button(rel5, 'Tolling Dead', async () => {
    if (!(await tonicRoom())) return say('no relics here (campaign only)');
    X().cmd('relicCurseHere', 'tolling_dead');
    const f = front();
    const ids = [-1.2, 0, 1.2].map((dx) => idOf(X().cmd('spawn', 'boar', f.x + dx, f.z + 0.6)));
    await wait(200);
    for (const [k, id] of ids.entries()) {
      setTimeout(() => {
        X().cmd('setHp', id, 0.02);
        X().cmd('relicHit', id, seatBody(1)?.id ?? null, 30, false);
      }, 250 * k);
    }
    say('Tolling Dead: each fallen boar tolls a knell by the party');
  }, 'Tolling Dead on this room, three boars killed beside the party');
  button(rel5, 'Dulled Edge', async () => {
    if (!(await tonicRoom())) return say('no relics here (campaign only)');
    X().cmd('eventMajor', 'dulled_edge');
    const f = front();
    const id = idOf(X().cmd('spawn', 'dummy', f.x, f.z));
    await wait(900);
    for (let k = 0; k < 3; k++) setTimeout(() => X().cmd('relicHit', id, seatBody(1)?.id ?? null, 20, true), 450 * k);
    say('Dulled Edge: each blunted crit chips and clinks');
  }, 'Bind Dulled Edge, then three crits on a dummy');

  // ------------------------------------------------------------ champions --
  // CHAMPION ROOMS (docs/CHAMPIONS.md): each act's champion spawned in front
  // of the party in its own land (crown, sigil, both moves, the rage below
  // half health and its fall all play live).
  const champ = section('Champions');
  for (const [act, kind, name] of [[1, 'briar_knight', 'Briar Knight'], [2, 'sluice_warden', 'Sluice Warden'], [3, 'bone_reeve', 'Bone Reeve'], [4, 'hollow_choir', 'Hollow Choir'], [5, 'gale_herald', 'Gale Herald'], [1, 'moss_hart', 'Moss Hart'], [2, 'lockkeeper', 'Lockkeeper'], [3, 'gravebell_ringer', 'Gravebell Ringer'], [4, 'vein_matron', 'Vein Matron']]) {
    button(champ, name, async () => {
      await ensureCombat(roomAct(act));
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

  // Gust vent (docs/ACT_V.md): a vent laid across the party, blowing from
  // its left to its right, with a kite in the lane (fliers are shoved too).
  // Its wind-up (the Ember lane) and the gust itself can be forced.
  const gustRow = section('Gust vent');
  let gustId = null;
  async function gustHere() {
    await ensureCombat(roomAct(5));
    const p = X().content.world().player;
    const x = p ? p.x : 0;
    const z = p ? p.z : 0;
    gustId = X().cmd('spawnHazard', 'gust', x - 3.6, z, { x0: x - 3.6, z0: z, x1: x + 3.6, z1: z });
    X().cmd('spawn', 'kite', x - 1.6, z - 0.2);
    return gustId;
  }
  button(gustRow, 'Vent', async () => {
    await gustHere();
    say(gustId == null ? 'no gust vent (hazard missing)' : 'gust vent across the party: idle, breathing faint wisps');
  }, 'a gust vent across the party, idle');
  button(gustRow, 'Wind-up', async () => {
    if (gustId == null || !X().content.world().entities().some((e) => e.id === gustId)) await gustHere();
    X().cmd('hazardPhase', gustId, 'telegraph');
    say('gust vent: the Ember lane (60 ticks), then the gust shoves everything in it');
  }, 'force its telegraph');
  button(gustRow, 'Gust', async () => {
    if (gustId == null || !X().content.world().entities().some((e) => e.id === gustId)) await gustHere();
    X().cmd('hazardPhase', gustId, 'active');
    say('gust vent: the gust itself (36 ticks)');
  }, 'force the gust');

  // Crystal spurs (docs/SHRINES.md): one forced under the party.
  const spurRow = section('Crystal spurs');
  let spurId = null;
  async function spurHere() {
    await ensureCombat(4);
    spurId = X().cmd('spawnHazard', 'spur', 0, 0, {});
    return spurId;
  }
  button(spurRow, 'Wind-up', async () => {
    if (spurId == null || !X().content.world().entities().some((e) => e.id === spurId)) await spurHere();
    X().cmd('hazardPhase', spurId, 'telegraph');
    say("crystal spur: the Ember ring on a hero's last spot (54 ticks), cracks and tips rising");
  }, 'force its telegraph');
  button(spurRow, 'Burst', async () => {
    if (spurId == null || !X().content.world().entities().some((e) => e.id === spurId)) await spurHere();
    X().cmd('hazardPhase', spurId, 'active');
    say('crystal spur: the burst, then a pillar for 7 s');
  }, 'force the burst');

  // Shrines (docs/SHRINES.md): a campaign room of the land, its shrine
  // beside the party.
  const shrineRow = section('Shrines');
  const LANDS = [['wood', 1, 'Antler'], ['mill', 2, 'Tithe'], ['barrow', 3, 'Grave'], ['heart', 4, 'Geode'], ['spire', 5, 'Wind']];
  let shrineLand = null;
  async function shrineRoom(land, level) {
    const r = run();
    if (!(r.active && r.phase === 'combat' && r.act === level && r.room !== 8 && r.shrine)) {
      if (r.active) {
        X().cmd('abandonRun', 'quit');
        await wait(300);
      }
      X().cmd('startCampaign', { level });
      for (let i = 0; i < 100 && run().phase !== 'combat'; i++) await wait(100);
      X().cmd('skipToRoom', 3);
      for (let i = 0; i < 100 && !(run().phase === 'combat' && run().room === 3); i++) await wait(100);
      await wait(400);
    }
    X().cmd('killAllEnemies');
    const p = X().content.world().player;
    X().cmd('shrineHere', land, (p ? p.x : 0) + 1.6, (p ? p.z : 0) - 1.2);
    shrineLand = land;
  }
  for (const [land, level, label] of LANDS) button(shrineRow, label, () => shrineRoom(land, level).then(() => say(`the ${label} Shrine beside the party`)), `a Level ${level} room with its shrine`);
  button(shrineRow, 'Offer', async () => {
    if (!shrineLand) await shrineRoom('wood', 1);
    X().cmd('wallet', 60);
    X().cmd('keyGive');
    X().cmd('tonicGive', 0, 'haste_draught');
    const r = X().cmd('shrineUse', 0);
    say(r && !r.denied ? `offered: ${JSON.stringify(r)}` : `refused: ${JSON.stringify(r)}`);
  }, 'pay the price and take the blessing');

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
  const THEME = { 1: 'wood', 2: 'mill', 3: 'barrow', 4: 'heart', 5: 'spire' };
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
      ['Briar Knight', 'ch_briar_knight_sting'], ['Sluice Warden', 'ch_sluice_warden_sting'], ['Bone Reeve', 'ch_bone_reeve_sting'], ['Hollow Choir', 'ch_hollow_choir_sting'], ['Gale Herald', 'ch_gale_herald_sting'], ['Moss Hart', 'ch_moss_hart_sting'], ['Lockkeeper', 'ch_lockkeeper_sting'], ['Gravebell Ringer', 'ch_gravebell_ringer_sting'], ['Vein Matron', 'ch_vein_matron_sting'],
      ['Rage', 'ch_briar_knight_rage'], ['Fall', 'ch_fall'], ['Chest', 'ch_chest'], ['Crown door', 'ch_crown'],
    ]],
    ['Sound, champion moves', [
      ['Tell', 'ch_tell'], ['Bramble Charge', 'ch_bramble_charge'], ['Charge stops', 'ch_charge_stop'], ['Thorn Ring', 'ch_thorn_ring'],
      ['Floodgate', 'ch_floodgate'], ['Undertow', 'ch_undertow'], ['Reaping Sweep', 'ch_reaping_sweep'], ['Grave Lance', 'ch_grave_lance'],
      ['Shard Hymn', 'ch_shard_hymn'], ['Discord', 'ch_discord'], ['Gale Call', 'ch_gale_call'], ['Stoop', 'ch_stoop'],
      ['Antler Toss', 'ch_antler_toss'], ['Leap gather', 'ch_leap_gather'], ["Hart's Leap", 'ch_harts_leap'], ['Hook whirl', 'ch_hook_whirl'], ['Chain Hook', 'ch_chain_hook'], ['Lock Turn', 'ch_lock_turn'],
      ['Death Knell', 'ch_death_knell'], ['Grave Call', 'ch_grave_call'], ['Vein Lash', 'ch_vein_lash'], ['Heart Pulse', 'ch_heart_pulse'],
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
