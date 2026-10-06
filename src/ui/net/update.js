// "A new version of Echoes is available — Reload" (docs/gauntlet/PLAN.md
// §14.5, owner DEPLOY).
//
// A redeploy never strands a player. The net client (lobbyClient.js) learns
// that a newer build exists from the session server's `latestBuild` (a
// `--static` server serves the game), the site's own version.json (a game on
// a CDN), a room whose host runs a newer build, or a server on a newer
// protocol — and emits 'update_available'. The Multiplayer menu shows the
// choice in place (its update panel); everywhere else — typically the title
// after the server restarted under a session — one dialog offers Reload /
// Not now. A single-player run in progress is never interrupted: the dialog
// waits for the title.
import { forgetStoredSessions } from '../../net/tabsession.js';
import { t } from '../../i18n/index.js';

export function updateCopy(u) {
  const mine = u && u.mine ? `v${u.mine}` : null;
  const latest = u && u.latest && u.latest !== u.mine ? `v${u.latest}` : null;
  const v = { mine, latest };
  return {
    title: t('A new version of Echoes is available'),
    body:
      mine && latest
        ? u && u.via === 'room'
          ? t('This page is {mine}; the host runs {latest}. Reload to update — your settings, saves and records stay in this browser.', v)
          : u && u.via === 'site'
            ? t('This page is {mine}; this site now serves {latest}. Reload to update — your settings, saves and records stay in this browser.', v)
            : t('This page is {mine}; the server now runs {latest}. Reload to update — your settings, saves and records stay in this browser.', v)
        : t('This page is older than the game on the server. Reload to update — your settings, saves and records stay in this browser.'),
  };
}

// Reload onto the new build. The stored net session belongs to the old build
// (its room, if any, is gone after a restart) — drop it so the new page does
// not offer a Rejoin into a room of another version.
export function reloadForUpdate() {
  try {
    forgetStoredSessions(window.localStorage); // every tab's record + the pre-v0.5.135 single one
  } catch {
    /* storage blocked — nothing stored either */
  }
  try {
    window.location.reload();
  } catch {
    /* detached */
  }
}

// Screens that show the update in place (mp-join hands back to mp-menu).
const IN_PLACE = new Set(['mp-menu', 'mp-join']);

export function installUpdatePrompt({ app, net }) {
  if (!app || !net || typeof net.on !== 'function') return () => {};
  let offered = null;
  let pending = null;
  let open = false;
  const keyOf = (u) => `${u.latest || ''}|${u.serverProtocol || ''}`;
  function tryOffer() {
    const u = pending;
    if (!u || open) return;
    if (offered === keyOf(u)) {
      pending = null;
      return;
    }
    const top = app.screens.top();
    if (IN_PLACE.has(top)) return; // the Multiplayer menu shows it itself; offer again if the player leaves it without reloading
    if (app.state === 'boot' || app.state === 'farewell') return;
    // Never over a single-player run in progress (or a session still
    // ending): wait until the title comes up.
    if (app.state === 'playing') return;
    offered = keyOf(u);
    pending = null;
    open = true;
    const c = updateCopy(u);
    app
      .confirm({ title: c.title, body: c.body, confirmLabel: t('Reload'), cancelLabel: t('Not now'), defaultFocus: 'confirm' })
      .then((yes) => {
        open = false;
        if (yes) reloadForUpdate();
      })
      .catch(() => {
        open = false;
      });
  }
  const offs = [];
  offs.push(
    net.on('update_available', (u) => {
      pending = u;
      // After the listener stack unwinds (a session loss ends the session
      // and quits to the title in the same turn).
      setTimeout(tryOffer, 0);
    })
  );
  if (app.events && typeof app.events.on === 'function') {
    const off = app.events.on('app_state', () => setTimeout(tryOffer, 450));
    if (typeof off === 'function') offs.push(off);
    const off2 = app.events.on('overlay', () => setTimeout(tryOffer, 50));
    if (typeof off2 === 'function') offs.push(off2);
  }
  return () => offs.forEach((f) => f && f());
}
