import re,sys
S='/tmp/claude-0/-home-user/c6e5249c-651a-5d08-9e09-1bd0fe313c84/scratchpad'
H=open(S+'/review/index.html').read()
body=open(S+'/harew/body.html').read()
a=H.index('<div class="wrap">'); b=H.index('<script src="https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js">')
p=H[:a]+body+H[b:]
def rep(o,n,c=1):
    global p
    assert o in p,o[:90]; p=p.replace(o,n,c)
rep('<title>Tripo Healer Review</title>','<title>Tripo Hare Review</title>')
rep('<script src="healer-model.js"></script>','<script src="hare-model.js"></script>')
rep("window.HEALER_GLB_B64","window.MODEL_GLB_B64")
rep("ORDER2=['tap','combo','castPoint','castBloom','castPlant','castSweep','castGive','castChannel','wave','throw','hurt'];","ORDER2=['tap','combo','castPoint','castBloom','castPlant','castSweep','vault','wave','hurt'];")
a=p.index("  const LABEL={"); b=p.index("\n",a)
p=p[:a]+"  const LABEL={idle:'Idle',walk:'Walk',run:'Run',combo:'Bow combo',dash:'Dash',hurt:'Hurt',wave:'Wave',vault:'Vault shot',downed:'Downed',crawl:'Crawl',spawn:'Spawn',tap:'Tap attack',castPoint:'Cast: power shot',castBloom:'Cast: sky volley',castPlant:'Cast: trap',castSweep:'Cast: feather fan'};"+p[b:]
rep("ACTIONS=['combo','castPoint','castBloom','castPlant','castSweep','castGive','castChannel','wave','throw'];","ACTIONS=['combo','castPoint','castBloom','castPlant','castSweep','vault','wave'];")
rep("const UPPERS=['combo','combo1','combo2','combo3','wave','castPoint','castBloom','castPlant','castSweep','castGive','castChannel'];","const UPPERS=['combo','combo1','combo2','combo3','wave','vault','castPoint','castBloom','castPlant','castSweep'];")
a=p.index("  const CT={"); b=p.index("\n",a)
p=p[:a]+"  const CT={combo:[0.22,0.54,1.00],combo1:[0.22],combo2:[0.28],combo3:[0.42],castPoint:[0.62],castBloom:[0.52],castPlant:[0.42],castSweep:[0.36],vault:[0.36]};"+p[b:]
rep("const THROWS={throw:[0.42,1.22]}, GEMFLY={};","const THROWS={}, GEMFLY={};")
rep("    A.throwUp=mixer.clipAction(sub(by.throw,'throwUp',n=>UPPER.test(n)||n==='weapon'));\n","    // an upper-body move over walking or running legs keeps its aim: the turn and lean its hips had in the full move are folded into the spine, so the trunk, the bow and the arrow point where they do when she stands\n    { const r=model.getObjectByName('hips').quaternion.clone().invert(), qa=new THREE.Quaternion(), qb=new THREE.Quaternion(); UPPERS.forEach(n=>{const h=by[n].tracks.find(t=>t.name==='hips.quaternion'), s=A[n+'Up'].getClip().tracks.find(t=>t.name==='spine.quaternion'); if(!h||!s)return; for(let i=0;i<s.values.length;i+=4){qa.fromArray(h.values,i); qb.fromArray(s.values,i); qa.premultiply(r).multiply(qb).toArray(s.values,i);} }); }\n")
rep("a.setEffectiveTimeScale(w.sync?a.getClip().duration/0.7:1);","a.setEffectiveTimeScale(w.sync?a.getClip().duration/(/^dash/.test(w.n)?0.66:0.6):1);")
rep("const cur=document.getElementById('cur'); if(cur.dataset.name===name)return;","const cur=document.getElementById('cur'); if(!cur||cur.dataset.name===name)return;")
rep("const CUR={idle:'cur-idle.mp4',walk:'cur-walk.mp4',combo:'cur-combo.mp4',dash:'cur-dash.mp4',hurt:'cur-hurt.mp4'};","const CUR={};")
rep("    if(next===1){ if(gemLocked())return; recallGem(); }\n","")
rep("else{ if(k==='combo'&&sel.action!=='combo'){ if(gemLocked())return; recallGem(); } sel.action=sel.action===k?null:k;}","else{sel.action=sel.action===k?null:k;}")
rep("      else if((k==='tap'&&!sel.tap||k==='combo'&&sel.action!=='combo')&&gemLocked()){off=true;why='The gem is out. Hit 1 opens again 1 second after it leaves.';}\n","")
rep("if(wasFlying&&!fl&&throwAct&&feel){flash=0.7; riseAt(new THREE.Vector3(0,0,0.1),14,0.4);} wasFlying=fl;","wasFlying=fl;")
# contacts
a=p.index("  function watchContacts(){"); b=p.index("  function makeFx(){")
p=p[:a]+"""  function watchContacts(){
    running.forEach((a,n)=>{const key=n.replace(/Up$/,''); const cts=CT[key]; const t=a.time; if(cts&&feel&&a.__tw>0){cts.forEach((c,i)=>{if(a.__prev<c&&t>=c){
      const hitNo=key==='combo'?i+1:key==='combo1'?1:key==='combo2'?2:key==='combo3'?3:0; const fx=hitNo?HITFX[hitNo-1]:CASTFX[key]||{pw:0.3}; const pw=fx.pw;
      hitstop=pw>0?0.035+0.085*pw:0; squash=pw>0?0.35+0.55*pw:0; shake=Math.max(shake,pw>=0.4?pw*0.8:0); castFx(key,hitNo,i); if(fx.at){ringT=0;ringAt=fx.at;ringSize=fx.size;}}});} a.__prev=t;});
  }
  // hit feel per shot. An archer's hits land far away, so the feel is the release: the two snap shots barely freeze, the full draw and the power shot kick; the camera only shakes on those.
  const HITFX=[{pw:0.1},{pw:0.1},{pw:0.45}], CASTFX={castPoint:{pw:0.55},castBloom:{pw:0.15},castPlant:{pw:0},castSweep:{pw:0.25},vault:{pw:0.2}}; let ringAt='head', ringSize=1; let shake=0, ringT=-1, ring=null, trail=null; const TN=14, tHist=[]; const tA=new THREE.Vector3(), tB=new THREE.Vector3(), shakeV=new THREE.Vector3();
"""+p[b:]
rep("new THREE.MeshBasicMaterial({color:0xA9DC7C,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));\n    ring.rotation.x","new THREE.MeshBasicMaterial({color:0x5ED3C0,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}));\n    ring.rotation.x")
rep("tA.set(0,0.74,0).applyMatrix4(staff.matrixWorld); tB.set(0,1.0,0).applyMatrix4(staff.matrixWorld);","tA.set(0,0.42,0).applyMatrix4(staff.matrixWorld); tB.set(0,1.0,0).applyMatrix4(staff.matrixWorld);")
rep("running.forEach((a,n)=>{if(/^combo/.test(n)&&a.__tw>0)inCombo=true;});","running.forEach((a,n)=>{if(/^nothing/.test(n)&&a.__tw>0)inCombo=true;});")
rep("C.setXYZW(i*2,0.78,0.93,0.62,0.05*k); C.setXYZW(i*2+1,0.78,0.93,0.62,0.4*k);","C.setXYZW(i*2,0.91,0.34,0.48,0.04*k); C.setXYZW(i*2+1,0.91,0.89,0.94,0.3*k);")
rep("ring.material.opacity=0.42*(1-u);","ring.material.opacity=0.3*(1-u);")
a=p.index("  // hits 1 and 2 each shoot one bolt from the gem"); b=p.index("  function makeGlow(){")
p=p[:a]+open(S+'/harew/fx.js').read()+p[b:]
rep("g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(0.25,'rgba(200,240,170,0.75)');g.addColorStop(1,'rgba(169,220,124,0)');","g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(0.3,'rgba(255,255,255,0.6)');g.addColorStop(1,'rgba(255,255,255,0)');")
rep("splitGem(); glow=makeGlow(); staff.add(glow); makeFx(); makeSoft();","glow=makeGlow(); glow.visible=false; makeFx(); makeSoft();")
rep("window.__review={gem:()=>({ph:gPh,age:+gAge.toFixed(2),locked:gemLocked()}),sel,pick,","window.__review={aim:()=>{staff.updateWorldMatrix(true,false);const d=aim(new THREE.Vector3());return [Math.round(Math.atan2(d.x,d.z)*57.3),Math.round(Math.asin(d.y)*57.3)];},fx:()=>({motes:FXP.length,shots:SHOTS.filter(s=>s.t>=0).length,trap:trapT}),sel,pick,")
a=p.index("      if(glow){const pulse="); b=p.index("    orbit.update();",a)
p=p[:a]+"      driveStaff(); updateFx(d,hitstop>0); if(hitstop<=0){ongoingFx(d); updateSoft(d);}\n    }\n"+p[b:]
rep("const sk=feel?shake*shake*0.045:0;","const sk=feel?shake*shake*0.04:0;")
rep("const UPPER=/^(spine|chest|head|ear|upperarm|forearm|hand|fingers)/","const UPPER=/^(spine|chest|head|ear|upperarm|forearm|hand|fingers|string|arrow)/")
rep("hand=model.getObjectByName('handR'); staff=model.getObjectByName('weapon');","hand=model.getObjectByName('handL'); staff=model.getObjectByName('weapon');")
rep("  function driveStaff(){\n    if(!hand||!staff)return;\n","  let hipsB=null, spineB=null, hipsRest=null; const hq=new THREE.Quaternion();\n  function aimFix(){\n    // runs once after each animation step, never while the animation is frozen, so it cannot add up\n    // while an upper-body move plays over moving legs, the sway the legs put on her hips is taken back out at the spine, so her aim stays on the line\n    if(!hipsB){hipsB=model.getObjectByName('hips'); spineB=model.getObjectByName('spine'); hipsRest=HIPS_REST;} let upW=0; running.forEach((a,n)=>{if(/Up$/.test(n)&&a.__tw>0)upW=Math.max(upW,Math.min(1,a.getEffectiveWeight()));}); if(upW>0){ hq.copy(hipsB.quaternion).invert().multiply(hipsRest); spineB.quaternion.premultiply(new THREE.Quaternion().slerp(hq,upW)); }\n  }\n  function driveStaff(){\n    if(!hand||!staff)return;\n")
rep("stepFades(d); mixer.update(d); watchContacts();","stepFades(d); mixer.update(d); aimFix(); watchContacts();")
rep("    { const r=model.getObjectByName('hips').quaternion.clone().invert(),","    { HIPS_REST=model.getObjectByName('hips').quaternion.clone(); const r=HIPS_REST.clone().invert(),")
rep("  function buildLayers(clips){","  let HIPS_REST=null;\n  function buildLayers(clips){")
open(S+'/harereview/index.html','w').write(p)
for w in ['gem','Gem','bolt','healer','Healer','throw']:
    import re
    hits=[m.start() for m in re.finditer(w,p[p.index('<script>\n(function(){'):])]
    print(w,len(hits))
