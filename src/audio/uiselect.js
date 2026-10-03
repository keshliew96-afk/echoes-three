// Selection sounds for the game's own build pages (docs/gauntlet/PLAN.md
// §3.5 "app nav (move / confirm / back / tab) -> UI bus"; fix-M3-r5 AUD5-F1).
// Owner: M3.
//
// The app screens (title, pause, settings, level select, …) announce every
// navigation step through the screen manager's `nav` app event, which the
// audio engine turns into UI-bus ticks. The run's build pages — the reward /
// swap / party page, the door picker, the shop shelf — and the socket screen
// are NOT app screens: they read keys, the pad and the pointer themselves, so
// moving their selection used to be silent while the same keys ticked in the
// pause menu over the same page. This helper gives them the same voice
// without teaching the audio engine about their DOM:
//
//   const sel = createSelectionSound('run');
//   sel.input(source, commit)   // every player input on the page (keyboard /
//                               // mouse / gamepad); commit = a key that
//                               // commits (Enter, X, …): its own cue plays
//   sel.poll(pageName, sig)     // once per frame: a cheap selection signature
//                               // '<tab>|<rest>' (null = nothing selectable)
//   sel.hover(pageName)         // the pointer entered a new interactive item
//
// A signature change on the SAME page that follows a player input within
// SELECT_TICK.inputWindowMs emits the app `nav` event a menu move does:
// 'tabNext' (-> ui_tab) when the <tab> part changed (another character),
// 'down' (-> ui_move) otherwise. A page opening, a page closing, a change no
// input caused (a replicated pick, a re-render) and a change caused by a
// commit key never tick. Two ticks never land closer than
// SELECT_TICK.minGapMs (a hover that also moves the selection plays once).
import { appEvents } from '../app/events.js';

export const SELECT_TICK = Object.freeze({
  inputWindowMs: 400, // a selection change this soon after a player input is that input's
  minGapMs: 70, // one tick per gesture (hover + the selection it moves; a gliding held key)
});

export function createSelectionSound(scope = 'run', { now = () => performance.now(), emit = (p) => appEvents.emit('nav', p) } = {}) {
  let inputAt = -Infinity;
  let inputSrc = 'keyboard';
  let inputCommit = false;
  let page = null; // the page the last signature belongs to
  let last = null; // its last signature
  let lastTickAt = -Infinity;
  const stats = { ticks: 0, tabs: 0, hovers: 0, skippedNoInput: 0, skippedCommit: 0, skippedGap: 0 };

  function tick(action, source, where, extra = null) {
    const t = now();
    if (t - lastTickAt < SELECT_TICK.minGapMs) {
      stats.skippedGap += 1;
      return false;
    }
    lastTickAt = t;
    stats.ticks += 1;
    emit({ action, source, screen: `${scope}:${where}`, repeat: false, ...(extra || {}) });
    return true;
  }

  function input(source = 'keyboard', commit = false) {
    inputAt = now();
    inputSrc = source;
    inputCommit = !!commit;
  }

  function poll(where, sig) {
    const s = sig === undefined ? null : sig;
    if (where !== page) {
      page = where;
      last = s;
      return false;
    }
    if (s === last) return false;
    const prev = last;
    last = s;
    if (s === null || prev === null) return false; // opened / emptied: not a move
    if (now() - inputAt > SELECT_TICK.inputWindowMs) {
      stats.skippedNoInput += 1;
      return false;
    }
    if (inputCommit) {
      stats.skippedCommit += 1;
      return false;
    }
    const tab = String(prev).split('|')[0] !== String(s).split('|')[0];
    if (tab) stats.tabs += 1;
    return tick(tab ? 'tabNext' : 'down', inputSrc, where);
  }

  function hover(where) {
    const ok = tick('down', 'mouse', where, { hover: true });
    if (ok) stats.hovers += 1;
    return ok;
  }

  return {
    input,
    poll,
    hover,
    debug: () => ({ page, sig: last, sinceInputMs: Number.isFinite(inputAt) ? Math.round(now() - inputAt) : null, source: inputSrc, commit: inputCommit, ...stats }),
  };
}
