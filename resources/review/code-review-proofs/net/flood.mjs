const R = '/home/claude/echoes-three/src/net/';
const { createHostDriver } = await import(R + 'driver.js');
const { encodeInputPacket, withSeat } = await import(R + 'protocol/codec.js');
const seats = [{ index: 0, peerId: 'h', connected: true }, { index: 1, peerId: 'g', connected: true }];
const net = { room: { seats }, peerId: 'h', transport: { state: 'open', sendBinary() {} } };
const inputs = [];
const world = { step(t, p, si) { inputs.push(si.seats[1] ? si.seats[1].moves.length + ':' + JSON.stringify(si.seats[1].moves[0]) : 'none'); }, cmd() { return {}; } };
const clock = { tick: 0, onTickEnd() { return () => {}; } };
const d = createHostDriver({ net, world, clock, bus: { on() { return () => {}; } }, registry: { all: () => [] }, capture: () => ({}), sampleLocal: () => ({ move: { x: 0, z: 0 }, presses: [] }) });
const f = (seq, move) => ({ seq, tick: seq, viewTick: 0, move, basic: false, revive: false, away: false, aimX: 0, aimZ: 0, press: 0 });
// normal: guest sends seq 1..10 move E
for (let s = 1; s <= 10; s++) d.onBinary(withSeat(encodeInputPacket(1, null, [f(s, 1)]), 1));
for (let t = 1; t <= 10; t++) d.step(t);
// (a) one packet whose frames jump the seq line by 1e6
d.onBinary(withSeat(encodeInputPacket(1, null, [f(1_000_000, 5)]), 1));
// then the guest keeps sending its real line 11..300 (move W)
for (let s = 11; s <= 300; s++) { d.onBinary(withSeat(encodeInputPacket(1, null, [f(s, 5)]), 1)); }
for (let t = 11; t <= 300; t++) d.step(t);
console.log('after real frames consumed, buffer size', d.feeds.get(1).buffer.size, 'lastConsumed', d.feeds.get(1).lastConsumed);
// (b) hostile: sparse far-future seqs never drained
for (let p = 0; p < 50000; p++) d.onBinary(withSeat(encodeInputPacket(1, null, [0,1,2,3,4,5].map((k) => f(2_000_000 + p * 100 + k * 10, 1))), 1));
console.log('buffer after 50k hostile packets', d.feeds.get(1).buffer.size);
const before = d.feeds.get(1).lastConsumed;
for (let t = 301; t <= 400; t++) d.step(t);
console.log('100 ticks later lastConsumed', before, '->', d.feeds.get(1).lastConsumed, 'last input', inputs.at(-1), 'gapsFilled', d.stats().gapsFilled);
