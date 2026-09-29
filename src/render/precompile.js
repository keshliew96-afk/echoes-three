// Off-main-thread program linking that survives a teardown (gauntlet r5 CAMPAIGN F2).
//
// three's WebGLRenderer.compileAsync(scene, camera, target) links every program
// the object needs (KHR_parallel_shader_compile) and then polls each material's
// `properties.get(material).currentProgram.isReady()` from a 10 ms setTimeout
// until all are ready. When a level change disposes a parked dressing while
// that poll is still pending (Level Select -> III during the camp's Level-1
// preload, a ?level=3 boot), `material.dispose()` removes the renderer's
// properties entry: the next poll reads `undefined.isReady()` and throws an
// uncaught page error from the timer, and the promise never settles.
//
// compileAsyncSafe() is the same contract with the teardown handled:
//   - a material whose renderer properties are gone (disposed) or that has no
//     current program any more leaves the wait list — there is nothing left to
//     link for it; it compiles again on its next real use like any material;
//   - a program whose status query throws counts as settled;
//   - a hard deadline (default 10 s) resolves anyway, so a caller that waits on
//     it (the arena's background pump) can never hang behind a stuck driver —
//     anything still unlinked then links on its first draw, as without warm-up.
// The promise always resolves, with { scene, dropped, timedOut, ms }.
export function compileAsyncSafe(renderer, scene, camera, targetScene = null, { deadlineMs = 10000 } = {}) {
  const materials = renderer.compile(scene, camera, targetScene);
  const props = renderer.properties;
  const t0 = performance.now();
  let dropped = 0;
  const parallel = (() => {
    try {
      return renderer.extensions.get('KHR_parallel_shader_compile') !== null;
    } catch {
      return false;
    }
  })();
  return new Promise((resolve) => {
    function settled(material) {
      if (!props.has(material)) return 'gone';
      const program = props.get(material).currentProgram;
      if (!program || typeof program.isReady !== 'function') return 'gone';
      try {
        return program.isReady() ? 'ready' : null;
      } catch {
        return 'gone';
      }
    }
    function check() {
      for (const material of materials) {
        const s = settled(material);
        if (s === null) continue;
        if (s === 'gone') dropped++;
        materials.delete(material);
      }
      const ms = performance.now() - t0;
      if (materials.size === 0 || ms >= deadlineMs) {
        resolve({ scene, dropped, timedOut: materials.size > 0, ms: Math.round(ms) });
        materials.clear();
        return;
      }
      setTimeout(check, 10);
    }
    // Same cadence as three: poll at once when the status can be read without
    // blocking, else give the links a first 10 ms.
    if (parallel) check();
    else setTimeout(check, 10);
  });
}
