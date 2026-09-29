// Settings ▸ Gameplay ▸ Ally builds + Socket my new nodes (BUILD_BRIEF §25.6,
// PLAN §16.4). Owner: PARTY. Registers the two keys and contributes two rows
// to M1's Gameplay tab through registerSettingsRow (M1's file is not edited).
//
// What each measurably changes (PLAN §5 platform honesty):
//   gameplay.allyBuilds  suggest | manual | auto — how AI-held characters'
//     reward cards, shop shelves and benches are decided: Suggested opens
//     their cards pre-decided (one Enter still commits) and auto-fills their
//     benches, pre-marks their shop buys; Manual decides nothing for them
//     (Enter walks all four cards; benches stay as they are); Automatic
//     decides everything and shows a one-line summary. Reaches the sim as
//     cmd('partyMode', mode) and applies from the next page (the run system
//     reads it when a page / shelf opens).
//   gameplay.autoSocketOwn  Off (default — the Healer's §16 rule) | On — your
//     OWN character's bench is auto-filled at every page commit.
// `?party=` overrides the mode for one boot without saving it.
import { registerSettingsRow, service } from '../../app/registry.js';
import { V } from '../../app/settings.js';

export const ALLY_BUILDS_KEY = 'gameplay.allyBuilds';
export const AUTO_SOCKET_OWN_KEY = 'gameplay.autoSocketOwn';
const MODES = ['suggest', 'manual', 'auto'];
const LABEL = { suggest: 'Suggested', manual: 'Manual', auto: 'Automatic' };
const NOTE = {
  suggest: 'AI-held allies arrive pre-picked — one Enter commits the page; you can change any card',
  manual: 'You decide every ally card, shelf and bench yourself',
  auto: 'AI-held allies build themselves — a one-line summary on each page',
};

// Push the stored values into the sim (and again whenever they change).
export function registerPartySettings(settings, { world, params = null } = {}) {
  if (settings && typeof settings.register === 'function') {
    settings.register(ALLY_BUILDS_KEY, { default: 'suggest', validate: V.oneOf(MODES) });
    settings.register(AUTO_SOCKET_OWN_KEY, { default: false, validate: V.bool() });
  }
  const override = params && params.party ? params.party : null;
  const ownSeat = () => {
    const n = service('net');
    try {
      if (n && typeof n.isGuest === 'function' && n.isGuest()) return Number.isInteger(n.seat) ? n.seat : 0;
    } catch {
      /* none */
    }
    return 0;
  };
  function apply() {
    const P = world && typeof world.partySystem === 'function' ? world.partySystem() : null;
    if (!P || (world.replica === true)) return;
    const mode = override ?? settings.get(ALLY_BUILDS_KEY) ?? 'suggest';
    if (P.mode() !== mode) P.setMode(mode);
    P.setAutoSocketOwn(ownSeat(), !!settings.get(AUTO_SOCKET_OWN_KEY));
  }
  apply();
  if (settings && typeof settings.subscribe === 'function') {
    settings.subscribe(ALLY_BUILDS_KEY, apply);
    settings.subscribe(AUTO_SOCKET_OWN_KEY, apply);
  }
  registerSettingsRow('gameplay', {
    id: 'allyBuilds',
    order: 40,
    build(ctx) {
      const { widgets } = ctx;
      const store = ctx.settings;
      const w = widgets.select({
        id: 'pt-gameplay-allyBuilds',
        label: 'Ally builds',
        options: MODES.map((id) => ({ value: id, label: LABEL[id], note: NOTE[id] })),
        value: store.get(ALLY_BUILDS_KEY) ?? 'suggest',
        help: 'Applies to allies played by the computer. In multiplayer each player builds their own character. Suggested: their reward cards arrive pre-picked (one Enter commits) and their benches fill themselves. Manual: you decide every ally card and socket. Automatic: allies build themselves, shown as one summary line.',
        onChange: (v) => {
          store.set(ALLY_BUILDS_KEY, v, { source: 'ui' });
          paint();
        },
      });
      const paint = () => {
        const cur = store.get(ALLY_BUILDS_KEY) ?? 'suggest';
        w.setNote?.(override ? `${NOTE[cur]} · this session runs ${LABEL[override]} (?party=)` : `${NOTE[cur]} · applies from the next reward page`);
      };
      paint();
      // fix-M1-r5: the Gameplay tab calls sync() on every gameplay.* change
      // (Reset to defaults, another screen) so the row never shows a stale value.
      const sync = () => {
        w.set(store.get(ALLY_BUILDS_KEY) ?? 'suggest');
        paint();
      };
      return { el: w.el, sync };
    },
  });
  registerSettingsRow('gameplay', {
    id: 'autoSocketOwn',
    order: 41,
    build(ctx) {
      const { widgets } = ctx;
      const store = ctx.settings;
      const t = widgets.toggle({
        id: 'pt-gameplay-autoSocketOwn',
        label: 'Socket my new nodes',
        value: !!store.get(AUTO_SOCKET_OWN_KEY),
        help: 'On: every node your own character gets from a reward page, spoils or the shop is socketed for you (the same policy as Auto-fill) when the page commits. Off: they wait on your bench for you to place.',
        onChange: (v) => {
          store.set(AUTO_SOCKET_OWN_KEY, !!v, { source: 'ui' });
          paint();
        },
      });
      // The sub-line says what the CURRENT value does (fix-M1-r5, MENU-R5-F1:
      // it was set once at build and contradicted the toggle all session).
      const paint = () => t.setNote?.(store.get(AUTO_SOCKET_OWN_KEY) ? 'Your bench is auto-filled at every commit' : 'Your new nodes wait on the bench');
      paint();
      const sync = () => {
        t.set(!!store.get(AUTO_SOCKET_OWN_KEY));
        paint();
      };
      return { el: t.el, sync };
    },
  });
  return { apply };
}
