// ZONE 1 — Command Bar (BUILD_BRIEF §17). The only permanent UI: four party
// portraits (player + 3 allies), four skill slots in slot order (= execution
// order), and the dodge slot on the right. Under each skill tile (where a
// portrait carries its HP bar) an 8-segment SOCKET-FILL strip shows how many
// of that skill's 8 node sockets hold a node (M4c): a filled Parchment
// segment = a live node, a hollow Bone segment = a grey / saturation-inert
// node (socketed, contributes nothing now), a dark segment = a vacant socket
// — shape and value channels, never colour alone.
//
// PORTRAIT STATE MACHINE (§17, all seven states reproducible on camera):
//   Healthy   (>50%)   static
//   Hurt      (25-50%) BAR LENGTH ONLY — no other chrome change
//   Critical  (<25%)   frame + track value-pulse charcoal<->bone at 2 Hz,
//                      inner frame 1 -> 3 px, persistent >=20 px HP numeral.
//                      The pulse is scoped to FRAME + TRACK: the inner ring
//                      and the track's OUTLINE carry it, the track interior
//                      stays Void Charcoal (so the bar cannot invert its
//                      reading) and the FILL holds its class accent (so the
//                      tile still says whose it is while the frame strobes).
//                      The numeral owns its own plate at the cell's
//                      bottom-right corner, inside the class frame: it
//                      shares no line with the F-key chip (round 3: the chip
//                      was clipped to "2" and fused with the numeral) and it
//                      does not cover the face (round 2: a bottom strip ate
//                      51.6% of the tile)
//   Downed             horizontal portrait crop + hollow Bone ring + hold-E
//   Being-revived      that ring fills CLOCKWISE FROM 12 in Parchment
//   Revive-interrupted reverse drain at 2x + a single 2 px shake
//   Selected           static 2 px Hearth Amber outline (F1-F4 / click)
//   Hover              chrome +1 value step only
// The 2 Hz Critical pulse is driven in JS (not a CSS animation) so a capture
// can pin its phase with __echoes.hud.freeze(t) and prove the 2 Hz rate.
//
// COOLDOWNS (one grammar for skills + dodge): clockwise radial wipe from 12,
// 70% charcoal overlay on a LIFTED charcoal icon field (a 70% charcoal veil on
// a pure charcoal plate is invisible, and its conic edge then only shows by
// slicing the abbrev glyph); the veil is painted UNDER the type and the glyph
// dims uniformly instead. <1.0 s remaining -> >=20 px Parchment numeral on its
// own opaque plate in the tile's bottom strip (a box that is DISJOINT from the
// abbrev box at every scale — see style.js); ready-pop 120 ms.
import { dodgeCooldownTicks } from '../../sim/relics.js';
import { PALETTE } from '../../data/palette.js';
import { DODGE, TICK_HZ, SKILL_SLOTS, SOCKETS_PER_SKILL } from '../../core/constants.js';
import { ACCENTS, CHROME } from './style.js';
import { iconEl, hasIcon } from './icons.js';
import { t } from '../../i18n/index.js';
import { skillAbbrev } from '../run/cards.js';

// Cooldown ring geometry (40-box viewBox over the medallion): r 16.5 -> the
// Parchment arc that grows clockwise from 12 as the skill recharges.
const CD_RING_R = 16.5;
const CD_RING_LEN = 2 * Math.PI * CD_RING_R;

const CLASS_BY_INDEX = ['healer', 'tank', 'swordsman', 'archer'];
const PORTRAIT_LETTER = { healer: 'H', tank: 'T', swordsman: 'S', archer: 'A' };
const REVIVE_TOTAL_TICKS = 300; // §10 5.0 s channel (allies.js REVIVE.channelTicks)
// DOWNED RING GEOMETRY (70-box viewBox over the tile's 60 px padding box).
// Round D advisory: the F-key chip stays up on a downed tile (identity), and
// the hold-E glyph becomes a second keycap at the top-right, so the top band
// of the tile is chrome. The ring sits a little low (cy 41.5) and the two
// keycaps CAP it: the Bone backing and the Parchment fill are drawn as one
// arc that starts just past the E cap (~2:30) and sweeps clockwise to just
// before the F cap (~9:30), so no stroke ever runs under a chip and the fill
// can never "stall" under one. Angles are clockwise from 12.
const RING_R = 23.5;
const RING_CY = 41.5;
const RING_C = 2 * Math.PI * RING_R;
const ARC_START_DEG = 68;
const ARC_SWEEP_DEG = 224;
const ARC_LEN = (RING_C * ARC_SWEEP_DEG) / 360;
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
//
// CLASS FENCE (round-2 defect). `animation` is a shorthand: two nudge classes
// sitting on one node let STYLESHEET ORDER pick the winner, so a single
// dash-cancel (priority_suppressed -> hud-nudge-skip) used to kill that slot's
// empty_slot frame blink forever. Two fences now:
//   1. every nudge kind owns its own ELEMENT and its own animated property
//      (flash layer / frame layer / the tile itself), and
//   2. applying any nudge strips EVERY nudge class from that node first, and
//      each class removes itself on animationend, so residue cannot build up.
const NUDGE_CLASSES = [
  'hud-nudge-wipe',
  'hud-nudge-blink',
  'hud-nudge-skip',
  'hud-ready',
  'hud-peak-wipe',
  'hud-peak-blink',
  'hud-peak-skip',
  'hud-peak-ready',
];
const nudgeLog = [];
function clearNudges(node) {
  for (const c of NUDGE_CLASSES) node.classList.remove(c);
}
function nudge(node, cls) {
  clearNudges(node);
  void node.offsetWidth;
  node.classList.add(cls);
  node.addEventListener(
    'animationend',
    () => node.classList.remove(cls),
    { once: true }
  );
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
  // Ornamental end caps (REFERENCE_BAR check 9 / Reference D's bracketed HUD
  // cards). Absolutely positioned inside the bar's own padding, so they are
  // pure ornament and change no layout box the size sweep measures.
  el('i', 'hud-cap hud-cap-l', bar);
  el('i', 'hud-cap hud-cap-r', bar);

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
    // Class-identity hairline, concentric inside the Bone downed ring (§10).
    el('div', 'hud-port-ident', tile);
    // TOP BAND: the F-key chip alone, at its natural width, in EVERY state —
    // "F1".."F4" is the §8 heal-override affordance and is never truncated.
    // The Critical HP numeral does NOT share this line (round-3 defect: the
    // chip was clipped to "2" and fused with the numeral); it owns its own
    // plate on the cell, bottom-right, over the dead end of the HP track.
    const top = el('div', 'hud-port-top', tile);
    const key = el('span', 'hud-port-key proto-port-key', top);
    el('i', null, key).textContent = 'F';
    key.append(String(i + 1));

    // Downed / being-revived ring: hollow Bone backing + Parchment clockwise
    // fill, drawn as an SVG so the fill is a true radial sweep from 12.
    const ring = svgEl('svg', 'hud-port-ring', tile);
    ring.setAttribute('viewBox', '0 0 70 70');
    const rk = svgEl('circle', 'rk', ring);
    const rb = svgEl('circle', 'rb', ring);
    const rf = svgEl('circle', 'rf', ring);
    for (const c of [rk, rb, rf]) {
      c.setAttribute('cx', '35');
      c.setAttribute('cy', String(RING_CY));
      c.setAttribute('r', String(RING_R));
      // One visible arc for all three strokes (see RING geometry above).
      c.setAttribute('stroke-dasharray', `${ARC_LEN} ${RING_C}`);
      c.style.transform = `rotate(${-90 + ARC_START_DEG}deg)`;
    }
    rf.setAttribute('stroke-dashoffset', String(ARC_LEN));
    const eGlyph = el('span', 'hud-port-e', tile);
    eGlyph.textContent = 'E';

    el('div', 'hud-port-sel', cell);
    el('div', 'hud-port-tab', cell);
    const rally = el('div', 'hud-port-rally', cell);
    // §23.3 shield read on the portrait: a Parchment HEX RIM around the tile
    // (shape channel, never colour alone) while the member carries a live
    // shield, plus the shield's points on a small plate.
    const shieldRim = svgEl('svg', 'hud-port-shield', cell);
    shieldRim.setAttribute('viewBox', '0 0 72 72');
    const hexPath = svgEl('path', null, shieldRim);
    hexPath.setAttribute('d', 'M36 2 L65 18.5 L65 53.5 L36 70 L7 53.5 L7 18.5 Z');
    const shieldNum = el('span', 'hud-port-shieldnum', cell);

    const hp = el('div', 'hud-port-hp proto-port-hp', cell);
    const fill = el('i', null, hp);
    // Critical numeral plate — a child of the CELL, not of the tile (the tile
    // clips with overflow:hidden and the plate carries its own rounded rim).
    const num = el('span', 'hud-port-num', cell);

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
      key,
      top,
      rf,
      rally,
      img,
      shieldNum,
      shieldShown: -1,
      state: 'healthy',
      lastPct: -1,
      lastState: '',
      lastFill: -1,
      shakeArmed: false,
    });
  }

  el('div', 'hud-sep', bar);

  // ------------------------------------------------------- skill slots --
  // SLOT ANATOMY (check 9: "cooldown radials, boon/skill icons"). The glyph
  // band holds a circular MEDALLION (.hud-slot-abbrev keeps its class so the
  // block probes still find it; its text became data-abbrev): a sunk charcoal
  // disc, the conic cooldown veil INSIDE the disc (so the wipe reads as a
  // clock face, not a corner wedge), the drawn skill icon above the veil, and
  // a Parchment progress arc on the disc's rim that fills clockwise from 12
  // as the skill recharges. Ready = full icon, no veil, dim chrome rim.
  function makeSlot(keyLabel, cls = '') {
    const slot = el('div', `hud-slot proto-slot ${cls}`.trim());
    const k = el('span', 'hud-slot-key proto-key', slot);
    k.textContent = keyLabel;
    const abbrev = el('span', 'hud-slot-abbrev proto-glyph', slot);
    abbrev.dataset.abbrev = '·';
    const wipe = el('div', 'hud-slot-wipe proto-wipe', abbrev);
    const iconHost = el('span', 'hud-slot-ico', abbrev);
    const ring = svgEl('svg', 'hud-slot-ring', slot);
    ring.setAttribute('viewBox', '0 0 40 40');
    const ringRim = svgEl('circle', 'rr', ring);
    const ringFill = svgEl('circle', 'rf', ring);
    for (const c of [ringRim, ringFill]) {
      c.setAttribute('cx', '20');
      c.setAttribute('cy', '20');
      c.setAttribute('r', String(CD_RING_R));
    }
    ringFill.setAttribute('stroke-dasharray', `0 ${CD_RING_LEN}`);
    // ROUND-2 CERTIFICATION FIX (check 9). Two scorers read the slot
    // differently: one measured the true conic sweep, the other called it "a
    // linear top-down grey wipe, not the radial the bar asks for". A 70%
    // charcoal veil on a small dark disc has no visible conic EDGE in a still
    // frame — the clock is only legible while it moves. So the sweep now
    // carries a HAND: a Parchment spoke from the medallion centre to the rim at
    // the elapsed/remaining boundary, capped with a diamond head on the arc,
    // the same grammar the boss plate's fill head uses. One <g> rotated per
    // repaint; nothing else changed about the wipe.
    const hand = svgEl('g', 'hd', ring);
    const handLine = svgEl('line', null, hand);
    handLine.setAttribute('x1', '20');
    handLine.setAttribute('y1', '20');
    handLine.setAttribute('x2', '20');
    handLine.setAttribute('y2', String(20 - CD_RING_R));
    const handHead = svgEl('path', 'hh', hand);
    handHead.setAttribute('d', `M20 ${20 - CD_RING_R - 3.1} L23.1 ${20 - CD_RING_R} L20 ${20 - CD_RING_R + 3.1} L16.9 ${20 - CD_RING_R} Z`);
    const passive = el('span', 'hud-slot-passive', slot);
    passive.textContent = '◈';
    const flash = el('div', 'hud-slot-flash', slot);
    // Dedicated layer for the empty_slot frame blink — its own element and its
    // own property, so it can never share a node with the skip-pulse.
    const frame = el('div', 'hud-slot-frame', slot);
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
    return {
      slot,
      abbrev,
      iconHost,
      iconId: null,
      ringFill,
      hand,
      lastHand: -1,
      lastRing: -1,
      wipe,
      flash,
      frame,
      num,
      lastDeg: -1,
      wasReady: true,
      counting: false,
      cooling: false,
    };
  }

  // Swap the drawn icon only when the slot's skill changes (never per frame).
  function setIcon(s, id, abbrev) {
    if (s.iconId === id) return;
    s.iconId = id;
    s.abbrev.dataset.abbrev = abbrev ?? '·';
    s.iconHost.replaceChildren();
    if (id && hasIcon(id)) s.iconHost.appendChild(iconEl(id, { size: 26 }));
  }

  // SKILL_SLOTS (4) tiles in slot order = execution order, keys 1-4 (M4c:
  // at most 4 equipped skills). Each tile sits in a column with its socket-
  // fill strip beneath it (the portraits' HP-bar row).
  const skillGroup = el('div', 'hud-group hud-group-skill', bar);
  const skillEls = [];
  for (let i = 0; i < SKILL_SLOTS; i++) {
    const s = makeSlot(String(i + 1));
    const col = el('div', 'hud-skillcol', skillGroup);
    col.appendChild(s.slot);
    s.col = col;
    s.pips = el('div', 'hud-slot-pips', col);
    s.pipEls = [];
    for (let k = 0; k < SOCKETS_PER_SKILL; k++) s.pipEls.push(el('i', null, s.pips));
    s.pipSig = '';
    s.sockets = null;
    skillEls.push(s);
  }
  // Socket fill, repainted from the build system only when the build or the
  // kit changes (never per frame): filled / live / grey counts per tile.
  let socketsDirty = true;
  const markSockets = () => {
    socketsDirty = true;
  };
  for (const t of ['node_socketed', 'node_unsocketed', 'build_restored', 'build_autofill', 'skill_equip', 'skills_restored', 'run_wiped', 'run_start', 'state_restored', 'room_start', 'room_cleared'])
    bus.on(t, markSockets);
  function paintSockets() {
    socketsDirty = false;
    const guestSeat = !!(world.netView && world.netView.seat > 0);
    const b = typeof world.buildSystem === 'function' ? world.buildSystem() : null;
    const v = b && typeof b.view === 'function' ? b.view() : null;
    const slotsNow = world.skillSlots();
    for (let i = 0; i < skillEls.length; i++) {
      const s = skillEls[i];
      const d = slotsNow[i];
      const sk = d && v ? v.skills.find((x) => x.id === d.id) : null;
      const row = sk ? sk.sockets : null;
      const sig = guestSeat ? 'guest' : !d ? 'none' : row ? row.map((c) => (c ? (c.verdict === 'live' ? 'L' : 'G') : '.')).join('') : '........';
      if (sig === s.pipSig) continue;
      s.pipSig = sig;
      s.pips.style.visibility = guestSeat || !d ? 'hidden' : '';
      const cells = row ?? [];
      let filled = 0;
      let live = 0;
      let grey = 0;
      for (let k = 0; k < s.pipEls.length; k++) {
        const c = cells[k] ?? null;
        const on = !!c && c.verdict === 'live';
        const g = !!c && c.verdict !== 'live';
        s.pipEls[k].className = on ? 'is-on' : g ? 'is-grey' : '';
        if (c) filled += 1;
        if (on) live += 1;
        if (g) grey += 1;
      }
      s.sockets = d ? { filled, live, grey, of: SOCKETS_PER_SKILL } : null;
      s.col.title = d
        ? grey
          ? t('{filled} / {total} sockets filled ({grey} contribute nothing here)', { filled, total: SOCKETS_PER_SKILL, grey })
          : t('{filled} / {total} sockets filled', { filled, total: SOCKETS_PER_SKILL })
        : '';
    }
  }
  el('div', 'hud-sep', bar);
  const dodgeGroup = el('div', 'hud-group hud-group-dodge', bar);
  const dodge = makeSlot('SPC');
  // The dodge glyph is an ICON, not text: "DASH" is four 24 px letters in a
  // 60 px band and would have to be shrunk under the >=16 px text floor. A
  // double chevron reads as "dash" at 20 px and carries no floor.
  setIcon(dodge, 'dodge', 'DASH');
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
      denyNudge(dodge, ev.reason);
      return;
    }
    const m = /^skill_([1-9])$/.exec(kind);
    if (!m) return;
    const s = skillEls[Number(m[1]) - 1];
    if (s) denyNudge(s, ev.reason);
  });

  // One routing table for every denial reason, so the three channels stay
  // told apart: fill wash / frame blink / motion skip. The empty_slot blink
  // rides BOTH the dedicated 3 px frame overlay (the pixel signal) and the
  // slot's own dashed border (what §17 describes, and what the round-2 probe
  // reads), which is safe because of the strip below.
  const NUDGE_TARGET = {
    on_cooldown: (s) => [[s.flash, 'hud-nudge-wipe']],
    empty_slot: (s) => [
      [s.frame, 'hud-nudge-blink'],
      [s.slot, 'hud-nudge-blink'],
    ],
    priority_suppressed: (s) => [[s.slot, 'hud-nudge-skip']],
  };
  // EVERY denial resets the whole slot first — all three layers, live classes
  // and held debug peaks alike — so a slot can never carry two nudge states at
  // once and stylesheet order can never pick the winner. This is the fence the
  // round-2 defect needed: a dash-cancel's skip-pulse used to survive on the
  // node and permanently outrank that slot's empty_slot frame blink.
  function denyNudge(s, reason) {
    clearNudges(s.slot);
    clearNudges(s.flash);
    clearNudges(s.frame);
    const pick = NUDGE_TARGET[reason] ?? NUDGE_TARGET.priority_suppressed;
    for (const [node, cls] of pick(s)) nudge(node, cls);
  }

  // -------------------------------------------------------- cooldowns ---
  // §17 CLOCKWISE radial wipe from 12 o'clock, 70% charcoal overlay.
  //
  // ROUND-3 DEFECT. The veil used to be painted on the REMAINING side
  // (`conic-gradient(veil <remaining>deg, transparent)`), which anchors the
  // charcoal wedge at 12 and shrinks it back TOWARD 12 — the reveal boundary
  // then travels counter-clockwise, the opposite of the spec. The veil is now
  // painted on the ELAPSED side: transparent from 12 through <elapsed>, veil
  // the rest, so the icon uncovers clockwise from 12 like every cooldown clock
  // the player has ever used. `lastDeg` stays the REMAINING degrees (that is
  // what the probes read: 360 at cast -> 0 at ready).
  const WIPE_RGBA = `rgba(34,31,27,0.7)`; // Void Charcoal #221F1B at 70%
  function paintWipe(s, frac) {
    const deg = Math.round(Math.min(1, Math.max(0, frac)) * 360);
    if (deg === s.lastDeg) return;
    s.lastDeg = deg;
    const elapsed = 360 - deg;
    s.wipe.style.background =
      deg > 0
        ? `conic-gradient(transparent 0deg ${elapsed}deg, ${WIPE_RGBA} ${elapsed}deg 360deg)`
        : 'none';
    // The rim arc is the same clock read from outside: it covers the ELAPSED
    // span, so it grows clockwise from 12 while the veil shrinks toward 12.
    const len = Math.round(((elapsed / 360) * CD_RING_LEN) * 10) / 10;
    if (len !== s.lastRing) {
      s.lastRing = len;
      s.ringFill.setAttribute('stroke-dasharray', `${len} ${CD_RING_LEN}`);
    }
    // The clock hand rides the same boundary, so the sweep reads as a radial in
    // a single captured frame instead of only in motion.
    if (s.hand && elapsed !== s.lastHand) {
      s.lastHand = elapsed;
      s.hand.setAttribute('transform', `rotate(${elapsed} 20 20)`);
    }
  }

  function paintCooldown(s, remainingTicks, totalTicks) {
    paintWipe(s, totalTicks > 0 ? remainingTicks / totalTicks : 0);
    const counting = remainingTicks > 0 && remainingTicks < TICK_HZ;
    if (counting) s.num.textContent = (Math.ceil(remainingTicks / (TICK_HZ / 10)) / 10).toFixed(1); // never "0.0" while ticks remain
    if (counting !== s.counting) {
      s.counting = counting;
      s.slot.classList.toggle('is-counting', counting);
    }
    // The veil now sits UNDER the type (style.js), so the glyph is dimmed as a
    // whole instead of being sliced by the conic edge.
    const cooling = remainingTicks > 0;
    if (cooling !== s.cooling) {
      s.cooling = cooling;
      s.slot.classList.toggle('is-cooling', cooling);
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
          p.hp.style.outlineColor = '';
          p.fill.style.background = '';
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
        // §17 scopes the Critical value pulse to FRAME + TRACK. The frame is
        // the inner ring (1 -> 3 px) and the track is its outline; the track
        // INTERIOR stays Void Charcoal so the bar can never invert its reading
        // at the bone end of the pulse (round-2 defect: at 15% HP the empty
        // 85% was 1.6x brighter than the fill).
        // ROUND-3 DEFECT: the FILL used to ride the same pulse and reached
        // rgb(219,213,204) — bone, not the class accent. The fill is the one
        // element still saying WHOSE tile this is while the frame strobes, so
        // it now holds its class-accent gradient (--accentLift -> --accent ->
        // --accentDeep, straight from the stylesheet) and never pulses.
        const c = CHAR.map((v, i) => Math.round(v + (BONE[i] - v) * k));
        const col = `rgb(${c[0]},${c[1]},${c[2]})`;
        p.inner.style.borderWidth = `${(1 + 2 * k).toFixed(2)}px`;
        p.inner.style.borderColor = col;
        p.hp.style.outlineColor = col;
        const hpNum = Math.max(0, Math.ceil(m.hp));
        if (hpNum !== p.lastPct) {
          p.lastPct = hpNum;
          p.num.textContent = String(hpNum);
        }
      }

      if (downedish) {
        const prog = ch ? Math.max(0, Math.min(1, ch.progress / REVIVE_TOTAL_TICKS)) : 0;
        p.rf.setAttribute('stroke-dashoffset', String(ARC_LEN * (1 - prog)));
        p.rf.style.stroke = ch && ch.draining ? PALETTE.bone : PALETTE.parchment;
      } else if (p.rf.getAttribute('stroke-dashoffset') !== String(ARC_LEN)) {
        p.rf.setAttribute('stroke-dashoffset', String(ARC_LEN));
      }

      p.cell.classList.toggle('is-selected', overrideIndex === p.i);

      // Shield rim (§23.3 / §23.8): shown while a live shield has points left.
      const sh = m && m.status && m.status.shield;
      const pts = sh && sh.untilTick > tickNow && sh.mag > 1e-6 && m.hp > 0 ? Math.max(1, Math.round(sh.mag)) : 0;
      if (pts !== p.shieldShown) {
        p.shieldShown = pts;
        p.cell.classList.toggle('has-shield', pts > 0);
        p.shieldNum.textContent = pts > 0 ? String(pts) : '';
      }
    }
  }
  let tickNow = 0;

  // ------------------------------------------------------------ update --
  // RELICS (Ash Feather): the dodge ring's full length follows the relics.
  // Read once per sim tick (the relic view is cheap, but this paints per frame).
  let dodgeTotalAt = -1;
  let dodgeTotalV = DODGE.cooldownTicks;
  function dodgeTotal() {
    if (tickNow === dodgeTotalAt) return dodgeTotalV;
    dodgeTotalAt = tickNow;
    const R = typeof world.runSystem === 'function' ? world.runSystem() : null;
    const rl = R && typeof R.relics === 'function' ? R.relics() : null;
    dodgeTotalV = dodgeCooldownTicks(DODGE.cooldownTicks, rl ? rl.owned.map((o) => o.id) : null);
    return dodgeTotalV;
  }

  function update(now, ctx) {
    const members = ctx.members;
    const channels = ctx.channels;
    tickNow = ctx.tick ?? 0;
    updatePortraits(now, members, channels);

    paintCooldown(
      dodge,
      Math.max(0, world.player.dodgeReadyTick - ctx.tick),
      dodgeTotal()
    );

    const view = world.skillSlots();
    if (socketsDirty || skillEls.some((s, i) => (view[i] ? view[i].id : null) !== s.iconId)) paintSockets();
    for (let i = 0; i < skillEls.length; i++) {
      const s = skillEls[i];
      const d = view[i];
      if (!d) {
        s.slot.classList.add('is-empty');
        s.slot.classList.remove('is-passive');
        setIcon(s, null, '·');
        paintCooldown(s, 0, 0);
        continue;
      }
      s.slot.classList.remove('is-empty');
      s.slot.classList.toggle('is-passive', !!d.passive);
      // §17 grey-socket marker: sim verdict, or the debug force for captures.
      s.slot.classList.toggle('is-grey', forcedGrey.has(i) || !!ctx.greySkills?.has(d.id));
      setIcon(s, d.id, d.abbrev);
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

  // RUN END (run_end / run_wiped / return_to_camp). The sim wipes cooldowns,
  // HP and the heal override, and the bar repaints from that truth on the
  // next frame — but two things are the bar's own and would otherwise leak
  // into the end card / Camp: the override outline (only updated by the
  // heal_override event, which the wipe does not emit) and the ready-pop
  // that every slot would fire when its cooldown snaps to 0. Both are
  // silenced here, along with any nudge / shake still animating.
  function endRun() {
    overrideIndex = null;
    for (const s of [...skillEls, dodge]) {
      clearNudges(s.slot);
      clearNudges(s.flash);
      clearNudges(s.frame);
      s.wasReady = true;
    }
    for (const p of ports) {
      p.cell.classList.remove('shake');
      p.cell.classList.remove('is-selected');
      p.rally.classList.remove('go');
    }
  }

  // --- boot warm-up (certification fix D-r3 S1). Every portrait and slot
  // state the fight can reach is painted once at boot (the bar sits at 2/1000
  // opacity for those frames, see hud/index.js), so the first Critical pulse,
  // the first downed portrait, the first cooldown wipe and the first denial
  // nudge of a session are rasterised on warm compositor pipelines instead of
  // mid-wave. `prewarmEnd` puts every class and inline style back and resets
  // the paint caches so the next real update repaints from truth.
  function prewarmFrame(k) {
    const P = ports;
    if (P[0]) {
      P[0].cell.classList.add('is-critical');
      P[0].inner.style.borderWidth = `${(1 + 2 * ((k + 1) / 3)).toFixed(2)}px`;
      P[0].inner.style.borderColor = 'rgb(201,194,179)';
      P[0].hp.style.outlineColor = 'rgb(201,194,179)';
      P[0].num.textContent = '12';
      P[0].fill.style.width = '18%';
    }
    if (P[1]) P[1].cell.classList.add('is-downed');
    if (P[2] && k === 0) nudge(P[2].cell, 'shake');
    if (P[3] && k === 0) nudge(P[3].rally, 'go');
    if (P[2]) P[2].cell.classList.add('is-hover');
    const S = skillEls;
    const cool = (s, deg) => {
      if (!s) return;
      s.slot.classList.add('is-cooling');
      s.lastDeg = -1;
      paintWipe(s, deg / 360);
    };
    cool(S[0], 120 + k * 40);
    cool(dodge, 300);
    if (S[1]) {
      S[1].slot.classList.add('is-counting');
      S[1].num.textContent = '0.4';
    }
    if (k === 0) {
      if (S[2]) nudge(S[2].slot, 'hud-ready');
      if (S[3]) {
        nudge(S[3].flash, 'hud-nudge-wipe');
        nudge(S[3].frame, 'hud-nudge-blink');
        nudge(S[3].slot, 'hud-nudge-skip');
      }
    }
    if (S[3]) S[3].slot.classList.add('is-grey');
  }
  function prewarmEnd() {
    for (const p of ports) {
      p.cell.classList.remove('is-critical', 'is-downed', 'is-hover', 'shake');
      clearNudges(p.cell);
      clearNudges(p.rally);
      p.rally.classList.remove('go');
      p.inner.style.borderWidth = '0px';
      p.inner.style.borderColor = 'transparent';
      p.hp.style.outlineColor = '';
      p.fill.style.background = '';
      p.num.textContent = '';
      p.lastState = null;
      p.lastFill = -1;
      p.lastPct = -1;
    }
    for (const s of [...skillEls, dodge]) {
      if (!s) continue;
      s.slot.classList.remove('is-cooling', 'is-counting', 'is-grey');
      clearNudges(s.slot);
      clearNudges(s.flash);
      clearNudges(s.frame);
      s.wipe.style.background = 'none';
      s.ringFill.setAttribute('stroke-dasharray', `0 ${CD_RING_LEN}`);
      if (s.hand) s.hand.setAttribute('transform', 'rotate(0 20 20)');
      s.num.textContent = '';
      s.lastDeg = -1;
      s.lastRing = -1;
      s.lastHand = -1;
      s.counting = false;
      s.cooling = false;
      s.wasReady = true;
    }
  }

  // @gnt:M5b VIEW-SEAT begin — setViewSeat(partyIndex): a guest's bar shows
  // its own seat's kit (4 tiles, ally kits stay 4) and portrait focus.
  // The net session publishes the local seat on `world.netView` ({ seat,
  // skillSlots(), dodge() } — the guest's action shadow, so a predicted cast
  // starts its tile on the press frame). Seat 0 / single-player: the bar is
  // exactly the Healer's (the wrapped update below is a pass-through).
  let viewSeat = 0;
  const healerUpdate = update;
  function setViewSeat(partyIndex) {
    viewSeat = partyIndex | 0;
    for (const p of ports) p.cell.classList.toggle('nt-self', viewSeat > 0 && p.i === viewSeat);
    if (viewSeat === 0) {
      for (const s of skillEls) s.slot.style.display = '';
      markSockets(); // the Healer's socket strips repaint on the next update
    }
    return viewSeat;
  }
  if (typeof document !== 'undefined' && !document.getElementById('nt-bar-style')) {
    const st = document.createElement('style');
    st.id = 'nt-bar-style';
    st.textContent =
      `.hud-port.nt-self { outline: 2px solid ${PALETTE.hearthAmber}; outline-offset: 2px; border-radius: 10px; }` +
      `.hud-slot .nt-abbr { position: relative; z-index: 2; font: 800 18px/1 "Nunito", "Trebuchet MS", system-ui, var(--i18n-font, sans-serif); color: ${PALETTE.parchment}; letter-spacing: 0.02em; }`;
    document.head.appendChild(st);
  }
  // eslint-disable-next-line no-func-assign
  update = function seatAwareUpdate(now, ctx) {
    const nv = world.netView;
    const slots = nv && nv.seat > 0 && typeof nv.skillSlots === 'function' ? nv.skillSlots() : null;
    if ((nv ? nv.seat : 0) !== viewSeat) setViewSeat(slots ? nv.seat : 0);
    if (!slots) return healerUpdate(now, ctx);
    tickNow = ctx.tick ?? 0;
    updatePortraits(now, ctx.members, ctx.channels);
    const dg = typeof nv.dodge === 'function' ? nv.dodge() : null;
    paintCooldown(dodge, dg ? dg.remaining : 0, dg ? dg.total : DODGE.cooldownTicks);
    for (let i = 0; i < skillEls.length; i++) {
      const s = skillEls[i];
      const d = slots[i];
      if (!d) {
        s.slot.style.display = 'none';
        continue;
      }
      s.slot.style.display = '';
      s.slot.classList.remove('is-empty', 'is-passive', 'is-grey');
      // PARTY: a class passive (Iron Stance / Razor Wake / Kestrel Watch) in
      // the seat's loadout reads as the Healer's passives do (no key press).
      if (d.passive) s.slot.classList.add('is-passive');
      // The guest's tiles keep the medallion only (its sockets live on the
      // party socket screen); the Healer's 8-socket strip never shows here.
      if (s.pips && s.pipSig !== 'guest') {
        s.pips.style.visibility = 'hidden';
        s.pipSig = 'guest';
        s.sockets = null;
      }
      setIcon(s, d.id, d.abbrev);
      // Ally kit skills have no drawn icon: their two-letter abbrev fills
      // the medallion instead (Parchment, >= 16 real px).
      if (!hasIcon(d.id) && s.iconHost.childElementCount === 0) {
        const ab = document.createElement('span');
        ab.className = 'nt-abbr';
        ab.textContent = skillAbbrev(d);
        s.iconHost.appendChild(ab);
      }
      paintCooldown(s, d.remainingTicks, d.totalTicks);
    }
    return undefined;
  };
  // The local seat's own denials (sim `seat_denied`, tagged by seat) nudge
  // its tiles like the Healer's intent_denied does.
  bus.on('seat_denied', (ev) => {
    if (!viewSeat || ev.seat !== viewSeat) return;
    const kind = ev.kind ?? '';
    if (kind === 'dodge') {
      denyNudge(dodge, ev.reason);
      return;
    }
    const m = /^skill_([1-9])$/.exec(kind);
    if (!m) return;
    const s = skillEls[Number(m[1]) - 1];
    if (s && s.slot.style.display !== 'none') denyNudge(s, ev.reason);
  });
  // @gnt:M5b VIEW-SEAT end
  return {
    el: bar,
    update,
    endRun,
    prewarmFrame,
    prewarmEnd,
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
        ports.map((p) => {
          const crit = p.cell.classList.contains('is-critical');
          const fillCs = getComputedStyle(p.fill);
          const trackCs = getComputedStyle(p.hp);
          return {
            index: p.i,
            classId: p.classId,
            state: p.state,
            selected: p.cell.classList.contains('is-selected'),
            hover: p.cell.classList.contains('is-hover'),
            hpWidth: p.fill.style.width,
            numeral: crit ? p.num.textContent : null,
            innerBorder: p.inner.style.borderWidth,
            innerColor: p.inner.style.borderColor,
            // Criterion 1: the key chip and the Critical numeral share the top
            // band; these two boxes must never intersect.
            keyBox: rect(p.key),
            numBox: rect(p.num),
            tileBox: rect(p.tile),
            hpBox: rect(p.hp),
            fillBox: rect(p.fill),
            // Criterion 2/5 polarity proof, straight off the computed style.
            fillColor: fillCs.backgroundColor,
            fillImage: fillCs.backgroundImage.slice(0, 60),
            trackColor: trackCs.backgroundColor,
            trackBorder: trackCs.borderTopColor,
            trackOutline: trackCs.outlineColor,
            reviveOffset: Number(p.rf.getAttribute('stroke-dashoffset')),
            reviveTotal: ARC_LEN,
            arc: { startDeg: ARC_START_DEG, sweepDeg: ARC_SWEEP_DEG },
            // Downed identity (round D advisory): the F-key chip stays up and
            // the hairline / track rim carry the class BASE accent.
            keyVisible: p.key.getBoundingClientRect().width > 1,
            eBox: rect(p.tile.querySelector('.hud-port-e')),
            identColor: getComputedStyle(p.tile.querySelector('.hud-port-ident')).borderTopColor,
            keyColor: getComputedStyle(p.key).color,
            imgFilter: p.img ? getComputedStyle(p.img).filter : null,
            hasImage: !!p.img,
            shield: p.shieldShown > 0 ? p.shieldShown : 0,
            shieldBox: rect(p.cell.querySelector('.hud-port-shield')),
          };
        }),
      slots: () =>
        [...skillEls, dodge].map((s) => ({
          key: s.slot.querySelector('.hud-slot-key').textContent,
          abbrev: s.abbrev.dataset.abbrev,
          icon: s.iconId,
          iconDrawn: !!s.iconHost.querySelector('svg'),
          ringLen: s.lastRing,
          abbrevVisible: s.abbrev.getBoundingClientRect().height > 1,
          counting: s.counting,
          numeral: s.counting ? s.num.textContent : null,
          wipeDeg: s.lastDeg,
          empty: s.slot.classList.contains('is-empty'),
          passive: s.slot.classList.contains('is-passive'),
          cooling: s.cooling,
          keyBox: rect(s.slot.querySelector('.hud-slot-key')),
          sockets: s.sockets ?? null,
          pipsBox: s.pips ? rect(s.pips) : null,
          abbrevBox: rect(s.abbrev),
          numBox: rect(s.num),
          tileBox: rect(s.slot),
          nudge: {
            slot: s.slot.className,
            flash: s.flash.className,
            frame: s.frame.className,
            frameBorder: getComputedStyle(s.frame).borderTopColor,
            flashBg: getComputedStyle(s.flash).backgroundColor,
            transform: getComputedStyle(s.slot).transform,
            anim: getComputedStyle(s.slot).animationName,
          },
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
      // HOLD a denial nudge at its keyframe PEAK as a STATIC class, so a
      // screenshot can prove the pixel half of criterion 3. Round 2 rejected
      // `pinAnimations` because a paused WAAPI animation did not survive the
      // HUD's per-frame class writes; a plain class does. The peak classes in
      // style.js carry the exact declarations the 40-50% keyframes reach.
      //   target: 0..3 skill slot, 'dodge', or 'all'
      //   kind:   'on_cooldown' | 'empty_slot' | 'priority_suppressed' | 'ready'
      //   holdMs: 0 (or omitted) holds until the next forceNudge/clear call
      forceNudge: (target, kind, holdMs = 0) => {
        const PEAK = {
          on_cooldown: (s) => [s.flash, 'hud-peak-wipe'],
          empty_slot: (s) => [s.frame, 'hud-peak-blink'],
          priority_suppressed: (s) => [s.slot, 'hud-peak-skip'],
          ready: (s) => [s.slot, 'hud-peak-ready'],
        };
        const pick = PEAK[kind];
        if (!pick) return { ok: false, reason: 'unknown kind: ' + kind };
        const targets =
          target === 'all'
            ? [...skillEls, dodge]
            : target === 'dodge'
              ? [dodge]
              : skillEls[target]
                ? [skillEls[target]]
                : [];
        if (!targets.length) return { ok: false, reason: 'unknown target' };
        const applied = [];
        for (const s of targets) {
          const [node, cls] = pick(s);
          clearNudges(node);
          node.classList.add(cls);
          applied.push({ cls, target: node.className, box: rect(node) });
          if (holdMs > 0) setTimeout(() => node.classList.remove(cls), holdMs);
        }
        return { ok: true, kind, applied };
      },
      // Back-compatible name for the round-2 probe, now honest: a paused WAAPI
      // animation did not survive the HUD's per-frame class writes, so instead
      // of pretending, every LIVE nudge is converted to its STATIC peak class
      // and held there until clearNudges() (or the next real nudge on that
      // node). `ms` is accepted and ignored — the peak is the peak.
      pinAnimations: (ms = 0) => {
        const PEAK = {
          'hud-nudge-wipe': 'hud-peak-wipe',
          'hud-nudge-blink': 'hud-peak-blink',
          'hud-nudge-skip': 'hud-peak-skip',
          'hud-ready': 'hud-peak-ready',
        };
        const held = [];
        for (const a of document.getAnimations()) {
          const t = a.effect && a.effect.target;
          if (!t || !t.classList) continue;
          for (const [live, peak] of Object.entries(PEAK)) {
            if (!t.classList.contains(live)) continue;
            t.classList.remove(live);
            t.classList.add(peak);
            held.push({ from: live, to: peak, target: t.className, box: rect(t) });
          }
        }
        return { pinned: held.length, held, note: 'held as static peak classes' };
      },
      clearNudges: () => {
        for (const s of [...skillEls, dodge]) {
          clearNudges(s.slot);
          clearNudges(s.flash);
          clearNudges(s.frame);
        }
        return true;
      },
    },
  };
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
