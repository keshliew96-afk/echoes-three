// Proto command bar: 4 SKILL SLOTS (skills block) + dodge + basic-attack
// slots bottom-center, wearing the §17 HUD grammar (charcoal plates, parchment
// ink, ONE cooldown language) so the whole §4/§6 denial + cooldown surface is
// visible before the full Zone-1 command bar block lands:
//   - skill slots in slot order (keys 1-4 = execution order), each with the
//     clockwise radial wipe from 12 o'clock (70% charcoal), a ≥20 px Parchment
//     numeral when <1.0 s remains, and a 120 ms ready-pop
//   - passive skill slot (Warding Aura) = static glyph, NO wipe ever (§7/§17)
//   - empty slot = dim hollow frame
//   - denial nudges (~180 ms, icon-level, restart on repeat, never alarms):
//       on_cooldown         -> wipe nudge (wipe flashes brighter)
//       empty_slot          -> frame blink
//       priority_suppressed -> ready-icon skip-pulse
// The full Zone-1 command bar (portraits, virtual-1080p scaler) replaces this
// in the HUD block.
import { PALETTE } from '../data/palette.js';
import { DODGE, TICK_HZ } from '../core/constants.js';

export function createProtoHud(bus, { dodgeRemaining, skillSlots = null }) {
  const style = document.createElement('style');
  style.textContent = `
    #proto-hud {
      position: fixed;
      left: 50%;
      bottom: 14px;
      transform: translateX(-50%);
      display: flex;
      gap: 10px;
      z-index: 10;
      pointer-events: none;
      user-select: none;
      font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
    }
    .proto-slot {
      position: relative;
      width: 52px;
      height: 52px;
      border-radius: 10px;
      background: ${PALETTE.voidCharcoal}E6;
      border: 2px solid ${PALETTE.warmGrey}66;
      color: ${PALETTE.parchment};
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      font-weight: 600;
      letter-spacing: 0.02em;
      overflow: hidden;
    }
    .proto-slot.proto-empty { opacity: 0.45; }
    .proto-slot.proto-empty .proto-glyph { opacity: 0.4; }
    .proto-key {
      position: absolute;
      top: 2px;
      left: 5px;
      font-size: 10px;
      font-weight: 700;
      color: ${PALETTE.warmGrey};
    }
    .proto-wipe {
      position: absolute;
      inset: 0;
      border-radius: 8px;
    }
    .proto-cd-num {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px; /* §17: numeral floor 20 px */
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      color: ${PALETTE.parchment};
      visibility: hidden;
    }
    .proto-divider { width: 6px; }
    @keyframes proto-skip-pulse {
      0% { transform: scale(1); }
      40% { transform: scale(1.15); }
      100% { transform: scale(1); }
    }
    .proto-nudge {
      animation: proto-skip-pulse 0.18s ease-out;
      border-color: ${PALETTE.parchment};
    }
    @keyframes proto-frame-blink {
      0%, 100% { border-color: ${PALETTE.warmGrey}66; }
      50% { border-color: ${PALETTE.parchment}; }
    }
    .proto-blink { animation: proto-frame-blink 0.18s ease-out; }
    @keyframes proto-wipe-nudge {
      0%, 100% { background-color: transparent; }
      50% { background-color: ${PALETTE.parchment}33; }
    }
    .proto-wipe-nudge { animation: proto-wipe-nudge 0.18s ease-out; }
    @keyframes proto-ready-pop {
      0% { transform: scale(1); background: ${PALETTE.voidCharcoal}E6; }
      45% { transform: scale(1.15); background: ${PALETTE.warmGrey}CC; }
      100% { transform: scale(1); background: ${PALETTE.voidCharcoal}E6; }
    }
    .proto-ready { animation: proto-ready-pop 0.12s ease-out; }
  `;
  document.head.appendChild(style);

  const rootEl = document.createElement('div');
  rootEl.id = 'proto-hud';

  function makeSlot(label, key = null) {
    const slot = document.createElement('div');
    slot.className = 'proto-slot';
    if (key) {
      const k = document.createElement('span');
      k.className = 'proto-key';
      k.textContent = key;
      slot.appendChild(k);
    }
    const glyph = document.createElement('span');
    glyph.className = 'proto-glyph';
    glyph.textContent = label;
    slot.appendChild(glyph);
    const wipe = document.createElement('div');
    wipe.className = 'proto-wipe';
    slot.appendChild(wipe);
    const num = document.createElement('span');
    num.className = 'proto-cd-num';
    slot.appendChild(num);
    rootEl.appendChild(slot);
    return { slot, glyph, wipe, num, lastDeg: -1, wasReady: true };
  }

  // 4 skill slots (execution order), a divider, then dodge + basic.
  const skillEls = [];
  for (let i = 0; i < 4; i++) skillEls.push(makeSlot('·', String(i + 1)));
  const divider = document.createElement('div');
  divider.className = 'proto-divider';
  rootEl.appendChild(divider);
  const dodge = makeSlot('SPC');
  const basic = makeSlot('RMB');
  document.body.appendChild(rootEl);

  // Icon-level nudge, restart on repeat (remove -> reflow -> re-add).
  function nudge(el, cls = 'proto-nudge') {
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
  }

  bus.on('intent_denied', (ev) => {
    if (ev.kind === 'basic_attack' && ev.reason === 'priority_suppressed') nudge(basic.slot);
    else if (ev.kind === 'dodge' && ev.reason === 'on_cooldown') nudge(dodge.slot);
    else if (/^skill_[1-4]$/.test(ev.kind ?? '')) {
      const el = skillEls[parseInt(ev.kind.slice(6), 10) - 1];
      if (!el) return;
      if (ev.reason === 'on_cooldown') nudge(el.wipe, 'proto-wipe-nudge');
      else if (ev.reason === 'empty_slot') nudge(el.slot, 'proto-blink');
      else if (ev.reason === 'priority_suppressed') nudge(el.slot);
    }
  });

  // §17 cooldown grammar: clockwise radial wipe from 12 o'clock, 70% charcoal
  // overlay, shrinking as the cooldown recovers.
  function paintWipe(el, frac) {
    const deg = Math.round(Math.min(1, Math.max(0, frac)) * 360);
    if (deg === el.lastDeg) return deg;
    el.lastDeg = deg;
    el.wipe.style.background =
      deg > 0 ? `conic-gradient(${PALETTE.voidCharcoal}B3 ${deg}deg, transparent 0deg)` : 'none';
    return deg;
  }

  function update() {
    paintWipe(dodge, dodgeRemaining() / DODGE.cooldownTicks);

    if (!skillSlots) return;
    const view = skillSlots();
    for (let i = 0; i < 4; i++) {
      const el = skillEls[i];
      const s = view[i];
      if (!s) {
        // Empty slot: dim hollow frame (§17).
        el.slot.classList.add('proto-empty');
        el.glyph.textContent = '·';
        paintWipe(el, 0);
        el.num.style.visibility = 'hidden';
        el.wasReady = true;
        continue;
      }
      el.slot.classList.remove('proto-empty');
      if (s.passive) {
        // Passive (Warding Aura): static glyph, never a cooldown wipe (§7/§17).
        el.glyph.textContent = `◈${s.abbrev}`;
        paintWipe(el, 0);
        el.num.style.visibility = 'hidden';
        continue;
      }
      el.glyph.textContent = s.abbrev;
      const remaining = s.remainingTicks;
      paintWipe(el, s.totalTicks > 0 ? remaining / s.totalTicks : 0);
      // <1.0 s remaining -> ≥20 px Parchment numeral (§17).
      if (remaining > 0 && remaining < TICK_HZ) {
        el.num.textContent = (remaining / TICK_HZ).toFixed(1);
        el.num.style.visibility = 'visible';
      } else {
        el.num.style.visibility = 'hidden';
      }
      // Ready-pop: 120 ms scale + plate flash when the wipe completes (§17).
      const ready = remaining === 0;
      if (ready && !el.wasReady) nudge(el.slot, 'proto-ready');
      el.wasReady = ready;
    }
  }

  return { update };
}
