#!/usr/bin/env node
// M5a multi-client network harness (docs/gauntlet/PLAN.md §6.7 — fixed path,
// CLI and output schema; M5b, critics and refuters run it READ-ONLY).
//
//   node tools/gnt-M5a-netbench.mjs --server ws://127.0.0.1:<port>/echoes
//        [--pages 2] [--bots 0] [--seconds 60] [--url http://127.0.0.1:5199/]
//        [--cond lat75,jit10,loss10,dup1,reo2,burst0.05:0.3:0.8] [--mode lobby|combat|boss]
//        [--drop guest:3000@20s | host:close@30s] [--out captures/<prefix>netbench.json]
//        [--seed 7] [--rate 20] [--gpu 1] [--headful] [--w 1600 --h 900] [--settle 8]
//
// Clients: `--pages` Chrome pages (MULTI-PAGE launch profile, tools/gnt-arch-
// browser.mjs: background:true, each page in its OWN window — tabs of one
// window are hidden and stop rAF; see gntM5a-botlib.mjs openEchoesWindow) —
// page 0 hosts (?nethost=1), the others join
// (?netjoin=CODE) — plus `--bots` Node WebSocket bots (tools/gntM5a-botlib.mjs,
// the same src/net client). Bots fill the free seats of the page room; bots
// beyond it form extra rooms hosted by a Node bot that runs the REAL sim
// headless. Every client uses src/net/lobbyClient.js unchanged.
//
// --cond shapes every GUEST link in both directions (the PLAN's N1-N4 are per
// guest link; the host link stays clean): through the server admin API when
// the server runs with --admin (true per-link shaping, visible in /stats),
// otherwise client-side (?netcond= on guest pages, the bots' own transport).
// The report says which (`condVia`).
// --mode lobby: everyone connected in one lobby, no game; combat: the host
// starts Act I with M4a's autopilot (restarted if the run ends); boss: the
// same from room 8 (the Hollow Stag + adds).
// --drop guest:MS@Ts: at T seconds the first guest's link goes down for MS
// (admin: POST /admin/drop close+forMs; else the page's net.drop(MS));
// host:close@Ts: the host is killed (admin: /admin/kill-host -> 10 s grace ->
// migration; else the host page disconnects).
//
// Output (one JSON object, schema echoes-netbench/1): { schema, startedAt,
// server, cond, condVia, pages, bots, seconds, mode, perClient: [{ kind, role,
// seat, rttMs: {p50, p95}, lossPct, bytesInPerSec: {avg, p95}, bytesOutPerSec:
// {avg, p95}, snapshotBytes: {avg, fullAvg, deltaRatio}, desyncs, predErr:
// {p95, max}, ownActionFeedbackMs: {p95}, reconnects, lastReconnectMs, fps:
// {avg, p5}, frameOver50, pageErrors, … }], server: { rooms, peers, drops,
// reorders, … }, verdict: { gates: { 'G5a.3': bool, … }, notes } }.
// Exit 0 even when a gate fails (the verdict says so); exit 1 only for a
// harness crash or page errors.
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchEchoes, FLAGS } from './gnt-arch-browser.mjs';
import { createGuestBot, createSimHostBot, openEchoesWindow } from './gntM5a-botlib.mjs';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const has = (k) => argv.includes(`--${k}`);
const arg = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 && argv[i + 1] !== undefined && !argv[i + 1].startsWith('--') ? argv[i + 1] : d;
};
const opt = {
  server: arg('server', null),
  pages: Number(arg('pages', 2)),
  bots: Number(arg('bots', 0)),
  seconds: Number(arg('seconds', 60)),
  url: arg('url', 'http://127.0.0.1:5199/'),
  cond: arg('cond', null),
  mode: arg('mode', 'combat'),
  drop: arg('drop', null),
  out: arg('out', 'captures/gntM5a-netbench.json'),
  seed: Number(arg('seed', 7)),
  rate: arg('rate', null),
  gpu: arg('gpu', '1') !== '0',
  headful: has('headful'),
  w: Number(arg('w', 1600)),
  h: Number(arg('h', 900)),
  settle: Number(arg('settle', 8)),
};
if (!opt.server || !/^wss?:\/\//.test(opt.server)) {
  console.error('usage: node tools/gnt-M5a-netbench.mjs --server ws://127.0.0.1:<port>/echoes [--pages 2] [--bots 0] [--seconds 60] [--cond …] [--mode lobby|combat|boss] [--drop …] [--out f]');
  process.exit(1);
}
if (!['lobby', 'combat', 'boss'].includes(opt.mode)) {
  console.error(`--mode must be lobby, combat or boss (got ${opt.mode})`);
  process.exit(1);
}
const httpBase = opt.server.replace(/^ws/, 'http').replace(/\/echoes\/?$/, '');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const logLine = (s) => console.log(`[netbench] ${s}`);
const pct = (arr, p) => {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(s.length * p))];
};
const r1 = (v) => (v === null || v === undefined || !Number.isFinite(v) ? null : Math.round(v * 10) / 10);

function parseDrop(s) {
  if (!s) return null;
  const m = /^(guest|host):(\d+|close)@(\d+(?:\.\d+)?)s?$/.exec(s);
  if (!m) throw new Error(`--drop must look like guest:3000@20s or host:close@30s (got ${s})`);
  return { who: m[1], ms: m[2] === 'close' ? null : Number(m[2]), mode: m[2] === 'close' ? 'close' : 'drop', atSec: Number(m[3]) };
}

async function getJSON(path, init) {
  try {
    const r = await fetch(`${httpBase}${path}`, init);
    return { status: r.status, body: await r.json() };
  } catch (err) {
    return { status: 0, body: null, error: String(err.message || err) };
  }
}
const post = (path, body) => getJSON(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

const startedAt = new Date().toISOString();
const report = {
  schema: 'echoes-netbench/1',
  startedAt,
  serverUrl: opt.server,
  cond: opt.cond,
  condVia: null,
  pages: opt.pages,
  bots: opt.bots,
  seconds: opt.seconds,
  mode: opt.mode,
  url: opt.url,
  drop: opt.drop,
  launch: { profile: 'multi-page', windows: 'one per page', gpu: opt.gpu, headful: opt.headful, flags: [...FLAGS.background] },
  perClient: [],
  server: null,
  verdict: { gates: {}, notes: [] },
};

// A dev-server HMR full reload (other agents edit src/** while this runs)
// destroys the pages' network sessions mid-run; the whole run is retried
// (up to 3 attempts) instead of reporting a half-measured session.
let browser = null;
let pages = []; // { page, errors, consoleLines, role, name }
let bots = []; // botlib objects
let crashed = null;
let drop = null;
const isNavError = (err) => /Execution context was destroyed|Cannot find context|Target closed|detached Frame|navigation/i.test(String(err && err.message ? err.message : err));
for (let attempt = 1; attempt <= 3; attempt++) {
  browser = null;
  pages = [];
  bots = [];
  crashed = null;
  report.perClient = [];
  report.server = null;
  report.verdict = { gates: {}, notes: [] };
  report.attempt = attempt;
  delete report.error;

  try {
    drop = parseDrop(opt.drop);
    const health = await getJSON('/health');
    if (!health.body || !health.body.ok) throw new Error(`server not reachable at ${httpBase}/health (${health.error || health.status}) — start it with: npm run net -- --port <port> --admin`);
    const statsProbe = await getJSON('/stats');
    const admin = statsProbe.status === 200 && statsProbe.body && statsProbe.body.ok;
    report.condVia = opt.cond ? (admin ? 'server-admin' : 'client') : 'none';
    if (!admin) report.verdict.notes.push('server started without --admin: conditions applied client-side, drops via the client, no server /stats');
    logLine(`server ok (protocol ${health.body.protocol}), admin ${admin ? 'on' : 'off'}; ${opt.pages} page(s) + ${opt.bots} bot(s), ${opt.seconds}s ${opt.mode}${opt.cond ? `, cond ${opt.cond} via ${report.condVia}` : ''}`);

    const netQ = (extra) => {
      const q = new URLSearchParams({ menu: '0', net: opt.server, ...extra });
      if (opt.rate) q.set('netrate', String(opt.rate));
      return `${opt.url}${opt.url.includes('?') ? '&' : '?'}${q.toString()}`;
    };
    const clientCond = opt.cond && !admin ? opt.cond : null;

    // ------------------------------------------------------------ host --
    let code = null;
    let hostKind = null;
    if (opt.pages > 0) {
      browser = await launchEchoes({ gpu: opt.gpu, headful: opt.headful, background: true, width: opt.w, height: opt.h });
      const hp = await openEchoesWindow(browser, netQ({ seed: String(opt.seed), nethost: '1', netname: 'Host' }), { width: opt.w, height: opt.h });
      pages.push({ ...hp, role: 'host', name: 'Host' });
      code = await hp.page.evaluate(async () => {
        const t0 = performance.now();
        while (performance.now() - t0 < 20000) {
          const n = window.__echoes && window.__echoes.net;
          if (n && n.code) return n.code;
          await new Promise((r) => setTimeout(r, 100));
        }
        return null;
      });
      if (!code) {
        // A build whose net service ignores ?nethost: host through the API.
        code = await hp.page.evaluate(async () => {
          const r = await window.__echoes.net.host({ visibility: 'private' });
          return r && r.ok ? r.code : null;
        });
      }
      hostKind = 'page';
    } else if (opt.bots > 0) {
      const hb = await createSimHostBot({ server: opt.server, name: 'BotHost', act: opt.mode === 'boss' ? 1 : 1, room: opt.mode === 'boss' ? 8 : 1, seed: opt.seed });
      const r = await hb.net.host({ visibility: 'private' });
      code = r.ok ? r.code : null;
      bots.push(hb);
      hostKind = 'bot';
    }
    if (!code) throw new Error('the host could not create a room');
    report.room = code;
    logLine(`room ${code} hosted by a ${hostKind}`);

    // ---------------------------------------------------------- guests --
    for (let i = 1; i < opt.pages; i++) {
      const gp = await openEchoesWindow(browser, netQ({ seed: String(opt.seed + i), netjoin: code, netname: `Guest${i}`, ...(clientCond ? { netcond: clientCond } : {}) }), { width: opt.w, height: opt.h });
      pages.push({ ...gp, role: 'guest', name: `Guest${i}` });
      const seat = await gp.page.evaluate(async () => {
        const t0 = performance.now();
        while (performance.now() - t0 < 20000) {
          const n = window.__echoes && window.__echoes.net;
          if (n && n.room && n.seat !== null) return n.seat;
          await new Promise((r) => setTimeout(r, 100));
        }
        return null;
      });
      if (seat === null) throw new Error(`guest page ${i} could not join ${code}`);
    }
    let seatsLeft = 4 - Math.max(1, opt.pages) - (hostKind === 'bot' ? 0 : 0);
    let botRoom = null;
    let botsInRoom = 0;
    for (let i = 0; i < opt.bots - (hostKind === 'bot' ? 1 : 0); i++) {
      if (seatsLeft > 0) {
        const b = createGuestBot({ server: opt.server, name: `Bot${i + 1}`, cond: clientCond });
        const r = await b.net.join(code);
        if (!r.ok) throw new Error(`bot ${i + 1} could not join ${code}: ${r.reason}`);
        bots.push(b);
        seatsLeft -= 1;
        continue;
      }
      // Extra bots: a second room hosted by a Node sim bot.
      if (!botRoom || botsInRoom >= 4) {
        const hb = await createSimHostBot({ server: opt.server, name: `BotHost${bots.length}`, room: opt.mode === 'boss' ? 8 : 1, seed: opt.seed + 100 + i });
        const r = await hb.net.host({ visibility: 'private' });
        if (!r.ok) throw new Error(`bot host could not create a room: ${r.reason}`);
        bots.push(hb);
        botRoom = r.code;
        botsInRoom = 1;
        continue;
      }
      const b = createGuestBot({ server: opt.server, name: `Bot${i + 1}`, cond: clientCond });
      const r = await b.net.join(botRoom);
      if (!r.ok) throw new Error(`bot ${i + 1} could not join ${botRoom}: ${r.reason}`);
      bots.push(b);
      botsInRoom += 1;
    }

    // Client list in a stable order.
    const clients = [
      ...pages.map((p) => ({ kind: 'page', role: p.role, name: p.name, p })),
      ...bots.map((b) => ({ kind: 'bot', role: b.role, name: b.name, b })),
    ];
    const netEval = (c, fnSrc, arg1) =>
      c.kind === 'page' ? c.p.page.evaluate(new Function('arg', `return (async () => { const n = window.__echoes.net; ${fnSrc} })()`), arg1 ?? null) : new Function('n', 'arg', `return (async () => { ${fnSrc} })()`)(c.b.net, arg1 ?? null);
    for (const c of clients) c.peerId = await netEval(c, 'return n.peerId;');

    // Conditions on every guest link (server-side when admin is available).
    if (opt.cond && admin) {
      for (const c of clients) {
        if (c.role !== 'guest') continue;
        const r = await post('/admin/conditioner', { target: c.peerId, up: opt.cond, down: opt.cond });
        if (!r.body || !r.body.ok) throw new Error(`admin conditioner failed for ${c.name}: ${JSON.stringify(r.body)}`);
      }
    }

    // Ready + start (not in lobby mode).
    if (opt.mode !== 'lobby') {
      for (const c of clients) if (c.role === 'guest') await netEval(c, 'return n.setReady(true);');
      for (const c of clients) {
        if (c.role !== 'host') continue;
        const st = await netEval(c, 'return n.start();');
        if (!st || !st.ok) throw new Error(`${c.name} could not start: ${JSON.stringify(st)}`);
      }
      await sleep(2000);
      // Put the page host into combat (bot hosts run their own sim).
      for (const c of clients) {
        if (c.role === 'host' && c.kind === 'page') {
          await c.p.page.evaluate((mode) => {
            const E = window.__echoes;
            E.cmd('startRun', { act: 1 });
            E.cmd('autopilot', true);
            if (mode === 'boss') E.cmd('skipToRoom', 8);
            // Keep the corpus in combat: restart a run that ends.
            window.__nbKeepCombat = setInterval(() => {
              try {
                const r = E.state().run;
                if (!r || !r.active) {
                  E.cmd('startRun', { act: 1 });
                  E.cmd('autopilot', true);
                  if (mode === 'boss') E.cmd('skipToRoom', 8);
                }
              } catch {
                /* between scenes */
              }
            }, 3000);
          }, opt.mode);
        }
        if (c.role === 'host' && c.kind === 'bot' && c.b.run) c.b.run();
      }
    }

    // Settle, then measure.
    logLine(`settling ${opt.settle}s…`);
    await sleep(opt.settle * 1000);
    for (const c of clients) {
      if (c.kind !== 'page') continue;
      await c.p.page.evaluate(() => {
        const nb = (window.__nb = { d: [], last: performance.now(), on: true });
        const f = (t) => {
          if (!nb.on) return;
          nb.d.push(t - nb.last);
          nb.last = t;
          requestAnimationFrame(f);
        };
        requestAnimationFrame(f);
      });
    }
    const samples = new Map(clients.map((c) => [c, []]));
    const t0 = Date.now();
    let dropDone = false;
    const dropInfo = {};
    logLine(`measuring ${opt.seconds}s…`);
    while (Date.now() - t0 < opt.seconds * 1000) {
      const el = (Date.now() - t0) / 1000;
      if (drop && !dropDone && el >= drop.atSec) {
        dropDone = true;
        const target = drop.who === 'guest' ? clients.find((c) => c.role === 'guest') : clients.find((c) => c.role === 'host');
        dropInfo.target = target ? target.name : null;
        dropInfo.at = r1(el);
        if (target && drop.who === 'guest') {
          if (admin) {
            const r = await post('/admin/drop', { peerId: target.peerId, mode: 'close', forMs: drop.ms });
            dropInfo.via = 'server-admin';
            dropInfo.ok = !!(r.body && r.body.ok);
          } else {
            dropInfo.via = 'client';
            dropInfo.ok = !!(await netEval(target, 'return n.drop(arg).ok;', drop.ms));
          }
          dropInfo.ms = drop.ms;
        } else if (target) {
          if (admin) {
            const r = await post('/admin/kill-host', { code });
            dropInfo.via = 'server-admin kill-host';
            dropInfo.ok = !!(r.body && r.body.ok);
          } else {
            dropInfo.via = 'client disconnect';
            dropInfo.ok = !!(await netEval(target, 'return n.disconnect().ok;'));
          }
        }
        logLine(`drop ${JSON.stringify(dropInfo)}`);
      }
      for (const c of clients) {
        try {
          const s = await netEval(c, 'return n.stats();');
          samples.get(c).push({ t: Date.now(), s });
        } catch {
          /* page busy / navigating */
        }
      }
      await sleep(1000);
    }
    report.dropResult = drop ? dropInfo : null;

    // ---------------------------------------------------------- collect --
    for (const c of clients) {
      const ss = samples.get(c);
      const last = ss.length ? ss[ss.length - 1].s : {};
      const rtts = ss.map((x) => x.s.rttMs).filter((v) => Number.isFinite(v));
      const perSec = (key) => {
        const out = [];
        for (let i = 1; i < ss.length; i++) {
          const dt = (ss[i].t - ss[i - 1].t) / 1000;
          const d = ss[i].s[key] - ss[i - 1].s[key];
          if (dt > 0 && d >= 0) out.push(d / dt);
        }
        return out;
      };
      const bin = perSec('bytesIn');
      const bout = perSec('bytesOut');
      let fps = { avg: null, p5: null };
      let frameOver50 = null;
      if (c.kind === 'page') {
        const fr = await c.p.page.evaluate(() => {
          const nb = window.__nb;
          if (!nb) return null;
          nb.on = false;
          return nb.d.slice(1);
        });
        if (fr && fr.length) {
          const total = fr.reduce((s, x) => s + x, 0);
          fps = { avg: r1((fr.length / total) * 1000), p5: r1(1000 / pct(fr, 0.95)) };
          frameOver50 = fr.filter((x) => x > 50).length;
        }
      }
      report.perClient.push({
        kind: c.kind,
        name: c.name,
        role: c.role,
        seat: await netEval(c, 'return n.seat;').catch(() => null),
        state: last.state ?? null,
        stream: last.stream ?? null,
        rttMs: { p50: r1(pct(rtts, 0.5)), p95: r1(pct(rtts, 0.95)) },
        jitterMs: r1(last.jitterMs),
        lossPct: r1(last.lossPct),
        bytesInPerSec: { avg: r1(bin.length ? bin.reduce((a, b) => a + b, 0) / bin.length : null), p95: r1(pct(bin, 0.95)) },
        bytesOutPerSec: { avg: r1(bout.length ? bout.reduce((a, b) => a + b, 0) / bout.length : null), p95: r1(pct(bout, 0.95)) },
        snapshotBytes: { avg: last.snapshotBytesAvg ?? null, fullAvg: last.fullBytesAvg ?? null, deltaRatio: last.deltaRatio ?? null },
        snapshotsPerSec: last.snapshotsPerSec ?? null,
        fullSnapshots: last.fullSnapshots ?? null,
        hashChecks: last.hashChecks ?? null,
        desyncs: last.desyncs ?? 0,
        decodeErrors: last.decodeErrors ?? 0,
        eventGaps: last.eventGaps ?? 0,
        predErr: { p95: last.predErrP95 ?? null, max: last.predErrMax ?? null },
        ownActionFeedbackMs: { p95: last.ownActionFeedbackMs && typeof last.ownActionFeedbackMs === 'object' ? last.ownActionFeedbackMs.p95 ?? null : last.ownActionFeedbackMs ?? null },
        reconnects: last.reconnects ?? 0,
        lastReconnectMs: last.lastReconnectMs ?? null,
        migrations: last.migrations ?? 0,
        hostNetMs: { p50: r1(last.hostNetMsP50), p95: r1(last.hostNetMsP95) },
        fps,
        frameOver50,
        pageErrors: c.kind === 'page' ? c.p.errors.length : 0,
        consoleErrors: c.kind === 'page' ? c.p.consoleLines.filter((l) => l.startsWith('[error]')).length : 0,
        conditioner: last.conditioner ?? null,
        netLog: await netEval(c, 'return n.log(60);').catch(() => null),
      });
    }
    if (admin) {
      const st = await getJSON('/stats');
      const b = st.body || {};
      report.server = {
        rooms: Array.isArray(b.rooms) ? b.rooms.length : null,
        peers: Array.isArray(b.peers) ? b.peers.filter((p) => p.connected).length : null,
        drops: b.totals ? b.totals.drops : null,
        reorders: b.totals ? b.totals.reorders : null,
        dups: b.totals ? b.totals.dups : null,
        relayed: b.totals ? b.totals.relayed : null,
        badFrames: b.totals ? b.totals.badFrames : null,
        timeouts: b.counters ? b.counters.timeouts : null,
        links: Array.isArray(b.peers) ? b.peers.filter((p) => p.link).map((p) => ({ peerId: p.peerId, name: p.name, role: p.role, rttMs: p.rttMs, up: p.link.up.spec, down: p.link.down.spec, upLossPct: p.link.up.appliedLossPct, downLossPct: p.link.down.appliedLossPct, bytesOutPerSec: p.link.bytesOutPerSec })) : [],
      };
    } else {
      const h = await getJSON('/health');
      report.server = { rooms: h.body ? h.body.rooms : null, peers: h.body ? h.body.peers : null, drops: null, reorders: null, note: 'no --admin: /stats unavailable' };
    }

    // ---------------------------------------------------------- verdict --
    const guests = report.perClient.filter((c) => c.role === 'guest');
    const hosts = report.perClient.filter((c) => c.role === 'host');
    const streamed = opt.mode !== 'lobby';
    const g = report.verdict.gates;
    const errs = report.perClient.reduce((s, c) => s + c.pageErrors, 0);
    g['G5a.5 harness schema + multi-page profile'] = true;
    if (streamed && guests.length) {
      g['G5a.3 delta <= 30% of full, 0 decode errors, 0 desyncs'] = guests.every((c) => c.snapshotBytes.deltaRatio !== null && c.snapshotBytes.deltaRatio <= 0.3 && c.decodeErrors === 0 && c.desyncs === 0);
      g['G5b.4 guest downstream avg <= 12 KB/s, p95 <= 24 KB/s, upstream <= 4 KB/s'] = guests.every((c) => c.bytesInPerSec.avg !== null && c.bytesInPerSec.avg <= 12 * 1024 && c.bytesInPerSec.p95 <= 24 * 1024 && c.bytesOutPerSec.avg <= 4 * 1024);
      g['G5b.4 host upstream <= 12 KB/s per guest + 6 KB/s keyframes'] = hosts.every((c) => c.bytesOutPerSec.avg !== null && c.bytesOutPerSec.avg <= 12 * 1024 * Math.max(1, guests.length) + 6 * 1024);
      g['G5b.5 0 hash mismatches'] = guests.every((c) => c.desyncs === 0 && (c.hashChecks ?? 0) > 0);
    }
    if (opt.pages + opt.bots >= 8) g['G5a.1 8+ concurrent clients (Chrome + Node)'] = report.perClient.length >= 8 && report.perClient.every((c) => c.state && c.state !== 'offline');
    if (drop && drop.who === 'guest' && report.dropResult) {
      const tgt = report.perClient.find((c) => c.name === report.dropResult.target);
      g['guest drop -> reconnected, full state within 3 s of link restoration'] = !!(tgt && tgt.reconnects >= 1 && tgt.lastReconnectMs !== null && tgt.lastReconnectMs - (drop.ms || 0) <= 3000);
    }
    g['0 page errors'] = errs === 0;
    report.verdict.pass = Object.values(g).every(Boolean);
    if (report.perClient.some((c) => c.predErr.p95 === null)) report.verdict.notes.push('predErr / ownActionFeedbackMs are reported by the M5b session driver (W4); null means no driver was registered (W3 probe stream)');
  } catch (err) {
    crashed = err;
    report.error = String(err && err.stack ? err.stack : err);
    console.error(`[netbench] ${err && err.message ? err.message : err}`);
  } finally {
    for (const b of bots) {
      try {
        b.stop();
      } catch {
        /* ignore */
      }
    }
    if (browser) await browser.close().catch(() => {});
  }


  if (!crashed || !isNavError(crashed) || attempt === 3) break;
  logLine(`page navigated mid-run (dev-server reload) — retrying (attempt ${attempt + 1}/3)`);
  await sleep(3000);
}

mkdirSync(dirname(resolve(here, opt.out)), { recursive: true });
writeFileSync(resolve(here, opt.out), JSON.stringify(report, null, 1));
for (const c of report.perClient) {
  logLine(`${c.kind}:${c.name} ${c.role} seat ${c.seat} rtt ${c.rttMs.p50}/${c.rttMs.p95} loss ${c.lossPct}% in ${c.bytesInPerSec.avg}/${c.bytesInPerSec.p95} B/s out ${c.bytesOutPerSec.avg} B/s snap ${c.snapshotBytes.avg}B full ${c.snapshotBytes.fullAvg}B ratio ${c.snapshotBytes.deltaRatio} desyncs ${c.desyncs}/${c.hashChecks} fps ${c.fps.avg}/${c.fps.p5} >50ms ${c.frameOver50} reconnects ${c.reconnects} (${c.lastReconnectMs} ms) errors ${c.pageErrors}`);
}
for (const [k, v] of Object.entries(report.verdict.gates)) logLine(`${v ? 'PASS' : 'FAIL'}  ${k}`);
logLine(`-> ${opt.out}`);
const pageErrors = report.perClient.reduce((s, c) => s + c.pageErrors, 0);
process.exit(crashed || pageErrors ? 1 : 0);
