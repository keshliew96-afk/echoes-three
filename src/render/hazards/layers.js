// M4b world-content presentation bundle, created once in main.js's
// `@gnt:M4b WORLD-LAYERS` block and ticked in `@gnt:M4b RENDER-TICK`
// (docs/gauntlet/PLAN.md §2.2): the hazard layer, the interactable layer, the
// `ix-` interaction prompts, the content audio cues, the render-side content
// probe, and the ?layout=N harness setup (PLAN §6.1 — layout N's placements in
// the ?room= harness / the camp-less arena; dressing for every scene).
import { createHazardLayer } from './index.js';
import { createInteractableLayer } from '../interactables/index.js';
import { createInteractPrompts } from '../../ui/interact/index.js';
import { registerContentCues } from './cues.js';
import { registerContentProbe } from '../../data/content.js';
import { service, whenService } from '../../app/registry.js';
import { pumpDressings } from '../../env/biomes/builder.js';
import { biomeInfo } from '../../env/biomes/index.js';

export function createWorldContentLayers({ stage, world, bus, cosmetic, runUi = null, scene = null, params = null, sceneKey = 'camp' }) {
  const hazards = createHazardLayer({ stage, world, bus, cosmetic });
  const assets = createInteractableLayer({ stage, world, bus, cosmetic });
  const prompts = createInteractPrompts({ stage, world, runUi });

  // Audio: the engine may be provided before or after us.
  let cues = 0;
  const wire = (engine) => {
    if (!cues && engine) cues = registerContentCues(engine);
  };
  const eng = service('audio');
  if (eng) wire(eng);
  else if (typeof whenService === 'function') {
    try {
      const p = whenService('audio');
      if (p && typeof p.then === 'function') p.then(wire);
    } catch {
      /* no audio in this build */
    }
  }

  // ?layout=N (content harness): dressing always; placements only where the
  // PLAN puts them — the ?room= harness or a camp-less scene (never the camp
  // hub, which is not a combat room).
  const layoutParam = params && Number.isFinite(params.layout) ? params.layout : null;
  // ?variant=N / ?layout=N >= 4 outside a run: the biome's music theme and
  // ambient bed follow the layout's act (PLAN §6.1). In a run the engine
  // derives both from the run's act itself.
  const dressParam = layoutParam ?? (params && Number.isFinite(params.variant) ? params.variant : null);
  if (dressParam && dressParam >= 4) {
    const b = biomeInfo(dressParam);
    const setAudio = (engine) => {
      try {
        if (engine && engine.music && b) engine.music.setTheme(b.music);
        if (engine && engine.ambient && b) engine.ambient.setBed(b.bed);
      } catch {
        /* audio optional */
      }
    };
    if (eng) setAudio(eng);
    else if (typeof whenService === 'function') {
      try {
        const p2 = whenService('audio');
        if (p2 && typeof p2.then === 'function') p2.then(setAudio);
      } catch {
        /* no audio */
      }
    }
  }
  let harnessLayout = null;
  if (layoutParam) {
    if (scene && typeof scene.cmd === 'function') scene.cmd('applyLayout', [{ layoutId: layoutParam }]);
    const run = world.runSystem ? world.runSystem() : null;
    if ((params.room || sceneKey !== 'camp') && !(run && run.isActive())) {
      harnessLayout = world.cmd('setLayout', layoutParam);
    }
  }

  registerContentProbe('render', () => ({
    ...hazards.debugState(),
    ...assets.debugState(),
    prompt: prompts.debug(),
    cues,
    harnessLayout,
  }));
  registerContentProbe('prompt', () => prompts.debug());

  return {
    update(tSec) {
      hazards.update(tSec);
      assets.update(tSec);
      prompts.update();
      // Background dressing builds: ~8 ms a frame outside live combat, none in it
      // (the paint worker keeps going off-thread either way).
      const run = world.runSystem ? world.runSystem() : null;
      const busy = run && typeof run.combatActive === 'function' && run.combatActive();
      pumpDressings(busy ? 0 : 8);
    },
    debugState: () => ({ ...hazards.debugState(), ...assets.debugState(), prompt: prompts.debug(), cues }),
  };
}
