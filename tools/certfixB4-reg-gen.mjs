// certfixB4 — regression-duty action files for the B fix round.
//   node tools/certfixB4-reg-gen.mjs
// writes tools/actions/certfixB4-reg-fps.json  (10 s rAF samples in camp and mid-wave, then a run plays to a banner)
//        tools/actions/certfixB4-reg-fit.json  (draft + path page fit / type floors; run at 1024x576 and 2560x1440)
import { ev, wait, key, mm, iife, waitFor, write, arm, clearRoom, escSocket, focus } from './certfixB4-parts.mjs';

// 10 s requestAnimationFrame sample: fps, worst gap, gaps over 100 ms.
const rafSample = (tag, ms = 10000) => ev(`(async()=>{const E=window.__echoes;const gaps=[];let last=performance.now();const t0=last;
await new Promise(res=>{function f(){const n=performance.now();gaps.push(n-last);last=n;if(n-t0<${ms})requestAnimationFrame(f);else res();}requestAnimationFrame(f);});
const total=gaps.reduce((a,b)=>a+b,0);const sorted=[...gaps].sort((a,b)=>a-b);
return {tag:${JSON.stringify(tag)},tick:E.tick,frames:gaps.length,fps:+(gaps.length/(total/1000)).toFixed(1),medianMs:+sorted[Math.floor(sorted.length/2)].toFixed(2),maxMs:+Math.max(...gaps).toFixed(1),over100:gaps.filter(g=>g>100).length,over50:gaps.filter(g=>g>50).length,enemies:E.state().enemies.length,uiFps:E.fps}})()`);

write('certfixB4-reg-fps', [
  wait(1500), arm, mm(800, 450),
  rafSample('fps-camp-10s'),
  ev(iife(`E.cmd('startRun');return {seed:E.seed,ver:E.version}`)),
  waitFor(`window.__echoes.state().enemies.length>=3`, 30000, `,enemies:E.state().enemies.length`),
  { type: 'mousedown', button: 'right' },
  rafSample('fps-wave-10s'),
  { type: 'mouseup', button: 'right' },
  // a run still plays: the room clears -> the banner/draft arrive -> Enter takes -> path
  ...clearRoom('reg-clear1'),
  ev(iife(`const b=E.hud.banner();return {tag:'reg-after-clear',tick:E.tick,screen:E.runUi().screen,banner:b.text,bannerVisible:b.visible,phase:E.runUi().phase}`)),
  wait(1500), focus('reg-draft'), key('Enter', 90), wait(1200), focus('reg-afterEnter'), escSocket,
]);

const fit = (tag) => ev(iife(`const u=E.runUi();const pg=document.querySelector('#run-screen .rn-page:not([style*="display: none"])');const r=pg?pg.getBoundingClientRect():null;
const bar=document.querySelector('.hud-bar');const br=bar?bar.getBoundingClientRect():null;
return {tag:${JSON.stringify(tag)},screen:u.screen,vw:innerWidth,vh:innerHeight,fit:u.fit,floors:u.floors,
 page:r?{x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height),bottom:Math.round(r.bottom),right:Math.round(r.right)}:null,
 bar:br?{top:Math.round(br.top),h:Math.round(br.height)}:null,
 pageInsideViewport:r?(r.x>=0&&r.y>=0&&r.right<=innerWidth&&r.bottom<=innerHeight):null,
 pageAboveBar:r&&br?r.bottom<=br.top+1:null,buttons:u.buttons,doors:u.doors.map(d=>d.box)}`));

write('certfixB4-reg-fit', [
  wait(1500), arm, mm(500, 300),
  ev(iife(`E.cmd('startRun');return {seed:E.seed,ver:E.version,vw:innerWidth,vh:innerHeight}`)),
  ...clearRoom('fit-clear1'), wait(1500), fit('fit-draft'), { type: 'shot', name: 'certfixB4-reg-fit-draft' },
  key('Enter', 90), wait(1200), escSocket, fit('fit-path'), { type: 'shot', name: 'certfixB4-reg-fit-path' },
]);
