// ZONE 1 — Command Bar (BUILD_BRIEF §17). The only permanent UI: four party
// portraits (player + 3 allies), four skill slots in slot order (= execution
// order), and the dodge slot on the right.
//
// PORTRAIT STATE MACHINE (§17, all seven states reproducible on camera):
//   Healthy   (>50%)   static
//   Hurt      (25-50%) BAR LENGTH ONLY — no other chrome change
//   Critical  (<25%)   frame + track value-pulse charcoal<->bone at 2 Hz,
//                      inner frame 1 -> 3 px, persistent >=20 px HP numeral;
//                      the character art itself is never tinted
//   Downed             horizontal portrait crop + hollow Bone ring + hold-E
//   Being-revived      that ring fills CLOCKWISE FROM 12 in Parchment
//   Revive-interrupted reverse drain at 2x + a single 2 px shake
//   Selected           static 2 px Hearth Amber outline (F1-F4 / click)
//   Hover              chrome +1 value step only
// The 2 Hz Critical pulse is driven in JS (not a CSS animation) so a capture
// can pin its phase with __echoes.hud.freeze(t) and prove the 2 Hz rate.
//
// COOLDOWNS (one grammar for skills + dodge): clockwise radial wipe from 12,
// 70% charcoal overlay; <1.0 s remaining -> >=20 px Parchment numeral on its
// own opaque plate in the tile's bottom strip (a box that is DISJOINT from the
// abbrev box at every scale — see style.js); ready-pop 120 ms.
import { PALETTE } from '../../data/palette.js';
import { DODGE, TICK_HZ } from '../../core/constants.js';
import { ACCENTS, CHROME } from './style.js';

const CLASS_BY_INDEX = ['healer', 'tank', 'swordsman', 'archer'];
const PORTRAIT_KEYS = ['F1', 'F2', 'F3', 'F4'];
const PORTRAIT_LETTER = { healer: 'H', tank: 'T', swordsman: 'S', archer: 'A' };
const REVIVE_TOTAL_TICKS = 300; // §10 5.0 s channel (allies.js REVIVE.channelTicks)
const RING_R = 27; // svg units in a 70-box viewBox
const RING_C = 2 * Math.PI * RING_R;
const CRIT_HZ = 2; // §17 Critical value-pulse rate

const el = (tag, cls, parent) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (parent) parent.appendChild(n);
  return n;
};
const svgEl = (tag, cls, parent) => {
  const n = document.createElementNS('http://www.w3.org/2000/svg', tag);
  if (cls) n.setAttribute('class', cls);
  if (parent) parent.appendChild(n);
  return n;
};

// Icon-level nudge: remove -> reflow -> re-add so a repeat restarts it (§17).
// Every nudge is logged so a capture can prove WHICH element animated and that
// nothing outside the command bar ever does (criterion 3: no screen alarms).
const nudgeLog = [];
function nudge(node, cls) {
  node.classList.remove(cls);
  void node.offsetWidth;
  node.classList.add(cls);
  nudgeLog.push({
    t: Math.round(performance.now()),
    cls,
    target: node.className.replace(/\s+/g, ' ').trim(),
    insideBar: !!node.closest('#proto-hud'),
  });
  if (nudgeLog.length > 40) nudgeLog.shift();
}

export function createCommandBar({ bus, world, portraits, onSelect }) {
  const bar = el('div', 'hud-bar');
  // Legacy anchor: the skills-block probe suites (tools/actions/qw-hud.json,
  // qx-vis-aura.json) address the command bar as `#proto-hud .proto-slot`.
  // Keeping the id (and the `proto-*` class aliases below) means the real HUD
  // answers every probe the proto bar answered.
  bar.id = 'proto-hud';

  // ---------------------------------------------------------- portraits --
  const portGroup = el('div', 'hud-group hud-group-port', bar);
  const ports = [];
  for (let i = 0; i < 4; i++) {
    const classId = CLASS_BY_INDEX[i];
    const acc = ACCENTS[classId];
    const cell = el('div', 'hud-port proto-port', portGroup);
    cell.style.setProperty('--accent', acc.base);
    cell.style.setProperty('--accentLift', acc.lift);
    cell.style.setProperty('--accentDeep', acc.deep);
    cell.dataset.index = String(i);
    cell.dataset.class = classId;

    const tile = el('div', 'hud-port-tile', cell);
    const crop = el('div', 'hud-port-crop', tile);
    let img = null;
    if (portraits && portraits[classId]) {
      img = el('img', 'hud-port-img', crop);
      img.src = portraits[classId];
      img.alt = '';
      img.draggable = false;
    } else {
      const fb = el('div', 'hud-port-fallback', crop);
      fb.textContent = PORTRAIT_LETTER[classId];
    }
    const inner = el('div', 'hud-port-inner', tile);
    const key = el('span', 'hud-port-key proto-port-key', tile);
    key.textContent = PORTRAIT_KEYS[i];
    const num = el('span', 'hud-port-num', tile);

    // Downed / being-revived ring: hollow Bone backing + Parchment clockwise
    // fill, drawn as an SVG so the fill is a true radial sweep from 12.
    const ring = svgEl('svg', 'hud-port-ring', tile);
    ring.setAttribute('viewBox', '0 0 70 70');
    const rk = svgEl('circle', 'rk', ring);
    const rb = svgEl('circle', 'rb', ring);
    const rf = svgEl('circle', 'rf', ring);
    for (const c of [rk, rb, rf]) {
      c.setAttribute('cx', '35');
      c.setAttribute('cy', '35');
      c.setAttribute('r', String(RING_R));
    }
    rf.setAttribute('stroke-dasharray', String(RING_C));
    rf.setAttribute('stroke-dashoffset', String(RING_C));
    const eGlyph = el('span', 'hud-port-e', tile);
    eGlyph.textContent = 'E';

    el('div', 'hud-port-sel', cell);
    el('div', 'hud-port-tab', cell);
    const rally = el('div', 'hud-port-rally', cell);

    const hp = el('div', 'hud-port-hp proto-port-hp', cell);
    const fill = el('i', null, hp);

    // Full tile = click region (§17). Left-click toggles the §8 heal override,
    // exactly like F1-F4.
    cell.addEventListener('mousedown', (ev) => {
      if (ev.button !== 0) return;
      ev.preventDefault();
      ev.stopPropagation();
      onSelect?.(i);
    });
    cell.addEventListener('contextmenu', (ev) => ev.preventDefault());

    ports.push({
      i,
      classId,
      cell,
      tile,
      inner,
      hp,
      fill,
      num,
      rf,
      rally,
      img,
      state: 'healthy',
      lastPct: -1,
      lastState: '',
      lastFill: -1,
      shakeArmed: false,
    });
  }

  el('div', 'hud-sep', bar);

  // ------------------------------------------------------- skill slots --
  function makeSlot(keyLabel, cls = '') {
    const slot = el('div', `hud-slot proto-slot ${cls}`.trim());
    const k = el('span', 'hud-slot-key proto-key', slot);
    k.textContent = keyLabel;
    const abbrev = el('span', 'hud-slot-abbrev proto-glyph', slot);
    abbrev.textContent = '·';
    const passive = el('span', 'hud-slot-passive', slot);
    passive.textContent = '◈';
    const wipe = el('div', 'hud-slot-wipe proto-wipe', slot);
    const flash = el('div', 'hud-slot-flash', slot);
    const num = el('span', 'hud-slot-num proto-cd-num', slot);
    // Grey-socketed-node marker: hollow icon + diagonal strike, persistent.
    // The strike crosses the GLYPH band only (rows 27..60 of the 60 px inner
    // box), so it never runs through the key chip or the numeral plate.
    const grey = svgEl('svg', 'hud-slot-grey', slot);
    grey.setAttribute('viewBox', '0 0 60 60');
    const line = svgEl('line', null, grey);
    line.setAttribute('x1', '7');
    line.setAttribute('y1', '55');
    line.setAttribute('x2', '53');
    line.setAttribute('y2', '31');
    line.setAttribute('stroke', CHROME.inkDim);
    line.setAttribute('stroke-width', '3');
    line.setAttribute('stroke-linecap', 'round');
    return { slot, abbrev, wipe, flash, num, lastDeg: -1, wasReady: true, counting: false };
  }

  const skillGroup = el('div', 'hud-group hud-group-skill', bar);
  const skillEls = [];
  for (let i = 0; i < 4; i++) {
    const s = makeSlot(String(i + 1));
    skillGroup.appendChild(s.slot);
    skillEls.push(s);
  }
  el('div', 'hud-sep', bar);
  const dodgeGroup = el('div', 'hud-group hud-group-dodge', bar);
  const dodge = makeSlot('SPC');
  // The dodge glyph is an ICON, not text: "DASH" is four 24 px letters in a
  // 60 px band and would have to be shrunk under the >=16 px text floor. A
  // double chevron reads as "dash" at 20 px and carries no floor.
  dodge.abbrev.replaceChildren(dashGlyph());
  dodgeGroup.appendChild(dodge.slot);

  // ----------------------------------------------------------- events ---
  const forcedGrey = new Set(); // debug-only override for capture scripts
  let overrideIndex = null;
  bus.on('heal_override', (ev) => {
    overrideIndex = ev.index;
  });
  bus.on('rally', () => {
    for (const p of ports) nudge(p.rally, 'go');
  });
  bus.on('revive_break', (ev) => {
    const p = ports.find((q) => q.entityId === ev.target);
    if (p) nudge(p.cell, 'shake'); // single 2 px shake (§17)
  });
  bus.on('intent_denied', (ev) => {
    const kind = ev.kind ?? '';
    if (kind === 'dodge') {
      if (ev.reason === 'on_cooldown') nudge(dodge.flash, 'hud-nudge-wipe');
      else nudge(dodge.slot, 'hud-nudge-skip');
      return;
    }
    const m = /^skill_([1-4])$/.exec(kind);
    if (!m) return;
    const s = skillEls[Number(m[1]) - 1];
    if (!s) return;
    if (ev.reason === 'on_cooldown') nudge(s.flash, 'hud-nudge-wipe');
    else if (ev.reason === 'empty_slot') nudge(s.slot, 'hud-nudge-blink');
    else nudge(s.slot, 'hud-nudge-skip'); // priority_suppressed / duplicate
  });

  // -------------------------------------------------------- cooldowns ---
  // §17 clockwise radial wipe from 12 o'clock, 70% charcoal overlay.
  const WIPE_RGBA = `rgba(34,31,27,0.7)`; // Void Charcoal #221F1B at 70%
  function paintWipe(s, frac) {
    const deg = Math.round(Math.min(1, Math.max(0, frac)) * 360);
    if (deg === s.lastDeg) return;
    s.lastDeg = deg;
    s.wipe.style.background =
      deg > 0 ? `conic-gradient(${WIPE_RGBA} ${deg}deg, transparent 0deg)` : 'none';
  }

  function paintCooldown(s, remainingTicks, totalTicks) {
    paintWipe(s, totalTicks > 0 ? remainingTicks / totalTicks : 0);
    const counting = remainingTicks > 0 && remainingTicks < TICK_HZ;
    if (counting) s.num.textContent = (remainingTicks / TICK_HZ).toFixed(1);
    if (counting !== s.counting) {
      s.counting = counting;
      s.slot.classList.toggle('is-counting', counting);
    }
    const ready = remainingTicks <= 0;
    if (ready && !s.wasReady) nudge(s.slot, 'hud-ready');
    s.wasReady = ready;
  }

  // ---------------------------------------------------------- portraits --
  // Value pulse: charcoal <-> bone at 2 Hz. `frozen` pins the phase for
  // deterministic captures.
  let frozenPhase = null;
  const CHAR = [34, 31, 27]; // Void Charcoal
  const BONE = [201, 194, 179]; // Bone
  function pulse(now) {
    const t = frozenPhase !== null ? frozenPhase : now;
    return 0.5 - 0.5 * Math.cos(2 * Math.PI * CRIT_HZ * t);
  }

  function portraitState(m, channel) {
    if (!m) return 'empty';
    if (m.hp <= 0) return channel ? (channel.draining ? 'drain' : 'revive') : 'downed';
    const f = m.maxHp > 0 ? m.hp / m.maxHp : 0;
    if (f < 0.25) return 'critical';
    if (f <= 0.5) return 'hurt';
    return 'healthy';
  }

  function updatePortraits(now, members, channels) {
    const k = pulse(now);
    for (const p of ports) {
      const m = members[p.i] ?? null;
      p.entityId = m ? m.id : undefined;
      const ch = m ? channels.get(m.id) ?? null : null;
      const state = portraitState(m, ch);
      const downedish = state === 'downed' || state === 'revive' || state === 'drain';

      if (state !== p.lastState) {
        p.lastState = state;
        p.state = state;
        p.cell.classList.toggle('is-critical', state === 'critical');
        p.cell.classList.toggle('is-downed', downedish);
        if (state !== 'critical') {
          p.inner.style.borderWidth = '0px';
          p.inner.style.borderColor = 'transparent';
          p.hp.style.background = CHROME.plate;
        }
      }

      // HP bar: the ONLY thing that changes between Healthy and Hurt (§17).
      const pct = m && m.maxHp > 0 ? Math.max(0, Math.min(1, m.hp / m.maxHp)) : 0;
      const rounded = Math.round(pct * 1000) / 10;
      if (rounded !== p.lastFill) {
        p.lastFill = rounded;
        p.fill.style.width = `${rounded}%`;
      }

      if (state === 'critical') {
        // Frame + track value pulse; the character art is never touched.
        const c = CHAR.map((v, i) => Math.round(v + (BONE[i] - v) * k));
        const col = `rgb(${c[0]},${c[1]},${c[2]})`;
        p.inner.style.borderWidth = `${(1 + 2 * k).toFixed(2)}px`;
        p.inner.style.borderColor = col;
        p.hp.style.background = col;
        const hpNum = Math.max(0, Math.ceil(m.hp));
        if (hpNum !== p.lastPct) {
          p.lastPct = hpNum;
          p.num.textContent = String(hpNum);
        }
      }

      if (downedish) {
        const prog = ch ? Math.max(0, Math.min(1, ch.progress / REVIVE_TOTAL_TICKS)) : 0;
        p.rf.setAttribute('stroke-dashoffset', String(RING_C * (1 - prog)));
        p.rf.style.stroke = ch && ch.draining ? PALETTE.bone : PALETTE.parchment;
      } else if (p.rf.getAttribute('stroke-dashoffset') !== String(RING_C)) {
        p.rf.setAttribute('stroke-dashoffset', String(RING_C));
      }

      p.cell.classList.toggle('is-selected', overrideIndex === p.i);
    }
  }

  // ------------------------------------------------------------ update --
  function update(now, ctx) {
    const members = ctx.members;
    const channels = ctx.channels;
    updatePortraits(now, members, channels);

    paintCooldown(
      dodge,
      Math.max(0, world.player.dodgeReadyTick - ctx.tick),
      DODGE.cooldownTicks
    );

    const view = world.skillSlots();
    for (let i = 0; i < 4; i++) {
      const s = skillEls[i];
      const d = view[i];
      if (!d) {
        s.slot.classList.add('is-empty');
        s.slot.classList.remove('is-passive');
        s.abbrev.textContent = '·';
        paintCooldown(s, 0, 0);
        continue;
      }
      s.slot.classList.remove('is-empty');
      s.slot.classList.toggle('is-passive', !!d.passive);
      // §17 grey-socket marker: sim verdict, or the debug force for captures.
      s.slot.classList.toggle('is-grey', forcedGrey.has(i) || !!ctx.greySkills?.has(d.id));
      if (s.abbrev.textContent !== d.abbrev) s.abbrev.textContent = d.abbrev;
      if (d.passive) {
        // §7/§17: a passive slot is a static glyph, never a cooldown wipe.
        paintWipe(s, 0);
        if (s.counting) {
          s.counting = false;
          s.slot.classList.remove('is-counting');
        }
        s.wasReady = true;
        continue;
      }
      paintCooldown(s, d.remainingTicks, d.totalTicks);
    }
  }

  return {
    el: bar,
    update,
    // Debug surface (docs/TESTING.md): every state a capture needs to pin.
    debug: {
      freeze: (t) => {
        frozenPhase = t;
      },
      unfreeze: () => {
        frozenPhase = null;
      },
      hover: (i, on = true) => {
        ports[i]?.cell.classList.toggle('is-hover', !!on);
        return !!ports[i];
      },
      grey: (slot, on = true) => {
        if (on) forcedGrey.add(slot);
        else forcedGrey.delete(slot);
        return !!skillEls[slot];
      },
      portraits: () =>
        ports.map((p) => ({
          index: p.i,
          classId: p.classId,
          state: p.state,
          selected: p.cell.classList.contains('is-selected'),
          hover: p.cell.classList.contains('is-hover'),
          hpWidth: p.fill.style.width,
          numeral: p.cell.classList.contains('is-critical') ? p.num.textContent : null,
          innerBorder: p.inner.style.borderWidth,
          innerColor: p.inner.style.borderColor,
          reviveOffset: Number(p.rf.getAttribute('stroke-dashoffset')),
          reviveTotal: RING_C,
          hasImage: !!p.img,
        })),
      slots: () =>
        [...skillEls, dodge].map((s) => ({
          key: s.slot.querySelector('.hud-slot-key').textContent,
          abbrev: s.abbrev.querySelector('svg') ? '<glyph>' : s.abbrev.textContent,
          abbrevVisible: s.abbrev.getBoundingClientRect().height > 1,
          counting: s.counting,
          numeral: s.counting ? s.num.textContent : null,
          wipeDeg: s.lastDeg,
          empty: s.slot.classList.contains('is-empty'),
          passive: s.slot.classList.contains('is-passive'),
          keyBox: rect(s.slot.querySelector('.hud-slot-key')),
          abbrevBox: rect(s.abbrev),
          numBox: rect(s.num),
          tileBox: rect(s.slot),
        })),
      overrideIndex: () => overrideIndex,
      // Criterion 3 evidence: the denial nudges that fired, and proof that
      // every running CSS animation belongs to a command-bar icon.
      nudges: () => nudgeLog.slice(-12),
      animations: () =>
        document.getAnimations().map((a) => {
          const t = a.effect && a.effect.target;
          return {
            name: a.animationName ?? null,
            target: t ? (t.className.baseVal ?? t.className ?? t.tagName) : null,
            insideBar: t && t.closest ? !!t.closest('#proto-hud') : false,
            playState: a.playState,
          };
        }),
      // Freeze every live animation at `ms` into its timeline so a still frame
      // can show a 180 ms nudge at its peak.
      pinAnimations: (ms) => {
        const live = document.getAnimations();
        for (const a of live) {
          try {
            a.currentTime = ms;
            a.pause();
          } catch (e) {
            /* finished animations reject a seek */
          }
        }
        return live.length;
      },
    },
  };
}

// Double-chevron dodge glyph (Void-Charcoal-inked Parchment, no colour
// semantics — the dodge slot is chrome, not a state).
function dashGlyph() {
  const svg = svgEl('svg');
  svg.setAttribute('viewBox', '0 0 30 26');
  const p = svgEl('path', null, svg);
  p.setAttribute(
    'd',
    'M3 4 L13 13 L3 22 L7.5 22 L17.5 13 L7.5 4 Z M13 4 L23 13 L13 22 L17.5 22 L27.5 13 L17.5 4 Z'
  );
  p.setAttribute('fill', CHROME.ink);
  return svg;
}

function rect(node) {
  const r = node.getBoundingClientRect();
  return {
    x: Math.round(r.x * 10) / 10,
    y: Math.round(r.y * 10) / 10,
    w: Math.round(r.width * 10) / 10,
    h: Math.round(r.height * 10) / 10,
  };
}
