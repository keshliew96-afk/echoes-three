// VFX lab (docs/gauntlet/design-VFX.md §10) — a review panel for the combat
// effects, opened with ?vfxlab=1 on any build (the deployed game included).
// Every button drives the real game through the same harness commands the
// probes use (__echoes.cmd), so what plays is exactly what a run plays, at
// the real frame rate:
//
//   Rooms    jump to a live Act I / II / III room (enemies cleared) or to a
//            boss room
//   Party    equip one of the class skill sets and play it as a reel: each
//            skill fires at a cluster of training targets in front of the
//            party, one after another (the Healer's through its own keys)
//   Enemies  spawn a pair of one enemy type in front of the party; they
//            fight, telegraph, hit and die as in a run
//   Boss     force the add phase / enrage, or end the fight
//
// Off unless the URL asks for it; touches nothing else in the UI.
const HEALER_SETS = [
  ['spirit_bolt', 'mending_bolt', 'nova_bloom', 'sanctuary'],
  ['bell_toll', 'pale_lance', 'rootsnare', 'mending_tide'],
  ['restorative_wave', 'guardian_bond', 'lantern_flurry', 'hearthsong'],
];
const CLASS_SETS = {
  tank: [
    ['heavy_slam', 'ground_crack', 'taunting_roar', 'shoulder_charge'],
    ['brutal_cleave', 'whirling_guard', 'shield_wall', 'iron_stance'],
  ],
  swordsman: [
    ['flurry', 'blade_storm', 'crescent_finisher', 'fox_step'],
    ['lunge_strike', 'caltrops', 'riposte', 'razor_wake'],
  ],
  archer: [
    ['piercing_shot', 'volley', 'rain_of_arrows', 'detonating_charge'],
    ['sundering_nova', 'pinning_arrow', 'vault_shot', 'kestrel_watch'],
  ],
};
const ENEMIES = [
  ['Act I', 1, ['boar', 'mantis', 'quillback', 'toad', 'moth', 'ram', 'mole']],
  ['Act II', 2, ['rotcap', 'snail']],
  ['Act III', 3, ['crow', 'brood']],
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
  async function room(act, n) {
    say(`entering Act ${act} room ${n}...`);
    // A live run keeps its act: switching acts abandons it and starts anew.
    if (run().active && run().act !== act) {
      X().cmd('abandonRun', 'quit');
      await wait(300);
    }
    if (!run().active) {
      X().cmd('startRun', { act });
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
  for (const a of [1, 2, 3]) button(rooms, `Act ${['I', 'II', 'III'][a - 1]} room`, () => room(a, 3));
  for (const a of [1, 2, 3]) button(rooms, ['Stag', 'Heron', 'Wyrm'][a - 1], () => room(a, 8), `Act ${a} boss room`);

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
  for (const cls of ['tank', 'swordsman', 'archer']) CLASS_SETS[cls].forEach((set, i) => button(party, `${cls[0].toUpperCase()}${cls.slice(1)} ${'AB'[i]}`, () => classReel(cls, set), set.join(', ')));
  HEALER_SETS.forEach((set, i) => button(party, `Healer ${'ABC'[i]}`, () => healerReel(set), set.join(', ')));

  // -------------------------------------------------------------- enemies --
  for (const [title, act, kinds] of ENEMIES) {
    const row = section(`Enemies, ${title}`);
    for (const k of kinds)
      button(row, k, async () => {
        if (run().act !== act || run().room === 8 || run().phase !== 'combat') await room(act, 3);
        X().cmd('killAllEnemies');
        const f = front();
        X().cmd('spawn', k, f.x - 1.1, f.z - 1.6);
        X().cmd('spawn', k, f.x + 1.1, f.z - 1.6);
        say(`${k} x2: watch them attack and die`);
      });
  }

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

  document.body.appendChild(panel);
  return panel;
}
