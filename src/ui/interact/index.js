// Interaction prompts (M4b, BUILD_BRIEF §23.7, docs/gauntlet/PLAN.md §4.6):
// the `ix-` plate "E · <verb>" that hangs over an interactive asset while the
// Healer is within reach (surface distance <= 1.1 u — the sim's own rule,
// sim/interactables.js), in the camp portal prompt's grammar (Void Charcoal
// plate, Parchment ink, Hearth Amber key cap). States carry their own GLYPH,
// never colour alone:
//   ready     [E] · Drink / Ring / Pull
//   used      ✕ Dry / Rung          (single-use, spent this room)
//   cooldown  ◷ Closed · 9 s / ◷ Resets · 18 s   (the Sluice clock)
// Hidden when a Downed ally within 0.6 u (or a live revive channel) owns KeyE,
// on every run page (draft / path / shop / end cards) and outside live play.
// Read-only DOM over sim state; z-index 40-49 (PLAN §2.3 band for M4b).
import { Vector3 } from 'three';
import { PALETTE } from '../../data/palette.js';
import { TICK_HZ } from '../../core/constants.js';
import { t } from '../../i18n/index.js';
import { cap, onHintsChange } from '../../app/controls.js';

const REACH = 1.1;
const REVIVE_RANGE = 0.6;

const CSS = `
  .ix-prompt {
    position: fixed; left: 0; top: 0; z-index: 42; pointer-events: none;
    display: none; align-items: center; gap: 10px;
    padding: 7px 14px 7px 8px; border-radius: 11px;
    background: ${PALETTE.voidCharcoal}F0;
    border: 2px solid ${PALETTE.hearthAmber}A0;
    box-shadow: 0 0 18px ${PALETTE.hearthAmber}2A, inset 0 0 0 1px ${PALETTE.bone}22;
    font-family: system-ui, -apple-system, 'Segoe UI', var(--i18n-font, sans-serif);
    color: ${PALETTE.parchment}; font-size: 18px; letter-spacing: 0.05em; font-weight: 600;
    transform-origin: bottom center; user-select: none; white-space: nowrap;
  }
  .ix-prompt.ix-on { display: flex; }
  .ix-prompt .ix-key {
    display: inline-flex; align-items: center; justify-content: center;
    min-width: 28px; height: 28px; padding: 0 6px; border-radius: 7px;
    border: 2px solid ${PALETTE.warmGrey}; background: #2c2822;
    font-size: 18px; font-weight: 800; color: ${PALETTE.hearthAmber};
  }
  .ix-prompt .ix-glyph { font-size: 18px; color: ${PALETTE.bone}; min-width: 20px; text-align: center; }
  .ix-prompt.ix-spent { border-color: ${PALETTE.warmGrey}AA; box-shadow: none; color: ${PALETTE.bone}; }
  .ix-prompt.ix-spent .ix-key { color: ${PALETTE.warmGrey}; border-color: ${PALETTE.warmGrey}88; }
  .ix-prompt .ix-sep { opacity: 0.7; }
`;

export function createInteractPrompts({ stage, world, runUi = null }) {
  const style = document.createElement('style');
  style.id = 'ix-style';
  style.textContent = CSS;
  document.head.appendChild(style);
  const el = document.createElement('div');
  el.className = 'ix-prompt';
  el.setAttribute('role', 'status');
  el.innerHTML = '<span class="ix-key">E</span><span class="ix-glyph" style="display:none"></span><span class="ix-lab"></span>';
  document.body.appendChild(el);
  const keyEl = el.querySelector('.ix-key');
  // Controls slice: the cap names the interact key, or A on a gamepad.
  const paintKey = () => {
    keyEl.textContent = cap('interact');
  };
  paintKey();
  onHintsChange(paintKey);
  const glyphEl = el.querySelector('.ix-glyph');
  const labEl = el.querySelector('.ix-lab');
  const pv = new Vector3();
  let current = null; // { id, state, text }
  let lastText = '';

  function availability(e, tick) {
    if (e.uses !== null && e.uses !== undefined && e.uses <= 0) return 'used';
    if (tick < (e.cooldownUntilTick ?? 0)) return 'cooldown';
    return 'ready';
  }

  function pick() {
    // @gnt:M5b LOCAL-SEAT begin — in network play the prompt belongs to THIS
    // page's seat (a guest's Tank / Swordsman / Archer), whose E presses the
    // host resolves with the same reach rule; single-player: the Healer.
    const nv = world.netView;
    const p = (nv && typeof nv.followTarget === 'function' && nv.followTarget()) || world.player;
    // @gnt:M5b LOCAL-SEAT end
    if (!p || !(p.hp > 0) || p.reviveTargetId != null) return null;
    const run = world.runSystem ? world.runSystem() : null;
    if (run && run.isActive() && run.view().phase !== 'combat') return null;
    if (runUi && typeof runUi.isOpen === 'function' && runUi.isOpen()) return null;
    let best = null;
    let bestD = Infinity;
    let downed = false;
    for (const e of world.entities()) {
      if (e.partyIndex !== undefined && e.id !== p.id && !(e.hp > 0) && Math.hypot(e.x - p.x, e.z - p.z) <= REVIVE_RANGE) downed = true;
      if (e.interactable !== true) continue;
      const d = Math.hypot(e.x - p.x, e.z - p.z) - (e.radius ?? 0);
      if (d <= (e.interactRadius ?? REACH) && d < bestD) {
        bestD = d;
        best = e;
      }
    }
    if (downed) return null;
    return best;
  }

  function place(e) {
    pv.set(e.x, e.itype === 'bell' ? 1.55 : 1.25, e.z).project(stage.camera);
    const x = (pv.x + 1) * 0.5 * window.innerWidth;
    const y = (1 - pv.y) * 0.5 * window.innerHeight;
    const s = Math.min(1.5, Math.max(0.78, Math.min(window.innerWidth / 1920, window.innerHeight / 1080) * 1.3));
    const cx = Math.max(90 * s, Math.min(window.innerWidth - 90 * s, x));
    const cy = Math.max(60 * s, Math.min(window.innerHeight * 0.8, y));
    el.style.transform = `translate(${Math.round(cx)}px, ${Math.round(cy)}px) translate(-50%, -100%) scale(${s.toFixed(3)})`;
  }

  function update() {
    const e = pick();
    if (!e) {
      if (current) {
        el.classList.remove('ix-on');
        current = null;
      }
      return;
    }
    const tick = world.tick;
    const st = availability(e, tick);
    let text;
    let glyph = '';
    if (st === 'ready') text = `<span class="ix-sep">·</span> ${t(e.verb ?? 'Use')}`;
    else if (st === 'used') {
      glyph = '✕';
      text = t(e.spentLabel ?? 'Spent');
    } else {
      glyph = '◷';
      const closed = tick < (e.activeUntilTick ?? 0);
      const left = closed ? e.activeUntilTick - tick : e.cooldownUntilTick - tick;
      const secs = Math.ceil(left / TICK_HZ);
      text = closed ? t('Closed · {secs} s', { secs }) : t('Resets · {secs} s', { secs });
    }
    const key = `${e.id}|${st}|${text}`;
    if (key !== lastText) {
      lastText = key;
      labEl.innerHTML = text;
      glyphEl.textContent = glyph;
      glyphEl.style.display = glyph ? '' : 'none';
      keyEl.style.display = st === 'ready' ? '' : 'none';
      el.classList.toggle('ix-spent', st !== 'ready');
      el.dataset.state = st;
      el.dataset.itype = e.itype;
    }
    el.classList.add('ix-on');
    place(e);
    current = { id: e.id, state: st, itype: e.itype };
  }

  function debug() {
    const r = el.getBoundingClientRect();
    return {
      visible: el.classList.contains('ix-on'),
      target: current ? { ...current } : null,
      text: el.classList.contains('ix-on') ? el.textContent.replace(/\s+/g, ' ').trim() : null,
      box: { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) },
    };
  }

  return { update, debug, el };
}
