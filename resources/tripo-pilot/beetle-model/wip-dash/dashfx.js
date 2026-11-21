  // ---- the Bellwright's dash: the bell. A great copy of the bell on her back drops over her (0.36 s); under it she cannot be hit and walks where the player steers.
  // It lifts and fades when she attacks or casts, when its time runs out, or when Dash is let go. Longest dash of all the heroes, and the slowest.
  const BELL_DROP=0.36, BELL_DUR=2.5, BELL_SPEED=1.5; let bellPh='', bellT=0, bigBell=null, bigMat=null, bigK=1, bigY0=0, bellLab=null, bellStep=0, bellOutT=0, bellWhy='';
  // the great bell is its own model (Kesh's Tripo bell, 13 Nov); her small pole bell scaled up stands in only if that model is missing
  let bigSrc=null; (function(){ const b64=window.BELL_GLB_B64; if(!b64)return; const bin=Uint8Array.from(atob(b64),c=>c.charCodeAt(0)).buffer; new THREE.GLTFLoader().parse(bin,'',g=>{ let m=null; g.scene.traverse(o=>{if(o.isMesh&&!m)m=o;}); if(!m)return; m.updateWorldMatrix(true,false); let geo=m.geometry.clone().applyMatrix4(m.matrixWorld); if(geo.index)geo=geo.toNonIndexed(); bigSrc={geo,mat:m.material}; }); })();
  function bigMake(){ initBells(); if(bigBell||!(bigSrc||bellGeo))return; const BG=bigSrc?bigSrc.geo:bellGeo, BM=bigSrc?bigSrc.mat:bellSrc; BG.computeBoundingBox(); const bb=BG.boundingBox, h=bb.max.y-bb.min.y, w=Math.max(bb.max.x-bb.min.x,bb.max.z-bb.min.z);
    // the rim is the lowest ring of the bell's widest part; the clapper hangs below it and goes under the floor
    const P=BG.attributes.position, cx=(bb.min.x+bb.max.x)/2, cz=(bb.min.z+bb.max.z)/2; let maxR=0; for(let i=0;i<P.count;i++)maxR=Math.max(maxR,Math.hypot(P.getX(i)-cx,P.getZ(i)-cz));
    let rimY=bb.max.y; for(let i=0;i<P.count;i++){ if(Math.hypot(P.getX(i)-cx,P.getZ(i)-cz)>0.8*maxR)rimY=Math.min(rimY,P.getY(i)); }
    // big enough that the bell on her pole (0.45 out, 1.05 up) and her cape (0.5 out, 0.45 up) are inside its wall, not only her body
    const NB=24, prof=new Array(NB).fill(0), H0=bb.max.y-rimY; for(let i=0;i<P.count;i++){ const y=P.getY(i); if(y<rimY)continue; const bi=Math.min(NB-1,Math.floor((y-rimY)/H0*NB)); prof[bi]=Math.max(prof[bi],Math.hypot(P.getX(i)-cx,P.getZ(i)-cz)); }
    const radAt=(y)=>{ const f=Math.min(NB-1.001,Math.max(0,y/H0*NB-0.5)), i0=Math.floor(f); return prof[i0]+(prof[Math.min(NB-1,i0+1)]-prof[i0])*(f-i0); };
    bigK=Math.max(1.3/H0,0.66/maxR); for(let n=0;n<80;n++){ if([[0.45,1.05],[0.5,0.45]].every(([R,Y])=>Y/bigK<H0&&radAt(Y/bigK)*bigK>=R+0.03))break; bigK*=1.02; }
    // the big bell has no clapper below its rim (it would go through the floor)
    const src=BG.attributes, np=[], nn=[], nu=[]; for(let f=0;f<P.count;f+=3){ if(P.getY(f)<rimY-0.004||P.getY(f+1)<rimY-0.004||P.getY(f+2)<rimY-0.004)continue; for(let v=f;v<f+3;v++){ np.push(P.getX(v),P.getY(v),P.getZ(v)); nn.push(src.normal.getX(v),src.normal.getY(v),src.normal.getZ(v)); nu.push(src.uv.getX(v),src.uv.getY(v)); } }
    const bigGeo=new THREE.BufferGeometry(); bigGeo.setAttribute('position',new THREE.Float32BufferAttribute(np,3)); bigGeo.setAttribute('normal',new THREE.Float32BufferAttribute(nn,3)); bigGeo.setAttribute('uv',new THREE.Float32BufferAttribute(nu,2));
    bigMat=BM.clone(); bigMat.skinning=false; bigMat.transparent=true; bigMat.opacity=0; bigMat.depthWrite=false; bigMat.side=THREE.DoubleSide;
    const m=new THREE.Mesh(bigGeo,bigMat); m.scale.setScalar(bigK); m.position.set(-cx*bigK,-rimY*bigK+0.01,-cz*bigK); window.__bigBell={k:+bigK.toFixed(2),h:+(H0*bigK).toFixed(2),r:+(maxR*bigK).toFixed(2)}; bigBell=new THREE.Group(); bigBell.add(m); bigBell.visible=false; scene.add(bigBell);
    bellLab=dlabel(); bellLab.position.set(0,H0*bigK+0.3,0); scene.add(bellLab); }
  function bellStart(){ bigMake(); bellPh='call'; bellT=0; bellOutT=0; bellWhy=''; }
  function bellEnd(why){ if(!bellPh||bellPh==='out')return; const was=bellPh; bellPh='out'; bellOutT=0; bellWhy=why; sel.dash=false;
    if(feel&&was==='in'){ const R=window.__bigBell.r; dring(heroW(0,0),VERD,R*0.8,R+0.9,0.5,{op:0.34}); dring(heroW(0,0),BRASS,R*0.6,R+0.4,0.36,{op:0.3,delay:0.04}); for(let i=0;i<8;i++){const a=i*0.785; dpuff(heroW(Math.cos(a)*R,Math.sin(a)*R,0.5+Math.random()*0.5),i%2?BRASS:VERD,0.06,0.5,{op:0.4,vx:Math.cos(a)*0.5,vz:Math.sin(a)*0.5,vy:0.5,grow:1.6});} } }
  function dashUpd(t,d){ if(!bellPh){ if(bigBell)bigBell.visible=false; if(bellLab)dsay(bellLab,''); return; } if(!bigBell){ bigMake(); if(!bigBell)return; }
    if(sel.downed||rising){ bellPh=''; sel.dash=false; return; }
    if(bellPh==='call'){ bellT+=d; const u=Math.min(1,Math.max(0,(bellT-0.08)/(BELL_DROP-0.08))); bigBell.visible=feel&&bellT>0.04; bigBell.position.set(0,3.0*(1-u*u),0); bigBell.rotation.set(0,0,0); bigBell.scale.setScalar(1); bigMat.opacity=0.86*Math.min(1,bellT/0.14);
      if(bellT>=BELL_DROP){ bellPh='in'; bellT=0; bellStep=0; if(feel){ shake=Math.max(shake,0.7); hitstop=Math.max(hitstop,0.04); const R=window.__bigBell.r; dring(heroW(0,0),BRASS,R,R+0.9,0.5,{op:0.42,inner:0.9}); dring(heroW(0,0),DUST,R*0.9,R+0.5,0.42,{op:0.3,delay:0.03}); dring(new THREE.Vector3(wOff.x,0.9,wOff.y),VERD,R,R+0.7,0.6,{op:0.3,y:0.9,inner:0.94});
          for(let i=0;i<16;i++){const a=i*0.393+Math.random()*0.2, sp=0.6+Math.random()*0.8; dpuff(heroW(Math.cos(a)*R,Math.sin(a)*R,0.05),DUST,0.14+Math.random()*0.1,0.6+Math.random()*0.3,{op:0.36,vx:Math.cos(a)*sp,vz:Math.sin(a)*sp,vy:0.2+Math.random()*0.3,grow:2.4});} }
        apply(); } }
    else if(bellPh==='in'){ bellT+=d; const left=BELL_DUR-bellT; bigBell.visible=feel; bigMat.opacity=left<0.5?0.86*(0.55+0.45*Math.abs(Math.sin(bellT*18))):0.86;
      // the bell shuffles with her steps: it rocks from side to side and hops a finger's width
      bellStep+=d/0.32; const s=Math.sin(bellStep*Math.PI); bigBell.rotation.set(0.03*Math.cos(bellStep*Math.PI),0,0.05*s); bigBell.position.set(0,0.025*Math.abs(s),0);
      if(feel&&Math.abs(s)<0.12&&Math.random()<0.5){ const v=DIRV[sel.dir], l=Math.hypot(v[0],v[1])||1; dpuff(heroW(0,0,0.04).add(new THREE.Vector3(-v[0]/l*window.__bigBell.r*0.9+rnd(0.3),0,-v[1]/l*window.__bigBell.r*0.9+rnd(0.3))),DUST,0.12,0.5,{op:0.3,vy:0.15,grow:2.2}); }
      if(feel&&Math.floor(bellT/0.64)!==Math.floor((bellT-d)/0.64))dring(new THREE.Vector3(wOff.x,0.7,wOff.y),BRASS,window.__bigBell.r,window.__bigBell.r+0.3,0.5,{op:0.2,y:0.7,inner:0.95});
      dsay(bellLab,'Invincible '+Math.max(0,left).toFixed(1)+' s');
      if(left<=0)bellEnd('time'), apply(); }
    else if(bellPh==='out'){ bellOutT+=d; const u=Math.min(1,bellOutT/0.3); bigBell.visible=feel&&u<1; bigBell.position.set(0,0.35*u,0); bigBell.rotation.set(0,0,0); bigBell.scale.setScalar(1+0.08*u); bigMat.opacity=0.86*(1-u);
      dsay(bellLab,u<1?(bellWhy==='attack'?'An attack lifts the bell':bellWhy==='time'?'Time is up':''):''); if(u>=1){ bellPh=''; bigBell.visible=false; dsay(bellLab,''); } } }
