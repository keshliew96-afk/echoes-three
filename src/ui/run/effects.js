// Settings ▸ Gameplay ▸ Effects (docs/gauntlet/design-VFX.md §8). Owner: VFX.
// Registers `gameplay.effects` (full · reduced) and contributes one row to the
// Gameplay tab through registerSettingsRow — the tab's own file is not edited.
//
// What it changes, read live by the VFX director (render/vfx/signature.js):
// Reduced halves the particle counts of every class / enemy / boss recipe,
// turns the camera kick and dolly off and dims the ground light pools. Every
// gameplay-relevant shape (telegraphs, heal glyphs, status rings) stays.
import { registerSettingsRow } from '../../app/registry.js';
import { V } from '../../app/settings.js';
import { t } from '../../i18n/index.js';

export const EFFECTS_KEY = 'gameplay.effects';
const ORDER = ['full', 'reduced'];

export function registerEffectsSetting(settings) {
  // register() is idempotent (a second call returns the live value).
  if (settings && typeof settings.register === 'function') {
    settings.register(EFFECTS_KEY, { default: 'full', validate: V.oneOf(ORDER) });
  }
  registerSettingsRow('gameplay', {
    id: 'effects',
    order: 5,
    build(ctx) {
      const store = ctx.settings;
      const w = ctx.widgets.select({
        id: 'vfx-gameplay-effects',
        label: t('Effects'),
        options: [
          { value: 'full', label: t('Full'), note: t('Every class effect, debris and camera kick') },
          { value: 'reduced', label: t('Reduced'), note: t('Half the particles, no camera kick, softer light') },
        ],
        value: store.get(EFFECTS_KEY) ?? 'full',
        help: t('How much the skills, hits and the Stag throw on screen. Reduced keeps every warning and every heal sign, with half the particles and no camera kick.'),
        onChange: (v) => store.set(EFFECTS_KEY, v, { source: 'ui' }),
      });
      const sync = () => w.set(store.get(EFFECTS_KEY) ?? 'full');
      return { el: w.el, sync };
    },
  });
}
