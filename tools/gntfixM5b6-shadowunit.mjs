// gntfixM5b6-shadowunit.mjs — fix-M5b-r6 unit check of net/predict.js createPartyShadow
// (pure; no browser): prediction, idempotent re-apply under every ack / snapshot order,
// retire on ack + replica tick, reject, card change, AI takeover, expiry.
// node tools/gntfixM5b6-shadowunit.mjs
import { createPartyShadow } from '../src/net/predict.js';
import { encodeCmd, decodeCmd } from '../src/net/protocol/codec.js';
let T = 0;
const now = () => T;
const view = (o = {}) => ({ phase: 'reward', room: 1, party: { room: 1, openedTick: 100, owners: ['human', o.owner || 'human', 'ai', 'ai'], cards: [{ seat: 0 }, { seat: 1, type: 'type' in o ? o.type : 'skill', id: o.id || 'shield_wall', swap: true, replace: o.replace ?? 2, decided: o.decided || false, choice: o.choice || null, by: o.by || null }, { seat: 2 }, { seat: 3 }] } });
const checks = [];
const ok = (name, c, info) => { checks.push({ name, pass: !!c, info }); };
{
  const s = createPartyShadow({ seat: 1, now });
  const v0 = view();
  ok('replace predicted', s.push(1, { op: 'replace', seat: 1, slot: 3 }, v0) && s.view(v0, 10).party.cards[1].replace === 3);
  s.push(2, { op: 'replace', seat: 1, slot: 0 }, s.view(v0, 10));
  ok('two presses inside one RTT', s.view(v0, 10).party.cards[1].replace === 0);
  ok('raw view untouched', v0.party.cards[1].replace === 2);
  // the snapshot with op 1 arrives BEFORE its ack (reliable CMD retransmit)
  ok('echo of op 1 before ack: still 0', s.view(view({ replace: 3 }), 20).party.cards[1].replace === 0);
  s.ack(1, 15);
  ok('op 1 retired when replica past ack tick; op 2 still shows', s.view(view({ replace: 3 }), 20).party.cards[1].replace === 0 && s.pendingCount() === 1);
  s.push(3, { op: 'pick', seat: 1, choice: 'take', replace: 0 }, s.view(view({ replace: 3 }), 20));
  const pv = s.view(view({ replace: 3 }), 20).party.cards[1];
  ok('pick predicted decided take with mark 0', pv.decided && pv.choice === 'take' && pv.replace === 0 && pv.by === 'human');
  s.ack(2, 21); s.ack(3, 21);
  ok('acked but replica not past -> held', s.view(view({ replace: 3 }), 21).party.cards[1].replace === 0 && s.pendingCount() === 2);
  const fin = s.view(view({ replace: 0, decided: true, choice: 'take', by: 'human' }), 24);
  ok('all retired, no correction', s.pendingCount() === 0 && fin.party.cards[1].replace === 0 && s.stats().corrections === 0, s.stats());
}
{
  const s = createPartyShadow({ seat: 1, now });
  s.push(1, { op: 'replace', seat: 1, slot: 3 }, view());
  s.reject(1);
  ok('rejected op dropped', s.view(view(), 10).party.cards[1].replace === 2 && s.stats().rejected === 1);
}
{
  const s = createPartyShadow({ seat: 1, now });
  s.push(1, { op: 'replace', seat: 1, slot: 3 }, view());
  const v2 = view(); v2.party.openedTick = 400;
  ok('another page -> dropped', s.view(v2, 10).party.cards[1].replace === 2 && s.pendingCount() === 0);
  s.push(2, { op: 'replace', seat: 1, slot: 1 }, view());
  ok('seat AI-held -> dropped (AI decision shows)', s.view(view({ owner: 'ai', decided: true, choice: 'leave', by: 'ai' }), 10).party.cards[1].choice === 'leave' && s.pendingCount() === 0);
  ok('page closed -> dropped', (s.push(3, { op: 'replace', seat: 1, slot: 1 }, view()), s.view({ phase: 'path' }, 10).party === undefined && s.pendingCount() === 0));
}
{
  const s = createPartyShadow({ seat: 1, now });
  T = 0; s.push(1, { op: 'replace', seat: 1, slot: 3 }, view());
  T = 3999; ok('unacked held < 4 s', s.view(view(), 1).party.cards[1].replace === 3);
  T = 4001; ok('unacked expired > 4 s, correction counted', s.view(view(), 1).party.cards[1].replace === 2 && s.stats().expired === 1 && s.stats().corrections === 1);
}
{
  const s = createPartyShadow({ seat: 1, now });
  ok('invalid slot not predicted', !s.push(1, { op: 'replace', seat: 1, slot: 7 }, view()));
  ok('take on an empty card not predicted', !s.push(2, { op: 'pick', seat: 1, choice: 'take' }, view({ type: null })));
  const nv = view(); nv.party.cards[1].swap = false; nv.party.cards[1].replace = null;
  ok('replace on a non-swap card not predicted', !s.push(3, { op: 'replace', seat: 1, slot: 1 }, nv));
}
{
  // the host's ack rides the reliable CMD frame (bvalue body) unchanged.
  const d = decodeCmd(encodeCmd(1, 4242, { kind: 'party_ack', re: 17, what: 'replace', tick: 123456 }));
  ok('party_ack CMD round trip', d.seat === 1 && d.cmdSeq === 4242 && d.cmd.kind === 'party_ack' && d.cmd.re === 17 && d.cmd.what === 'replace' && d.cmd.tick === 123456, d);
}
const fails = checks.filter((c) => !c.pass);
for (const c of checks) console.log(c.pass ? 'PASS' : 'FAIL', c.name, c.info ? JSON.stringify(c.info) : '');
console.log(`RESULT ${checks.length - fails.length}/${checks.length}`);
process.exit(fails.length ? 1 : 0);
