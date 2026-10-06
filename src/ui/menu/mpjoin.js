// Join by code (docs/gauntlet/PLAN.md §1.3 'mp-join'). Owner: M5b.
// A dialog with the 5-character room code (letters A–Z without I and O,
// digits 2–9 — typed case-insensitively, spaces and dashes ignored). Enter
// joins; every rejection reason is spelled out (not found, full, started
// without drop-in, version mismatch); success replaces this dialog with the
// lobby — unless the room is already playing (drop-in, PLAN G5b.1): then the
// lobby client is a guest at once, the session has taken this player into
// the game (src/net/session.js sync -> enterPlaying, which clears the screen
// stack) and no lobby is opened. Esc / B / Back returns to the multiplayer
// menu.
import { service } from '../../app/registry.js';
import { createHints } from './hints.js';
import { installMpStyle, mkBtn } from './mpmenu.js';
import { normalizeCode } from '../../net/protocol/messages.js';
import { SEAT_LABELS } from '../../net/seats.js';
import { t } from '../../i18n/index.js';

export function createJoinScreen(ctx) {
  installMpStyle();
  const { app, manager } = ctx;
  const el = document.createElement('div');
  el.className = 'ap-dialog nt-join';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', t('Join by code'));
  el.innerHTML = `
    <div class="ap-veil"></div>
    <div class="ap-dlg ap-plate">
      <div class="ap-dlg-title">${t('Join a game')}</div>
      <div class="ap-dlg-body">${t('Type the room code the host sees in their lobby.')}</div>
      <input type="text" id="nt-join-code" class="nt-input nt-codein" maxlength="9" autocomplete="off" spellcheck="false" placeholder="ABCDE" data-nav data-nav-default />
      <div class="nt-err" aria-live="polite"></div>
      <div class="ap-dlg-btns"></div>
    </div>`;
  const input = el.querySelector('input');
  const err = el.querySelector('.nt-err');
  const btns = el.querySelector('.ap-dlg-btns');
  let busy = false;
  function setErr(text, bad = true) {
    err.textContent = text || '';
    err.classList.toggle('nt-bad', !!text && bad);
  }
  async function join() {
    if (busy) return;
    const code = normalizeCode(input.value);
    if (!code) {
      setErr(t('Room codes are 5 letters or digits (no 0, O, 1 or I).'));
      return;
    }
    const n = service('net');
    if (!n) return;
    busy = true;
    joinBtn.disabled = true;
    setErr(t('Joining {code}…', { code }), false);
    try {
      const r = await n.join(code);
      if (!r || !r.ok) {
        // DEPLOY (PLAN §14.5): this page is older than the room / server —
        // back to the Multiplayer menu, which offers Reload in place.
        if (r && (r.update || r.reason === 'update_available') && manager.top() === 'mp-join') {
          manager.pop();
          return;
        }
        const why =
          r && r.reason === 'unreachable'
            ? t('The server can’t be reached right now — go Back and Retry.')
            : r && r.text
              ? t(r.text)
              : t('Couldn’t join {code} ({reason}).', { code, reason: (r && r.reason) || t('no answer') });
        setErr(why);
        return;
      }
      setErr('');
      // Drop-in into a running room (gauntlet r1, J4): the server seated us
      // in an `in_game` room and the lobby client went straight to 'guest';
      // the session already entered play. A lobby pushed now would sit on top
      // of the running game with a Ready the server refuses — a dead end.
      const running = !!(r.room && r.room.state && r.room.state !== 'lobby') || (typeof n.inSession === 'function' && n.inSession());
      if (running) {
        if (app.state === 'playing') manager.clear();
        else if (manager.top() === 'mp-join') manager.pop();
        const seatName = SEAT_LABELS[r.seat];
        app.toast(
          seatName
            ? t('Joined {code} — the game is under way. You play the {cls}.', { code, cls: t(seatName) })
            : t('Joined {code} — the game is under way. You play the ally.', { code }),
          { tone: 'good', ms: 4200 }
        );
        return;
      }
      manager.replace('lobby', { via: 'join' });
    } finally {
      busy = false;
      joinBtn.disabled = false;
    }
  }
  const joinBtn = mkBtn(t('Join'), 'nt-join-ok', { cls: 'ap-primary', onPress: join });
  const back = mkBtn(t('Back'), 'nt-join-back', { onPress: () => manager.pop() });
  btns.append(joinBtn, back);
  const hints = createHints(app, [
    ['confirm', t('Join')],
    ['back', t('Back')],
  ]);
  hints.el.style.justifyContent = 'flex-end';
  el.querySelector('.ap-dlg').appendChild(hints.el);
  input.addEventListener('click', () => input.focus({ preventScroll: true }));
  input.addEventListener('input', () => {
    const v = input.value.toUpperCase();
    if (v !== input.value) input.value = v;
    if (err.classList.contains('nt-bad')) setErr('');
  });
  return {
    el,
    blocking: true,
    layer: 'dialog',
    reusable: false,
    onOpen() {
      input.value = '';
      setErr('');
      setTimeout(() => {
        try {
          input.focus({ preventScroll: true });
        } catch {
          /* detached */
        }
      }, 0);
    },
    onNav(action) {
      if (action === 'confirm' && document.activeElement === input) {
        join();
        return true;
      }
      return false;
    },
  };
}
