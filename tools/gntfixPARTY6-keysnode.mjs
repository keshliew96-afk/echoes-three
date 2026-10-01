#!/usr/bin/env node
// gntfixPARTY6 (PARTY6-F1) — headless key-order probe on a world built exactly
// like main.js: do swaps on the ally party page land in the key the card
// shows, and does a player's own key order survive later swaps?
//
// Scenarios (seeds x Level 1, rooms 1-6, the skill door when one is offered):
//   human   — every ally swap card is Taken BY THE PLAYER (partyPick 'take'
//             with replace k, k cycling 0-3): the new skill must sit in key
//             k, the other three keys unmoved; skill_swapped.slot = k.
//   mark    — the player only MOVES the Replaces mark (partyReplace k) on the
//             AI's pre-decided Take and commits from the Healer's card: the
//             new skill must sit in key k, the other keys unmoved.
//   reorder — after room 1 the player reorders every ally (keys 1 <-> 4);
//             later AI-decided swaps (untouched Suggested cards) must keep the
//             player's order: the new skill in the replaced key, others unmoved.
//   ai      — nobody touches anything (the autopilot path): the §25.8 rule —
//             after an AI swap the seat's keys follow its priority; the event
//             trace (skill_swapped + loadout_reorder) replays to the final
//             loadout exactly.
//   save    — reorder, save tree -> fresh world load: the arranged flag and
//             the order survive; a later AI swap keeps them.
//   node tools/gntfixPARTY6-keysnode.mjs [--seeds 1,2,3,4,5] [--verbose 1]
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { writeFileSync } from 'node:fs';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const u = (p) => pathToFileURL(join(here, p)).href;
const argv = process.argv.slice(2);
const opt = (k, d = null) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const SEEDS = (opt('seeds', '1,2,3,4,5') || '').split(',').map(Number);
const VERBOSE = opt('verbose') === '1';
const OUT = opt('out', 'gntfixPARTY6-keysnode');

const { createGameplayRng } = await import(u('src/core/rng.js'));
const { createRegistry } = await import(u('src/core/registry.js'));
const { createEventBus } = await import(u('src/core/events.js'));
const { createClock } = await import(u('src/core/clock.js'));
const { createWorld } = await import(u('src/sim/world.js'));
const { emptySnapshot } = await import(u('src/core/intents.js'));
const C = await import(u('src/data/classes.js'));

function mk(seed) {
  const rng = createGameplayRng(seed);
  const registry = createRegistry();
  const bus = createEventBus();
  const clock = createClock();
  const world = createWorld({ rng, registry, events: bus, harness: false, requestHitstop: clock.requestHitstop, room: null });
  const evs = [];
  bus.on('*', (e) => {
    if (e.type !== 'sound') evs.push(e);
  });
  const step = (n = 1) => {
    const goal = world.tick + n;
    for (let g = 0; world.tick < goal && g < n * 4 + 64; g++) clock.advance(1000 / 60, (t) => world.step(t, emptySnapshot()));
  };
  return { world, evs, step, R: () => world.runSystem(), P: () => world.partySystem() };
}

const results = [];
const cases = [];
function check(group, name, pass, got = null) {
  results.push({ group, name, pass: !!pass, got });
  if (VERBOSE || !pass) console.log(`${pass ? 'PASS' : 'FAIL'} [${group}] ${name}${got !== null ? ' ' + JSON.stringify(got).slice(0, 500) : ''}`);
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Replay skill_swapped / loadout_reorder events for `seat` over `pre`.
function replay(pre, evs, seat) {
  const s = [...pre];
  for (const e of evs) {
    if (e.seat !== seat) continue;
    if (e.type === 'skill_swapped') s[e.slot] = e.id;
    if (e.type === 'loadout_reorder') {
      const t = s[e.from];
      s[e.from] = s[e.to];
      s[e.to] = t;
    }
  }
  return s;
}

// Drive Level 1 rooms 1-6. `onPage(ctx)` runs on every open party page before
// the Healer's commit; `onPath(ctx)` on every door choice.
function drive(W, { onPage, onPath, rooms = 6 }) {
  W.R().startRun({ act: 1 });
  W.step(2);
  let pageNo = 0;
  let lastRoomPaged = -1;
  for (let t = 0; t < 40000; t += 30) {
    W.step(30);
    const v = W.R().view();
    if (v.phase === 'idle' || v.room > rooms) break;
    if (v.phase === 'combat' && t % 240 === 0) W.world.cmd('killAllEnemies');
    if (v.phase === 'reward' && v.party && v.room !== lastRoomPaged) {
      lastRoomPaged = v.room;
      const pre = [null, 1, 2, 3].map((s) => (s ? [...W.P().slots(s)] : null));
      const k0 = W.evs.length;
      const plan = onPage ? onPage({ W, v, pageNo, pre }) : null;
      // The Healer's card commits the page (Take its reward, as the autopilot).
      if (W.R().view().phase === 'reward') W.R().takeReward();
      const ev = W.evs.slice(k0).filter((e) => e.type === 'skill_swapped' || e.type === 'loadout_reorder');
      if (plan && plan.after) plan.after({ pre, ev, post: [null, 1, 2, 3].map((s) => (s ? [...W.P().slots(s)] : null)) });
      pageNo += 1;
    } else if (v.phase === 'reward' && !v.party) {
      W.R().takeReward();
    }
    if (v.phase === 'path') {
      const opts = v.path && v.path.options ? v.path.options : [];
      if (onPath) onPath({ W, v });
      const k = opts.findIndex((o) => o.reward === 'skill');
      W.world.cmd('pathChoose', k >= 0 ? (opts[k].side ?? k) : 0);
    }
    if (v.phase === 'shop') W.world.cmd('shopAdvance');
  }
}

const swapCards = (v) => (v.party ? v.party.cards.slice(1).filter((c) => c.type === 'skill' && c.swap) : []);

for (const seed of SEEDS) {
  // ---------------------------------------------------------------- human --
  {
    const W = mk(seed);
    drive(W, {
      onPage: ({ v, pageNo }) => {
        const picks = [];
        for (const c of swapCards(v)) {
          const k = (pageNo + c.seat) % 4;
          W.R().partyPick(c.seat, 'take', k);
          picks.push({ seat: c.seat, id: c.id, k });
        }
        return {
          after: ({ pre, ev, post }) => {
            for (const p of picks) {
              const want = [...pre[p.seat]];
              want[p.k] = p.id;
              const e = ev.find((x) => x.type === 'skill_swapped' && x.seat === p.seat);
              const ok = same(post[p.seat], want) && e && e.slot === p.k && same(replay(pre[p.seat], ev, p.seat), post[p.seat]);
              cases.push({ scenario: 'human', seed, seat: p.seat, k: p.k, id: p.id, pre: pre[p.seat], post: post[p.seat], want, eventSlot: e ? e.slot : null, ok });
              check('human', `seed ${seed} seat ${p.seat}: Take ${p.id} replacing key ${p.k + 1} -> new skill in key ${p.k + 1}, other keys unmoved, event slot ${p.k}`, ok, { pre: pre[p.seat], post: post[p.seat], want, eventSlot: e ? e.slot : null });
            }
          },
        };
      },
    });
  }
  // ----------------------------------------------------------------- mark --
  {
    const W = mk(seed);
    drive(W, {
      onPage: ({ v, pageNo }) => {
        const picks = [];
        for (const c of swapCards(v)) {
          if (!(c.decided && c.choice === 'take')) continue; // the AI's pre-decided Take only
          const k = (pageNo + c.seat + 1) % 4;
          W.R().partyReplace(c.seat, k);
          picks.push({ seat: c.seat, id: c.id, k });
        }
        return {
          after: ({ pre, ev, post }) => {
            for (const p of picks) {
              const want = [...pre[p.seat]];
              want[p.k] = p.id;
              const ok = same(post[p.seat], want) && same(replay(pre[p.seat], ev, p.seat), post[p.seat]);
              cases.push({ scenario: 'mark', seed, seat: p.seat, k: p.k, id: p.id, pre: pre[p.seat], post: post[p.seat], want, ok });
              check('mark', `seed ${seed} seat ${p.seat}: mark moved to key ${p.k + 1}, committed from the Healer's card -> ${p.id} in key ${p.k + 1}, others unmoved`, ok, { pre: pre[p.seat], post: post[p.seat], want });
            }
          },
        };
      },
    });
  }
  // -------------------------------------------------------------- reorder --
  {
    const W = mk(seed);
    let reordered = false;
    drive(W, {
      onPath: () => {
        if (reordered) return;
        reordered = true;
        for (const s of [1, 2, 3]) W.R().reorderLoadout(s, 0, 3);
      },
      onPage: ({ v }) => {
        if (!reordered) return null;
        const ai = swapCards(v).filter((c) => c.decided && c.choice === 'take' && c.by === 'ai').map((c) => ({ seat: c.seat, id: c.id, k: c.replace }));
        return {
          after: ({ pre, ev, post }) => {
            for (const p of ai) {
              const want = [...pre[p.seat]];
              want[p.k] = p.id;
              const ok = same(post[p.seat], want) && same(replay(pre[p.seat], ev, p.seat), post[p.seat]);
              cases.push({ scenario: 'reorder', seed, seat: p.seat, k: p.k, id: p.id, pre: pre[p.seat], post: post[p.seat], want, ok });
              check('reorder', `seed ${seed} seat ${p.seat}: after the player's reorder an AI Take of ${p.id} lands in the replaced key ${p.k + 1}, the player's order kept`, ok, { pre: pre[p.seat], post: post[p.seat], want });
            }
          },
        };
      },
    });
  }
  // -------------------------------------------------------------- timeout --
  // Manual mode (AI-held cards open undecided), the player moves the mark,
  // then the page times out (pages.timeoutPage — the network deadline's
  // path): a card whose suggestion is Take lands in the PLAYER's mark.
  {
    const W = mk(seed);
    W.P().setMode('manual');
    drive(W, {
      onPage: ({ v, pageNo }) => {
        const picks = [];
        for (const c of swapCards(v)) {
          if (c.decided) continue;
          const k = (pageNo + c.seat + 2) % 4;
          W.R().partyReplace(c.seat, k);
          picks.push({ seat: c.seat, id: c.id, k, sug: c.suggest ? c.suggest.choice : null });
        }
        W.R().partyPages().timeoutPage();
        return {
          after: ({ pre, ev, post }) => {
            for (const p of picks) {
              const want = [...pre[p.seat]];
              if (p.sug === 'take') want[p.k] = p.id;
              const ok = same(post[p.seat], want) && same(replay(pre[p.seat], ev, p.seat), post[p.seat]);
              cases.push({ scenario: 'timeout', seed, seat: p.seat, k: p.k, id: p.id, sug: p.sug, pre: pre[p.seat], post: post[p.seat], want, ok });
              check('timeout', `seed ${seed} seat ${p.seat}: mark moved to key ${p.k + 1}, the page times out (suggest ${p.sug}) -> ${p.sug === 'take' ? `${p.id} in key ${p.k + 1}, others unmoved` : 'loadout unchanged'}`, ok, { pre: pre[p.seat], post: post[p.seat], want });
            }
          },
        };
      },
    });
  }
  // ------------------------------------------------------------------- ai --
  {
    const W = mk(seed);
    drive(W, {
      onPage: ({ v }) => {
        const ai = swapCards(v).filter((c) => c.decided && c.choice === 'take' && c.by === 'ai').map((c) => ({ seat: c.seat, id: c.id, k: c.replace }));
        return {
          after: ({ pre, ev, post }) => {
            for (const p of ai) {
              const placed = [...pre[p.seat]];
              placed[p.k] = p.id;
              const want = C.prioritySorted(C.CLASS_OF_SEAT[p.seat], placed);
              const rep = replay(pre[p.seat], ev, p.seat);
              const ok = same(post[p.seat], want) && same(rep, post[p.seat]);
              cases.push({ scenario: 'ai', seed, seat: p.seat, k: p.k, id: p.id, pre: pre[p.seat], post: post[p.seat], want, replayed: rep, ok });
              check('ai', `seed ${seed} seat ${p.seat}: an untouched AI Take of ${p.id} -> keys in §25.8 priority order and the event trace replays to the final loadout`, ok, { pre: pre[p.seat], post: post[p.seat], want, replayed: rep });
            }
          },
        };
      },
    });
  }
}

// ----------------------------------------------------------------- save --
{
  const seed = SEEDS[0];
  const W = mk(seed);
  W.R().startRun({ act: 1 });
  W.step(2);
  // To the first door (a reorder is refused while combat is active).
  for (let t = 0; t < 6000 && W.R().view().phase !== 'path'; t += 30) {
    W.step(30);
    const v = W.R().view();
    if (v.phase === 'combat' && t % 240 === 0) W.world.cmd('killAllEnemies');
    if (v.phase === 'reward') W.R().takeReward();
  }
  const kit = [1, 2, 3].map((s) => [...W.P().slots(s)]);
  const ro = [1, 2, 3].map((s) => W.R().reorderLoadout(s, 0, 3));
  const before = [1, 2, 3].map((s) => [...W.P().slots(s)]);
  check('save', 'the reorder between rooms moved keys 1 <-> 4 on every ally', ro.every((r) => r && r.ok) && [0, 1, 2].every((i) => before[i][0] === kit[i][3] && before[i][3] === kit[i][0]), { kit, before, ro });
  const tree = structuredClone(W.world.saveState());
  const flags = [1, 2, 3].map((s) => !!(tree.systems.party.seats[s] && tree.systems.party.seats[s].arranged));
  const W2 = mk(seed);
  W2.world.loadState(tree);
  const after = [1, 2, 3].map((s) => [...W2.P().slots(s)]);
  const arranged2 = [1, 2, 3].map((s) => (typeof W2.P().arranged === 'function' ? W2.P().arranged(s) : null));
  check('save', 'the player-arranged flag is in the save tree for every reordered seat', flags.every(Boolean), flags);
  check('save', 'the reordered keys and the flag survive a save -> fresh-world load', same(before, after) && arranged2.every((x) => x === true), { before, after, arranged2 });
  // An untouched (never arranged) seat writes no flag (old trees byte-identical).
  const W3 = mk(seed);
  W3.R().startRun({ act: 1 });
  W3.step(2);
  const t3 = W3.world.saveState();
  check('save', 'a never-arranged seat writes no flag', [1, 2, 3].every((s) => !('arranged' in t3.systems.party.seats[s])), [1, 2, 3].map((s) => Object.keys(t3.systems.party.seats[s])));
}

const by = (g) => results.filter((r) => r.group === g);
const summary = {};
for (const g of ['human', 'mark', 'reorder', 'timeout', 'ai', 'save']) summary[g] = `${by(g).filter((r) => r.pass).length}/${by(g).length}`;
const ok = results.every((r) => r.pass);
writeFileSync(join(here, 'captures', `${OUT}.json`), JSON.stringify({ ok, summary, cases, results }, null, 1));
console.log(JSON.stringify({ ok, summary, fails: results.filter((r) => !r.pass).length }));
process.exit(ok ? 0 : 1);
