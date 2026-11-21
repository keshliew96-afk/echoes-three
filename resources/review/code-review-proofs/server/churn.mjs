import { connect, sendJ, until } from './rawws.mjs';
import { readFileSync } from 'node:fs';
const [host, port, pid, N] = process.argv.slice(2);
const rss = () => Math.round(Number(/VmRSS:\s+(\d+)/.exec(readFileSync(`/proc/${pid}/status`, 'utf8'))[1]) / 1024);
console.log('rss before', rss());
const t0 = Date.now(); let ok = 0;
const one = async () => { const s = await connect(host, +port); sendJ(s, { t: 'hello', v: 4, build: 'x'.repeat(32), name: 'n'.repeat(16) }); await until(s, (m) => m.t === 'welcome'); s.destroy(); ok++; };
for (let i = 0; i < +N / 10; i++) await Promise.all(Array.from({ length: 10 }, one).map((p) => p.catch(() => {})));
console.log('identities created+dropped', ok, 'in', Date.now() - t0, 'ms; rss', rss());
