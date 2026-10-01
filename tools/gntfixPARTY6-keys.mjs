// gntfixPARTY6 (PARTY6-F1) — page probe by REAL input: where does a swap on the
// ally party page land, by every path that is not the critic's own S + Enter?
//   untouched — nobody touches the ally cards (Suggested pre-picks), F1 + Enter:
//               the AI's take lands where the card's line says ("AI cast order:
//               lands in key N", else the marked key) and skill_swapped +
//               loadout_reorder events replay to the committed loadout
//   mark      — F2..F4 + S (mark moved, no Enter on the ally tab), F1 + Enter:
//               the new skill in the MARKED key, the other keys unmoved
//   pad       — mocked pad: RB to each ally tab, D-pad down, A: marked key,
//               others unmoved
//   reorder   — the critic's reorder (B, F2..F4, 1, ← to the header, Enter, 4)
//               then an untouched AI take on the next skill page: the player's
//               order kept, the new skill in the replaced key
// Plus: __echoes.party surface, the Healer card-0 mirror after S, save tree
// carries `arranged` and applying a tree without it drops it again.
//   node tools/gntfixPARTY6-keys.mjs [--url u] [--seeds 1,2,3] [--modes untouched,mark,pad,reorder] [--w 1600 --h 900] [--tag t]
import { launch, open, E, sleep, waitFor, shot, writeJson } from './gntcparty6-lib.mjs';
const argv = process.argv.slice(2);
const opt = (k, d = null) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const BASEURL = opt('url', 'http://127.0.0.1:5199/');
const SEEDS = opt('seeds', '1,2,3').split(',').map(Number);
const MODES = opt('modes', 'untouched,mark,pad,reorder').split(',');
const W = Number(opt('w', 1600));
const H = Number(opt('h', 900));
const TAG = opt('tag', '');
const out = { url: BASEURL, size: `${W}x${H}`, rows: [], checks: [], errors: [] };
const check = (name, pass, got) => {
  out.checks.push({ name, pass: !!pass, got });
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}${got !== undefined ? ' ' + JSON.stringify(got).slice(0, 400) : ''}`);
};
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const slots = (page, s) => E(page, (x) => window.__echoes.cmd('partyView', x).slots, s);
const screen = (page) => E(page, () => window.__echoes.runUi().screen);
async function clearRoom(page) {
  for (let i = 0; i < 60; i++) {
    if ((await screen(page)) === 'draft') return true;
    await E(page, () => {
      window.__echoes.cmd('killAllEnemies');
      return 1;
    });
    await sleep(1500);
  }
  return false;
}
async function commitHealer(page) {
  await page.keyboard.press('F1');
  await sleep(350);
  for (let i = 0; i < 6; i++) {
    if ((await screen(page)) !== 'draft') break;
    await page.keyboard.press('Enter');
    await sleep(650);
  }
  await sleep(400);
}
const cardsOf = (page) => E(page, () => window.__echoes.state().run.party.cards.map((c) => ({ seat: c.seat, type: c.type, id: c.id, swap: c.swap, replace: c.replace, decided: c.decided, choice: c.choice, by: c.by, keyed: !!c.keyed })));
const evMark = (page) => E(page, () => window.__echoes.tick);
// Replay skill_swapped / loadout_reorder for `seat` over `pre`.
async function replay(page, pre, seat, t0) {
  const ev = await E(page, (a) => window.__echoes.events.filter((e) => (e.type === 'skill_swapped' || e.type === 'loadout_reorder') && e.seat === a.s && e.tick >= a.t0).map((e) => ({ type: e.type, tick: e.tick, slot: e.slot, id: e.id, from: e.from, to: e.to })), { s: seat, t0 });
  return ev;
}
async function lineOf(page) {
  return E(page, () => {
    const l = document.querySelector('.rn-draft .rn-repline');
    const sel = document.querySelector('.rn-draft .rn-rep.rn-sel');
    return { line: l ? l.textContent : null, sel: sel ? Number(sel.dataset.slot) : null };
  });
}

const b = await launch({ width: W, height: H });
try {
  for (const seed of SEEDS) {
    for (const mode of MODES) {
      let page, errors;
      try {
        ({ page, errors } = await open(b, `${BASEURL}?menu=0&seed=${seed}`, { width: W, height: H }));
      } catch (e) {
        out.rows.push({ seed, mode, err: 'boot ' + e.message });
        continue;
      }
      try {
        await E(page, () => {
          window.__echoes.cmd('startRun', { act: 1 });
          return 1;
        });
        await waitFor(page, () => window.__echoes.state().run.phase === 'combat', null, 30000);
        await sleep(900);
        if (mode === 'reorder') {
          // Room 1: leave every ally card (keep the kits), then the critic's reorder by real keys.
          await clearRoom(page);
          await sleep(1300);
          await E(page, () => {
            for (const s of [1, 2, 3]) window.__echoes.cmd('partyPick', s, 'leave');
            return 1;
          });
          await commitHealer(page);
          await waitFor(page, () => window.__echoes.state().run.phase === 'path', null, 20000);
          await page.keyboard.press('KeyB');
          await sleep(900);
          const kit = {};
          for (const s of [1, 2, 3]) {
            kit[s] = await slots(page, s);
            await page.keyboard.press(['F1', 'F2', 'F3', 'F4'][s]);
            await sleep(600);
            for (const k of ['Digit1', 'ArrowLeft', 'ArrowLeft', 'ArrowLeft', 'ArrowLeft', 'ArrowLeft', 'ArrowLeft', 'ArrowLeft', 'ArrowLeft', 'ArrowLeft', 'Enter', 'Digit4']) {
              await page.keyboard.press(k);
              await sleep(380);
            }
          }
          const reordered = {};
          for (const s of [1, 2, 3]) reordered[s] = await slots(page, s);
          const arranged = await E(page, () => [1, 2, 3].map((s) => window.__echoes.party.arranged(s)));
          check(`seed ${seed} reorder: rows 1 <-> 4 by real keys, every ally marked player-arranged`, [1, 2, 3].every((s) => reordered[s][0] === kit[s][3] && reordered[s][3] === kit[s][0]) && arranged.every(Boolean), { kit, reordered, arranged });
          await page.keyboard.press('Escape');
          await sleep(900);
          // Save tree carries the flag; a tree without it drops it again; the flag returns with the tree.
          const sv = await E(page, () => {
            const S = window.__echoes.save;
            const t = S.capture();
            const flags = [1, 2, 3].map((s) => t.systems.party.seats[s].arranged === true);
            const t2 = structuredClone(t);
            for (const s of [1, 2, 3]) delete t2.systems.party.seats[s].arranged;
            S.apply(t2);
            const off = [1, 2, 3].map((s) => window.__echoes.party.arranged(s));
            S.apply(t);
            const on = [1, 2, 3].map((s) => window.__echoes.party.arranged(s));
            return { flags, off, on, slots: [1, 2, 3].map((s) => window.__echoes.party.view(s).slots), phase: window.__echoes.state().run.phase, screen: window.__echoes.runUi().screen };
          });
          check(`seed ${seed} save: the tree carries arranged, the loader reads it (off without, on with)`, sv.flags.every(Boolean) && sv.off.every((x) => x === false) && sv.on.every(Boolean) && [1, 2, 3].every((s, i) => same(sv.slots[i], reordered[s])), sv);
          await sleep(900);
          out.rows.push({ seed, mode, afterApply: await E(page, () => ({ phase: window.__echoes.state().run.phase, screen: window.__echoes.runUi().screen })) });
          // Walk doors until a skill page; leave non-skill pages.
          let found = false;
          for (let hop = 0; hop < 5 && !found; hop++) {
            await waitFor(page, () => window.__echoes.state().run.phase === 'path', null, 20000);
            const pick = await E(page, () => {
              const o = window.__echoes.state().run.path.options;
              const k = o.find((x) => x.reward === 'skill');
              return k ? { side: k.side, skill: true } : { side: o[0].side, skill: false };
            });
            await E(page, (sd) => window.__echoes.content.world().runSystem().choosePath(sd), pick.side);
            await waitFor(page, () => ['combat', 'shop'].includes(window.__echoes.state().run.phase), null, 30000);
            await sleep(900);
            await clearRoom(page);
            await sleep(1300);
            if (pick.skill) {
              found = true;
              break;
            }
            await E(page, () => {
              for (const s of [1, 2, 3]) window.__echoes.cmd('partyPick', s, 'leave');
              window.__echoes.cmd('draftDecline');
              return 1;
            });
          }
          if (!found) {
            out.rows.push({ seed, mode, skip: 'no skill page' });
            await page.close();
            continue;
          }
        } else {
          await clearRoom(page);
          await sleep(1400);
        }
        const cards = await cardsOf(page);
        const pre = {};
        for (const s of [1, 2, 3]) pre[s] = await slots(page, s);
        const plan = {};
        // Per-mode input on each ally swap card.
        for (const s of [1, 2, 3]) {
          const c = cards.find((x) => x.seat === s);
          if (!c || c.type !== 'skill' || !c.swap) continue;
          if (mode === 'untouched' || mode === 'reorder') {
            if (!(c.decided && c.choice === 'take')) continue;
            await page.keyboard.press(['F1', 'F2', 'F3', 'F4'][s]);
            await sleep(450);
            const l = await lineOf(page);
            const m = l.line ? /→ key (\d)/.exec(l.line) : null;
            plan[s] = { id: c.id, marked: l.sel, line: l.line, expectKey: m ? Number(m[1]) - 1 : l.sel, sorted: !!m };
            await shot(page, `gntfixPARTY6-keys${TAG}-${mode}-s${seed}-seat${s}-mid`);
          } else if (mode === 'mark') {
            if (!(c.decided && c.choice === 'take')) continue; // the AI's pre-decided Take: only the mark moves
            await page.keyboard.press(['F1', 'F2', 'F3', 'F4'][s]);
            await sleep(450);
            await page.keyboard.press('KeyS');
            await sleep(400);
            const l = await lineOf(page);
            plan[s] = { id: c.id, marked: l.sel, line: l.line, expectKey: l.sel, prior: c };
            await shot(page, `gntfixPARTY6-keys${TAG}-${mode}-s${seed}-seat${s}-mid`);
          } else if (mode === 'pad') {
            // Go to the Healer's tab first, then RB s times.
            await page.keyboard.press('F1');
            await sleep(400);
            for (let k = 0; k < s; k++) await E(page, () => window.__padPress(5));
            await sleep(300);
            await E(page, () => window.__padPress(13));
            await sleep(400);
            const l = await lineOf(page);
            const vs = await E(page, () => window.__echoes.runUi().draft.viewSeat);
            plan[s] = { id: c.id, marked: l.sel, line: l.line, expectKey: l.sel, viewSeat: vs };
            await shot(page, `gntfixPARTY6-keys${TAG}-${mode}-s${seed}-seat${s}-mid`);
            await E(page, () => window.__padPress(0));
            await sleep(700);
          }
        }
        if (mode === 'untouched' && Object.keys(plan).length === 0) {
          out.rows.push({ seed, mode, skip: 'no AI take swap card', cards });
          await page.close();
          continue;
        }
        const k0 = await evMark(page);
        await commitHealer(page);
        await waitFor(page, () => window.__echoes.state().run.phase !== 'reward', null, 20000).catch(() => null);
        for (const s of Object.keys(plan).map(Number)) {
          const p = plan[s];
          const after = await slots(page, s);
          const got = after.indexOf(p.id);
          const ev = await replay(page, pre[s], s, k0);
          // Replay the events since the page opened.
          const r = [...pre[s]];
          for (const e of ev) {
            if (e.type === 'skill_swapped') r[e.slot] = e.id;
            if (e.type === 'loadout_reorder') {
              const t = r[e.from];
              r[e.from] = r[e.to];
              r[e.to] = t;
            }
          }
          const othersKept = p.sorted ? null : same(pre[s].filter((x, k) => k !== p.marked), after.filter((x) => x !== p.id)) && after.every((x, k) => k === got || x === pre[s][k]);
          const ok = got === p.expectKey && (othersKept === null || othersKept) && same(r, after);
          out.rows.push({ seed, mode, seat: s, offered: p.id, marked: p.marked, line: p.line, expectKey: p.expectKey, pre: pre[s], after, gotKey: got, othersKept, replayed: r, ok, viewSeat: p.viewSeat });
          check(`seed ${seed} ${mode} seat ${s}: ${p.id} -> key ${got + 1} (card: ${p.sorted ? 'line says' : 'marked'} key ${p.expectKey + 1})${othersKept === null ? ' [AI sort]' : othersKept ? ', other keys unmoved' : ', OTHER KEYS MOVED'}, events replay ${same(r, after)}`, ok, { pre: pre[s], after, line: p.line });
        }
        if (seed === SEEDS[0] && mode === MODES[0]) {
          const api = await E(page, () => {
            const P = window.__echoes.party;
            if (!P) return null;
            return {
              keys: Object.keys(P),
              state: !!P.state() && P.state().seats.length,
              view: P.view(2).slots,
              pools: P.pools(3) ? Object.keys(P.pools(3)) : null,
              verdict: P.verdict(1, P.view(1).slots[0], 'sharpen'),
              aiLog: Array.isArray(P.aiLog()) || typeof P.aiLog() === 'object',
              oracle: Object.keys(P.oracle().pools),
              cmd: P.cmd('view', 1) ? P.cmd('view', 1).slots : null,
            };
          });
          check('__echoes.party: state / view / pools / verdict / aiLog / oracle / cmd', api && api.state === 3 && Array.isArray(api.view) && api.pools && api.verdict && api.aiLog && api.oracle.length === 3 && Array.isArray(api.cmd), api);
        }
        if (errors.length) out.errors.push({ seed, mode, errors: errors.slice(0, 3) });
      } catch (e) {
        out.rows.push({ seed, mode, err: String(e.message || e).slice(0, 300) });
        console.log('ERR', seed, mode, e.message);
      }
      await page.close();
    }
  }
  // The Healer's card-0 mirror follows its Replaces mark at once.
  {
    const { page, errors } = await open(b, `${BASEURL}?menu=0&seed=${SEEDS[0]}`, { width: W, height: H });
    await E(page, () => {
      window.__echoes.cmd('startRun', { act: 1 });
      return 1;
    });
    await waitFor(page, () => window.__echoes.state().run.phase === 'combat', null, 30000);
    await E(page, () => {
      window.__echoes.cmd('giveSkill', 'lantern_flurry');
      window.__echoes.cmd('giveSkill', 'dewfall');
      return 1;
    });
    await sleep(900);
    await clearRoom(page);
    await sleep(1400);
    const c0 = await E(page, () => window.__echoes.state().run.party.cards[0]);
    if (c0 && c0.swap) {
      await page.keyboard.press('F1');
      await sleep(300);
      await page.keyboard.press('KeyS');
      await sleep(400);
      const m = await E(page, () => ({ mirror: window.__echoes.state().run.party.cards[0].replace, reward: window.__echoes.state().run.reward.replace, sel: Number(document.querySelector('.rn-draft .rn-rep.rn-sel').dataset.slot) }));
      check('the Healer card-0 mirror follows the mark (state().run.party.cards[0].replace = run.reward.replace = the marked tile)', m.mirror === m.sel && m.reward === m.sel, m);
    } else check('the Healer card-0 mirror (no swap card on this seed)', true, c0);
    if (errors.length) out.errors.push({ healer: true, errors: errors.slice(0, 3) });
    await page.close();
  }
} finally {
  await b.close();
}
const tested = out.rows.filter((r) => r.ok !== undefined);
out.summary = { tested: tested.length, ok: tested.filter((r) => r.ok).length, checks: `${out.checks.filter((c) => c.pass).length}/${out.checks.length}`, pageErrors: out.errors.length };
writeJson(`gntfixPARTY6-keys${TAG}`, out);
console.log(JSON.stringify(out.summary));
