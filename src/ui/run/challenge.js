// Settings ▸ Gameplay ▸ Challenge (docs/gauntlet/PLAN.md §3.2 / §4.2). Owner:
// M4a. Registers the `gameplay.challenge` key (relaxed · standard ·
// harrowing) and contributes one row to M1's Gameplay tab through
// registerSettingsRow — M1's file is never edited.
//
// What it measurably changes (PLAN §5 platform honesty): the multipliers the
// NEXT expedition is planned with — every enemy's HP and damage, the Stag's
// HP and damage (data/difficulty.js CHALLENGE) — captured into run state at
// the portal press (camp.js reads the setting there; the sim never reads app
// state). The run in progress keeps the challenge it started with, and the
// row says so.
import { registerSettingsRow, service } from '../../app/registry.js';
import { V } from '../../app/settings.js';
import { CHALLENGE } from '../../data/difficulty.js';

export const CHALLENGE_KEY = 'gameplay.challenge';
const ORDER = ['relaxed', 'standard', 'harrowing'];
const LABEL = { relaxed: 'Relaxed', standard: 'Standard', harrowing: 'Harrowing' };
const pct = (m) => `${Math.round(m * 100)}%`;
const NOTE = Object.fromEntries(
  ORDER.map((id) => [id, `Enemies and the Stag: ${pct(CHALLENGE[id].hp)} HP, ${pct(CHALLENGE[id].dmg)} damage`])
);

export function registerChallengeSetting(settings) {
  if (settings && typeof settings.register === 'function') {
    settings.register(CHALLENGE_KEY, { default: 'standard', validate: V.oneOf(ORDER) });
  }
  registerSettingsRow('gameplay', {
    id: 'challenge',
    order: 30,
    build(ctx) {
      const { widgets } = ctx;
      const store = ctx.settings;
      const liveRun = () => {
        const world = service('content')?.world?.();
        const run = world && world.runSystem ? world.runSystem() : null;
        return run && run.isActive() ? run.challenge() : null;
      };
      const w = widgets.select({
        id: 'ex-gameplay-challenge',
        label: 'Challenge',
        options: ORDER.map((id) => ({ value: id, label: LABEL[id], note: NOTE[id] })),
        value: store.get(CHALLENGE_KEY) ?? 'standard',
        help:
          'How hard the enemies of your NEXT expedition are. Relaxed: 75% HP, 70% damage. Standard: as designed. Harrowing: 125% HP, 130% damage. The challenge is fixed when you step through the camp gate, so a run in progress keeps the one it started with. Harrowing scores ×1.5, Relaxed ×0.75.',
        onChange: (v) => {
          store.set(CHALLENGE_KEY, v, { source: 'ui' });
          paintNote();
        },
      });
      function paintNote() {
        const cur = store.get(CHALLENGE_KEY) ?? 'standard';
        const run = liveRun();
        const base = NOTE[cur];
        w.setNote?.(run && run !== cur ? `${base} · this run stays ${LABEL[run]} — applies from your next expedition` : `${base} · applies from your next expedition`);
      }
      paintNote();
      return w.el;
    },
  });
}
