#!/usr/bin/env node
// Zone circle probe (AUDIT.md X1, feature-freeze cleanup): the template
// circle IS a lasting area skill's AOE indicator. It opens with the zone, sits
// on the zone's exact radius for the zone's whole life, and is gone once the
// zone ends; no plain disc is drawn under it.
//
//   node tools/zone-circle-probe.mjs [--out <dir>]   (needs npm run dev on 5199)
//
// Two Level I sessions: one where the Healer is given Sanctuary and casts it
// with the real key, one with every seat's build granted (?partygrant=max) so
// the heroes' kits lay their own zones. Each samples every zone entity (`zone` from the skill bar, `azone` from the heroes' kits) against
// __echoes.content.vfx().zoneCircleList on each sample until the zones are
// gone. Screenshots: zone-open.png (a fresh zone), zone-late.png (the same
// zone near its end).
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const argv = process.argv.slice(2);
const OUT = resolve(ROOT, argv.includes('--out') ? argv[argv.indexOf('--out') + 1] : 'captures/zone-circle');
mkdirSync(OUT, { recursive: true });
const BASE = 'http://127.0.0.1:5199/?fresh=1&menu=0&seed=7';
const WAIT = 240000;

const results = [];
const check = (name, ok, info) => {
  results.push({ name, ok: !!ok, info });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${info !== undefined ? ' ' + JSON.stringify(info) : ''}`);
};

const errors = [];
const samplesOf = async (page, untilTick) => {
  const out = [];
  for (;;) {
    const s = await page.evaluate(() => {
      const st = window.__echoes.state();
      const zones = [...(st.zones || []).map((z) => ({ ...z, kind: 'zone' })), ...(st.azones || []).map((z) => ({ ...z, kind: 'azone' }))];
      return { tick: window.__echoes.tick, zones: zones.map((z) => ({ id: z.id, kind: z.kind, skill: z.skill, radius: z.radius })), circles: window.__echoes.content.vfx().zoneCircleList };
    });
    out.push(s);
    if (await untilTick(s, page)) return out;
    await page.waitForFunction((t) => window.__echoes.tick >= t + 15, s.tick, { timeout: WAIT });
  }
};
// Every sampled zone has exactly one live circle on its own radius, and no
// circle is kept for a zone that is gone.
function judge(label, samples) {
  const bad = [];
  const kinds = new Set();
  for (const s of samples) {
    for (const z of s.zones) {
      kinds.add(`${z.kind}:${z.skill}`);
      const c = s.circles.find((x) => x.id === z.id);
      if (!c || !c.live || Math.abs(c.radius - z.radius) > 1e-6) bad.push({ tick: s.tick, zone: z, circle: c ?? null });
    }
    for (const c of s.circles) if (!s.zones.some((z) => z.id === c.id)) bad.push({ tick: s.tick, stray: c });
  }
  check(`${label}: every live zone shows one live circle at its exact radius, none kept after`, bad.length === 0 && kinds.size > 0, { samples: samples.length, zones: [...kinds], bad: bad.slice(0, 5) });
}
async function open(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: WAIT });
  await page.waitForFunction(() => window.__echoes && window.__echoes.tick >= 30, null, { timeout: WAIT });
  await page.evaluate(() => window.__echoes.cmd('startCampaign', { level: 1 }));
  await page.waitForFunction(() => window.__echoes.state().enemies.length > 0, null, { timeout: WAIT });
  await page.mouse.move(700, 380);
}

const extra = (process.env.ECHOES_CHROME_ARGS || '').split(/\s+/).filter(Boolean);
const browser = await chromium.launch({ args: ['--disable-renderer-backgrounding', '--disable-background-timer-throttling', ...extra] });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));

  // 1. The Healer's Sanctuary, cast with the real key.
  await open(page, BASE);
  const give = await page.evaluate(() => window.__echoes.cmd('giveSkill', 'sanctuary'));
  check('Sanctuary given to the Healer', give && !give.error, give);
  let zoneId = null;
  for (let i = 0; i < 12 && zoneId === null; i++) {
    await page.keyboard.down('Digit1');
    await page.waitForTimeout(250);
    await page.keyboard.up('Digit1');
    const t0 = await page.evaluate(() => window.__echoes.tick);
    await page.waitForFunction((t) => window.__echoes.tick >= t + 6, t0, { timeout: WAIT });
    zoneId = await page.evaluate(() => window.__echoes.state().zones.find((e) => e.skill === 'sanctuary')?.id ?? null);
  }
  check('Sanctuary cast spawned a zone', zoneId !== null, { zoneId });
  let first = null;
  let last = null;
  let lateShot = false;
  const sanct = await samplesOf(page, async (s, pg) => {
    const live = s.zones.some((z) => z.id === zoneId);
    if (live) {
      if (first === null) {
        first = s.tick;
        await pg.screenshot({ path: join(OUT, 'zone-open.png') });
      }
      last = s.tick;
      if (!lateShot && s.tick - first >= 180) {
        lateShot = true;
        await pg.screenshot({ path: join(OUT, 'zone-late.png') });
      }
    }
    return (first !== null && !live && s.tick - last > 30) || s.tick - (first ?? s.tick) > 20 * 60;
  });
  judge('Sanctuary', sanct);
  check("the Sanctuary circle stayed for the zone's whole life (about 4 s)", first !== null && last - first >= 3 * 60, { first, last });
  const face = sanct.flatMap((s) => s.circles).find((c) => c.id === zoneId);
  check('Sanctuary (a Healer heal) wears the magic circle', face && face.face === 'magic', face);

  // 2. The heroes' own zones (every seat's build granted).
  await open(page, `${BASE}&partygrant=max`);
  const t1 = await page.evaluate(() => window.__echoes.tick);
  let shotKit = false;
  const kit = await samplesOf(page, async (s, pg) => {
    if (!shotKit && s.zones.length >= 2) {
      shotKit = true;
      await pg.screenshot({ path: join(OUT, 'zone-kits.png') });
    }
    return s.tick - t1 > 15 * 60;
  });
  judge('hero kit zones', kit);
  check('no console errors', errors.length === 0, errors.slice(0, 5));
} catch (e) {
  check('probe ran', false, String((e && e.stack) || e));
} finally {
  await browser.close();
}
writeFileSync(join(OUT, 'zone-circle-probe.json'), JSON.stringify(results, null, 2));
const failed = results.filter((r) => !r.ok);
console.log(failed.length ? `FAIL: ${failed.length} check(s)` : 'PASS: zone circles');
process.exit(failed.length ? 1 : 0);
