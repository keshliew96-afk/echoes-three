// MODEL STANDARD (docs/MODEL_STANDARD.md): which models play the faceted
// model standard. The pilot rebuilt the Barrow Wyrm and the Tank; the Level I
// slices add the Hollow Stag, the Thornmother, the Gloam Wolf and the eight
// Level I foes (render/enemies/facet/), then the Briar Knight and the
// Moss Hart (render/enemies/champfacet/); the Level II slice adds the Drowned
// Heron, the Millwheel and the Mire King; the heroes slice adds the Healer,
// the Swordsman, the Archer, the Tidecaller and the Bellwright. The classic
// rigs stay in the code beside them.
//
// A harness build reads `?facet=` to compare (a player build never sees it):
//   ?facet=0       every model classic
//   ?facet=wyrm    only the listed models faceted (comma list: wyrm,tank,healer,swordsman,archer,tidecaller,bellwright)
import { pageQuery } from '../../app/harness.js';

export const MODEL_STANDARD = Object.freeze({
  wyrm: true,
  tank: true,
  // The heroes.
  healer: true,
  swordsman: true,
  archer: true,
  tidecaller: true,
  bellwright: true,
  // The Level I bosses.
  stag: true,
  thornmother: true,
  gloamwolf: true,
  // The Level II bosses.
  heron: true,
  millwheel: true,
  mireking: true,
  // The Level I foes (data/levels.js row 1: its roster and campaign roster).
  boar: true,
  mantis: true,
  quillback: true,
  rotcap: true,
  wasp: true,
  thornling: true,
  owl: true,
  lasher: true,
  // The Level I champions.
  briar_knight: true,
  moss_hart: true,
});

export function facetOn(kind, query = pageQuery()) {
  const q = query.get('facet');
  if (q === null) return !!MODEL_STANDARD[kind];
  if (q === '0' || q === 'false' || q === 'classic') return false;
  if (q === '1' || q === 'true') return !!MODEL_STANDARD[kind];
  return q.split(',').includes(kind) && !!MODEL_STANDARD[kind];
}
