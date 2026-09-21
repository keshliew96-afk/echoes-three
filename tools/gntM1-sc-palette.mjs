// G1.12 palette discipline: screenshots of the title, settings (every tab),
// confirm, keep-display, loading and farewell at 1600x900, plus every plate
// rect (every [data-nav] item and .ap-plate panel of the top screen, and the
// focused item's rect). tools/gntM1-palette-check.mjs then runs
// tools/analyze.mjs --box on each rect (danger / heal / violet band counts must
// be 0) and on the whole title frame (the live camp backdrop: Ember band
// <= 952 px + 10%).
import { writeFileSync } from 'fs';
export default async function (h) {
  const { ev, sleep, shot, waitFor, page, key } = h;
  const frames = [];
  const rects = () =>
    ev(() => {
      const top = __echoes.app.stack().slice(-1)[0];
      const el = document.querySelector(`.ap-screen.ap-in[data-screen="${top}"]`);
      if (!el) return [];
      const out = [];
      const add = (n, kind) => {
        const r = n.getBoundingClientRect();
        if (r.width < 4 || r.height < 4 || n.getClientRects().length === 0) return;
        const x = Math.max(0, Math.floor(r.left));
        const y = Math.max(0, Math.floor(r.top));
        const w = Math.min(innerWidth - x, Math.ceil(r.width));
        const hh = Math.min(innerHeight - y, Math.ceil(r.height));
        if (w > 3 && hh > 3) out.push({ kind, id: n.id || n.className.split(' ')[0], box: [x, y, w, hh] });
      };
      el.querySelectorAll('.ap-plate').forEach((n) => add(n, 'plate'));
      el.querySelectorAll('[data-nav]').forEach((n) => add(n, 'nav'));
      const f = __echoes.app.focus();
      if (f) out.push({ kind: 'focus', id: f.id, box: [Math.max(0, Math.floor(f.rect.x - 4)), Math.max(0, Math.floor(f.rect.y - 4)), Math.ceil(f.rect.w + 8), Math.ceil(f.rect.h + 8)] });
      return out;
    });
  const grab = async (name) => {
    await sleep(450);
    const path = await shot(`pal-${name}`);
    frames.push({ name, path, rects: await rects() });
  };
  // loading (prompt state) — the splash is the first screen of a title boot
  await waitFor(() => __echoes.app.state === 'title' || document.querySelector('.ap-press.ap-on'), { timeout: 90000 });
  if (await ev(() => __echoes.app.state !== 'title')) {
    await grab('loading');
    await key('Enter');
  }
  await waitFor(() => __echoes.app.state === 'title', { timeout: 10000 });
  await sleep(900);
  await grab('title');
  await ev(() => {
    __echoes.app.open('settings', { tab: 'display' });
    return true;
  });
  for (const tab of await ev(() => [...document.querySelectorAll('.ap-tab')].map((b) => b.id))) {
    await ev((id) => document.getElementById(id).click(), tab);
    await grab(`settings-${tab.replace('ap-tab-', '')}`);
  }
  await key('Escape');
  await sleep(300);
  await ev(() => {
    __echoes.app.confirm({ title: 'Exit Echoes?', body: 'Your settings are saved.', confirmLabel: 'Exit', danger: true });
    return true;
  });
  await grab('confirm');
  await key('Escape');
  await ev(() => {
    __echoes.app.keepDisplay({ changes: ['Resolution scale 75% — render resolution 1200 × 675'] });
    return true;
  });
  await grab('keep');
  await key('Enter');
  await ev(() => {
    __echoes.app.open('farewell');
    return true;
  });
  await grab('farewell');
  await key('Enter');
  writeFileSync('captures/gntM1-palette-frames.json', JSON.stringify(frames, null, 1));
  h.log('frames', frames.map((f) => ({ name: f.name, rects: f.rects.length })));
}
