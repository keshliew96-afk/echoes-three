// certfixDshouldfix1 generator — probes for the D "performance hygiene" fix pass.
//
//  shine   : legendary-card shimmer cost (F2). startRun -> skipToRoom 7 (the
//            shop shelf, the one screen whose legendary card is deterministic
//            for a seed) -> census of the card / its animations / its shine
//            band -> two 3 s rAF samples (the open window, then steady).
//  wave    : in-wave first-draw hitches (A2). startRun -> room 2 -> hold RMB
//            through two wave starts, sampling every frame from 3 s after the
//            room opened, so any gap > 100 ms after the warm-up is reported
//            with the sim ring around it.
//
// Reuses the D critic's sampler library byte-for-byte (certD1-n-camp-idle.json
// entries 0/1) so the numbers are comparable with certD1-*.
import { readFileSync, writeFileSync } from 'fs';

const base = JSON.parse(readFileSync('tools/actions/certD1-n-camp-idle.json', 'utf8'));
const LIB = base[0];
const LOAD = base[1];
const ev = (code) => ({ type: 'eval', code });
const aiife = (b) =>
  `(async()=>{const E=window.__echoes;const D=window.__D;const sl=(ms)=>new Promise(r=>setTimeout(r,ms));${b}})()`;
const iife = (b) => `(()=>{const E=window.__echoes;const D=window.__D;${b}})()`;

// Census of every legendary card on screen: its box, the animations the page
// is running on it, and the shine band's live transform.
const CENSUS = `
const cards=[...document.querySelectorAll('#run-screen .rn-card')].filter(c=>c.offsetParent!==null);
const leg=cards.filter(c=>c.classList.contains('rn-legendary'));
const anims=(document.getAnimations?document.getAnimations():[]).map(a=>({
  name:(a.animationName||(a.effect&&a.effect.getKeyframes&&'css')||'?'),
  target:a.effect&&a.effect.target?(a.effect.target.className||a.effect.target.tagName)+'':null,
  pseudo:a.effect&&a.effect.pseudoElement||null,
  dur:a.effect&&a.effect.getTiming?a.effect.getTiming().duration:null,
  play:a.playState}));
const shine=leg.map(c=>{const b=c.querySelector(':scope > .rn-shine');
  return b?{has:true,transform:getComputedStyle(b).transform,bg:getComputedStyle(b).backgroundImage.slice(0,60),wc:getComputedStyle(b).willChange}:{has:false};});
const legBox=leg.map(c=>{const r=c.getBoundingClientRect();return [Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)];});
const after=leg.map(c=>{const s=getComputedStyle(c,'::after');return {content:s.content,bgImage:s.backgroundImage.slice(0,40),anim:s.animationName,bgSize:s.backgroundSize};});
`;

writeFileSync(
  'tools/actions/certfixDshouldfix1-shine.json',
  JSON.stringify(
    [
      LIB,
      LOAD,
      ev(iife(`D.arm();const r=E.cmd('startRun');return {seed:E.seed,room:r&&r.room,tick:E.tick}`)),
      ev(
        aiife(`E.cmd('skipToRoom',7);const t0=performance.now();
while(performance.now()-t0<20000){let s=null;try{s=E.runUi().screen}catch(e){}if(s==='shop')break;await sl(16);}
await sl(300);${CENSUS}
return {screen:E.runUi().screen,phase:E.cmd('runState').phase,cards:cards.length,legendary:leg.length,legBox,shine,after,anims,
  stock:(E.cmd('runState').shop?E.cmd('runState').shop.stock.map(i=>i.node+':'+i.price):null)}`)
      ),
      ev(aiife(`const a=await D.sample(3000);const b=await D.sample(3000);${CENSUS}
return {open:a.all||a,steady:b.all||b,openGaps:(a.gaps||[]).map(g=>({dt:g.dt,tm:g.timerMaxGap,screen:g.screen})),
  steadyGaps:(b.gaps||[]).map(g=>({dt:g.dt,tm:g.timerMaxGap,screen:g.screen})),
  shineAfterSample:shine,animsAfterSample:anims,heap:D.heap(),rinfo:D.rinfo()}`)),
      { type: 'shot', name: 'certfixDshouldfix1-shine-shop' },
    ],
    null,
    1
  )
);
console.log('wrote tools/actions/certfixDshouldfix1-shine.json');
