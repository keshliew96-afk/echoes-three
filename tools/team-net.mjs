#!/usr/bin/env node
// THE TIDECALLER in co-op (docs/LINEUP.md): own network server, a host page
// on http://127.0.0.1:5199 and a guest page on http://localhost:5199 (two
// origins = two players' browsers).
//   - the guest picks the Tidecaller from the roster (she takes their seat's
//     place); the host's "Who joins as AI" waits until the guest is ready;
//   - the host then picks who joins as AI (Archer out, Swordsman in);
//   - the session's host world seats that team: Rill is the guest's body.
// Screenshots under captures/ (or --out <dir>).
//   node tools/team-net.mjs [--port 7912] [--out dir]
// Linux cloud: PUPPETEER_EXECUTABLE_PATH=<chrome>, ECHOES_CHROME_ARGS=--no-sandbox.
import { mkdirSync } from 'node:fs';
import { startServer, launchEchoes, openClient, hostRoom, joinRoom, waitSession, netEval, sleep } from './gntM5b-lib.mjs';

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 ? process.argv[i + 1] : d;
};
const port = Number(arg('port', 7912));
const OUT = arg('out', 'captures');
mkdirSync(OUT, { recursive: true });
const fails = [];
function check(what, ok, got = null) {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}${got === null ? '' : ` (${JSON.stringify(got).slice(0, 300)})`}`);
  if (!ok) fails.push(what);
}
const seatsOf = (c) => netEval(c, 'return n.room.seats.map((s) => `${s.classId}:${s.name || "AI"}`).join(" ");');
const openLobby = async (c) => {
  await netEval(c, 'E.app.open("lobby", {}); return true;');
  await sleep(1500);
};

let srv = null;
let browser = null;
try {
  srv = await startServer({ port, admin: true });
  const extraArgs = (process.env.ECHOES_CHROME_ARGS || '').split(/\s+/).filter(Boolean);
  browser = await launchEchoes({ gpu: !extraArgs.length, background: true, width: 1280, height: 720, extraArgs });
  const host = await openClient(browser, { base: 'http://127.0.0.1:5199/', server: srv.url, name: 'Host', seed: 7 });
  const guest = await openClient(browser, { base: 'http://localhost:5199/', server: srv.url, name: 'Guest', seed: 8 });

  const code = await hostRoom(host);
  await joinRoom(guest, code);
  check('a new room is the default four', (await netEval(host, 'return n.room.lineup.join(",");')) === 'healer,tank,swordsman,archer');

  // 1. The guest picks their character from the roster.
  const gp = await netEval(guest, 'return n.selectClass("tidecaller");');
  check('the guest picks the Tidecaller', gp && gp.ok, gp);
  await sleep(500);
  check('she takes the guest\'s seat\'s place', /tidecaller:Guest/.test(await seatsOf(host)), await seatsOf(host));

  // 2. The host's AI picks wait for the guest.
  await openLobby(host);
  const waiting = await netEval(host, 'const r = document.querySelector(".nt-row-team"); return { cap: document.querySelector(".nt-cap-team").textContent, disabled: [...r.querySelectorAll("button")].every((b) => b.disabled) };');
  check('the host\'s AI picks wait for the guest', waiting.disabled && /Guest/.test(waiting.cap), waiting);
  await netEval(guest, 'return n.setReady(true);');
  await sleep(800);
  const openNow = await netEval(host, 'return [...document.querySelectorAll(".nt-row-team button")].filter((b) => !b.disabled).map((b) => b.dataset.cls);');
  check('once the guest is ready the host picks who joins as AI', openNow.length >= 2 && !openNow.includes('tidecaller'), openNow);

  // 3. The host picks: the Archer stays at camp, the Swordsman joins.
  const cur = await netEval(host, 'return n.room.lineup.slice(1);');
  const out = cur.includes('archer') ? 'archer' : cur.find((c) => c !== 'tidecaller');
  const inn = ['tank', 'swordsman', 'archer'].find((c) => !cur.includes(c));
  await host.page.click(`.nt-row-team button[data-cls="${out}"]`);
  await sleep(400);
  await host.page.click(`.nt-row-team button[data-cls="${inn}"]`);
  await sleep(1200);
  const lineup = await netEval(host, 'return n.room.lineup.join(",");');
  check(`the host's pick lands (${out} out, ${inn} in)`, lineup.split(',').includes(inn) && !lineup.split(',').includes(out) && lineup.includes('tidecaller'), lineup);
  check('the guest keeps the Tidecaller', /tidecaller:Guest/.test(await seatsOf(guest)), await seatsOf(guest));
  await host.page.screenshot({ path: `${OUT}/tidecaller-5-lobby-host.png` });
  await openLobby(guest);
  await guest.page.screenshot({ path: `${OUT}/tidecaller-6-lobby-guest.png` });

  // 4. The session seats that team on the host's world.
  await netEval(host, 'return n.start();');
  await waitSession([host, guest], 60000);
  await sleep(4000);
  const bodies = await netEval(host, 'return E.state().party.slice().sort((a, b) => a.partyIndex - b.partyIndex).map((p) => p.classId || "healer").join(",");');
  check('the host world in camp is the lobby\'s team', bodies === lineup, { bodies, lineup });
  const gseat = await netEval(guest, 'const s = n.room.seats.find((x) => x.peerId === n.peerId); return s ? s.index : null;');
  check('the guest\'s seat is Rill\'s', lineup.split(',')[gseat] === 'tidecaller', { gseat, lineup });
  const mirror = await netEval(guest, 'return E.state().party.slice().sort((a, b) => a.partyIndex - b.partyIndex).map((p) => p.classId || "healer").join(",");');
  check('the guest\'s page mirrors the team', mirror === lineup, mirror);
} catch (e) {
  console.error(e);
  fails.push(String(e && e.message));
} finally {
  if (browser) await browser.close().catch(() => {});
  if (srv && srv.stop) await srv.stop();
  else if (srv && srv.proc) srv.proc.kill();
}
console.log(fails.length ? `\n${fails.length} FAILED` : '\nall ok');
process.exit(fails.length ? 1 : 0);
