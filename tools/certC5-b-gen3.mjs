// Certification C round 5, audit re-run (prefix certC5-b-): screenshake proven in RENDERED PIXELS.
// Every rAF (after the game's own rAF has rendered) copies six peripheral 96x80 patches of the WebGL canvas and stores
// their luma; offline, a +-8 px SAD search gives the integer image shift frame-to-frame and vs the last pre-event frame.
import { writeFileSync, mkdirSync } from 'fs';
mkdirSync('tools/actions', { recursive: true });
const ev = (code) => ({ type: 'eval', code });
const wait = (ms) => ({ type: 'wait', ms });
const shot = (name) => ({ type: 'shot', name });
const iife = (b) => `(()=>{const E=__echoes;${b}})()`;
const waitFor = (cond, timeout = 30000, extra = '') =>
  ev(`(async()=>{const E=__echoes;const t0=performance.now();const k0=E.tick;while(performance.now()-t0<${timeout}){if(${cond})return {ok:true,tick:E.tick,waitedTicks:E.tick-k0,ms:Math.round(performance.now()-t0)${extra}};await new Promise(r=>setTimeout(r,8));}return {ok:false,tick:E.tick,waitedTicks:E.tick-k0${extra}}})()`);

const TYPES = ['screenshake', 'boss_quake_start', 'boss_quake_resolve', 'boss_trample', 'death', 'room_enter'];
const ARM = ev(iife(`window.__c={ev:[]};for(const t of ${JSON.stringify(TYPES)})E.on(t,e=>window.__c.ev.push(Object.assign({T:t},e)));return 'armed '+E.tick`));

const PATCHES = [[60, 110], [1440, 110], [60, 420], [1440, 420], [250, 690], [1250, 690]];
const PXSAMPLER = ev(iife(`const P=window.__arenaProbe;const gl=P.stage.renderer.domElement;const PW=96,PH=80,NP=${PATCHES.length};
  const PT=${JSON.stringify(PATCHES)};const c2=document.createElement('canvas');c2.width=PW*NP;c2.height=PH;const g=c2.getContext('2d',{willReadFrequently:true});
  window.__px={fr:[],err:null,on:true,PW,PH,NP,glW:gl.width,glH:gl.height,cssW:gl.clientWidth,cssH:gl.clientHeight};const X=window.__px;
  const sx=gl.width/gl.clientWidth,sy=gl.height/gl.clientHeight;
  const step=()=>{if(!X.on)return;try{const c=P.stage.camera.position;
    for(let i=0;i<NP;i++){const [x,y]=PT[i];g.drawImage(gl,x*sx,y*sy,PW*sx,PH*sy,i*PW,0,PW,PH);}
    const d=g.getImageData(0,0,PW*NP,PH).data;const L=new Uint8Array(PW*NP*PH);for(let k=0,j=0;k<L.length;k++,j+=4)L[k]=(d[j]*77+d[j+1]*150+d[j+2]*29)>>8;
    X.fr.push([E.tick,+performance.now().toFixed(1),c.x,c.z,L]);}catch(e){X.err=String(e);}requestAnimationFrame(step);};
  requestAnimationFrame(step);return {pxArmed:E.tick,glW:gl.width,glH:gl.height,cssW:gl.clientWidth,cssH:gl.clientHeight}`));

const ANALYZEPX = ev(iife(`const X=window.__px;X.on=false;const EV=window.__c.ev;const F=X.fr,PW=X.PW,PH=X.PH,NP=X.NP,R=8,RW=PW*NP;
  const std=(L,i)=>{let s=0,s2=0,n=0;for(let y=0;y<PH;y++)for(let x=0;x<PW;x++){const v=L[y*RW+i*PW+x];s+=v;s2+=v*v;n++;}const m=s/n;return Math.sqrt(Math.max(0,s2/n-m*m));};
  const sh=(A,B,i)=>{let bx=0,by=0,bs=1e18,z=0;for(let dy=-R;dy<=R;dy++)for(let dx=-R;dx<=R;dx++){let s=0;
      for(let y=R;y<PH-R;y++){const ra=y*RW+i*PW,rb=(y+dy)*RW+i*PW+dx;for(let x=R;x<PW-R;x++){const q=A[ra+x]-B[rb+x];s+=q<0?-q:q;}}
      if(dx===0&&dy===0)z=s;if(s<bs){bs=s;bx=dx;by=dy;}}return [bx,by,bs,z];};
  const med=(a)=>{const s=[...a].sort((p,q)=>p-q);return s.length?s[(s.length-1)>>1]:null;};
  const shift=(k,r)=>{const A=F[k][4],B=F[r][4];const v=[];for(let i=0;i<NP;i++){if(std(B,i)<10)continue;const s=sh(A,B,i);v.push(s);}
    if(!v.length)return null;return [med(v.map(s=>s[0])),med(v.map(s=>s[1])),v.length];};
  const shakeT=EV.filter(e=>e.T==='screenshake').map(e=>e.tick),enterT=EV.filter(e=>e.T==='room_enter').map(e=>e.tick);
  const r4=v=>+v.toFixed(4);
  const evs=EV.filter(e=>e.T==='boss_quake_start'||e.T==='boss_quake_resolve'||(e.T==='boss_trample')||(e.T==='screenshake'&&e.cause==='kill'))
    .filter(e=>enterT.every(t=>e.tick-t>30||e.tick<t));
  const out=[];for(const e of evs){let ref=-1;for(let k=0;k<F.length;k++)if(F[k][0]<e.tick)ref=k;if(ref<1)continue;
    const rows=[];let maxP=0,maxR=0;for(let k=ref+1;k<F.length&&F[k][0]<=e.tick+14;k++){const p=shift(k,k-1),q=shift(k,ref);
      const cs=[r4(F[k][2]-F[k-1][2]),r4(F[k][3]-F[k-1][3])];if(p){maxP=Math.max(maxP,Math.hypot(p[0],p[1]));}if(q){maxR=Math.max(maxR,Math.hypot(q[0],q[1]));}
      rows.push([F[k][0],cs,p&&[p[0],p[1]],q&&[q[0],q[1]],p&&p[2]]);}
    out.push({T:e.T==='screenshake'?'kill_shake':e.T,t:e.tick,maxPxPrev:+maxP.toFixed(2),maxPxRef:+maxR.toFixed(2),rows});}
  const base=[];for(let k=1;k<F.length;k++){const t=F[k][0];if(shakeT.some(s=>Math.abs(t-s)<=24))continue;if(enterT.some(s=>t>=s&&t-s<=90))continue;base.push(k);}
  const pick=base.filter((_,i)=>i%Math.max(1,Math.floor(base.length/120))===0).slice(0,120);
  const bs=pick.map(k=>{const p=shift(k,k-1);const cs=Math.hypot(F[k][2]-F[k-1][2],F[k][3]-F[k-1][3]);return [F[k][0],p?Math.hypot(p[0],p[1]):null,r4(cs)];});
  const hist={};for(const b of bs){const key=b[1]==null?'na':String(Math.round(b[1]));hist[key]=(hist[key]||0)+1;}
  const blank=F.filter(f=>{let s=0;for(let k=0;k<f[4].length;k+=97)s+=f[4][k];return s===0;}).length;
  const stds=F.length?Array.from({length:NP},(_,i)=>+std(F[F.length-1][4],i).toFixed(1)):[];
  return {tick:E.tick,fps:E.fps,frames:F.length,blank,err:X.err,patchStdLast:stds,glW:X.glW,cssW:X.cssW,
    baseline:{n:bs.length,pxShiftHist:hist,nonzero:bs.filter(b=>b[1]>0).map(b=>[b[0],+b[1].toFixed(2),b[2]]).slice(0,20)},
    cols:'rows=[tick,[camDx,camDz] vs prev frame,[pxDx,pxDy] vs prev frame,[pxDx,pxDy] vs last pre-event frame,patchesUsed]',
    events:out}`));

const PIN_PLAYER = `setInterval(()=>{try{E.cmd('iframe',0,600);const p=E.state().party[0];if(p&&p.hp<100)E.cmd('heal',0,100);}catch(e){window.__perr=String(e);}},100);`;
const files = {};
files['certC5-b-shakepx'] = [
  ARM,
  ev(iife(`E.cmd('startRun');${PIN_PLAYER}return {tick:E.tick,version:E.version,seed:E.seed}`)),
  wait(400),
  PXSAMPLER,
  waitFor(`window.__c.ev.filter(e=>e.T==='screenshake'&&e.cause==='kill').length>=4`, 45000, `,deaths:window.__c.ev.filter(e=>e.T==='death').length`),
  wait(500),
  shot('certC5-b-shakepx-room1'),
  ev(iife(`const r=E.cmd('skipToRoom',8);window.__t8=E.tick;setInterval(()=>{try{E.cmd('bossHp',1);}catch(e){window.__berr=String(e);}},16);return {tick:E.tick,room:r&&r.room,mode:r&&r.mode}`)),
  waitFor(`E.tick>=window.__t8+1250`, 60000),
  shot('certC5-b-shakepx-boss'),
  ANALYZEPX,
];
for (const [name, acts] of Object.entries(files)) { writeFileSync(`tools/actions/${name}.json`, JSON.stringify(acts, null, 1)); console.log('wrote', name, acts.length); }
