// Settings ▸ Gameplay ▸ Health bars over heroes (docs/HP_BARS.md). Registers
// `gameplay.hpBars` (on by default) and contributes one row to the Gameplay
// tab through registerSettingsRow — the tab's own file is not edited. The
// render layer (render/hpbars.js) reads the key every frame, so a flip shows
// at once, in camp, the tutorial and a run alike.
import { registerSettingsRow } from '../../app/registry.js';
import { V } from '../../app/settings.js';
import { t } from '../../i18n/index.js';

export const HP_BARS_KEY = 'gameplay.hpBars';

export function registerHpBarsSetting(settings) {
  // register() is idempotent (a second call returns the live value).
  if (settings && typeof settings.register === 'function') {
    settings.register(HP_BARS_KEY, { default: true, validate: V.bool() });
  }
  registerSettingsRow('gameplay', {
    id: 'hpBars',
    order: 7,
    build(ctx) {
      const store = ctx.settings;
      const note = () => (store.get(HP_BARS_KEY) !== false ? t('A bar over every hero in the party') : t('Health shows on the party portraits only'));
      const w = ctx.widgets.toggle({
        id: 'hpbars-gameplay-toggle',
        label: t('Health bars over heroes'),
        value: store.get(HP_BARS_KEY) !== false,
        help: t('A small health bar floats over the head of each hero in the party, yours and your allies’, human or AI. It flashes on a hit and drains behind so you can read the damage. The portraits at the bottom keep showing health either way.'),
        onChange: (v) => store.set(HP_BARS_KEY, !!v, { source: 'ui' }),
      });
      w.setNote(note());
      const sync = () => {
        w.set(store.get(HP_BARS_KEY) !== false);
        w.setNote(note());
      };
      return { el: w.el, sync };
    },
  });
}
