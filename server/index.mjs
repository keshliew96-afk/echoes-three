#!/usr/bin/env node
// Echoes session server — CLI (docs/gauntlet/PLAN.md §3.7). Owner: M5a.
// Zero npm dependencies (node:http, node:crypto, node:os). The game itself
// never needs it for single-player; multiplayer runs through it.
//
//   npm run net                                   ws://127.0.0.1:7800/echoes
//   npm run net -- --host 0.0.0.0                 LAN: prints every reachable ws:// URL
//   npm run net -- --port 7811 --admin            admin API (/stats, /admin/*) for probes
//   npm run net -- --latency 75 --jitter 10 --loss 0.1 --dup 0.01 --reorder 0.02
//                  --burst 0.05,0.3,0.8 --bw 256 [--seed 7]   conditioner on EVERY link
//   npm run net -- --cond lat75,jit10,loss10      the same as one compact spec
//
// Flags: --port P (7800) · --host H (127.0.0.1) · --admin · --latency ms ·
// --jitter ms (σ) · --loss f · --dup f · --reorder f (fractions 0-1, or "10%")
// · --burst pGB,pBG,lossInBad · --bw kbit/s · --seed n · --cond spec · --log
// (one line per lobby event) · --max-rooms n. Every agent runs its OWN
// instance on its own port (PLAN §6.3) and kills it before returning.
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { createEchoesServer } from './server.mjs';
import { parseCond, formatCond } from '../src/net/protocol/conditioner.js';
import { DEFAULT_PORT, PROTOCOL_VERSION, WS_PATH } from '../src/net/protocol/constants.js';

function parseArgs(argv) {
  const opt = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const k = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) opt[k] = true;
    else {
      opt[k] = next;
      i += 1;
    }
  }
  return opt;
}

const frac = (v) => {
  if (v === undefined || v === true) return 0;
  const s = String(v).trim();
  if (s.endsWith('%')) return Number(s.slice(0, -1)) / 100;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) throw new Error(`bad fraction "${v}" (use 0-1 or N%)`);
  return n > 1 ? n / 100 : n; // "10" means 10 % — a loss above 100 % is never meant
};

export function condFromArgs(a) {
  if (a.cond) return parseCond(String(a.cond));
  const spec = {
    latencyMs: Number(a.latency ?? 0),
    jitterMs: Number(a.jitter ?? 0),
    loss: frac(a.loss),
    dup: frac(a.dup),
    reorder: frac(a.reorder),
    bandwidthKbps: Number(a.bw ?? 0),
    seed: a.seed !== undefined ? Number(a.seed) : null,
    burstLoss: null,
  };
  if (a.burst) {
    const [pGB, pBG, lossInBad] = String(a.burst).split(/[,:]/).map(Number);
    if (![pGB, pBG, lossInBad].every(Number.isFinite)) throw new Error('--burst needs pGB,pBG,lossInBad');
    spec.burstLoss = { pGB, pBG, lossInBad };
  }
  return parseCond(spec);
}

const isMain = (() => {
  try {
    return !!process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
  } catch {
    return false;
  }
})();

if (isMain) {
  const a = parseArgs(process.argv.slice(2));
  let cond;
  try {
    cond = condFromArgs(a);
  } catch (err) {
    console.error(`[echoes-net] ${err.message}`);
    process.exit(2);
  }
  const port = a.port !== undefined ? Number(a.port) : DEFAULT_PORT;
  const host = a.host && a.host !== true ? String(a.host) : '127.0.0.1';
  const srv = createEchoesServer({
    port,
    host,
    admin: !!a.admin,
    log: !!a.log,
    maxRooms: a['max-rooms'] ? Number(a['max-rooms']) : undefined,
    cond: { up: cond, down: cond },
  });
  srv
    .listen()
    .then((info) => {
      console.log(`[echoes-net] Echoes session server listening (protocol ${PROTOCOL_VERSION}, zero dependencies)`);
      console.log(`[echoes-net]   this computer: ${info.url}`);
      if (host === '0.0.0.0' || host === '::') {
        if (info.lanUrls.length) for (const u of info.lanUrls) console.log(`[echoes-net]   your network:  ${u}`);
        else console.log('[echoes-net]   your network:  no LAN address found (is this computer on a network?)');
      } else console.log('[echoes-net]   (only this computer can connect — add --host 0.0.0.0 for players on your network)');
      console.log(`[echoes-net]   health: ${info.health}   admin API: ${a.admin ? 'on (loopback only)' : 'off'}   conditioner: ${formatCond(cond)}`);
      console.log(`[echoes-net] ready ${JSON.stringify({ port: info.port, host, url: info.url, lanUrls: info.lanUrls, path: WS_PATH, admin: !!a.admin, pid: process.pid })}`);
    })
    .catch((err) => {
      console.error(`[echoes-net] cannot listen on ${host}:${port} — ${err.code || err.message}${err.code === 'EADDRINUSE' ? ' (another server already uses this port; pick another with --port)' : ''}`);
      process.exit(1);
    });
  let stopping = false;
  const shutdown = (sig) => {
    if (stopping) return;
    stopping = true;
    console.log(`[echoes-net] ${sig} — closing every connection`);
    srv.close().then(() => process.exit(0));
    setTimeout(() => process.exit(0), 2000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

export { createEchoesServer };
