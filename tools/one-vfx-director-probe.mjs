#!/usr/bin/env node
// ONE VFX DIRECTOR probe (AUDIT D5, docs/CODE_HEALTH.md "One VFX director")
// — headless Node.
//
//   node tools/one-vfx-director-probe.mjs
//
// Checks:
//   1. The dispatch (render/vfx/sig/common.js createVfxDispatch) holds one
//      sim-bus subscription per event type, however many handlers register.
//   2. It runs every handler of an event in the order the bus would have run
//      them had each subscribed on its own (so no look changes order).
//   3. Source: the director (render/vfx/signature.js) is the only VFX file
//      that reaches the sim bus; the template layer (templates.js), the class
//      layer parts (render/vfx/sig/) and their helper layers (bell, dusk,
//      tide, tonic, shrine, secret, relic6, foe and bolt fx) register on the
//      dispatch they are handed, and the director hands every part the same
//      dispatch.
// Exit code 1 on any failure.
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { readFileSync, readdirSync } from 'node:fs';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const u = (p) => pathToFileURL(join(here, p)).href;
const { createEventBus } = await import(u('src/core/events.js'));
const { createVfxDispatch } = await import(u('src/render/vfx/sig/common.js'));

let pass = 0;
let fail = 0;
function check(ok, label) {
  if (ok) pass++;
  else fail++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}`);
}

// 1 and 2: the same registrations, once straight on a bus, once through the
// dispatch; the same emissions; the same call order.
{
  const plan = [];
  const types = ['skill_cast', 'hit', 'death', 'zone_tick', 'ally_dash'];
  for (let i = 0; i < 40; i++) plan.push(types[(i * 7 + (i >> 2)) % types.length]);
  const run = (useDispatch) => {
    const bus = createEventBus();
    let subs = 0;
    const counted = { on: (t, f) => (subs++, bus.on(t, f)) };
    const target = useDispatch ? createVfxDispatch(counted) : counted;
    const calls = [];
    plan.forEach((t, i) => target.on(t, (ev) => calls.push(`${ev.type}:${i}`)));
    for (let k = 0; k < 12; k++) bus.emit(k, types[(k * 3) % types.length], {});
    return { calls, subs, target };
  };
  const a = run(false);
  const b = run(true);
  check(b.subs === new Set(plan).size && b.target.types() === b.subs, `one bus subscription per event type (${b.subs} for ${plan.length} handlers on ${new Set(plan).size} types; straight on the bus: ${a.subs})`);
  check(b.target.handlers() === plan.length, `every handler is kept (${b.target.handlers()})`);
  check(a.calls.length > 0 && JSON.stringify(a.calls) === JSON.stringify(b.calls), `every event runs its handlers in the bus's own order (${b.calls.length} calls)`);
}

// 3. Source
{
  const vfx = join(here, 'src/render/vfx');
  const sig = join(vfx, 'sig');
  const read = (p) => readFileSync(p, 'utf8');
  const dir = read(join(vfx, 'signature.js'));
  check((dir.match(/createVfxDispatch\(/g) || []).length === 1 && /bus: eventBus/.test(dir), 'the director builds the one dispatch from the sim bus');
  check(!/eventBus\.on\(/.test(dir), 'the director itself registers through the dispatch, never on the bus');
  const parts = readdirSync(sig).filter((f) => f.endsWith('.js') && f !== 'common.js');
  const users = parts.filter((f) => /\bbus\.on\(/.test(read(join(sig, f))));
  const handedBus = (dir.match(/Object\.assign\(SF, createSig\w+\(\{[^}]*\bbus\b/g) || []).length;
  check(users.length > 0 && handedBus === users.length, `every class-layer part that listens gets the director's dispatch (${handedBus} of ${users.length})`);
  const party = read(join(sig, 'party.js'));
  const layers = ['createTemplateFx', 'createTideFx', 'createBellFx', 'createDuskFx', 'createTonicFx', 'createShrineFx', 'createSecretFx', 'createRelic6Fx', 'createFoeFx', 'createBoltFx'];
  const viaDispatch = layers.filter((n) => new RegExp(`${n}\\(\\{[^}]*\\bbus\\b`).test(party));
  check(viaDispatch.length === layers.length, `the template layer and the helper layers are handed the dispatch (${viaDispatch.length}/${layers.length})`);
  const outside = readdirSync(vfx)
    .filter((f) => f.endsWith('.js'))
    .filter((f) => /createSignatureFx|createTemplateFx|createTideFx|createBellFx|createDuskFx|createTonicFx|createShrineFx|createSecretFx|createRelic6Fx|createFoeFx|createBoltFx/.test(read(join(vfx, f))))
    .filter((f) => f !== 'signature.js');
  const mainSrc = read(join(here, 'src/main.js'));
  const callers = (mainSrc.match(/create(TemplateFx|TideFx|BellFx|DuskFx|TonicFx|ShrineFx|SecretFx|Relic6Fx|FoeFx|BoltFx)\(/g) || []).length;
  check(callers === 0, `no layer is built outside the director (main.js builds ${callers})`);
  check(outside.length > 0, `the layer modules (${outside.length}) export their factories for the director`);
}

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
