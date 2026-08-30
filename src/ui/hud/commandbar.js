// ZONE 1 — Command Bar (BUILD_BRIEF §17). The only permanent UI: four party
// portraits (player + 3 allies), four skill slots in slot order (= execution
// order), and the dodge slot on the right.
//
// PORTRAIT STATE MACHINE (§17, all seven states reproducible on camera):
//   Healthy   (>50%)   static
//   Hurt      (25-50%) BAR LENGTH ONLY — no other chrome change
//   Critical  (<25%)   frame + track value-pulse charcoal<->bone at 2 Hz,
//                      inner frame 1 -> 3 px, persistent >=20 px HP numeral;
//                      the character art itself is never tinted OR COVERED —
//                      the numeral shares the tile's reserved top chrome band
//                      with the F-key chip (round 2 rejected a bottom strip
//                      that ate 51.6% of the tile and hid the face), and the
//                      track's charcoal<->bone pulse rides its OUTLINE so the
//                      fill stays the brighter element at every phase
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
import { PALETTE } from '../../data/palette.js';
import { DODGE, TICK_HZ } from '../../core/constants.js';
import { ACCENTS, CHROME, mix } from './style.js';

const CLASS_BY_INDEX = ['healer', 'tank', 'swordsman', 'archer'];
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
    // ONE top-band plate: F-key chip on the left, Critical HP numeral on the
    // right, flexed apart. §17 wants a persistent >=20 px numeral AND the
    // character art untouched; the top band is the tile's reserved chrome
    // strip (portraits.js frames the bust to keep it empty), so the numeral
    // lands there instead of over the face.
    const top = el('div', 'hud-port-top', tile);
    const key = el('span', 'hud-port-key proto-port-key', top);
    // "F" + ordinal. The "F" stands down while Critical so the HP numeral fits
    // the same band (see style.js) — the ordinal still names the F-row key.
    el('i', null, key).textContent = 'F';
    key.append(String(i + 1));
    const num = el('span', 'hud-port-num', top);

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

    // Critical value-pulse LUT: the FILL brightens from its class-accent
    // highlight toward Parchment, so its luma stays far above the charcoal
    // track at every phase k (see paintCritical + the POLARITY FENCE note in
    // style.js). 21 steps is finer than a 2 Hz pulse can be read.
    const critFill = [];
    for (let q = 0; q <= 20; q++) critFill.push(mix(acc.lift, PALETTE.parchment, 0.6 * (q / 20)));

    ports.push({
      i,
      classId,
      critFill,
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
      state: 'healthy',
      lastK: -1,
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
      denyNudge(dodge, ev.reason);
      return;
    }
    const m = /^skill_([1-4])$/.exec(kind);
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
          p.lastK = -1;
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
        // Frame + track-outline value pulse; the character art is never
        // touched, and the track INTERIOR stays Void Charcoal so the bar can
        // never invert its reading at the bone end of the pulse (round-2
        // defect: at 15% HP the empty 85% was 1.6x brighter than the fill).
        const c = CHAR.map((v, i) => Math.round(v + (BONE[i] - v) * k));
        const col = `rgb(${c[0]},${c[1]},${c[2]})`;
        p.inner.style.borderWidth = `${(1 + 2 * k).toFixed(2)}px`;
        p.inner.style.borderColor = col;
        p.hp.style.outlineColor = col;
        const q = Math.round(k * 20);
        if (q !== p.lastK) {
          p.lastK = q;
          p.fill.style.background = p.critFill[q];
        }
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
            reviveTotal: RING_C,
            hasImage: !!p.img,
          };
        }),
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
          cooling: s.cooling,
          keyBox: rect(s.slot.querySelector('.hud-slot-key')),
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
