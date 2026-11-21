import { connect, frame, wait } from './rawws.mjs';
import { readFileSync } from 'node:fs';
const [host, port, pid] = process.argv.slice(2);
const rss = () => Math.round(Number(/VmRSS:\s+(\d+)/.exec(readFileSync(`/proc/${pid}/status`, 'utf8'))[1]) / 1024);
const s = await connect(host, Number(port));
console.log('rss before MB', rss());
s.pause();
const ping = frame(9, Buffer.alloc(125, 7));
const batch = Buffer.concat(Array.from({ length: 2000 }, () => ping));
const t0 = Date.now(); let sent = 0;
while (Date.now() - t0 < 4500) { sent++; if (!s.write(batch)) await Promise.race([new Promise((r) => s.once('drain', r)), wait(200)]); }
console.log('no hello, 4.5 s of pings, batches', sent, 'rss MB', rss());
await wait(3000); console.log('after server hello-timeout close, rss MB', rss());
process.exit(0);
