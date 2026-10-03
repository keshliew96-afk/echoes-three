// G1.6 case (a) check: the same pacing probe at display.renderScale 0.5 (PLAN
// G1.6 note: on a >= 144 Hz display with a GPU-bound camp frame the critic
// re-runs (a) at renderScale 0.5).
import pacing from './gntM1-sc-pacing.mjs';
export default async function (h) {
  await h.waitFor(() => window.__echoes && __echoes.settings, { timeout: 90000 });
  await h.ev(() => {
    __echoes.settings.set('display.renderScale', 0.5);
    return true;
  });
  await pacing(h);
  await h.ev(() => {
    __echoes.settings.set('display.renderScale', 1);
    return true;
  });
}
