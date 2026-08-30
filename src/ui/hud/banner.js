// ZONE 2 — Room banner (BUILD_BRIEF §17): top-centre, contextual, <=300 ms
// fade in/out.
//   kill_all -> wave progress cue ("WAVE 2/3" + remaining pips + enemies left)
//   defend   -> Waystone HP bar + current/max numeral + countdown timer
//   boss     -> ornate boss HP bar + name plate ("THE HOLLOW STAG")
//
// DEVIATION (documented): the sim's wave director (src/sim/waves.js) ships
// kill_all and defend only — the room-8 Hollow Stag lands with the boss block.
// The banner is written against the shape the sim will hand over and reads, in
// priority order: room.boss -> a live `stag` entity -> an injected descriptor
// from __echoes.hud.boss({name, hp, maxHp}). Nothing in this file guesses; the
// moment the sim owns a boss the first branch takes over untouched.
import { PALETTE } from '../../data/palette.js';
import { CHROME, mix } from './style.js';
import { TICK_HZ } from '../../core/constants.js';

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

  const label = el('span', 'hud-bn-label', root);
  const pips = el('span', 'hud-bn-pips', root);
  const bar = el('div', 'hud-bn-bar', root);
  const barFill = el('i', null, bar);
  const num = el('span', 'hud-bn-num', root);
  const timer = el('span', 'hud-bn-num', root);

  bar.style.display = 'none';
  timer.style.display = 'none';

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

  // room: waves.roomState() | null ; enemies: live enemy snapshot list
  function update(room, bossEntity) {
    const boss = (room && room.boss) || bossEntity || bossOverride;

    let next = 'none';
    if (boss) next = 'boss';
    else if (room && !room.cleared && room.mode === 'defend') next = 'defend';
    else if (room && !room.cleared && room.mode === 'kill_all') next = 'kill_all';

    let changed = false;
    if (next !== mode) {
      changed = true;
      mode = next;
      root.classList.toggle('boss', mode === 'boss');
      root.classList.toggle('show', mode !== 'none');
      pips.style.display = mode === 'kill_all' ? 'flex' : 'none';
      bar.style.display = mode === 'kill_all' ? 'none' : 'block';
      timer.style.display = mode === 'defend' ? 'inline' : 'none';
      num.style.display = mode === 'kill_all' ? 'inline' : 'inline';
      lastKey = '';
    }
    if (mode === 'none') return changed;

    if (mode === 'boss') {
      const name = (boss.name ?? 'THE HOLLOW STAG').toUpperCase();
      const frac = boss.maxHp > 0 ? boss.hp / boss.maxHp : 0;
      const key = `b|${name}|${Math.round(boss.hp)}|${boss.maxHp}`;
      if (key === lastKey) return changed;
      lastKey = key;
      label.textContent = name;
      label.className = 'hud-bn-label';
      showBar(PALETTE.godstuffViolet, mix(PALETTE.godstuffViolet, PALETTE.godstuffVioletPeak, 0.6), frac);
      num.textContent = `${Math.max(0, Math.ceil(boss.hp))}/${boss.maxHp}`;
      num.className = 'hud-bn-num';
      return true;
    }

    if (mode === 'defend') {
      const ws = room.waystone;
      const hp = ws ? Math.max(0, Math.ceil(ws.hp)) : 0;
      const maxHp = ws ? ws.maxHp : 150;
      const left = room.defendTicksLeft ?? 0;
      const key = `d|${hp}|${maxHp}|${Math.ceil(left / TICK_HZ)}|${room.softFailed}`;
      if (key === lastKey) return changed;
      lastKey = key;
      label.textContent = room.softFailed ? 'WAYSTONE LOST' : 'WAYSTONE';
      showBar(PALETTE.hearthAmber, mix(PALETTE.hearthAmber, PALETTE.parchment, 0.45), maxHp > 0 ? hp / maxHp : 0);
      num.textContent = `${hp}/${maxHp}`;
      num.className = 'hud-bn-num';
      timer.textContent = clock(left);
      timer.className = 'hud-bn-num' + (left <= 10 * TICK_HZ ? ' warn' : '');
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
    label.textContent = `WAVE ${shown}/${total}`;
    setPips(total, idx, idx);
    num.textContent = `${alive} LEFT`;
    num.className = 'hud-bn-label hud-bn-sub';
    return true;
  }

  return {
    el: root,
    update,
    isVisible: () => mode !== 'none',
    debug: {
      boss: (d) => {
        bossOverride = d ? { name: d.name ?? 'THE HOLLOW STAG', hp: d.hp ?? 200, maxHp: d.maxHp ?? 200 } : null;
        return bossOverride;
      },
      state: () => ({
        mode,
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
