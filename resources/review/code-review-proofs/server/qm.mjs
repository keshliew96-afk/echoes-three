import { connect, sendJ, until, wait } from './rawws.mjs';
const s = await connect('127.0.0.1', 5302); sendJ(s, { t: 'hello', v: 4, build: 'x', name: 'q' }); await until(s, (m) => m.t === 'welcome');
sendJ(s, { t: 'quick_match' });
for (let i = 0; i < 4; i++) { await wait(1000); sendJ(s, { t: 'ping', ts: Date.now() }); }
console.log('match_status messages in ~4 s:', s.msgs.filter((m) => m.t === 'match_status').length, JSON.stringify(s.msgs.filter((m) => m.t === 'match_status')));
process.exit(0);
