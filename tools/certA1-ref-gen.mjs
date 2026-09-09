// certA1-ref critic — action-file generator (shop interaction evidence).
// Writes tools/actions/certA1-ref-*.json via JSON.stringify (never hand-escaped).
import { writeFileSync } from 'fs';
const ev = (code) => ({ type: 'eval', code });
const wait = (ms) => ({ type: 'wait', ms });
const iife = (body) => `(()=>{const E=__echoes;${body}})()`;
const shot = (name) => ({ type: 'shot', name });
const click = (x, y) => ({ type: 'click', x, y });
const move = (x, y) => ({ type: 'mousemove', x, y });
const waitFor = (cond, timeout = 20000) =>
  ev(`(async()=>{const E=__echoes;const t0=performance.now();const k0=E.tick;while(performance.now()-t0<${timeout}){if(${cond})return {ok:true,tick:E.tick,waitedTicks:E.tick-k0};await new Promise(r=>setTimeout(r,8));}return {ok:false,tick:E.tick}})()`);
const ui = (tag) => ev(iife(`const u=E.runUi();const r=E.state().run;return JSON.stringify({tag:${JSON.stringify(tag)},tick:E.tick,screen:u.screen,wallet:u.wallet,owned:u.owned,plaques:u.plaques,cards:u.cards,buttons:u.buttons,phase:r.phase,room:r.room,ev:(window.__c?window.__c.ev.map(e=>[e.T,e.tick,e.nodeId||e.id||'',e.cost||'',e.wallet||'']):[])}).slice(0,3000)`));
const arm = ev(iife(`window.__c={ev:[]};for(const t of ['shop_buy','currency_denied','node_granted','sound','skill_equip'])E.on(t,e=>window.__c.ev.push(Object.assign({T:t},e)));return 'armed '+E.tick`));

const files = {};
files['certA1-ref-shop'] = [
  arm,
  ev(iife(`E.cmd('startRun');const r=E.cmd('skipToRoom',7);return {seed:E.seed,room:r&&r.room,phase:r&&r.phase,mode:r&&r.mode}`)),
  waitFor(`E.runUi().screen==='shop'`, 15000),
  wait(1500),
  ui('shop-open'),
  move(528, 390), wait(250), ui('hover-bounce'), shot('certA1-ref-shop-hover'),
  click(528, 390), wait(120), ui('buy1-120ms'), shot('certA1-ref-shop-buy1a'),
  wait(400), ui('buy1-520ms'), shot('certA1-ref-shop-buy1b'),
  move(800, 390), click(800, 390), wait(120), ui('buy2-120ms'), shot('certA1-ref-shop-buy2'),
  move(1072, 390), click(1072, 390), wait(100), ui('deny-100ms'), shot('certA1-ref-shop-deny1'),
  wait(150), ui('deny-250ms'), shot('certA1-ref-shop-deny2'),
  wait(400), ui('deny-650ms'),
];
for (const [name, actions] of Object.entries(files)) {
  writeFileSync(`tools/actions/${name}.json`, JSON.stringify(actions, null, 1));
  console.log('wrote tools/actions/' + name + '.json (' + actions.length + ' steps)');
}
