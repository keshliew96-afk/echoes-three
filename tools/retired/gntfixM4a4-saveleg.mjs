#!/usr/bin/env node
// fix-M4a-r4 — save / load across the new upgrade state: a Level-3 reward page
// holding an UPGRADE offer (pool 'upgrade' + swap target, spoils.upgrades) and
// the Level-3 shelf with upgrade cards survive capture -> apply bit-identically
// (save.roundTrip: hashBefore == hashAfterApply, continuation equal) and the
// run view reads the same afterwards.   node tools/gntfixM4a4-saveleg.mjs [seed=4]
import { boot, ev, writeJson, BASE, waitFor, sleep } from './gntccontent4-lib.mjs';

const seed = process.argv[2] || '4';
const out = { seed, base: BASE };
const fails = [];
const check = (name, ok, info) => {
  (out.checks ||= []).push({ name, ok: !!ok, info });
  if (!ok) fails.push(name);
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${JSON.stringify(info).slice(0, 260)}`);
};
const { browser, page, errors } = await boot(BASE + `?menu=0&seed=${seed}`);
await ev(page, () => window.__echoes.cmd('startCampaign', { level: 3 }));
await waitFor(page, () => window.__echoes.state().run.phase === 'combat', { timeout: 60000 });
await waitFor(page, () => {
  const s = window.__echoes.state();
  if (s.run.phase === 'combat') window.__echoes.cmd('killAllEnemies');
  return s.run.phase === 'reward';
}, { timeout: 90000, poll: 300 });
await sleep(800);
for (const leg of ['reward', 'shop']) {
  if (leg === 'shop') {
    await ev(page, () => window.__echoes.cmd('skipToRoom', 7));
    await waitFor(page, () => window.__echoes.state().run.phase === 'shop', { timeout: 30000 });
    await sleep(1500);
  }
  const r = await ev(page, async () => {
    const E = window.__echoes;
    const v0 = E.state().run;
    const pick = (v) => JSON.stringify({ reward: v.reward, spoils: v.spoils, shop: v.shop && v.shop.stock });
    const before = pick(v0);
    const rt = await E.save.roundTrip({ ticks: 600, scriptSeed: 1, every: 60, restore: true });
    const after = pick(E.state().run);
    const tree = E.save.capture();
    const applied = E.save.apply(tree);
    const again = pick(E.state().run);
    return { before, after, again, applied: !!applied, rt: { equal: rt.equal, continuationEqual: rt.continuationEqual, hashBefore: rt.hashBefore, hashAfterApply: rt.hashAfterApply, firstDivergence: rt.firstDivergence } };
  });
  out[leg] = r;
  const hasUp = leg === 'reward' ? /"pool":"upgrade"/.test(r.before) && /"upgrades"/.test(r.before) : /"upgrade":\{/.test(r.before);
  check(`${leg}: upgrade state present`, hasUp, r.before.slice(0, 240));
  check(`${leg}: roundTrip equal + continuation equal`, r.rt.equal && r.rt.continuationEqual, r.rt);
  check(`${leg}: run view identical after the round trip and a capture/apply`, r.before === r.after && r.before === r.again, { same1: r.before === r.after, same2: r.before === r.again });
}
out.errors = errors.slice();
check('0 page errors', errors.length === 0, errors.slice(0, 3));
writeJson(`gntfixM4a4-saveleg-s${seed}.json`, out);
console.log(fails.length ? `FAILS: ${fails.join(', ')}` : 'ALL PASS');
await browser.close();
process.exit(fails.length ? 1 : 0);
