// MODEL STANDARD PILOT (docs/MODEL_STANDARD.md): which models play the
// faceted model standard. The pilot rebuilt two, the Barrow Wyrm and the
// Tank; the heroes slice adds the Swordsman. The classic rigs stay in the
// code beside them.
//
// A harness build reads `?facet=` to compare (a player build never sees it):
//   ?facet=0       every model classic
//   ?facet=wyrm    only the listed models faceted (comma list: wyrm,tank,swordsman)
import { pageQuery } from '../../app/harness.js';

export const MODEL_STANDARD = Object.freeze({ wyrm: true, tank: true, swordsman: true });

export function facetOn(kind, query = pageQuery()) {
  const q = query.get('facet');
  if (q === null) return !!MODEL_STANDARD[kind];
  if (q === '0' || q === 'false' || q === 'classic') return false;
  if (q === '1' || q === 'true') return !!MODEL_STANDARD[kind];
  return q.split(',').includes(kind) && !!MODEL_STANDARD[kind];
}
