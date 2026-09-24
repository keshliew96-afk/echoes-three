#!/usr/bin/env node
// gntfixM5a1 — NET-F2 probe: does the client KNOW and SHOW its packet loss?
// (fix builder M5a, gauntlet round 1; own file, read-only for everyone else)
//
// One browser, every page in its own window (multi-page profile): a HOST page
// (autopilot run, act 1) + one GUEST page (scripted bot input) + N playing
// Node guests (tools/gntM5b-botlib.mjs). For each condition of --sweep the
// server admin API shapes every guest link (up / down separately), the probe
// settles, then samples once per second for --seconds:
//   guest page  n.stats() { lossPct, lossInPct, lossOutPct, snapshotsPerSec,
//               rttMs, jitterMs, quality } + the chip's text / class / title
//   host page   n.stats() { lossPct, lossInPct, quality } + chip
//   server      GET /stats peers[].link.up/down { lost, appliedLossPct } —
//               differenced over the window, so the APPLIED loss of exactly
//               that window is the reference (the counters are cumulative).
// It also times how long the chip takes to react (N0 -> loss: first sample
// with quality != good; loss -> N0: first sample back to good), and saves a
// guest + host frame per condition (captures/gntfixM5a1-loss-<tag>-<cond>-*.png)
// plus a 2x zoom of the guest chip.
//
//   node tools/gntfixM5a1-loss.mjs --server ws://127.0.0.1:7810/echoes --base http://127.0.0.1:5199/
//        [--sweep N0,L5,L10,L20,DOWN20,UP20,BURST,N0] [--seconds 20] [--settle 8] [--bots 2]
//        [--tag name] [--w 1280 --h 720] [--gpu 1]
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchEchoes, waitReady } from './gnt-arch-browser.mjs';
import { openEchoesWindow } from './gntM5a-botlib.mjs';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argOf = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 ? process.argv[i + 1] : d;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const r1 = (x) => (x === null || x === undefined || Number.isNaN(x) ? null : Math.round(x * 10) / 10);
const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);

const SERVER = argOf('server', 'ws://127.0.0.1:7810/echoes');
const BASE = argOf('base', 'http://127.0.0.1:5199/');
const SWEEP = String(argOf('sweep', 'N0,L5,L10,L20,DOWN20,UP20,BURST,N0')).split(',').filter(Boolean);
const SECONDS = Number(argOf('seconds', 20));
const SETTLE = Number(argOf('settle', 8));
const BOTS = Number(argOf('bots', 2));
const TAG = argOf('tag', 'run');
const W = Number(argOf('w', 1280));
const H = Number(argOf('h', 720));
const GPU = argOf('gpu', '1') !== '0';
const HTTP = SERVER.replace(/^ws/, 'http').replace(/\/echoes$/, '');

// { up, down } conditioner specs per condition (compact conditioner strings).
const CONDS = {
  N0: { up: 'off', down: 'off' },
  L5: { up: 'lat75,jit10,loss5', down: 'lat75,jit10,loss5' },
  L10: { up: 'lat75,jit10,loss10', down: 'lat75,jit10,loss10' },
  L20: { up: 'lat75,jit10,loss20', down: 'lat75,jit10,loss20' },
  DOWN20: { up: 'lat75,jit10', down: 'lat75,jit10,loss20' },
  UP20: { up: 'lat75,jit10,loss20', down: 'lat75,jit10' },
  BURST: { up: 'lat75,burst0.05:0.3:0.8', down: 'lat75,burst0.05:0.3:0.8' },
  R250: { up: 'lat125,jit25', down: 'lat125,jit25' },
  N2: { up: 'lat125,jit20,loss20', down: 'lat125,jit20,loss20' },
  // Only the guest PAGE's link is lossy (the bots stay clean): the host's own
  // link is fine, one seat is not.
  SOLO20: { up: 'lat75,jit10,loss20', down: 'lat75,jit10,loss20', only: 'guest' },
};

async function admin(path, body = null) {
  const res = await fetch(`${HTTP}${path}`, body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {});
  const t = await res.text();
  try {
    return JSON.parse(t);
  } catch {
    return { raw: t, status: res.status };
  }
}
const ev = (c, src, arg = null) => c.page.evaluate(new Function('arg', `return (async () => { const E = window.__echoes; const n = E.net; ${src} })()`), arg);

async function openClient(browser, name) {
  const q = new URLSearchParams({ menu: '0', seed: '7', net: SERVER, netname: name });
  const url = `${BASE}${BASE.includes('?') ? '&' : '?'}${q}`;
  const c = await openEchoesWindow(browser, url, { width: W, height: H });
  c.name = name;
  await waitReady(c.page, { minTick: 120, timeout: 150000 });
  return c;
}

// What a client knows about its link, plus what its chip shows.
const SAMPLE = `
  const s = n.stats();
  const chip = document.querySelector('#nt-hud .nt-chip');
  const q = chip ? chip.querySelector('.nt-q') : null;
  return {
    lossPct: s.lossPct ?? null, lossInPct: s.lossInPct ?? null, lossOutPct: s.lossOutPct ?? null,
    snapshotsPerSec: s.snapshotsPerSec ?? null, rttMs: s.rttMs ?? null, jitterMs: s.jitterMs ?? null,
    quality: s.quality ?? null, stream: s.stream,
    chip: chip ? chip.textContent.replace(/\\s+/g, ' ').trim() : null,
    chipClass: chip ? chip.className : null,
    chipTitle: chip ? chip.getAttribute('title') : null,
    qLevel: q ? q.getAttribute('data-level') : null,
    detail: (() => { const d = document.querySelector('#nt-hud .nt-detail'); return d && d.style.display !== 'none' ? d.textContent : null; })(),
    notes: [...document.querySelectorAll('#nt-hud .nt-note')].map((x) => x.textContent),
    lossBySeat: s.lossBySeat ?? null,
  };`;

function linkOf(stats, peerId) {
  const p = (stats.peers || []).find((x) => x.peerId === peerId);
  return p && p.link ? p.link : null;
}
// Cumulative unreliable counters -> { lost, sentU } (sentU derived from the
// server's own appliedLossPct = (lost + outage + bw) / sentUnreliable).
function unrel(dir) {
  if (!dir) return null;
  const dropped = (dir.lost || 0) + (dir.outageDrops || 0) + (dir.bwDrops || 0);
  const sentU = dir.appliedLossPct > 0 ? (dropped * 100) / dir.appliedLossPct : null;
  return { dropped, sentU };
}
function windowLoss(a, b) {
  if (!a || !b) return null;
  const d = b.dropped - a.dropped;
  if (d === 0) return 0;
  if (a.sentU === null && b.sentU !== null) return r1((d / b.sentU) * 100); // the counters started in this window
  if (a.sentU === null || b.sentU === null) return null;
  const s = b.sentU - a.sentU;
  return s > 0 ? r1((d / s) * 100) : null;
}

const out = { schema: 'gntfixM5a1-loss/1', startedAt: new Date().toISOString(), server: SERVER, base: BASE, sweep: SWEEP, seconds: SECONDS, settle: SETTLE, bots: BOTS, conditions: [], pageErrors: {}, notes: [] };
const browser = await launchEchoes({ gpu: GPU, background: true, width: W, height: H });
const bots = [];
let host;
let guest;
try {
  host = await openClient(browser, 'LHost');
  guest = await openClient(browser, 'LGuest');
  out.version = await ev(host, 'return E.version;');
  const hr = await ev(host, "return n.host({ visibility: 'private' });");
  if (!hr || !hr.ok) throw new Error(`host failed ${JSON.stringify(hr)}`);
  const code = hr.code;
  const jr = await ev(guest, 'return n.join(arg);', code);
  if (!jr || !jr.ok) throw new Error(`join failed ${JSON.stringify(jr)}`);
  if (BOTS > 0) {
    const { createPlayingGuest } = await import('./gntM5b-botlib.mjs');
    for (let i = 0; i < BOTS; i++) {
      const b = createPlayingGuest({ server: SERVER, name: `LBot${i + 1}`, seed: 11 + i });
      const r = await b.net.join(code);
      if (!r || !r.ok) throw new Error(`bot join failed ${JSON.stringify(r)}`);
      await b.net.setReady(true);
      bots.push(b);
    }
  }
  await ev(guest, 'return n.setReady(true);');
  const st = await ev(host, 'return n.start();');
  if (!st || !st.ok) throw new Error(`start failed ${JSON.stringify(st)}`);
  const t0 = Date.now();
  for (;;) {
    const s = await Promise.all([host, guest].map((c) => ev(c, 'const s = n.session ? n.session.status() : null; return s ? { role: s.role, synced: s.synced } : null;').catch(() => null)));
    if (s.every((x) => x && x.role !== 'none' && x.synced)) break;
    if (Date.now() - t0 > 30000) throw new Error(`no sync ${JSON.stringify(s)}`);
    await sleep(150);
  }
  out.syncMs = Date.now() - t0;
  await ev(host, "E.cmd('startRun', { act: 1 }); E.cmd('autopilot', true); return true;");
  await ev(guest, 'return n.session.setBotInput({ seed: 3, aim: true, chase: true });');
  if (process.argv.includes('--showstats')) for (const c of [host, guest]) await ev(c, "E.settings.set('net.showStats', true); return true;");
  const peers = await ev(host, 'return n.peers().filter((p) => p.peerId && !p.me).map((p) => ({ peerId: p.peerId, name: p.name, seat: p.index }));');
  const guestPeer = peers.find((p) => p.name === 'LGuest');
  out.peers = peers;
  await sleep(3000);

  let prev = null;
  for (const [ci, cname] of SWEEP.entries()) {
    const spec = CONDS[cname];
    if (!spec) throw new Error(`unknown condition ${cname}`);
    for (const p of peers) {
      const mine = !spec.only || (spec.only === 'guest' && p.peerId === guestPeer.peerId);
      await admin('/admin/conditioner', { target: p.peerId, up: mine ? spec.up : 'off', down: mine ? spec.down : 'off' });
    }
    const applyAt = Date.now();
    const sA = await admin('/stats');
    const react = { firstNotGoodS: null, firstGoodS: null, firstLossReportedS: null };
    const series = [];
    const hostSeries = [];
    const allNotes = { guest: new Set(), host: new Set() };
    const early = [];
    const total = SETTLE + SECONDS;
    let sB = null;
    let sAfterSettle = null;
    for (let s = 1; s <= total; s++) {
      await sleep(1000 - ((Date.now() - applyAt) % 1000));
      const [g, h] = await Promise.all([ev(guest, SAMPLE).catch((e) => ({ err: String(e.message || e) })), ev(host, SAMPLE).catch((e) => ({ err: String(e.message || e) }))]);
      const tS = Math.round((Date.now() - applyAt) / 100) / 10;
      const lvl = g.quality ? g.quality.level : null;
      if (lvl && lvl !== 'good' && react.firstNotGoodS === null) react.firstNotGoodS = tS;
      if (lvl === 'good' && react.firstGoodS === null) react.firstGoodS = tS;
      if ((g.lossPct || 0) >= 1 && react.firstLossReportedS === null) react.firstLossReportedS = tS;
      if (s === SETTLE) sAfterSettle = await admin('/stats');
      // Notes are short-lived (3.6 s): collect them from the first second.
      for (const x of g.notes || []) allNotes.guest.add(x);
      for (const x of h.notes || []) allNotes.host.add(x);
      early.push({ t: tS, g: g.quality ? `${g.quality.level}:${g.quality.reasons.join('+')}` : null, h: h.quality ? `${h.quality.level}:${h.quality.reasons.join('+')}` : null, hj: h.jitterMs, hr: h.rttMs });
      if (s > SETTLE) {
        series.push({ t: tS, ...g });
        hostSeries.push({ t: tS, ...h });
      }
    }
    sB = await admin('/stats');
    const gLinkA = linkOf(sAfterSettle || sA, guestPeer.peerId);
    const gLinkB = linkOf(sB, guestPeer.peerId);
    const applied = {
      down: windowLoss(unrel(gLinkA && gLinkA.down), unrel(gLinkB && gLinkB.down)),
      up: windowLoss(unrel(gLinkA && gLinkA.up), unrel(gLinkB && gLinkB.up)),
    };
    const vals = (k) => series.map((x) => x[k]).filter((v) => typeof v === 'number');
    const shot = `captures/gntfixM5a1-loss-${TAG}-${ci}-${cname}`;
    await guest.page.screenshot({ path: resolve(here, `${shot}-guest.png`) }).catch(() => {});
    await host.page.screenshot({ path: resolve(here, `${shot}-host.png`) }).catch(() => {});
    const box = await guest.page.evaluate(() => {
      const c = document.querySelector('#nt-hud .nt-chip');
      if (!c) return null;
      const r = c.getBoundingClientRect();
      return { x: Math.max(0, r.x - 6), y: Math.max(0, r.y - 6), width: r.width + 12, height: r.height + 12 };
    });
    if (box && box.width > 0) {
      const cdp = await guest.page.target().createCDPSession();
      const png = await cdp.send('Page.captureScreenshot', { format: 'png', clip: { ...box, scale: 2 } }).catch(() => null);
      if (png) writeFileSync(resolve(here, `${shot}-guestchip.png`), Buffer.from(png.data, 'base64'));
      await cdp.detach().catch(() => {});
    }
    const last = series[series.length - 1] || {};
    const hostLast = hostSeries[hostSeries.length - 1] || {};
    const row = {
      cond: cname,
      spec,
      from: prev,
      appliedWindowPct: applied,
      guest: {
        lossPctMean: r1(mean(vals('lossPct'))),
        lossPctMin: vals('lossPct').length ? Math.min(...vals('lossPct')) : null,
        lossPctMax: vals('lossPct').length ? Math.max(...vals('lossPct')) : null,
        lossInPctMean: r1(mean(vals('lossInPct'))),
        lossOutPctMean: r1(mean(vals('lossOutPct'))),
        snapshotsPerSecMean: r1(mean(vals('snapshotsPerSec'))),
        impliedSnapLossPct: vals('snapshotsPerSec').length ? r1((1 - mean(vals('snapshotsPerSec')) / 20) * 100) : null,
        rttMsMean: r1(mean(vals('rttMs'))),
        levels: series.reduce((m, x) => ((m[x.quality ? x.quality.level : 'none'] = (m[x.quality ? x.quality.level : 'none'] || 0) + 1), m), {}),
        lastQuality: last.quality || null,
        lastChip: last.chip || null,
        lastChipTitle: last.chipTitle || null,
        lastChipClass: last.chipClass || null,
        lastQLevel: last.qLevel || null,
        lastDetail: last.detail || null,
      },
      notes: { guest: [...allNotes.guest], host: [...allNotes.host] },
      levelTrace: early,
      host: {
        lossBySeatLast: hostLast.lossBySeat || null,
        levels: hostSeries.reduce((m, x) => ((m[x.quality ? x.quality.level : 'none'] = (m[x.quality ? x.quality.level : 'none'] || 0) + 1), m), {}),
        lossPctMean: r1(mean(hostSeries.map((x) => x.lossPct).filter((v) => typeof v === 'number'))),
        lastQuality: hostLast.quality || null,
        lastChip: hostLast.chip || null,
      },
      react,
      series: series.map((x) => ({ t: x.t, loss: x.lossPct, in: x.lossInPct, out: x.lossOutPct, snaps: x.snapshotsPerSec, rtt: x.rttMs, lvl: x.quality ? x.quality.level : null, why: x.quality ? x.quality.reasons : null, qLevel: x.qLevel })),
      hostSeries: hostSeries.map((x) => ({ t: x.t, loss: x.lossPct, rtt: x.rttMs, jit: x.jitterMs, lvl: x.quality ? x.quality.level : null, why: x.quality ? x.quality.reasons : null, judged: x.quality ? x.quality.lossPct : null, bySeat: x.lossBySeat })),
      shots: [`${shot}-guest.png`, `${shot}-host.png`, `${shot}-guestchip.png`],
    };
    out.conditions.push(row);
    prev = cname;
    console.log(
      `${cname.padEnd(7)} applied down ${applied.down}% up ${applied.up}% | guest lossPct mean ${row.guest.lossPctMean} (in ${row.guest.lossInPctMean} / out ${row.guest.lossOutPctMean}) snaps/s ${row.guest.snapshotsPerSecMean} (implied ${row.guest.impliedSnapLossPct}%) rtt ${row.guest.rttMsMean} levels ${JSON.stringify(row.guest.levels)} | chip "${row.guest.lastChip}" | host lossPct ${row.host.lossPctMean} levels ${JSON.stringify(row.host.levels)} chip "${row.host.lastChip}" | notes ${JSON.stringify(row.notes)} | react ${JSON.stringify(react)}`
    );
  }
  for (const p of peers) await admin('/admin/conditioner', { target: p.peerId, up: 'off', down: 'off' });
  out.pageErrors = { host: host.errors, guest: guest.errors };
  out.console = { host: host.consoleLines.filter((l) => /error/i.test(l)).slice(-20), guest: guest.consoleLines.filter((l) => /error/i.test(l)).slice(-20) };
} catch (err) {
  out.error = String(err && err.stack ? err.stack : err);
  console.error(out.error);
} finally {
  for (const b of bots) {
    try {
      b.stop();
    } catch {
      /* already gone */
    }
  }
  await browser.close().catch(() => {});
  const file = resolve(here, `captures/gntfixM5a1-loss-${TAG}.json`);
  writeFileSync(file, JSON.stringify(out, null, 1));
  console.log(`wrote ${file}${out.error ? ' (with error)' : ''}; page errors host ${out.pageErrors.host ? out.pageErrors.host.length : '?'} guest ${out.pageErrors.guest ? out.pageErrors.guest.length : '?'}`);
  process.exit(out.error ? 1 : 0);
}
