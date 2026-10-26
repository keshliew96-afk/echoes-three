// The Journal model viewer's rig builders (ui/story/viewer.js): every enemy
// and boss rig by kind. Its own module so viewer.js can load it with import()
// and the rigs stay in the combat art chunk, out of the boot.
import { buildBoar } from '../../render/enemies/boar.js';
import { buildMantis } from '../../render/enemies/mantis.js';
import { ARCH_BUILDERS } from '../../render/enemies/archetypes.js';
import { facetFoeBuilders } from '../../render/enemies/facet/index.js';
import { buildStag } from '../../render/boss/stag.js';
import { buildHeron } from '../../render/boss/heron.js';
import { buildWyrm } from '../../render/boss/wyrm.js';
import { buildWyrmFacet } from '../../render/boss/wyrmfacet.js';
import { facetOn } from '../../render/facet/flags.js';
import { buildThornmother, buildMillwheel, buildLichram } from '../../render/boss/slice2.js';
import { buildCantor, buildColossus } from '../../render/boss/heart.js';
import { buildGloamWolf, buildMireKing, buildAshRaven, buildVeinWeaver } from '../../render/boss/third.js';
import { buildHush, buildSkyhorn, buildHourwarden } from '../../render/boss/spire.js';
import { buildFounder, buildCinderback } from '../../render/boss/kiln.js';

export const BUILDERS = {
  boar: buildBoar,
  mantis: buildMantis,
  ...ARCH_BUILDERS,
  ...facetFoeBuilders(), // the model standard's Level I foes (docs/MODEL_STANDARD.md)
  stag: buildStag,
  heron: buildHeron,
  wyrm: facetOn('wyrm') ? buildWyrmFacet : buildWyrm, // the model standard pilot (docs/MODEL_STANDARD.md)
  thornmother: buildThornmother,
  millwheel: buildMillwheel,
  lichram: buildLichram,
  cantor: buildCantor,
  colossus: buildColossus,
  gloamwolf: buildGloamWolf,
  mireking: buildMireKing,
  ashraven: buildAshRaven,
  veinweaver: buildVeinWeaver,
  hush: buildHush,
  skyhorn: buildSkyhorn,
  hourwarden: buildHourwarden,
  founder: buildFounder,
  cinderback: buildCinderback,
};
