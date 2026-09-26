#!/usr/bin/env node
// gntDEPLOY-versions — the version rules of PLAN §14.5 at the protocol level
// (Node clients = the same src/net/lobbyClient.js the page runs):
//  - a join into a room whose host runs a NEWER build: `update` + "newer
//    version … reload this page", and net emits update_available;
//  - a join into an OLDER room: "its host needs to reload their page", no
//    update for the joiner;
//  - a `--build` server newer than the client: connect() refuses with
//    update_available, probe() answers state 'update';
//  - the same server and an older / equal client build: normal.
//   node tools/gntDEPLOY-versions.mjs [--port 7937]
import { writeFileSync, mkdirSync } from 'node:fs';
import { createEchoesServer } from '../server/server.mjs';
import { createNetClient } from '../src/net/lobbyClient.js';

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 ? process.argv[i + 1] : d;
};
const port = Number(arg('port', 7937));
const url = `ws://127.0.0.1:${port}/echoes`;
mkdirSync('captures', { recursive: true });
const out = { checks: [] };
function check(name, ok, detail = {}) {
  out.checks.push({ name, ok: !!ok, ...detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${JSON.stringify(detail).slice(0, 260)}`);
}
const client = (version, name) => createNetClient({ params: { net: url, netName: name }, version, autoStart: false, probeStream: false });
const srvs = [];
const clients = [];
try {
  const s = createEchoesServer({ port, host: '127.0.0.1' });
  await s.listen();
  srvs.push(s);
  const hostNew = client('0.5.200', 'HostNew');
  const guestOld = client('0.5.123', 'GuestOld');
  clients.push(hostNew, guestOld);
  const seen = [];
  guestOld.on('update_available', (u) => seen.push(u));
  const h = await hostNew.host({ visibility: 'private' });
  const j = await guestOld.join(h.code);
  check('join into a NEWER room -> update + "newer version … reload this page", update_available emitted', !j.ok && j.reason === 'version_mismatch' && !!j.update && /newer version of Echoes \(v0\.5\.200\) — reload this page/.test(j.text) && seen.length === 1 && guestOld.updateInfo && guestOld.updateInfo.latest === '0.5.200', { text: j.text, update: j.update, seen: seen.length });
  const hostOld = client('0.5.100', 'HostOld');
  const guestMid = client('0.5.123', 'GuestMid');
  clients.push(hostOld, guestMid);
  const h2 = await hostOld.host({ visibility: 'private' });
  const j2 = await guestMid.join(h2.code);
  check('join into an OLDER room -> "its host needs to reload their page", no update for the joiner', !j2.ok && /older version of Echoes \(v0\.5\.100\) — its host needs to reload their page/.test(j2.text) && !j2.update && guestMid.updateInfo === null, { text: j2.text });
  // A server that knows the deployed build.
  const s2 = createEchoesServer({ port: port + 1, host: '127.0.0.1', build: '0.5.150' });
  await s2.listen();
  srvs.push(s2);
  const url2 = `ws://127.0.0.1:${port + 1}/echoes`;
  const stale = createNetClient({ params: { net: url2, netName: 'Stale' }, version: '0.5.123', autoStart: false, probeStream: false });
  const fresh = createNetClient({ params: { net: url2, netName: 'Fresh' }, version: '0.5.150', autoStart: false, probeStream: false });
  const newer = createNetClient({ params: { net: url2, netName: 'Dev' }, version: '0.5.160', autoStart: false, probeStream: false });
  clients.push(stale, fresh, newer);
  const p1 = await stale.probe();
  const c1 = await stale.connect();
  check('server deploys v0.5.150, page v0.5.123: probe -> "update", connect refused with update_available', p1.state === 'update' && p1.latest === '0.5.150' && !c1.ok && c1.error === 'update_available', { probe: p1.state, connect: c1.error });
  const p2 = await fresh.probe();
  const c2 = await fresh.connect();
  const p3 = await newer.probe();
  check('the same build and a NEWER page (a dev build) connect normally', p2.state === 'online' && c2.ok && p3.state === 'online' && newer.updateInfo === null, { fresh: p2.state, newer: p3.state });
} catch (err) {
  out.crash = String(err && err.stack ? err.stack : err);
  console.error(out.crash);
} finally {
  for (const c of clients) {
    try {
      c.disconnect();
    } catch {
      /* not connected */
    }
  }
  for (const s of srvs) await s.close();
}
const fails = out.checks.filter((c) => !c.ok).length;
out.summary = `${out.checks.length - fails}/${out.checks.length} ${fails ? 'FAILURES' : 'ALL PASS'}${out.crash ? ' (crashed)' : ''}`;
writeFileSync('captures/gntDEPLOY-versions.json', JSON.stringify(out, null, 1));
console.log(out.summary);
process.exit(out.crash || fails ? 1 : 0);
