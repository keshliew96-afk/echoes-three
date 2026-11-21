import { connect, frame, sendJ, wait } from './rawws.mjs';
import { readFileSync } from 'node:fs';
const [host, port, pid] = process.argv.slice(2);
const rss = () => Math.round(Number(/VmRSS:\s+(\d+)/.exec(readFileSync(`/proc/${pid}/status`, 'utf8'))[1]) / 1024);
const s = await connect(host, Number(port)); sendJ(s, { t: "hello", v: 4, build: "x", name: "a" }); await wait(200); setInterval(() => sendJ(s, { t: "ping", ts: Date.now() }), 1000);
console.log('rss before MB', rss());
s.pause(); // never read what the server sends back
const ping = frame(9, Buffer.alloc(125, 7));
const batch = Buffer.concat(Array.from({ length: 2000 }, () => ping));
const t0 = Date.now();
while (Date.now() - t0 < 8000) { if (!s.write(batch)) await Promise.race([new Promise((r) => s.once("drain", r)), wait(500)]); }
console.log('sent pings for 8s; rss after MB', rss());
await wait(2000); console.log('rss +2s MB', rss(), 'socket still open?', !s.destroyed);
s.destroy(); await wait(1500); console.log('rss after close MB', rss());
