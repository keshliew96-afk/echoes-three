// Settings ▸ Gameplay (docs/gauntlet/PLAN.md §3.2). Owner: M1.
//   Language      one of the ten (docs/I18N.md) -> ui.language, held until
//                 "Apply language", which reloads the game in it (asks first
//                 while playing)
//   Screen shake  Off / Reduced / Full  -> gameplay.screenshake 0 / 0.5 / 1
//                 (camera shake amplitude on kills, stomps and quake landings,
//                 read live by the scene's shake listener)
//   Pause when the window loses focus   -> gameplay.autoPause (single-player;
//                 an online session never pauses for one player)
// plus every row another key contributes with registerSettingsRow('gameplay',
// ...) (M4a's Challenge row, PARTY's Ally builds / Socket my new nodes),
// rendered after these in `order`.
//
// A contributed row's build(ctx) returns its element, or { el, sync?(),
// destroy?() }. sync() re-reads the store and repaints the row's value AND
// its one-line status note; the tab calls it whenever any gameplay.* key
// changes (a toggle, "Reset to defaults", the pause menu's copy of Settings,
// a debug-API set), on every show and after a reset — so no row can say one
// thing while the store holds another (fix-M1-r5, MENU-R5-F1: the "Socket my
// new nodes" line stayed at its boot value all session).
import { settingsRows } from '../../../app/registry.js';
import { t, LANGUAGES, LANGUAGE_KEY, getLanguage, applyLanguage } from '../../../i18n/index.js';

export function buildGameplayTab(ctx) {
  const { settings, widgets, app } = ctx;
  const el = document.createElement('div');
  el.className = 'ap-tabcontent ap-gameplay';
  el.style.display = 'flex';
  el.style.flexDirection = 'column';
  el.style.gap = 'calc(10px * var(--ap-s, 1))';

  // Language (docs/I18N.md): the choice is held until Apply, because a switch
  // reloads the page so every screen is rebuilt in the new language.
  const current = getLanguage();
  let pendingLang = current;
  const english = (code) => {
    const l = LANGUAGES.find((x) => x.code === code);
    return l ? t(l.english) : code;
  };
  const language = widgets.select({
    id: 'ap-gameplay-language',
    label: t('Language'),
    options: LANGUAGES.map((l) => ({ value: l.code, label: l.name, note: l.code === current ? english(l.code) : t('{language} · press Apply to switch', { language: english(l.code) }) })),
    value: current,
    help: t('The language of every menu, card and message. Switching reloads the game in the new language; a run carries on from its last autosave through Continue.'),
    onChange: (v) => {
      pendingLang = v;
      applyBtn.setDisabled(v === current, t('Already in this language'));
    },
  });
  const applyBtn = widgets.button({
    id: 'ap-gameplay-language-apply',
    label: t('Apply language'),
    disabled: true,
    reason: t('Already in this language'),
    help: t('Reload the game in the language picked above.'),
    onPress: async () => {
      if (pendingLang === getLanguage()) return;
      const name = (LANGUAGES.find((x) => x.code === pendingLang) || {}).name || pendingLang;
      if (app && app.state === 'playing' && typeof app.confirm === 'function') {
        const ok = await app.confirm({
          title: t('Switch to {language}?', { language: name }),
          body: t('The game reloads in the new language. A run carries on from its last autosave (the start of the current room) through Continue; an online game is left.'),
          confirmLabel: t('Reload now'),
          cancelLabel: t('Cancel'),
        });
        if (!ok) return;
      }
      applyLanguage(pendingLang, settings);
    },
  });

  const shake = widgets.select({
    id: 'ap-gameplay-screenshake',
    label: t('Screen shake'),
    options: [
      { value: 0, label: t('Off'), note: t('No camera shake') },
      { value: 0.5, label: t('Reduced'), note: t('Half-strength camera shake') },
      { value: 1, label: t('Full'), note: t('Full camera shake on kills and stomps') },
    ],
    value: settings.get('gameplay.screenshake'),
    help: t('How hard the camera shakes on kills, the Stag’s stomps and quake landings. Applies to the next shake.'),
    onChange: (v) => settings.set('gameplay.screenshake', v, { source: 'ui' }),
  });

  const autoPause = widgets.toggle({
    id: 'ap-gameplay-autoPause',
    label: t('Pause when the window loses focus'),
    value: settings.get('gameplay.autoPause'),
    help: t('Single-player: the game stops while the tab is hidden or another window has focus. An online game keeps running — the shared world cannot pause for one player.'),
    onChange: (v) => settings.set('gameplay.autoPause', !!v, { source: 'ui' }),
  });
  const autoNote = () => (settings.get('gameplay.autoPause') ? t('Single-player only — online games keep running') : t('The game keeps running in the background'));
  autoPause.setNote(autoNote());

  el.append(language.el, applyBtn.el, shake.el, autoPause.el);

  // Rows contributed by other keys (registerSettingsRow('gameplay', ...)).
  const extra = document.createElement('div');
  extra.style.display = 'flex';
  extra.style.flexDirection = 'column';
  extra.style.gap = 'calc(10px * var(--ap-s, 1))';
  el.appendChild(extra);
  const builtRows = new Map(); // row id -> { el, sync, destroy }
  function renderRows() {
    for (const row of settingsRows('gameplay')) {
      if (builtRows.has(row.id)) continue;
      try {
        const out = row.build({ settings, widgets, app, services: ctx.services, toast: ctx.toast });
        const node = out && out.nodeType === 1 ? out : out && out.el && out.el.nodeType === 1 ? out.el : null;
        if (node) {
          builtRows.set(row.id, {
            el: node,
            sync: out !== node && typeof out.sync === 'function' ? out.sync : null,
            destroy: out !== node && typeof out.destroy === 'function' ? out.destroy : null,
          });
          extra.appendChild(node);
        }
      } catch (err) {
        console.error(`[settings] gameplay row '${row.id}' failed to build`, err);
      }
    }
  }
  function syncRows() {
    for (const [id, r] of builtRows) {
      if (!r.sync) continue;
      try {
        r.sync();
      } catch (err) {
        console.error(`[settings] gameplay row '${id}' failed to sync`, err);
      }
    }
  }
  renderRows();
  const offRows = app.events.on('settings_rows', (p) => {
    if (p && p.tabId === 'gameplay') renderRows();
  });

  const offs = [
    settings.subscribe('gameplay.screenshake', (v) => shake.set(v)),
    settings.subscribe('gameplay.autoPause', (v) => {
      autoPause.set(!!v);
      autoPause.setNote(autoNote());
    }),
    // Every contributed row follows the store, whoever changed it.
    settings.subscribe('gameplay', () => syncRows()),
  ];

  return {
    el,
    onShow() {
      shake.set(settings.get('gameplay.screenshake'));
      autoPause.set(settings.get('gameplay.autoPause'));
      autoPause.setNote(autoNote());
      renderRows();
      syncRows();
    },
    reset() {
      settings.reset('gameplay');
      syncRows();
    },
    destroy() {
      offRows();
      for (const off of offs) off();
      for (const r of builtRows.values()) {
        try {
          if (r.destroy) r.destroy();
        } catch {
          /* a row's own cleanup */
        }
      }
    },
  };
}
