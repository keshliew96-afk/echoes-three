# A dash of its own for each hero (Kesh 2026-11-13). Run after dashrule.apply.
# apply(p, cfg, fxjs): cfg is a dict, fxjs is the hero's own dash effects (may define dashFx(ev,t), dashUpd(t,d), dummyHit(m,i)).
# cfg: go [t0,t1] the travel window in clip seconds, dist metres travelled, inv [a,b] invincible window, ev [[name,t],...] effect cues,
#      prof 'burst'|'flat'|'surge', face (turn to the dash direction), dummy {mode:'knock'|'hit'|'slow', at:[[ahead,side],...], r, stun}, note (one sentence for the rule text),
#      free: the hero's page drives the dash itself (the beetle's bell) and only uses the helpers.
import re, json

KIT = r'''
  // ---- a dash of its own for each hero (Kesh 11-13). One dash at a time: the hero turns to face where it goes and only travels inside its go window.
  const DASH=__CFG__;
  let dashYaw=0, dashPrev=-1, dashWas=false, dashInv=false, dashT=-1; const wOff=new THREE.Vector2(), dashU=[0,1];
  const worldG=new THREE.Group(), dashG=new THREE.Group(); scene.add(worldG); scene.add(dashG);   // worldG stays on the floor that slides by, dashG turns with the dash
  // how far along the dash the hero is at clip time t (0 to 1): 'burst' starts fastest and eases off, 'surge' swells and settles, 'flat' is even
  const dfrac=t=>{const u=Math.min(1,Math.max(0,(t-DASH.go[0])/(DASH.go[1]-DASH.go[0]))); return DASH.prof==='flat'?u:DASH.prof==='surge'?(1-Math.cos(Math.PI*u))/2:1-Math.pow(1-u,1.5);};
  let dashF=0;
  // a spot on the sliding floor: `ahead` metres along the dash from where the hero is now, `side` metres to the hero's left
  const heroW=(ahead=0,side=0,y=0)=>new THREE.Vector3(wOff.x+dashU[0]*ahead+dashU[1]*side,y,wOff.y+dashU[1]*ahead-dashU[0]*side);
  let softT=null; function softTex(){ if(softT)return softT; const c=document.createElement('canvas'); c.width=c.height=64; const x=c.getContext('2d'); const g=x.createRadialGradient(32,32,0,32,32,32); g.addColorStop(0,'rgba(255,255,255,1)'); g.addColorStop(0.45,'rgba(255,255,255,0.55)'); g.addColorStop(1,'rgba(255,255,255,0)'); x.fillStyle=g; x.fillRect(0,0,64,64); softT=new THREE.CanvasTexture(c); return softT; }
  // small shared effects: a soft puff and a flat ring, both dim, both on the sliding floor unless told otherwise
  const DFX=[];
  function dpuff(pos,color,size,life,o={}){ const m=new THREE.Sprite(new THREE.SpriteMaterial({map:softTex(),color,transparent:true,opacity:0,depthWrite:false})); m.position.copy(pos); m.scale.setScalar(size); (o.parent||worldG).add(m); DFX.push({m,t:-(o.delay||0),life,size,grow:o.grow==null?1.6:o.grow,vy:o.vy||0,vx:o.vx||0,vz:o.vz||0,op:o.op==null?0.4:o.op}); return m; }
  function dring(pos,color,r0,r1,life,o={}){ const m=new THREE.Mesh(new THREE.RingGeometry(o.inner==null?0.86:o.inner,1,40),new THREE.MeshBasicMaterial({color,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide})); m.position.copy(pos); if(!o.up){ m.rotation.x=-Math.PI/2; m.position.y=o.y==null?0.014:o.y; } (o.parent||worldG).add(m); DFX.push({m,t:-(o.delay||0),life,ring:[r0,r1],op:o.op==null?0.35:o.op}); return m; }
  function dfxStep(d){ for(let i=DFX.length-1;i>=0;i--){ const f=DFX[i]; f.t+=d; if(f.t<0){f.m.visible=false;continue;} f.m.visible=feel; const u=f.t/f.life; if(u>=1){ f.m.parent.remove(f.m); if(f.m.geometry&&f.ring)f.m.geometry.dispose(); f.m.material.dispose(); DFX.splice(i,1); continue; }
      const e=1-(1-u)*(1-u); if(f.ring){ f.m.scale.setScalar(f.ring[0]+(f.ring[1]-f.ring[0])*e); f.m.material.opacity=f.op*(1-u); }
      else{ f.m.scale.setScalar(f.size*(1+(f.grow-1)*e)); f.m.position.x+=f.vx*d; f.m.position.y+=f.vy*d; f.m.position.z+=f.vz*d; f.m.material.opacity=f.op*Math.min(1,u*6)*(1-u); } } }
  function dlabel(){ const c=document.createElement('canvas'); c.width=512; c.height=64; const tex=new THREE.CanvasTexture(c); const s=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false,depthTest:false})); s.scale.set(1.12,0.14,1); s.userData={c,tex,txt:null}; s.visible=false; return s; }
  function dsay(s,txt){ if(s.userData.txt===txt)return; s.userData.txt=txt; s.visible=!!txt; if(!txt)return; const x=s.userData.c.getContext('2d'); x.clearRect(0,0,512,64); x.fillStyle='rgba(32,36,34,0.78)'; x.font='600 30px system-ui,sans-serif'; const tw=Math.min(500,x.measureText(txt).width+34); x.beginPath(); x.roundRect((512-tw)/2,10,tw,44,22); x.fill(); x.fillStyle='#F2F0E8'; x.textAlign='center'; x.textBaseline='middle'; x.fillText(txt,256,33); s.userData.tex.needsUpdate=true; }
  // practice dummies: plain posts that stand in the dash lane so the rule of each dash can be seen (knocked aside and stunned, hit, slowed)
  const DUMS=[];
  function dpost(parent){ const g=new THREE.Group(), tip=new THREE.Group(); const mat=new THREE.MeshLambertMaterial({color:0x8E8676,transparent:true,emissive:0x000000});
      const add=(geo,y,par=tip)=>{const m=new THREE.Mesh(geo,mat); m.position.y=y; par.add(m); return m;};
      add(new THREE.CylinderGeometry(0.15,0.17,0.03,14),0.015,g); add(new THREE.CylinderGeometry(0.06,0.085,0.44,10),0.24); add(new THREE.BoxGeometry(0.34,0.05,0.05),0.36); add(new THREE.SphereGeometry(0.115,14,10),0.56);
      const stars=new THREE.Group(); for(let k=0;k<3;k++){const s=new THREE.Mesh(new THREE.OctahedronGeometry(0.028),new THREE.MeshBasicMaterial({color:0xE9E4D2,transparent:true,opacity:0.9})); s.position.set(Math.cos(k*2.094)*0.15,0,Math.sin(k*2.094)*0.15); stars.add(s);} stars.position.y=0.74; stars.visible=false; tip.add(stars);
      const lab=dlabel(); lab.position.y=0.92; g.add(lab); g.add(tip); g.visible=false; (parent||worldG).add(g); return {g,tip,mat,lab,stars,on:false,pos:new THREE.Vector3()}; }
  function makeDummies(){ if(!DASH.dummy||DUMS.length)return; DASH.dummy.at.forEach(()=>DUMS.push(dpost())); }
  function spawnDummies(){ makeDummies(); DUMS.forEach((m,i)=>{ const [a,s]=DASH.dummy.at[i]; m.pos.copy(heroW(a,s)); m.on=true; m.age=0; m.hit=false; m.hitT=0; m.vel=0; m.vdir=[0,0]; m.tilt=0; m.tiltV=0; m.stun=0; m.slow=0; m.say=''; m.side=s>=0?1:-1; m.u=[dashU[0],dashU[1]]; m.mat.color.setHex(0x8E8676); m.mat.emissive.setHex(0); m.stars.visible=false; dsay(m.lab,''); }); }
  function dumStep(t,d){ DUMS.forEach((m,i)=>{ if(!m.on||!feel){m.g.visible=false;return;} m.age+=d; const rx=m.pos.x-wOff.x, rz=m.pos.z-wOff.y, along=rx*m.u[0]+rz*m.u[1], lat=rx*m.u[1]-rz*m.u[0];
      if(!m.hit&&t>=DASH.go[0]&&along<(DASH.dummy.r||0.3)&&Math.abs(lat)<(DASH.dummy.w||0.4)){ m.hit=true; m.hitT=0; const md=DASH.dummy.mode;
        if(md==='knock'){ m.vel=DASH.dummy.push||3.2; m.vdir=[m.u[1]*m.side,-m.u[0]*m.side]; m.stun=DASH.dummy.stun; m.tiltV=9; }
        else if(md==='hit'){ m.tiltV=7; m.say='Hit'; }
        if(typeof dummyHit==='function')dummyHit(m,i); }
      if(m.hit){ m.hitT+=d; }
      if(m.vel>0.01){ m.pos.x+=m.vdir[0]*m.vel*d; m.pos.z+=m.vdir[1]*m.vel*d; m.vel*=Math.exp(-7*d); }
      // a damped wobble for the post
      const rest=m.stun>0?0.42:0; m.tiltV+=((rest-m.tilt)*160-m.tiltV*14)*d; m.tilt+=m.tiltV*d;
      if(DASH.dummy.mode==='knock'){ m.tip.rotation.set(0,0,0); if(m.hit)m.tip.rotateOnAxis(TMPV.set(m.vdir[1],0,-m.vdir[0]).normalize(),m.tilt); if(m.stun>0){ m.stun-=d; m.stars.visible=true; m.stars.rotation.y+=d*9; m.say='Stunned '+Math.max(0.1,Math.ceil(m.stun*10)/10).toFixed(1)+' s'; if(m.stun<=0){m.stars.visible=false; m.say=''; } } }
      else{ m.tip.rotation.set(0,0,0); m.tip.rotateOnAxis(TMPV.set(m.u[1],0,-m.u[0]),m.tilt*0.6); if(DASH.dummy.mode==='hit'){ m.mat.emissive.setHex(0xffffff); m.mat.emissiveIntensity=m.hit?Math.max(0,0.22-m.hitT*2.2):0; if(m.hit&&m.hitT>0.6)m.say=''; } }
      if(DASH.dummy.mode==='slow'){ const wet=typeof dummyWet==='function'&&dummyWet(m); m.slow=wet?Math.min(1,m.slow+d*6):Math.max(0,m.slow-d*3); m.mat.color.setRGB(0.557-0.2*m.slow,0.525+0.05*m.slow,0.463+0.3*m.slow); m.say=m.slow>0.5?'Slowed':''; m.bob=(m.bob||0)+d*(m.slow>0.5?3.2:8); m.tip.position.y=0.02*Math.abs(Math.sin(m.bob)); m.tip.rotation.z=0.07*Math.sin(m.bob); }
      dsay(m.lab,m.say); const far=Math.hypot(rx,rz)>5.5, old=m.age>(DASH.dummy.life||2.6); const fade=old?Math.max(0,1-(m.age-(DASH.dummy.life||2.6))/0.3):Math.min(1,m.age/0.12); m.mat.opacity=fade; m.g.position.set(m.pos.x,0,m.pos.z); m.g.visible=fade>0&&!far; if(fade<=0||far){m.on=false; m.g.visible=false;} }); }
  const TMPV=new THREE.Vector3();
  const toW=v=>{v.x+=wOff.x; v.z+=wOff.y; return v;};   // a point seen now, turned into a spot on the sliding floor
  function dashTick(d){
    if(model.rotation.order!=='YXZ')model.rotation.order='YXZ';
    const a=running.get('dash'); const on=!DASH.free&&sel.dash&&!sel.downed&&!rising&&!!a&&a.__tw>0; const t=on?a.time:-1; dashT=t;
    if(on){ const v=DIRV[sel.dir], l=Math.hypot(v[0],v[1]); dashU[0]=v[0]/l; dashU[1]=v[1]/l;
      if(!dashWas||t<dashPrev)dashF=0; const f=dfrac(t), step=Math.max(0,f-dashF)*DASH.dist; dashF=f; const going=t>DASH.go[0]&&t<DASH.go[1]; moving=going?[dashU[0]*0.001,dashU[1]*0.001]:[0,0];
      if(step>0){ const dx=dashU[0]*step, dz=dashU[1]*step; wOff.x+=dx; wOff.y+=dz; floor.position.x=((floor.position.x-dx)%0.5+0.5)%0.5; floor.position.z=((floor.position.z-dz)%0.5+0.5)%0.5; }
      dashInv=t>=DASH.inv[0]&&t<DASH.inv[1];
      const fire=(lo,hi)=>DASH.ev.forEach(([n,te])=>{ if(lo<te&&hi>=te){ if(n==='start'&&DASH.dummy&&feel)spawnDummies(); if(typeof dashFx==='function')dashFx(n,te); } });
      if(!dashWas||t<dashPrev){ if(dashWas)fire(dashPrev,1e9); fire(-1,t); } else fire(dashPrev,t);
      dashPrev=t; }
    else{ if(dashWas&&typeof dashFx==='function')dashFx('off',-1); dashInv=false; dashPrev=-1; }
    dashWas=on;
    if(!DASH.free){ const ty=on&&DASH.face!==false?Math.atan2(dashU[0],dashU[1]):0; let dy=ty-dashYaw; dy=Math.atan2(Math.sin(dy),Math.cos(dy)); dashYaw+=dy*Math.min(1,d*(on?40:14)); if(Math.abs(dashYaw)<1e-4&&!on)dashYaw=0; model.rotation.y=dashYaw; dashG.rotation.y=dashYaw; }
    if(moving&&hitstop<=0){ wOff.x+=moving[0]*0.9*d; wOff.y+=moving[1]*0.9*d; }
    worldG.position.set(-wOff.x,0,-wOff.y);
    if(typeof dashUpd==='function')dashUpd(t,d);
    dumStep(t,d); dfxStep(d);
  }
__FX__
'''

def apply(p, cfg, fxjs=''):
    def rep(o, n, cnt=1):
        nonlocal p
        assert o in p, o[:90]; p = p.replace(o, n, cnt)
    assert 'dashCancel' in p, 'run dashrule first'
    kit = KIT.replace('__CFG__', json.dumps(cfg)).replace('__FX__', fxjs)
    rep("  function tapAttack(){", kit + "  function tapAttack(){")
    if not cfg.get('free'):
        rep("mixOf('dash',sel.dir).forEach(m=>want.push(m));", "want.push({n:'dash'});")
        rep("sel.dash?DIRV[sel.dir].map(v=>v*2.2):", "sel.dash?[0,0]:")
        rep("const on=sel.dash&&!sel.downed&&!rising; invClock+=d;", "const on=sel.dash&&dashInv&&!sel.downed&&!rising; invClock+=d;")
    rep("model.rotation.x=lean.x; model.rotation.z=-lean.y;", "{const cy=Math.cos(dashYaw), sy=Math.sin(dashYaw); model.rotation.x=lean.x*cy+lean.y*sy; model.rotation.z=-(lean.y*cy-lean.x*sy);}")
    rep("iframes(d); driveStaff(); ", "dashTick(d); iframes(d); driveStaff(); ")
    rep("window.__review={", "window.__review={cam:(p,t)=>{cam.position.set(...p);orbit.target.set(...t);orbit.update();},dashS:()=>({t:+dashT.toFixed(3),inv:dashInv,yaw:+dashYaw.toFixed(2),off:[+wOff.x.toFixed(2),+wOff.y.toFixed(2)],moving:moving?moving.map(v=>+v.toFixed(2)):null,dfx:DFX.length,dums:DUMS.map(m=>({on:m.on,hit:m.hit,say:m.say}))}),")
    if not cfg.get('free'):
        if cfg.get('face', True):
            p, c = re.subn(r"walks, runs or dashes while (he|she) keeps facing the same way", r"walks or runs while \1 keeps facing the same way", p); assert c == 1, 'facing text'
        p, c = re.subn(r"4 dashes", "1 dash", p); assert c == 1, 'moves text'
        p, c = re.subn(r"(<dt>Moves</dt><dd>)(\d+)", lambda m: m.group(1) + str(int(m.group(2)) - 3), p); assert c == 1, 'moves count'
    note = cfg.get('note')
    if note:
        rep("and the dash is invincible (the pale blue tint).", "and the dash is invincible (the pale blue tint). " + note)
    return p
