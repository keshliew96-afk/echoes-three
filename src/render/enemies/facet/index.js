// THE LEVEL I FOES, MODEL STANDARD (docs/MODEL_STANDARD.md "Foes"): every
// creature Level I rolls (data/levels.js row 1: the roster's boar, mantis,
// quillback, rotcap, wasp and thornling, the campaign roster's owl and
// lasher), rebuilt on the faceted look, the crowd-cheap parts kit and
// ability timelines, with their classic rigs kept beside them.
//
// The enemy layer and the Journal viewer take `facetFoeBuilders()` over their
// classic builders: a kind is faceted when its MODEL_STANDARD flag is on and
// the harness's `?facet=` allows it (render/facet/flags.js).
import { facetOn } from '../../facet/flags.js';
import { buildBoarFacet, BOAR_ABILITIES } from './boar.js';
import { buildMantisFacet, MANTIS_ABILITIES } from './mantis.js';
import { buildQuillbackFacet, QUILLBACK_ABILITIES } from './quillback.js';
import { buildRotcapFacet, ROTCAP_ABILITIES } from './rotcap.js';
import { buildWaspFacet, WASP_ABILITIES } from './wasp.js';
import { buildThornlingFacet, THORNLING_ABILITIES } from './thornling.js';
import { buildOwlFacet, OWL_ABILITIES } from './owl.js';
import { buildLasherFacet, LASHER_ABILITIES } from './lasher.js';

export const FACET_FOES = Object.freeze({
  boar: buildBoarFacet,
  mantis: buildMantisFacet,
  quillback: buildQuillbackFacet,
  rotcap: buildRotcapFacet,
  wasp: buildWaspFacet,
  thornling: buildThornlingFacet,
  owl: buildOwlFacet,
  lasher: buildLasherFacet,
});
// Each foe's lab abilities (the model lab, the probe).
export const FOE_ABILITIES = Object.freeze({
  boar: BOAR_ABILITIES,
  mantis: MANTIS_ABILITIES,
  quillback: QUILLBACK_ABILITIES,
  rotcap: ROTCAP_ABILITIES,
  wasp: WASP_ABILITIES,
  thornling: THORNLING_ABILITIES,
  owl: OWL_ABILITIES,
  lasher: LASHER_ABILITIES,
});

export function facetFoeBuilders(query) {
  const out = {};
  for (const [kind, build] of Object.entries(FACET_FOES)) if (query ? facetOn(kind, query) : facetOn(kind)) out[kind] = build;
  return out;
}
