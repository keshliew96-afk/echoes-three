#!/usr/bin/env node
// vfx-budget — frame-budget check for the AAA VFX pass (design-VFX.md §10).
// A busy room: Act I room 3 with the autopilot on and ten extra enemies of
// every Act I type, run on the real clock; samples the renderer's draw calls,
// the GL program count (a change mid-fight would mean a shader compiled
// mid-fight, i.e. a hitch), the live VFX primitives and the VFX director's own
// CPU time per frame.
//
//   PUPPETEER_EXECUTABLE_PATH=... node tools/vfx-budget.mjs [--url URL] [--sec 20]
// Prints one JSON line. On a machine without a GPU the fps it reports is
// software GL's, not the game's; the draw calls, programs and CPU ms are the
// numbers to compare between builds.
const argv = process.argv.slice(2);
const arg = (k, d) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : d);
const URL0 = arg('--url', 'http://127.0.0.1:5199/');
const SEC = Number(arg('--sec', 20));
const { launchEchoes, openEchoes } = await import('./gnt-arch-browser.mjs');
const root = typeof process.getuid === 'function' && process.getuid() === 0;
const browser = await launchEchoes({ gpu: false, width: 1280, height: 720, extraArgs: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', ...(root ? ['--no-sandbox'] : [])] });
const { page, errors } = await openEchoes(browser, `${URL0}?menu=0&seed=7`, { width: 1280, height: 720 });
await page.waitForFunction(() => window.__echoes && window.__echoes.tick > 60, { timeout: 180000 });
await page.evaluate(() => {
  const X = __echoes;
  X.cmd('skipToRoom', 3, { act: 1 });
  X.cmd('autopilot', true);
});
await new Promise((r) => setTimeout(r, 3000));
await page.evaluate(() => {
  const X = __echoes;
  const p = X.content.world().player;
  const kinds = ['boar', 'mantis', 'quillback', 'toad', 'moth', 'ram', 'mole', 'boar', 'mantis', 'toad'];
  kinds.forEach((k, i) => X.cmd('spawn', k, p.x + (i - 4.5) * 0.9, p.z - 3 - (i % 3) * 0.7));
});
const samples = [];
const programs0 = await page.evaluate(() => __echoes.state().gl.programs);
for (let i = 0; i < SEC; i++) {
  await new Promise((r) => setTimeout(r, 1000));
  samples.push(
    await page.evaluate(() => {
      const s = __echoes.state();
      const v = __echoes.content.vfx();
      const live = ['arcs', 'lights', 'flashes', 'streaks', 'cracks', 'pillars', 'stars', 'marks', 'glows'].reduce((n, k) => n + (v[k] || 0), 0);
      return { calls: s.gl.calls, programs: s.gl.programs, fps: Math.round(__echoes.fps * 10) / 10, vfxLive: live, vfxMs: v.updateMs ?? null, enemies: s.room ? s.room.alive ?? null : null };
    })
  );
}
const pick = (k) => samples.map((s) => s[k]).filter((v) => v != null).sort((a, b) => a - b);
const pct = (arr, q) => (arr.length ? arr[Math.min(arr.length - 1, Math.floor(arr.length * q))] : null);
const out = {
  url: URL0,
  drawCalls: { p50: pct(pick('calls'), 0.5), p95: pct(pick('calls'), 0.95), max: pct(pick('calls'), 1) },
  vfxLive: { p50: pct(pick('vfxLive'), 0.5), max: pct(pick('vfxLive'), 1) },
  vfxDirectorMs: { p50: pct(pick('vfxMs'), 0.5), max: pct(pick('vfxMs'), 1) },
  programs: { start: programs0, end: samples.at(-1)?.programs },
  softwareFps: pct(pick('fps'), 0.5),
  errors,
};
console.log(JSON.stringify(out));
await browser.close();
process.exit(errors.length ? 1 : 0);
