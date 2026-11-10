// The Journal model viewer's rig builders (ui/story/viewer.js): every enemy
// and boss rig by kind. Its own module so viewer.js can load it with import()
// and the rigs stay in the combat art chunk, out of the boot.
import { buildBoar } from '../../render/enemies/boar.js';
import { buildMantis } from '../../render/enemies/mantis.js';
import { ARCH_BUILDERS } from '../../render/enemies/archetypes.js';
import { facetFoeBuilders } from '../../render/enemies/facet/index.js';
import { buildWyrmFacet } from '../../render/boss/wyrmfacet.js';
import { buildStagFacet } from '../../render/boss/stagfacet.js';
import { buildThornmotherFacet } from '../../render/boss/thornmotherfacet.js';
import { buildGloamWolfFacet } from '../../render/boss/gloamwolffacet.js';
import { buildHeronFacet } from '../../render/boss/heronfacet.js';
import { buildMillwheelFacet } from '../../render/boss/millwheelfacet.js';
import { buildMireKingFacet } from '../../render/boss/mirekingfacet.js';
import { buildLichramFacet } from '../../render/boss/lichramfacet.js';
import { buildAshRavenFacet } from '../../render/boss/ashravenfacet.js';
import { buildCantorFacet } from '../../render/boss/cantorfacet.js';
import { buildColossusFacet } from '../../render/boss/colossusfacet.js';
import { buildVeinWeaverFacet } from '../../render/boss/veinweaverfacet.js';
import { buildHush, buildSkyhorn, buildHourwarden } from '../../render/boss/spire.js';
import { buildFounder, buildCinderback } from '../../render/boss/kiln.js';

export const BUILDERS = {
  boar: buildBoar,
  mantis: buildMantis,
  ...ARCH_BUILDERS,
  ...facetFoeBuilders(), // the model standard's Level I foes (docs/MODEL_STANDARD.md)
  stag: buildStagFacet,
  heron: buildHeronFacet,
  wyrm: buildWyrmFacet,
  thornmother: buildThornmotherFacet,
  millwheel: buildMillwheelFacet,
  lichram: buildLichramFacet,
  cantor: buildCantorFacet,
  colossus: buildColossusFacet,
  gloamwolf: buildGloamWolfFacet,
  mireking: buildMireKingFacet,
  ashraven: buildAshRavenFacet,
  veinweaver: buildVeinWeaverFacet,
  hush: buildHush,
  skyhorn: buildSkyhorn,
  hourwarden: buildHourwarden,
  founder: buildFounder,
  cinderback: buildCinderback,
};
