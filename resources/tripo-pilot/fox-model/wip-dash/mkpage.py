import re,sys
S='/tmp/claude-0/-home-user/c6e5249c-651a-5d08-9e09-1bd0fe313c84/scratchpad'
H=open(S+'/review/index.html').read()
body=open(S+'/fox/body.html').read()
a=H.index('<div class="wrap">'); b=H.index('<script src="https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js">')
p=H[:a]+body+H[b:]
def rep(o,n,c=1):
    global p
    assert o in p,o[:90]; p=p.replace(o,n,c)
rep('<title>Tripo Healer Review</title>','<title>Tripo Fox Review</title>')
rep('<script src="healer-model.js"></script>','<script src="fox-model.js"></script>')
rep("window.HEALER_GLB_B64","window.MODEL_GLB_B64")
rep("ORDER2=['tap','combo','castPoint','castBloom','castPlant','castSweep','castGive','castChannel','wave','throw','hurt'];","ORDER2=['tap','combo','castPoint','castBloom','castPlant','castSweep','castParry','bladeStorm','flourish','wave','hurt'];")
a=p.index("  const LABEL={"); b=p.index("\n",a)
p=p[:a]+"  const LABEL={idle:'Idle',walk:'Walk',run:'Run',combo:'Sword combo',dash:'Dash',hurt:'Hurt',wave:'Wave',flourish:'Flourish',bladeStorm:'Blade Storm',castParry:'Cast: riposte',downed:'Downed',crawl:'Crawl',spawn:'Spawn',tap:'Tap attack',castPoint:'Cast: lunge',castBloom:'Cast: edge draw',castPlant:'Cast: caltrops',castSweep:'Cast: crescent'};"+p[b:]
rep("ACTIONS=['combo','castPoint','castBloom','castPlant','castSweep','castGive','castChannel','wave','throw'];","ACTIONS=['combo','castPoint','castBloom','castPlant','castSweep','castParry','bladeStorm','flourish','wave'];")
rep("const UPPERS=['combo','combo1','combo2','combo3','wave','castPoint','castBloom','castPlant','castSweep','castGive','castChannel'];","const UPPERS=['combo','combo1','combo2','combo3','combo4','wave','flourish','bladeStorm','castParry','castPoint','castBloom','castPlant','castSweep'];")
a=p.index("  const CT={"); b=p.index("\n",a)
p=p[:a]+"  const CT={combo:[0.14,0.32,0.50,0.82],combo1:[0.14],combo2:[0.06],combo3:[0.10],combo4:[0.24],castPoint:[0.22],castBloom:[0.36],castPlant:[0.28],castSweep:[0.30],castParry:[0.10,0.44],bladeStorm:[0.28,0.40,0.52]};"+p[b:]
rep("const THROWS={throw:[0.42,1.22]}, GEMFLY={};","const THROWS={}, GEMFLY={};")
rep("    A.throwUp=mixer.clipAction(sub(by.throw,'throwUp',n=>UPPER.test(n)||n==='weapon'));\n","    // a move that spins him keeps its turn when it plays over walking legs: the turn of the hips is copied onto the root for the upper-body version\n    ['combo','combo4','bladeStorm'].forEach(n=>{const t=by[n].tracks.find(t=>bone(t.name)==='hips'&&/quaternion$/.test(t.name)); if(!t)return; const v=new Float32Array(t.values.length); let y0=0,w0=1; for(let i=0;i<v.length;i+=4){let y=t.values[i+1],w=t.values[i+3]; const l=Math.hypot(y,w)||1; y/=l;w/=l; if(i===0){y0=y;w0=w;} v[i+1]=y*w0-w*y0; v[i+3]=w*w0+y*y0;} const c=A[n+'Up'].getClip(); mixer.uncacheAction(c); c.tracks.push(new THREE.QuaternionKeyframeTrack(t.name.replace('hips','root'),Array.from(t.times),Array.from(v))); A[n+'Up']=mixer.clipAction(c);});\n")
rep("a.setEffectiveTimeScale(w.sync?a.getClip().duration/0.7:1);","a.setEffectiveTimeScale(w.sync?a.getClip().duration/(/^dash/.test(w.n)?0.66:0.62):1);")
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
      const hitNo=key==='combo'?i+1:key==='combo1'?1:key==='combo2'?2:key==='combo3'?3:key==='combo4'?4:0; const fx=hitNo?HITFX[hitNo-1]:key==='castParry'?PARRYFX[i]:key==='bladeStorm'?STORMFX[i]:CASTFX[key]||{pw:0.4}; const pw=fx.pw;
      hitstop=pw>0?0.035+0.085*pw:0; squash=pw>0?0.35+0.55*pw:0; shake=Math.max(shake,pw>=0.45?pw:0); castFx(key,hitNo,i); if(fx.at){ringT=0;ringAt=fx.at;ringSize=fx.size;}}});} a.__prev=t;});
  }
  // hit feel per hit. A swordsman's cuts are quick: the two fast cuts barely freeze, the thrust a little more, the spin cut and the lunge bite harder; the camera only shakes on those.
  const HITFX=[{pw:0.2},{pw:0.22},{pw:0.35},{pw:0.7}], PARRYFX=[{pw:0.35},{pw:0.55}], STORMFX=[{pw:0.15},{pw:0.15},{pw:0.5}], CASTFX={castPoint:{pw:0.65},castBloom:{pw:0,at:'self',size:1.5},castPlant:{pw:0},castSweep:{pw:0.5}}; let ringAt='head', ringSize=1; let shake=0, ringT=-1, ring=null, trail=null; const TN=14, tHist=[]; const tA=new THREE.Vector3(), tB=new THREE.Vector3(), shakeV=new THREE.Vector3();
"""+p[b:]
rep("new THREE.MeshBasicMaterial({color:0xA9DC7C,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));\n    ring.rotation.x","new THREE.MeshBasicMaterial({color:0xE8577A,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}));\n    ring.rotation.x")
rep("tA.set(0,0.74,0).applyMatrix4(staff.matrixWorld); tB.set(0,1.0,0).applyMatrix4(staff.matrixWorld);","tA.set(0,0.42,0).applyMatrix4(staff.matrixWorld); tB.set(0,1.0,0).applyMatrix4(staff.matrixWorld);")
rep("running.forEach((a,n)=>{if(/^combo/.test(n)&&a.__tw>0)inCombo=true;});","running.forEach((a,n)=>{if(/^(combo|castSweep|castPoint|castParry|bladeStorm)/.test(n)&&a.__tw>0)inCombo=true;});")
rep("C.setXYZW(i*2,0.78,0.93,0.62,0.05*k); C.setXYZW(i*2+1,0.78,0.93,0.62,0.4*k);","C.setXYZW(i*2,0.91,0.34,0.48,0.04*k); C.setXYZW(i*2+1,0.91,0.89,0.94,0.3*k);")
rep("ring.material.opacity=0.42*(1-u);","ring.material.opacity=0.3*(1-u);")
a=p.index("  // hits 1 and 2 each shoot one bolt from the gem"); b=p.index("  function makeGlow(){")
p=p[:a]+open(S+'/fox/fx.js').read()+p[b:]
rep("g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(0.25,'rgba(200,240,170,0.75)');g.addColorStop(1,'rgba(169,220,124,0)');","g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(0.3,'rgba(255,255,255,0.6)');g.addColorStop(1,'rgba(255,255,255,0)');")
rep("splitGem(); glow=makeGlow(); staff.add(glow); makeFx(); makeSoft();","glow=makeGlow(); glow.visible=false; makeFx(); makeSoft();")
rep("window.__review={gem:()=>({ph:gPh,age:+gAge.toFixed(2),locked:gemLocked()}),sel,pick,","window.__review={fx:()=>({motes:FXP.length,arcs:ARCS.map(a=>+a.t.toFixed(2)),streak:streakT,edge:edgeT,ring:ringT}),sel,pick,")
a=p.index("      if(glow){const pulse="); b=p.index("    orbit.update();",a)
p=p[:a]+"      driveStaff(); updateFx(d,hitstop>0); if(hitstop<=0){ongoingFx(d); updateSoft(d);}\n    }\n"+p[b:]
rep("const sk=feel?shake*shake*0.045:0;","const sk=feel?shake*shake*0.04:0;")
rep("next=sel.tap%3+1;}","next=sel.tap%4+1;}")
rep("{next=tapLast%3+1;}","{next=tapLast%4+1;}")
rep("/^combo[123](Up)?$/","/^combo[1234](Up)?$/")
sys.path.insert(0,S); from dashrule import apply as dashrule; from dashkit import apply as dashkit
p=dashrule(p)
p=dashkit(p,{'go':[0.11,0.36],'dist':2.2,'inv':[0,0.38],'prof':'burst','ev':[['start',0.0],['go',0.11],['end',0.36],['flick',0.52]],
  'dummy':{'mode':'hit','at':[[0.9,0.06],[1.6,-0.07]],'r':0.25,'w':0.4},
  'note':'His dash: the stance from the picture for a tenth of a second (sword level beside his cheek, free paw reaching along the blade), then a thrust along the way that cuts every foe he passes, then a low skid and a flick of the blade. He turns to face where he dashes. The two posts are practice dummies.'},open(S+'/fox/dashfx.js').read())
open(S+'/foxreview/index.html','w').write(p)
for w in ['gem','Gem','bolt','healer','Healer','throw']:
    import re
    hits=[m.start() for m in re.finditer(w,p[p.index('<script>\n(function(){'):])]
    print(w,len(hits))
