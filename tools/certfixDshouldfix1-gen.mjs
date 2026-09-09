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

// --- hitch anatomy --------------------------------------------------------
// Same driver as certD1-n-clear (hold RMB, take every draft, walk every door,
// three natural clears) but the recorder samples renderer.info EVERY frame, so
// each gap can be attributed: a jump in `programs` across it means a first-use
// shader compile, a jump in `geometries`/`textures` means a first upload, and
// no jump at all means the work was raster/composite.
const REC = `
D.rec = async (ms, until) => {
  const R = window.__arenaProbe.stage.renderer;
  const fr = []; let last = null; const t0 = performance.now();
  await new Promise((res) => {
    const f = (now) => {
      const i = R.info;
      if (last !== null) {
        const dt = now - last;
        fr.push([+(now - t0).toFixed(1), +dt.toFixed(2),
          i.programs.length, i.memory.geometries, i.memory.textures, E.tick,
          i.render.calls, i.render.triangles]);
        if (dt > 60) {
          let s = null; try { s = E.state(); } catch (e) {}
          D.hot = D.hot || [];
          D.hot.push({ at: +(now - t0).toFixed(0), dt: +dt.toFixed(1), tick: E.tick,
            prog: i.programs.length, geo: i.memory.geometries, tex: i.memory.textures,
            calls: i.render.calls, tris: i.render.triangles,
            enemies: s ? s.enemies.length : null, ents: E.entityCount,
            vfx: s && s.vfx ? s.vfx : null, sk: s ? s.skillfx : null, al: s ? s.allyfx : null,
            tf: s ? s.techfx : null, bo: s ? s.bossfx : null,
            ring: (E.events || []).filter((e) => e.tick >= E.tick - 20).map((e) => e.tick + ':' + e.type + (e.kind ? '/' + e.kind : '')) });
        }
      }
      last = now;
      if (now - t0 < ms && !(until && until())) requestAnimationFrame(f); else res();
    };
    requestAnimationFrame(f);
  });
  return fr;
};`;

writeFileSync(
  'tools/actions/certfixDshouldfix1-hitch.json',
  JSON.stringify(
    [
      LIB,
      LOAD,
      ev(iife(`${REC}D.arm();const r=E.cmd('startRun');return {seed:E.seed,room:r&&r.room,tick:E.tick,rec:!!D.rec}`)),
      { type: 'mousemove', x: 800, y: 380 },
      { type: 'mousedown', button: 'right' },
      ev(
        aiife(`const log=[];const drv=setInterval(()=>{try{if(D.clears>=3)return;const u=E.runUi();
if(u.screen==='draft'){E.cmd('draftTake');log.push('draftTake t'+E.tick);}
else if(u.screen==='path'){E.cmd('pathChoose',0);log.push('pathChoose t'+E.tick);}}catch(e){log.push('drv-err '+String(e).slice(0,50));}},400);
const fr=await D.rec(95000,()=>D.clears>=3&&performance.now()-D.lastClearAt>4000);clearInterval(drv);
const out=[];for(let i=1;i<fr.length;i++){const f=fr[i];if(f[1]<60)continue;const a=fr[i-1];const c=fr[Math.min(fr.length-1,i+3)];
out.push({at:f[0],dt:f[1],tick:f[5],dProg:c[2]-a[2],dGeo:c[3]-a[3],dTex:c[4]-a[4],dCalls:f[6]-a[6],dTris:f[7]-a[7],calls:f[6],tris:f[7]});}
const dts=fr.map(f=>f[1]);const warm=fr.filter(f=>f[0]>3000).map(f=>f[1]);
return {frames:fr.length,spanMs:Math.round(fr[fr.length-1][0]),max:Math.max(...dts),gt100:dts.filter(d=>d>100).length,
gt100warm:warm.filter(d=>d>100).length,gt60warm:warm.filter(d=>d>60).length,
prog0:fr[0][2],progEnd:fr[fr.length-1][2],geo0:fr[0][3],geoEnd:fr[fr.length-1][3],
driver:log,clears:D.clears,gaps:out,hot:(D.hot||[])}`)
      ),
      { type: 'mouseup', button: 'right' },
    ],
    null,
    1
  )
);
console.log('wrote tools/actions/certfixDshouldfix1-hitch.json');
