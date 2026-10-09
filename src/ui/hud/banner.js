// ZONE 2 — Room banner (BUILD_BRIEF §17): top-centre, contextual, <=300 ms
// fade in/out.
//   kill_all -> wave progress cue ("WAVE 2/3" + remaining pips + enemies left)
//   defend   -> Waystone HP bar + current/max numeral + countdown timer
//   boss     -> ornate boss HP bar + name plate ("THE HOLLOW STAG")
//   hunt     -> the quarry's HP bar (Signal Blue, the mark colour) + its
//               escape countdown; "QUARRY ESCAPED · NO REWARD" on a soft-fail
//   purge    -> one pip per nest (filled = destroyed) + nests left + the purge
//               countdown; "THE CORRUPTION TOOK ROOT · NO REWARD" on a soft-fail
//   (ROOM OBJECTIVES, docs/ROOM_OBJECTIVES.md)
//   champion -> the champion's name plate over a Pale Gold HP bar (gold, the
//               crown's colour; violet stays the bosses'), "· ENRAGED" below
//               half, then "FELLED" and what is left to clear
//               (CHAMPION ROOMS, docs/CHAMPIONS.md)
//
// DEVIATION (documented): the sim's wave director (src/sim/waves.js) ships
// kill_all and defend only — the room-8 Hollow Stag lands with the boss block.
// The banner is written against the shape the sim will hand over and reads, in
// priority order: room.boss -> a live `stag` entity -> an injected descriptor
// from __echoes.hud.boss({name, hp, maxHp}). Nothing in this file guesses; the
// moment the sim owns a boss the first branch takes over untouched.
//
// PHASE GATE (round D, camp/run critics' F2/F6). The banner is COMBAT chrome:
// it is only ever shown while the run system says a room is in combat, and
// index.js passes that verdict in as `combat`. When it is false — reward /
// path / shop pages, the Victory and Defeat cards, Camp, or no run at all —
// the banner hides regardless of what the wave director or a stray entity
// still reports, so a sim-side leak (enemies spawning after run_end) can
// never draw "WAVE 2/2 · 1 LEFT" over an end card or the campfire.
//
// FADE TIMING. The <=300 ms fade-out shares its budget with the reward page
// that the run UI builds in the same frame (measured 158-250 ms of main
// thread). The show/hide toggle therefore FLUSHES style synchronously so the
// CSS transition's start time is anchored before that build, and the
// transition itself is 150 ms — the fade completes inside the stall instead
// of starting after it.
import { PALETTE } from '../../data/palette.js';
import { CHROME, mix } from './style.js';
import { TICK_HZ } from '../../core/constants.js';
import { iconEl } from './icons.js';
import { t, tn } from '../../i18n/index.js';
import { CHAMPIONS } from '../../sim/champions.js';

// CHAMPION ROOMS: champion kind -> its English name (translated when shown).
const CHAMPION_NAME = Object.fromEntries(Object.values(CHAMPIONS).map((c) => [c.id, c.name]));

// §11 add-phase thresholds, drawn as pips on the boss bar (75 / 50 / 25 %).
// Mirrors sim/boss.js STAG.addPhases; the sim's `phasesFired` fills them.
const BOSS_PHASES = [0.75, 0.5, 0.25];

// Boss kind -> medal icon (src/ui/hud/icons.js). The Stag keeps its original.
export const BOSS_MEDAL = Object.freeze({
  stag: 'stag',
  thornmother: 'boss_thornmother',
  heron: 'boss_heron',
  millwheel: 'boss_millwheel',
  wyrm: 'boss_wyrm',
  lichram: 'boss_lichram',
  cantor: 'boss_cantor',
  colossus: 'boss_colossus',
});

const el = (tag, cls, parent) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (parent) parent.appendChild(n);
  return n;
};

const clock = (ticks) => {
  const s = Math.max(0, Math.ceil(ticks / TICK_HZ));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export function createBanner() {
  const root = el('div', 'hud-banner');
  root.id = 'hud-banner';

  // Boss medallion (Reference D: icon medallion at the plate's left end): a
  // violet-rimmed disc carrying the drawn Stag, with four ornamental studs.
  const medal = el('div', 'hud-bn-medal', root);
  const medalRing = el('div', 'hud-bn-medal-ring', medal);
  for (let i = 0; i < 4; i++) el('i', `hud-bn-stud s${i}`, medalRing);
  // Boss identity: each boss wears its own medal (icons.js boss_*), picked by
  // the boss kind the run view / entity scan hands over; no kind = the Stag.
  let medalIco = iconEl('stag', { size: 34, cls: 'hud-bn-medal-ico' });
  medal.appendChild(medalIco);
  let medalKind = 'stag';
  function setMedal(kind) {
    const k = BOSS_MEDAL[kind] ? kind : 'stag';
    if (k === medalKind) return;
    medalKind = k;
    const next = iconEl(BOSS_MEDAL[k], { size: 34, cls: 'hud-bn-medal-ico' });
    medal.replaceChild(next, medalIco);
    medalIco = next;
    medal.dataset.boss = k;
  }
  medal.dataset.boss = 'stag';

  const label = el('span', 'hud-bn-label', root);
  const pips = el('span', 'hud-bn-pips', root);
  // The bar rides in a row with its two ornamental caps (boss mode only).
  const barRow = el('div', 'hud-bn-barrow', root);
  const capL = el('span', 'hud-bn-cap hud-bn-cap-l', barRow);
  const bar = el('div', 'hud-bn-bar', barRow);
  const barFill = el('i', null, bar);
  const phases = el('span', 'hud-bn-phases', barRow);
  const phaseEls = BOSS_PHASES.map((f) => {
    const p = el('i', 'hud-bn-phase', phases);
    p.style.left = `${f * 100}%`;
    return p;
  });
  const capR = el('span', 'hud-bn-cap hud-bn-cap-r', barRow);
  const num = el('span', 'hud-bn-num', root);
  const timer = el('span', 'hud-bn-num', root);

  bar.style.display = 'none';
  timer.style.display = 'none';
  let phasesShown = -1;

  let bossOverride = null; // { name, hp, maxHp }
  let mode = 'none';
  let lastKey = '';
  let pipCount = -1;

  function setPips(total, doneCount, nowIndex) {
    if (total !== pipCount) {
      pipCount = total;
      pips.replaceChildren();
      for (let i = 0; i < total; i++) el('span', 'hud-bn-pip', pips);
    }
    const kids = pips.children;
    for (let i = 0; i < kids.length; i++) {
      kids[i].className =
        'hud-bn-pip' + (i < doneCount ? ' done' : i === nowIndex ? ' now' : '');
    }
  }

  function showBar(base, lift, frac) {
    bar.style.display = 'block';
    bar.style.setProperty('--barBase', base);
    bar.style.setProperty('--barLift', lift);
    barFill.style.width = `${Math.max(0, Math.min(1, frac)) * 100}%`;
  }

  let gated = false; // last `combat` verdict the banner was updated with

  // room: waves.roomState() | null ; bossEntity: live boss descriptor | null ;
  // combat: the run system's "a room is in combat" verdict (index.js). Nothing
  // is shown while it is false.
  function update(room, bossEntity, combat = true) {
    gated = !combat;
    const boss = combat ? (room && room.boss) || bossEntity || bossOverride : null;

    let next = 'none';
    if (!combat) next = 'none';
    else if (boss) next = 'boss';
    else if (room && !room.cleared && room.mode === 'defend') next = 'defend';
    else if (room && !room.cleared && room.mode === 'kill_all') next = 'kill_all';
    else if (room && !room.cleared && (room.mode === 'hunt' || room.mode === 'purge' || room.mode === 'champion')) next = room.mode;

    let changed = false;
    if (next !== mode) {
      changed = true;
      mode = next;
      root.classList.toggle('boss', mode === 'boss');
      root.classList.toggle('show', mode !== 'none');
      // Anchor the opacity transition NOW (synchronous style flush), not at
      // the next style recalc — which may sit behind the reward page build.
      void root.offsetWidth;
      const pipped = mode === 'kill_all' || mode === 'purge';
      pips.style.display = pipped ? 'flex' : 'none';
      bar.style.display = pipped ? 'none' : 'block';
      barRow.style.display = pipped ? 'none' : 'flex';
      phasesShown = -1;
      timer.style.display = mode === 'defend' || mode === 'hunt' || mode === 'purge' ? 'inline' : 'none';
      root.dataset.mode = mode;
      num.style.display = mode === 'kill_all' ? 'inline' : 'inline';
      lastKey = '';
    }
    if (mode === 'none') return changed;

    if (mode === 'boss') {
      setMedal(boss.kind);
      const name = t(boss.name ?? 'THE HOLLOW STAG').toUpperCase();
      const frac = boss.maxHp > 0 ? Math.max(0, boss.hp / boss.maxHp) : 0;
      // §11: clear = boss AND adds all dead, so the room can outlive the Stag.
      // A felled boss is not "0/1800" — the plate says what the player still
      // has to do (Round D2 HUD F1: the bar read a dead boss for the whole
      // add mop-up).
      const felled = boss.hp <= 0;
      const adds = boss.adds ?? boss.addsAlive ?? (room && room.adds) ?? null;
      const key = `b|${medalKind}|${name}|${felled ? 'F' + adds : Math.round(boss.hp)}|${boss.maxHp}`;
      if (key === lastKey) return changed;
      lastKey = key;
      label.textContent = felled ? t('{name} · FELLED', { name }) : name;
      label.className = 'hud-bn-label';
      showBar(PALETTE.godstuffViolet, mix(PALETTE.godstuffViolet, PALETTE.godstuffVioletPeak, 0.6), frac);
      const fired = felled ? BOSS_PHASES.length : Math.max(0, Math.min(BOSS_PHASES.length, boss.phasesFired ?? 0));
      if (fired !== phasesShown) {
        phasesShown = fired;
        phaseEls.forEach((p, i) => p.classList.toggle('fired', i < fired));
      }
      num.textContent = felled
        ? adds != null && adds > 0
          ? tn(adds, '{n} ADD REMAIN', '{n} ADDS REMAIN')
          : t('CLEAR THE ADDS')
        : `${Math.max(0, Math.ceil(boss.hp))}/${boss.maxHp}`;
      num.className = 'hud-bn-num';
      return true;
    }

    if (mode === 'defend') {
      const ws = room.waystone;
      const hp = ws ? Math.max(0, Math.ceil(ws.hp)) : 0;
      const maxHp = ws ? ws.maxHp : 150;
      const left = room.defendTicksLeft ?? 0;
      // v0.5.227 (Kesh: "the building reach 0 hp, but we still can play"):
      // a lost Waystone is the §11 SOFT-FAIL — the room's reward is forfeited
      // and the rest of the schedule must be cleared. The plate now says so
      // and counts what is left instead of a dead 0/150 and a timer.
      const alive = (room.aliveEnemies ?? 0) + (room.pendingSpawns ?? 0);
      const key = `d|${hp}|${maxHp}|${Math.ceil(left / TICK_HZ)}|${room.softFailed}|${room.softFailed ? alive : ''}`;
      if (key === lastKey) return changed;
      lastKey = key;
      if (room.softFailed) {
        label.textContent = t('WAYSTONE LOST · NO REWARD');
        showBar(PALETTE.hearthAmber, mix(PALETTE.hearthAmber, PALETTE.parchment, 0.45), 0);
        num.textContent = t('{alive} LEFT', { alive });
        num.className = 'hud-bn-label hud-bn-sub';
        timer.textContent = '';
        return true;
      }
      label.textContent = t('WAYSTONE');
      showBar(PALETTE.hearthAmber, mix(PALETTE.hearthAmber, PALETTE.parchment, 0.45), maxHp > 0 ? hp / maxHp : 0);
      num.textContent = `${hp}/${maxHp}`;
      num.className = 'hud-bn-num';
      timer.textContent = clock(left);
      timer.className = 'hud-bn-num' + (left <= 10 * TICK_HZ ? ' warn' : '');
      return true;
    }

    if (mode === 'hunt') {
      const q = room.quarry ?? {};
      const hp = Math.max(0, Math.ceil(q.hp ?? 0));
      const maxHp = Math.max(1, Math.ceil(q.maxHp || 1));
      const left = room.huntTicksLeft ?? 0;
      const alive = (room.aliveEnemies ?? 0) + (room.pendingSpawns ?? 0);
      const key = `h|${hp}|${maxHp}|${Math.ceil(left / TICK_HZ)}|${room.softFailed}|${q.winded}|${room.softFailed ? alive : ''}`;
      if (key === lastKey) return changed;
      lastKey = key;
      if (room.softFailed) {
        label.textContent = t('QUARRY ESCAPED · NO REWARD');
        showBar(PALETTE.signalBlue, mix(PALETTE.signalBlue, PALETTE.parchment, 0.45), 0);
        num.textContent = t('{alive} LEFT', { alive });
        num.className = 'hud-bn-label hud-bn-sub';
        timer.textContent = '';
        return true;
      }
      label.textContent = q.winded ? t('THE HUNT · WINDED') : t('THE HUNT');
      showBar(PALETTE.signalBlue, mix(PALETTE.signalBlue, PALETTE.parchment, 0.45), q.spawned ? hp / maxHp : 1);
      num.textContent = q.spawned ? `${hp}/${maxHp}` : '';
      num.className = 'hud-bn-num';
      timer.textContent = q.spawned ? clock(left) : '';
      timer.className = 'hud-bn-num' + (left <= 10 * TICK_HZ ? ' warn' : '');
      return true;
    }

    if (mode === 'champion') {
      const c = room.champion ?? {};
      const hp = Math.max(0, Math.ceil(c.hp ?? 0));
      const maxHp = Math.max(1, Math.ceil(c.maxHp || 1));
      const alive = (room.aliveEnemies ?? 0) + (room.pendingSpawns ?? 0);
      const key = `c|${c.kind}|${hp}|${maxHp}|${c.felled}|${c.rage}|${c.felled ? alive : ''}`;
      if (key === lastKey) return changed;
      lastKey = key;
      const name = t(CHAMPION_NAME[c.kind] ?? 'The Champion').toUpperCase();
      const gold = PALETTE.paleGold;
      if (c.felled) {
        label.textContent = t('{name} · FELLED', { name });
        showBar(gold, mix(gold, PALETTE.parchment, 0.5), 0);
        num.textContent = alive > 0 ? t('{alive} LEFT', { alive }) : t('THE CHEST AWAITS');
        num.className = 'hud-bn-label hud-bn-sub';
        return true;
      }
      label.textContent = c.rage ? t('{name} · ENRAGED', { name }) : name;
      showBar(c.rage ? mix(gold, PALETTE.emberDanger, 0.45) : gold, mix(gold, PALETTE.parchment, 0.5), c.spawned ? hp / maxHp : 1);
      num.textContent = c.spawned ? `${hp}/${maxHp}` : '';
      num.className = 'hud-bn-num';
      return true;
    }

    if (mode === 'purge') {
      const total = Math.max(1, room.nestsTotal ?? 3);
      const nestsLeft = room.nestsAlive ?? 0;
      const left = room.purgeTicksLeft ?? 0;
      const key = `p|${nestsLeft}|${total}|${Math.ceil(left / TICK_HZ)}|${room.softFailed}`;
      if (key === lastKey) return changed;
      lastKey = key;
      setPips(total, total - nestsLeft, -1);
      label.textContent = room.softFailed ? t('THE CORRUPTION TOOK ROOT · NO REWARD') : t('PURGE THE NESTS');
      num.textContent = tn(nestsLeft, '{n} NEST LEFT', '{n} NESTS LEFT');
      num.className = 'hud-bn-label hud-bn-sub';
      timer.textContent = room.softFailed ? '' : clock(left);
      timer.className = 'hud-bn-num' + (left <= 15 * TICK_HZ ? ' warn' : '');
      return true;
    }

    // kill_all
    const total = Math.max(1, room.wavesTotal);
    const idx = Math.max(0, room.waveIndex);
    const shown = Math.min(total, idx + 1);
    const alive = room.aliveEnemies + room.pendingSpawns;
    const key = `k|${shown}|${total}|${alive}`;
    if (key === lastKey) return changed;
    lastKey = key;
    label.textContent = t('WAVE {shown}/{total}', { shown, total });
    setPips(total, idx, idx);
    num.textContent = t('{alive} LEFT', { alive });
    num.className = 'hud-bn-label hud-bn-sub';
    return true;
  }

  // Hard hide + state clear (run_end / run_wiped / return_to_camp): the mode
  // drops to none in this JS turn and the stale text is emptied so nothing
  // combat-flavoured survives into the end card or Camp.
  function hide() {
    const changed = update(null, null, false);
    label.textContent = '';
    num.textContent = '';
    timer.textContent = '';
    pips.replaceChildren();
    pipCount = -1;
    phasesShown = -1;
    lastKey = '';
    return changed;
  }

  return {
    el: root,
    update,
    hide,
    isVisible: () => mode !== 'none',
    // Boot warm-up tail (hud/index.js): the warm frames painted synthetic
    // boss / defend / kill_all plates; the hidden plate must not keep their
    // text for a probe to read in camp.
    reset() {
      label.textContent = '';
      num.textContent = '';
      timer.textContent = '';
      lastKey = '';
      phasesShown = -1;
    },
    debug: {
      boss: (d) => {
        bossOverride = d ? { name: d.name ?? 'THE HOLLOW STAG', kind: d.kind ?? 'stag', hp: d.hp ?? 200, maxHp: d.maxHp ?? 200 } : null;
        return bossOverride;
      },
      // Boss plate anatomy (check 9): medallion, caps, phase pips, in real px.
      plate: () => {
        const box = (n) => {
          const r = n.getBoundingClientRect();
          return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
        };
        return {
          mode,
          medal: { visible: getComputedStyle(medal).display !== 'none', box: box(medal), icon: !!medal.querySelector('svg[data-icon="stag"]'), boss: medalKind, iconId: medalIco.dataset.icon },
          caps: { visible: getComputedStyle(capL).display !== 'none', l: box(capL), r: box(capR) },
          phases: phaseEls.map((p, i) => ({ at: BOSS_PHASES[i], fired: p.classList.contains('fired'), box: box(p) })),
          label: label.textContent,
          num: num.textContent,
          fillPct: Math.round(parseFloat(barFill.style.width || '0') * 10) / 10,
        };
      },
      state: () => ({
        mode,
        gated, // true = hidden by the run-phase gate (no combat room live)
        show: root.classList.contains('show'),
        text: root.textContent,
        opacity: Number(getComputedStyle(root).opacity),
        transition: getComputedStyle(root).transitionDuration,
        box: (() => {
          const r = root.getBoundingClientRect();
          return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
        })(),
      }),
    },
  };
}
