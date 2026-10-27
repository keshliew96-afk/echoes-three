// THE MODEL-STANDARD HEROES (docs/MODEL_STANDARD.md): one SPEC per faceted
// hero rig (the shape is in render/facet/hero.js). The critter factory builds
// a hero's faceted twin from here, the model lab gives each a tab and the
// heroes probe runs every check on each. A hero joins by exporting its SPEC
// and being listed below (and in MODEL_STANDARD, render/facet/flags.js).
import { TANK_SPEC } from '../critters/tankfacet.js';
import { HEALER_SPEC } from '../critters/healerfacet.js';
import { SWORDSMAN_SPEC } from '../critters/swordsmanfacet.js';
import { ARCHER_SPEC } from '../critters/archerfacet.js';

export const FACET_HEROES = Object.freeze([TANK_SPEC, HEALER_SPEC, SWORDSMAN_SPEC, ARCHER_SPEC]);
export const FACET_HERO = Object.freeze(Object.fromEntries(FACET_HEROES.map((h) => [h.id, h])));
