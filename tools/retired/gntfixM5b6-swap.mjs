// gntfixM5b6-swap.mjs — copy of the net critic's tools/gntcnet6-swap.mjs (outputs renamed gntfixM5b6-swap*). Original: net critic r6: FULL-SLOT SKILL REWARD swap offers in multiplayer.
// Host + Fox (seat 1) + Wren (seat 2), each its own browser, own child server, guest links conditioned (N1).
// Checks: a full-loadout ally gets a SWAP skill card (never a node); only the owner decides (host UI + other
// guest refused, raw CMD -> not_owner); the owner's REAL keys (S / S / Enter) pick the replace target and take;
// on every client exactly 4 skills, the new skill in the chosen slot, the replaced skill's nodes on the bench
// (0 lost); Leave keeps the loadout; a stalled owner -> 30 s autopick with the AI suggestion, still 4 skills.
// node tools/gntfixM5b6-swap.mjs --port 7843 [--cond lat75,jit10,loss10]
import { openClient, closeClient, sleep, writeJson, shot, startServer, admin, PREVIEW } from './gntcnet6-lib.mjs';

const A = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => { if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]); return acc; }, []));
const port = Number(A.port || 7843);
const COND = A.cond || 'lat75,jit10,loss10';
const out = { tool: 'gntfixM5b6-swap', startedAt: new Date().toISOString(), port, cond: COND, checks: [], notes: [], errors: {} };
const check = (what, ok, got) => { out.checks.push({ what, ok: !!ok, got }); console.log(`${ok ? 'PASS' : 'FAIL'} ${what}${ok ? '' : ' ' + JSON.stringify(got).slice(0, 1200)}`); };
const note = (m, d) => { out.notes.push({ m, d }); console.log('[note] ' + m + (d !== undefined ? ' ' + JSON.stringify(d).slice(0, 900) : '')); };
const ev = (c, fn, arg) => c.page.evaluate(fn, arg);
async function waitOn(c, fn, { timeout = 30000, poll = 50, arg } = {}) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) { try { const v = await c.page.evaluate(fn, arg); if (v) return v; } catch { /* nav */ } await sleep(poll); }
  throw new Error(`${c.tag}: timeout ${String(fn).slice(0, 140)}`);
}
const card = (c, s) => ev(c, (q) => { const v = window.__echoes.state().run; if (!v.party) return null; const k = v.party.cards[q]; return k ? { seat: k.seat, type: k.type, id: k.id, swap: k.swap, replace: k.replace, decided: k.decided, choice: k.choice, by: k.by, suggest: k.suggest } : null; }, s);
const view = (c, s) => ev(c, (q) => { const v = window.__echoes.cmd('partyView', q); return v && { slots: v.slots, skills: (v.skills || []).map((k) => ({ id: k.id, sockets: (k.sockets || []).map((x) => (x ? x.node : null)) })), bench: (v.bench || []).map((b) => (b && typeof b === 'object' ? { node: b.node || b.id, prov: b.provenance || b.prov || null } : b)) }; }, s);
async function toPage(H) {
  for (let i = 0; i < 300; i++) {
    const r = await ev(H, () => { const E = window.__echoes; const v = E.state().run; if (v.phase === 'combat') E.cmd('killAllEnemies'); return v.phase === 'reward' && v.party ? 'page' : v.phase; });
    if (r === 'page') return r;
    await sleep(150);
  }
  return 'timeout';
}

let srv = null; const cl = [];
try {
  srv = await startServer(port, ['--admin']);
  const names = ['Host', 'Fox', 'Wren'];
  const url = (nm) => PREVIEW + `?menu=0&seed=11&netname=${nm}&net=${encodeURIComponent(`ws://127.0.0.1:${port}/echoes`)}`;
  for (const [i, nm] of names.entries()) cl[i] = await openClient(url(nm), { w: 1280, h: 720, tag: nm });
  await Promise.all(cl.map((c) => waitOn(c, () => window.__echoes.tick > 240, { timeout: 120000, poll: 200 })));
  const [H, F, W] = cl;
  const code = await ev(H, async () => (await window.__echoes.net.host({ visibility: 'private' })).code);
  const seats = [];
  for (const g of [F, W]) seats.push(await ev(g, async (c) => { const n = window.__echoes.net; const r = await n.join(c); n.setReady(true); return r.seat; }, code));
  const [fs, ws] = seats;
  await sleep(500);
  await ev(H, () => window.__echoes.net.start());
  await Promise.all([F, W].map((g) => waitOn(g, () => window.__echoes.net.session.status().synced, { timeout: 30000 })));
  const peers = await Promise.all([F, W].map((g) => ev(g, () => window.__echoes.net.peerId)));
  if (COND !== 'off') for (const p of peers) await admin(port, '/admin/conditioner', { target: p, up: COND, down: COND });
  for (const c of cl) await ev(c, () => { const E = window.__echoes; window.__se = []; for (const t of ['skill_swapped', 'swap_denied', 'party_autopick', 'draft_taken', 'draft_declined']) E.on(t, (e) => window.__se.push({ ...e, type: t, at: E.tick })); return 1; });
  await ev(H, () => window.__echoes.cmd('startCampaign', { level: 1 }));
  await waitOn(H, () => window.__echoes.state().run.phase === 'combat', { timeout: 30000 });
  for (const g of [F, W]) await waitOn(g, () => window.__echoes.state().run.phase === 'combat', { timeout: 30000 });
  await sleep(1200);
  const pools = await ev(H, () => { try { return window.__echoes.cmd('partyPools'); } catch (e) { return 'ERR ' + e.message; } });
  out.poolsShape = typeof pools === 'object' ? Object.keys(pools) : pools;
  note('seats', { code, fs, ws, pools: JSON.stringify(pools).slice(0, 700) });
  const v0 = await view(H, fs);
  note('Fox build at start (host view)', v0);

  // ------------------------------------------------ page 1
  check('page 1 reached', (await toPage(H)) === 'page');
  for (const g of [F, W]) await waitOn(g, () => { const v = window.__echoes.state().run; return v.phase === 'reward' && !!v.party; }, { timeout: 15000 });
  // give Fox two class nodes and socket them into the skill in slot 2 (host cmd: setup only)
  const tankNodes = await ev(H, (s) => { const E = window.__echoes; const p = E.cmd('partyPools'); const cls = E.cmd('partyView', s).classId || 'tank'; const byCls = (p.nodes && (p.nodes[cls] || p.nodes.tank)) || (p[cls] && p[cls].nodes) || null; return { cls, list: byCls ? byCls.slice(0, 6) : null }; }, fs);
  note('Fox class node pool (first 6)', tankNodes);
  const setup = await ev(H, ([s, list]) => {
    const E = window.__echoes; const r = { grants: [], sockets: [] };
    const v = E.cmd('partyView', s); const target = v.slots[2];
    const ids = (list || []).slice(0, 4).map((n) => (typeof n === 'string' ? n : n.id));
    for (const n of ids) r.grants.push(E.cmd('partyGrantNode', s, n));
    ids.forEach((n, k) => r.sockets.push(E.cmd('partySocket', s, v.slots[k], n)));
    r.byslot = Object.fromEntries(v.slots.map((sk, k) => [sk, ids[k]]));
    r.after = E.cmd('partyView', s).skills.map((k) => k.id + ':' + (k.sockets || []).filter(Boolean).map((x) => x.node).join('+'));
    r.target = target; return r;
  }, [fs, tankNodes.list]);
  note('setup: nodes socketed into Fox slot 2', setup);
  await sleep(1500);
  const c1 = await card(H, fs);
  const vPre = await view(H, fs);
  const wPre = await view(H, ws);
  check(`Fox (4 skills owned: ${JSON.stringify(vPre.slots)}) gets a SKILL swap card, not a node (${JSON.stringify(c1)})`, c1 && c1.type === 'skill' && c1.swap === true && vPre.slots.filter(Boolean).length === 4, { c1, vPre });
  const cW = await card(H, ws);
  check(`Wren (4 skills) also gets a skill swap card (${JSON.stringify(cW && { type: cW.type, swap: cW.swap })})`, cW && cW.type === 'skill' && cW.swap === true, cW);
  // ownership: host UI and Wren cannot decide Fox's swap
  const hostUi = await ev(H, (s) => window.__echoes.content.world().runSystem().partyPick(s, 'take', 0), fs);
  const wrenUi = await ev(W, (s) => window.__echoes.content.world().runSystem().partyPick(s, 'take', 0), fs);
  const hb = await ev(H, () => window.__echoes.net.session.partyStats());
  await ev(W, (s) => { window.__echoes.net.session.debugPartyCmd({ op: 'pick', seat: s, choice: 'take', replace: 1 }); return 1; }, fs);
  await sleep(1500);
  const ha = await ev(H, () => window.__echoes.net.session.partyStats());
  const c1b = await card(H, fs);
  check(`only the owner decides: host UI ${JSON.stringify(hostUi)}, Wren UI ${JSON.stringify(wrenUi)} refused; Wren's raw swap CMD -> host not_owner +${(ha.byReason.not_owner || 0) - (hb.byReason.not_owner || 0)}; Fox's card still undecided (${c1b.decided})`, hostUi === false && wrenUi === false && (ha.byReason.not_owner || 0) - (hb.byReason.not_owner || 0) === 1 && !c1b.decided, { hostUi, wrenUi, hb, ha, c1b });
  // Fox's REAL keys: S, S moves the Replaces mark, Enter takes.
  const markBefore = await ev(F, (s) => { const k = window.__echoes.state().run.party.cards[s]; return k.replace; }, fs);
  await F.page.bringToFront();
  await F.page.mouse.move(640, 700);
  await F.page.keyboard.press('KeyS'); await sleep(250);
  await F.page.keyboard.press('KeyS'); await sleep(400);
  const markLocal = await ev(F, (s) => { const k = window.__echoes.state().run.party.cards[s]; return { replace: k.replace, focus: document.activeElement && document.activeElement.textContent.trim().slice(0, 40) }; }, fs);
  await shot(F, 'gntfixM5b6-swap-fox-marked.png');
  await F.page.keyboard.press('Enter');
  await sleep(1800);
  const c1c = await card(H, fs);
  note('Fox real keys', { markBefore, markLocal, hostCardAfter: c1c });
  // Wren leaves, host leaves -> commit
  const wLeave = await ev(W, (s) => window.__echoes.content.world().runSystem().partyPick(s, 'leave'), ws);
  const hLeave = await ev(H, () => window.__echoes.content.world().runSystem().partyPick(0, 'leave'));
  note('Wren leave / host leave', { wLeave, hLeave });
  await Promise.all(cl.map((c) => waitOn(c, () => window.__echoes.state().run.phase !== 'reward', { timeout: 20000, poll: 30 })));
  await sleep(1500);
  const post = await Promise.all(cl.map((c) => view(c, fs)));
  const postW = await Promise.all(cl.map((c) => view(c, ws)));
  const slot = c1c && Number.isInteger(c1c.replace) ? c1c.replace : markLocal.replace;
  const replaced = vPre.slots[slot];
  const p0 = post[0];
  const benchNodes = (p0.bench || []).map((b) => (b && b.node) || b);
  const relNode = setup.byslot[replaced]; const lostNodes = relNode && !benchNodes.includes(relNode) ? [relNode] : []; const relBench = (p0.bench || []).find((b) => b && b.node === relNode) || null; out.released = { replaced, relNode, relBench, benchNodes };
  check(`Fox's own swap applied on the host: exactly 4 skills ${JSON.stringify(p0.slots)}, ${c1.id} in slot ${slot} (replaced ${replaced}), replaced skill gone, its node ${relNode} on the bench ${JSON.stringify(relBench)} (lost ${lostNodes.length})`, !!relNode && p0.slots.filter(Boolean).length === 4 && p0.slots.length === 4 && p0.slots[slot] === c1.id && !p0.slots.includes(replaced) && lostNodes.length === 0, { p0, slot, replaced, benchNodes, setup });
  check(`the swap chosen by keys matches the mark shown (S,S from ${markBefore} -> ${markLocal.replace}; applied slot ${slot})`, markLocal.replace === slot && markLocal.replace !== markBefore, { markBefore, markLocal, slot });
  const eqF = post.map((b) => JSON.stringify(b) === JSON.stringify(post[0]));
  const eqW = postW.map((b) => JSON.stringify(b) === JSON.stringify(postW[0]));
  check(`Fox's and Wren's builds equal on all 3 clients (${eqF.join(',')} / ${eqW.join(',')})`, eqF.every(Boolean) && eqW.every(Boolean), { post, postW });
  check(`Wren's Leave kept its loadout + sockets (${JSON.stringify(postW[0].slots)})`, JSON.stringify(postW[0].slots) === JSON.stringify(wPre.slots) && JSON.stringify(postW[0].skills) === JSON.stringify(wPre.skills), { wPre, w: postW[0] });
  const swEv = await Promise.all(cl.map((c) => ev(c, () => window.__se.filter((e) => e.type === 'skill_swapped').map((e) => ({ seat: e.seat, id: e.id, slot: e.slot, replaced: e.replaced, released: e.released, by: e.by })))));
  check(`skill_swapped seen once on every client (${swEv.map((x) => x.length).join('/')})`, swEv.every((x) => x.filter((e) => e.seat === fs).length === 1), swEv);
  out.page1 = { c1, vPre, post: p0, swEv: swEv[0] };

  // ------------------------------------------------ page 2: Fox stalls on a swap card
  await ev(H, () => window.__echoes.content.world().runSystem().choosePath(0));
  await waitOn(H, () => window.__echoes.state().run.phase === 'combat', { timeout: 20000 });
  await sleep(800);
  check('page 2 reached', (await toPage(H)) === 'page');
  for (const g of [F, W]) await waitOn(g, () => { const v = window.__echoes.state().run; return v.phase === 'reward' && !!v.party; }, { timeout: 15000 });
  const c2 = await card(H, fs);
  const v2pre = await view(H, fs);
  const opened = await ev(H, () => window.__echoes.state().run.party.openedTick);
  await ev(W, (s) => window.__echoes.content.world().runSystem().partyPick(s, 'leave'), ws);
  await ev(H, () => window.__echoes.content.world().runSystem().partyPick(0, 'leave'));
  note('page 2 Fox card (stall)', c2);
  await sleep(24000);
  await shot(W, 'gntfixM5b6-swap-stall-wren.png');
  await shot(F, 'gntfixM5b6-swap-stall-fox.png');
  await waitOn(H, () => window.__echoes.state().run.phase !== 'reward', { timeout: 20000, poll: 30 });
  const ap = await ev(H, () => window.__se.filter((e) => e.type === 'party_autopick'));
  const mine = ap.find((e) => e.seat === fs);
  await sleep(1500);
  const v2 = await Promise.all(cl.map((c) => view(c, fs)));
  const sug = c2 && c2.suggest;
  const exp = sug && (sug.choice === 'take' || sug === 'take') ? 'take' : 'leave';
  const secs = mine ? (mine.tick - opened) / 60 : null;
  const inBuild = (v, id) => v.slots.includes(id) || (v.bench || []).some((b) => b && b.node === id) || v.skills.some((k) => k.sockets.includes(id));
  const applied = c2.type === 'skill' ? (exp === 'take' ? (Number.isInteger(sug.replace) ? v2[0].slots[sug.replace] === c2.id : v2[0].slots.includes(c2.id)) : JSON.stringify(v2[0].slots) === JSON.stringify(v2pre.slots)) : (exp === 'take' ? inBuild(v2[0], c2.id) && !inBuild(v2pre, c2.id) : true);
  check(`stalled owner (card type ${c2 && c2.type}): the page commits ${secs && secs.toFixed(2)} s after it opened with the AI suggestion ${JSON.stringify(sug)} applied (${applied}); still exactly 4 skills ${JSON.stringify(v2[0].slots)}`, mine && Math.abs(secs - 30) <= 0.5 && applied && v2[0].slots.filter(Boolean).length === 4, { mine, sug, v2pre, v2: v2[0], c2 });
  const eq2 = v2.map((b) => JSON.stringify(b) === JSON.stringify(v2[0]));
  check(`after the autopick Fox's build equal on all clients (${eq2.join(',')})`, eq2.every(Boolean), v2);
  const hs = await Promise.all([F, W].map((g) => ev(g, () => { const d = window.__echoes.net.session.debugGuest(); return { desyncs: d.desyncs, hashChecks: d.hashChecks }; })));
  check(`0 desyncs (${hs.map((h) => h.desyncs + '/' + h.hashChecks).join(', ')})`, hs.every((h) => h.desyncs === 0 && h.hashChecks > 0), hs);
} catch (e) { out.crash = String(e && e.stack ? e.stack : e); console.log('CRASH', out.crash); }
finally {
  for (const c of cl) if (c) out.errors[c.tag] = c.errors;
  for (const c of cl) if (c) await closeClient(c);
  if (srv) srv.proc.kill();
  out.summary = `${out.checks.filter((c) => c.ok).length}/${out.checks.length}`;
  writeJson('gntfixM5b6-swap.json', out);
  console.log('SUMMARY', out.summary, 'pageErrors', JSON.stringify(out.errors));
}
