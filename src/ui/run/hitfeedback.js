// Settings ▸ Gameplay ▸ Hit feedback (docs/HIT_FEEDBACK.md). Registers
// `gameplay.hitFeedback` (on by default) and contributes one row to the
// Gameplay tab through registerSettingsRow — the tab's own file is not edited.
// Read live by render/vfx/hitfeedback.js and audio/hitcues.js: off removes
// the red edge pulse, the arc toward the attacker, the party's hit flash, the
// heavy-hit camera kick and the heavy / downed hit sounds at once.
import { registerSettingsRow } from '../../app/registry.js';
import { V } from '../../app/settings.js';
import { t } from '../../i18n/index.js';
import { HIT_FEEDBACK_KEY } from '../../render/vfx/hitfeedback.js';

export function registerHitFeedbackSetting(settings) {
  if (settings && typeof settings.register === 'function') {
    settings.register(HIT_FEEDBACK_KEY, { default: true, validate: V.bool() });
  }
  registerSettingsRow('gameplay', {
    id: 'hitFeedback',
    order: 6,
    build(ctx) {
      const store = ctx.settings;
      const w = ctx.widgets.toggle({
        id: 'ap-gameplay-hitFeedback',
        label: t('Hit feedback'),
        value: store.get(HIT_FEEDBACK_KEY) !== false,
        help: t('When you are hit, the screen edge pulses red toward the attacker, a struck character flashes and heavy hits kick the camera. Turn it off if flashing bothers you.'),
        onChange: (v) => {
          store.set(HIT_FEEDBACK_KEY, !!v, { source: 'ui' });
          note();
        },
      });
      const note = () => w.setNote(store.get(HIT_FEEDBACK_KEY) !== false ? t('Red edge pulse, flash and camera kick when you are hit') : t('No flash or kick when you are hit'));
      note();
      const sync = () => {
        w.set(store.get(HIT_FEEDBACK_KEY) !== false);
        note();
      };
      return { el: w.el, sync };
    },
  });
}
