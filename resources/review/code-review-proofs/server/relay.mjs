import { connect, frame, sendJ, wait, until } from './rawws.mjs';
import { readFileSync } from 'node:fs';
const [host, port, pid] = process.argv.slice(2);
const rss = () => Math.round(Number(/VmRSS:\s+(\d+)/.exec(readFileSync(`/proc/${pid}/status`, 'utf8'))[1]) / 1024);
const hello = async (n) => { const s = await connect(host, +port); sendJ(s, { t: 'hello', v: 4, build: 'x', name: n }); await until(s, (m) => m.t === 'welcome'); return s; };
const h = await hello('host');
sendJ(h, { t: 'create_room', visibility: 'private' });
const code = (await until(h, (m) => m.t === 'room_state')).room.code;
const gs = [];
for (let i = 0; i < 3; i++) { const g = await hello('g' + i); sendJ(g, { t: 'join_room', code }); await until(g, (m) => m.t === 'room_state'); sendJ(g, { t: 'set_ready', ready: true }); gs.push(g); }
await wait(200); sendJ(h, { t: 'start_game' }); await wait(1800);
console.log('room', code, 'in game; rss MB', rss());
for (const g of gs) { g.pause(); }
const keep = setInterval(() => { for (const s of [h, ...gs]) sendJ(s, { t: 'ping', ts: Date.now() }); }, 500);
const snap = Buffer.alloc(200 * 1024); snap[0] = 1; snap[1] = 0xff;
const f = frame(2, snap);
const t0 = Date.now(); let n = 0;
while (Date.now() - t0 < 6000) { for (let i = 0; i < 20; i++) { h.write(f); n++; } await wait(40); }
console.log('host sent', n, 'SNAP frames of 200 KB to SEAT_ALL in 6 s (', Math.round(n*200/1024), 'MB up); rss MB', rss());
clearInterval(keep); process.exit(0);
