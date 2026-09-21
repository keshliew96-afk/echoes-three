// Join by code (docs/gauntlet/PLAN.md §1.3 'mp-join'). Owner: M5b.
// A dialog with the 5-character room code (letters A–Z without I and O,
// digits 2–9 — typed case-insensitively, spaces and dashes ignored). Enter
// joins; every rejection reason is spelled out (not found, full, started
// without drop-in, version mismatch); success replaces this dialog with the
// lobby. Esc / B / Back returns to the multiplayer menu.
import { service } from '../../app/registry.js';
import { createHints } from './hints.js';
import { installMpStyle, mkBtn } from './mpmenu.js';
import { normalizeCode } from '../../net/protocol/messages.js';

export function createJoinScreen(ctx) {
  installMpStyle();
  const { app, manager } = ctx;
  const el = document.createElement('div');
  el.className = 'ap-dialog nt-join';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', 'Join by code');
  el.innerHTML = `
    <div class="ap-veil"></div>
    <div class="ap-dlg ap-plate">
      <div class="ap-dlg-title">Join a game</div>
      <div class="ap-dlg-body">Type the room code the host sees in their lobby.</div>
      <input type="text" id="nt-join-code" class="nt-input nt-codein" maxlength="9" autocomplete="off" spellcheck="false" placeholder="ABCDE" data-nav data-nav-default />
      <div class="nt-err" aria-live="polite"></div>
      <div class="ap-dlg-btns"></div>
    </div>`;
  const input = el.querySelector('input');
  const err = el.querySelector('.nt-err');
  const btns = el.querySelector('.ap-dlg-btns');
  let busy = false;
  function setErr(t, bad = true) {
    err.textContent = t || '';
    err.classList.toggle('nt-bad', !!t && bad);
  }
  async function join() {
    if (busy) return;
    const code = normalizeCode(input.value);
    if (!code) {
      setErr('Room codes are 5 letters or digits (no 0, O, 1 or I).');
      return;
    }
    const n = service('net');
    if (!n) return;
    busy = true;
    joinBtn.disabled = true;
    setErr(`Joining ${code}…`, false);
    try {
      const r = await n.join(code);
      if (!r || !r.ok) {
        const why =
          r && r.reason === 'unreachable'
            ? 'The server can’t be reached right now — go Back and Retry.'
            : r && r.text
              ? r.text
              : `Couldn’t join ${code} (${(r && r.reason) || 'no answer'}).`;
        setErr(why);
        return;
      }
      setErr('');
      manager.replace('lobby', { via: 'join' });
    } finally {
      busy = false;
      joinBtn.disabled = false;
    }
  }
  const joinBtn = mkBtn('Join', 'nt-join-ok', { cls: 'ap-primary', onPress: join });
  const back = mkBtn('Back', 'nt-join-back', { onPress: () => manager.pop() });
  btns.append(joinBtn, back);
  const hints = createHints(app, [
    ['confirm', 'Join'],
    ['back', 'Back'],
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
