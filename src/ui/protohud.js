// Proto command bar for the graybox controller block: dodge + basic-attack
// slots bottom-center, wearing the §17 HUD grammar (charcoal plates, parchment
// ink, one cooldown language) so the denial nudges are VISIBLE now:
//   on_cooldown          -> wipe nudge on the dodge slot
//   priority_suppressed  -> ready-icon skip-pulse on the basic slot
// Nudges are ~180 ms, icon-level only, restart on repeat, never alarms (§17).
// The full Zone-1 command bar (portraits, 4 skill slots, virtual-1080p scaler)
// replaces this in the HUD block.
import { PALETTE } from '../data/palette.js';
import { DODGE } from '../core/constants.js';

export function createProtoHud(bus, { dodgeRemaining }) {
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
    .proto-wipe {
      position: absolute;
      inset: 0;
      border-radius: 8px;
    }
    @keyframes proto-skip-pulse {
      0% { transform: scale(1); }
      40% { transform: scale(1.15); }
      100% { transform: scale(1); }
    }
    .proto-nudge {
      animation: proto-skip-pulse 0.18s ease-out;
      border-color: ${PALETTE.parchment};
    }
  `;
  document.head.appendChild(style);

  const rootEl = document.createElement('div');
  rootEl.id = 'proto-hud';

  function makeSlot(label) {
    const slot = document.createElement('div');
    slot.className = 'proto-slot';
    const glyph = document.createElement('span');
    glyph.textContent = label;
    slot.appendChild(glyph);
    const wipe = document.createElement('div');
    wipe.className = 'proto-wipe';
    slot.appendChild(wipe);
    rootEl.appendChild(slot);
    return { slot, wipe };
  }

  const dodge = makeSlot('SPC');
  const basic = makeSlot('RMB');
  document.body.appendChild(rootEl);

  // Icon-level nudge, restart on repeat (remove -> reflow -> re-add).
  function nudge(el) {
    el.classList.remove('proto-nudge');
    void el.offsetWidth;
    el.classList.add('proto-nudge');
  }

  bus.on('intent_denied', (ev) => {
    if (ev.kind === 'basic_attack' && ev.reason === 'priority_suppressed') nudge(basic.slot);
    else if (ev.kind === 'dodge' && ev.reason === 'on_cooldown') nudge(dodge.slot);
  });

  // §17 cooldown grammar: clockwise radial wipe from 12 o'clock, 70% charcoal
  // overlay, shrinking as the cooldown recovers.
  let lastDeg = -1;
  function update() {
    const frac = Math.min(1, Math.max(0, dodgeRemaining() / DODGE.cooldownTicks));
    const deg = Math.round(frac * 360);
    if (deg === lastDeg) return;
    lastDeg = deg;
    dodge.wipe.style.background =
      deg > 0 ? `conic-gradient(${PALETTE.voidCharcoal}B3 ${deg}deg, transparent 0deg)` : 'none';
  }

  return { update };
}
