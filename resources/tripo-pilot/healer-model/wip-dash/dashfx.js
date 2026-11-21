  // ---- the Healer's dash: a few pale leaves of light swing out of the turn, and when she lands she heals herself a little:
  // a soft green ring closes in on her feet, motes rise round her, the gem brightens and a small plus lifts off her head
  const HEALC=0xA9DC7C, HEALP=0xE4F5D2; let plusS=null, plusT=-1;
  function makePlus(){ const c=document.createElement('canvas'); c.width=c.height=64; const x=c.getContext('2d'); x.fillStyle='#fff'; x.beginPath(); x.roundRect(25,8,14,48,5); x.fill(); x.beginPath(); x.roundRect(8,25,48,14,5); x.fill(); plusS=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),color:HEALC,transparent:true,opacity:0,depthWrite:false})); plusS.scale.setScalar(0.11); plusS.visible=false; scene.add(plusS); }
  function dashFx(ev){ if(!feel)return;
    if(ev==='go'){ dring(heroW(0,0),HEALP,0.1,0.4,0.3,{op:0.22}); for(let i=0;i<6;i++){const a=i*1.05; dpuff(heroW(0.1+0.22*i,Math.sin(a)*0.22,0.25+0.07*i),i%2?HEALC:HEALP,0.05+Math.random()*0.03,0.5+Math.random()*0.2,{op:0.42,vy:0.18,grow:1.4,delay:0.03*i});} }
    if(ev==='heal'){ if(!plusS)makePlus(); const c=heroW(0,0);
      dring(c,HEALC,0.62,0.2,0.5,{op:0.34,inner:0.9}); dring(c,HEALP,0.5,0.16,0.42,{op:0.24,inner:0.93,delay:0.08});
      for(let i=0;i<9;i++){const a=i*0.7+Math.random(), r=0.2+Math.random()*0.14; dpuff(new THREE.Vector3(c.x+Math.cos(a)*r,0.08+Math.random()*0.2,c.z+Math.sin(a)*r),i%3?HEALC:HEALP,0.04+Math.random()*0.03,0.8+Math.random()*0.4,{op:0.5,vy:0.42+Math.random()*0.25,grow:0.8,delay:0.04*i});}
      dpuff(new THREE.Vector3(c.x,0.36,c.z),HEALC,0.5,0.55,{op:0.16,grow:1.5}); flash=Math.max(flash,0.45); plusT=0; }
    if(ev==='off'){ plusT=-1; if(plusS)plusS.visible=false; }
  }
  function dashUpd(t,d){ if(!plusS||plusT<0)return; plusT+=d; const u=plusT/0.9; if(u>=1){plusT=-1; plusS.visible=false; return;} plusS.visible=feel; plusS.position.set(0.02,0.86+0.2*(1-(1-u)*(1-u)),0); plusS.material.opacity=0.75*Math.min(1,u*8)*(1-u*u); }
