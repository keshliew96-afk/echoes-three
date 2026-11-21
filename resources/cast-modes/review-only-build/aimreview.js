// REVIEW-ONLY (cast modes design review, 2026-11-16): draws one skill's aim
// indicator on the floor of a real room, using the same 2D drawing as the
// review page, on a canvas texture laid flat under the hero. Not for merge.
import { CanvasTexture, Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace } from 'three';
const GLOW = {healer:'#E8A23D',tank:'#9DB8CF',swordsman:'#E8577A',archer:'#5ED3C0',tidecaller:'#3F7FE6',bellwright:'#F5D06B',duskwing:'#E0509E'};
const C_LIVE='rgba(244,239,230,0.9)', F_LIVE='rgba(244,239,230,0.17)', C_CD='rgba(201,194,179,0.42)', F_CD='rgba(201,194,179,0.0)', HEAL='#5FE873';
let cdDash=false; const CDD=[0.14,0.12];
let foes = [];
const norm=(x,z)=>{const l=Math.hypot(x,z);return l>1e-6?{x:x/l,z:z/l,l}:{x:0,z:-1,l:0};};
// ---------- drawing (world units, z down the screen) ----------
function tf(ctx,scale,ox,oz){ctx.setTransform(scale,0,0,scale,ox,oz);}
function circle(ctx,x,z,r,edge,fill,dash,lw){ctx.beginPath();ctx.arc(x,z,r,0,Math.PI*2);if(fill){ctx.fillStyle=fill;ctx.fill();}ctx.setLineDash(dash||(cdDash?CDD:[]));ctx.strokeStyle=edge;ctx.lineWidth=lw;ctx.stroke();ctx.setLineDash([]);}
function wedge(ctx,x,z,dir,r,halfDeg,edge,fill,lw){const a0=Math.atan2(dir.z,dir.x),h=Math.min(Math.PI,halfDeg*Math.PI/180);ctx.beginPath();ctx.moveTo(x,z);ctx.arc(x,z,r,a0-h,a0+h);ctx.closePath();ctx.fillStyle=fill;ctx.fill();ctx.setLineDash(cdDash?CDD:[]);ctx.strokeStyle=edge;ctx.lineWidth=lw;ctx.stroke();ctx.setLineDash([]);}
function bar(ctx,x,z,dir,len,w,edge,fill,lw,head){const px=-dir.z,pz=dir.x,hw=w/2,ex=x+dir.x*len,ez=z+dir.z*len;ctx.beginPath();ctx.moveTo(x+px*hw,z+pz*hw);ctx.lineTo(ex+px*hw,ez+pz*hw);
  if(head){ctx.lineTo(ex+px*hw*2.2,ez+pz*hw*2.2);ctx.lineTo(ex+dir.x*w*1.6,ez+dir.z*w*1.6);ctx.lineTo(ex-px*hw*2.2,ez-pz*hw*2.2);}
  ctx.lineTo(ex-px*hw,ez-pz*hw);ctx.lineTo(x-px*hw,z-pz*hw);ctx.closePath();ctx.fillStyle=fill;ctx.fill();ctx.setLineDash(cdDash?CDD:[]);ctx.strokeStyle=edge;ctx.lineWidth=lw;ctx.stroke();ctx.setLineDash([]);}
function arrow(ctx,x,z,dir,len,edge,lw){if(len<0.05)return;const ex=x+dir.x*len,ez=z+dir.z*len,px=-dir.z,pz=dir.x;ctx.setLineDash([0.18,0.12]);ctx.beginPath();ctx.moveTo(x,z);ctx.lineTo(ex,ez);ctx.strokeStyle=edge;ctx.lineWidth=lw*1.4;ctx.stroke();ctx.setLineDash([]);
  ctx.beginPath();ctx.moveTo(ex+dir.x*0.22,ez+dir.z*0.22);ctx.lineTo(ex-dir.x*0.12+px*0.17,ez-dir.z*0.12+pz*0.17);ctx.lineTo(ex-dir.x*0.12-px*0.17,ez-dir.z*0.12-pz*0.17);ctx.closePath();ctx.fillStyle=edge;ctx.fill();}
function bellGlyph(ctx,x,z,col){ctx.beginPath();ctx.moveTo(x-0.16,z+0.12);ctx.quadraticCurveTo(x-0.15,z-0.2,x,z-0.2);ctx.quadraticCurveTo(x+0.15,z-0.2,x+0.16,z+0.12);ctx.closePath();ctx.fillStyle=col;ctx.fill();}
function clampTo(P,aim,r){const d=norm(aim.x-P.x,aim.z-P.z);return d.l<=r?{x:aim.x,z:aim.z}:{x:P.x+d.x*r,z:P.z+d.z*r};}
function dashLen(s,aimDist,reach){return Math.min(s.dash,Math.max(0,aimDist-0.8*reach));}
function picks(s,P,heroes){const elig=heroes.filter(m=>m.self||Math.hypot(m.x-P.x,m.z-P.z)<=s.range);
  if(s.pick==='threat'){const n=m=>foes.filter(f=>Math.hypot(f.x-m.x,f.z-m.z)<2.6).length;elig.sort((a,b)=>(a.cls==='tank')-(b.cls==='tank')||n(b)-n(a)||a.hp-b.hp);}
  else elig.sort((a,b)=>a.hp-b.hp||(b.self?1:0)-(a.self?1:0));
  return elig.slice(0,Math.max(1,s.count||1));}
// draw one skill's indicator. o: {P, aim, live, alpha, lw, heroes, bells, passiveShow}
function drawInd(ctx,s,o){
  const P=o.P, d=norm(o.aim.x-P.x,o.aim.z-P.z), live=o.live, lw=o.lw;
  const a=o.alpha??1; ctx.save(); ctx.globalAlpha=a; cdDash=!live;
  const E=live?C_LIVE:C_CD, F=live?(o.flash?'rgba(244,239,230,0.42)':F_LIVE):F_CD;
  switch(s.k){
    case 'line': bar(ctx,P.x,P.z,d,s.range,0.32,E,F,lw,true); if(s.pierce>1){for(let i=1;i<=3;i++){const t=s.range*i/4,cx=P.x+d.x*t,cz=P.z+d.z*t,px=-d.z,pz=d.x;ctx.beginPath();ctx.moveTo(cx-d.x*0.1+px*0.12,cz-d.z*0.1+pz*0.12);ctx.lineTo(cx+d.x*0.06,cz+d.z*0.06);ctx.lineTo(cx-d.x*0.1-px*0.12,cz-d.z*0.1-pz*0.12);ctx.strokeStyle=E;ctx.lineWidth=lw;ctx.stroke();}} break;
    case 'fan': {const n=s.count,base=Math.atan2(d.z,d.x),st12=12*Math.PI/180;for(let i=0;i<n;i++){const ang=base+(i-(n-1)/2)*st12;bar(ctx,P.x,P.z,{x:Math.cos(ang),z:Math.sin(ang)},s.range,0.2,E,F,lw,true);}break;}
    case 'cone': wedge(ctx,P.x,P.z,d,s.range,s.area,E,F,lw); break;
    case 'dash_cone': {const L=dashLen(s,d.l,s.range);arrow(ctx,P.x,P.z,d,L,E,lw);wedge(ctx,P.x+d.x*L,P.z+d.z*L,d,s.range,s.area,E,F,lw);circle(ctx,P.x,P.z,s.dash,'rgba(244,239,230,0.35)',null,[0.16,0.14],lw*0.8);break;}
    case 'dash_ring': {const L=dashLen(s,d.l,s.area);arrow(ctx,P.x,P.z,d,L,E,lw);circle(ctx,P.x+d.x*L,P.z+d.z*L,s.area,E,F,null,lw);circle(ctx,P.x,P.z,s.dash,'rgba(244,239,230,0.35)',null,[0.16,0.14],lw*0.8);break;}
    case 'self_ring': circle(ctx,P.x,P.z,s.area,E,F,null,lw); break;
    case 'pull_ring': circle(ctx,P.x,P.z,s.drawArea,E,F_CD,[0.2,0.14],lw); circle(ctx,P.x,P.z,s.area,E,F,null,lw);
      ctx.fillStyle=E;ctx.font='600 0.32px Inter, sans-serif';ctx.textAlign='center';ctx.fillText('1 s',P.x,P.z-s.area-0.12); break;
    case 'ground': case 'bell': {circle(ctx,P.x,P.z,s.range,'rgba(244,239,230,0.45)',null,[0.2,0.14],lw*0.8);const c=clampTo(P,o.aim,s.range);circle(ctx,c.x,c.z,s.area,E,F,null,lw);if(s.k==='bell')bellGlyph(ctx,c.x,c.z,E);break;}
    case 'bells': {const bs=o.bells&&o.bells.length?o.bells:[P];for(const b of bs)circle(ctx,b.x,b.z,s.area,E,F,null,lw);break;}
    case 'hop_puddle': {arrow(ctx,P.x,P.z,{x:-d.x,z:-d.z},s.vault,E,lw);circle(ctx,P.x,P.z,s.area,E,F,null,lw);if(s.id==='wing_hop')bellGlyph(ctx,P.x,P.z,E);break;}
    case 'shot_vault': bar(ctx,P.x,P.z,d,s.range,0.32,E,F,lw,true); arrow(ctx,P.x,P.z,{x:-d.x,z:-d.z},s.vault,E,lw); break;
    case 'allies': {circle(ctx,P.x,P.z,s.range,'rgba(244,239,230,0.55)',F_CD,[0.2,0.14],lw*0.8);
      for(const m of picks(s,P,o.heroes)){circle(ctx,m.x,m.z,0.62,live?HEAL:C_CD,null,null,lw*2.6);const tz=m.z-0.95;ctx.beginPath();ctx.moveTo(m.x-0.2,tz-0.22);ctx.lineTo(m.x,tz);ctx.lineTo(m.x+0.2,tz-0.22);ctx.strokeStyle=live?HEAL:C_CD;ctx.lineWidth=lw*2.6;ctx.stroke();} break;}
    case 'passive': if(o.passiveShow) circle(ctx,P.x,P.z,s.area,'rgba(201,194,179,0.6)','rgba(201,194,179,0.06)',[0.16,0.12],lw); break;
  }
  cdDash=false; ctx.restore();
}
function drawFloor(ctx,w,h,scale,ox,oz){ctx.setTransform(1,0,0,1,0,0);const g=ctx.createRadialGradient(w/2,h*0.45,40,w/2,h/2,w*0.7);g.addColorStop(0,'#3d5a2e');g.addColorStop(1,'#22331c');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
  tf(ctx,scale,ox,oz);ctx.strokeStyle='rgba(255,255,255,0.045)';ctx.lineWidth=1/scale;const xr=w/scale/2+1,zr=h/scale/2+1;
  for(let x=Math.floor(-xr-ox/scale+w/scale/2);x<=xr+2;x++){ctx.beginPath();ctx.moveTo(x,-zr-5);ctx.lineTo(x,zr+5);ctx.stroke();}
  for(let z=Math.floor(-zr-2);z<=zr+2;z++){ctx.beginPath();ctx.moveTo(-xr-5,z);ctx.lineTo(xr+5,z);ctx.stroke();}}
function drawBody(ctx,x,z,r,col,ring){ctx.beginPath();ctx.ellipse(x,z+0.08,r*1.05,r*0.55,0,0,Math.PI*2);ctx.fillStyle='rgba(0,0,0,0.3)';ctx.fill();ctx.beginPath();ctx.arc(x,z,r,0,Math.PI*2);ctx.fillStyle=col;ctx.fill();ctx.lineWidth=0.05;ctx.strokeStyle=ring||'#221F1B';ctx.stroke();}
function drawFoe(ctx,f){drawBody(ctx,f.x,f.z,0.3,'#3a2f2a','#120f0d');ctx.fillStyle='#B8141F';ctx.beginPath();ctx.arc(f.x-0.09,f.z-0.06,0.045,0,7);ctx.arc(f.x+0.09,f.z-0.06,0.045,0,7);ctx.fill();}
function drawAlly(ctx,m){drawBody(ctx,m.x,m.z,0.3,GLOW[m.cls],'#221F1B');ctx.fillStyle='rgba(0,0,0,0.6)';ctx.fillRect(m.x-0.4,m.z-0.56,0.8,0.1);ctx.fillStyle=HEAL;ctx.fillRect(m.x-0.4,m.z-0.56,0.8*m.hp,0.1);}


export function createAimReview({ stage }) {
  const SPAN = 18, PX = 1536;
  const cv = document.createElement('canvas'); cv.width = cv.height = PX;
  const ctx = cv.getContext('2d');
  const tex = new CanvasTexture(cv); tex.colorSpace = SRGBColorSpace;
  const mat = new MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false });
  const mesh = new Mesh(new PlaneGeometry(SPAN, SPAN), mat);
  mesh.rotation.x = -Math.PI / 2; mesh.position.y = 0.035; mesh.renderOrder = 5; mesh.visible = false;
  stage.scene.add(mesh);
  return {
    set({ skill, hero, aim, live = true, heroes = [], bells = [], foes: f = [], alpha = 1, lwMul = 1 }) {
      foes = f;
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, PX, PX);
      const sc = PX / SPAN; ctx.setTransform(sc, 0, 0, sc, PX / 2 - hero.x * sc, PX / 2 - hero.z * sc);
      drawInd(ctx, skill, { P: hero, aim, live, lw: 0.06 * lwMul, heroes, bells, passiveShow: true, alpha });
      tex.needsUpdate = true; mesh.position.x = hero.x; mesh.position.z = hero.z; mesh.visible = true;
    },
    hide() { mesh.visible = false; },
  };
}
