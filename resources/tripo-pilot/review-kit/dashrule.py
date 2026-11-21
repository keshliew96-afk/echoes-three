# Kesh's dash rule (2026-11-13) for every character review page: dash has top priority, it cancels a move in its wind-up or its recovery at once, and the character is invincible while dashing.
import re
def apply(p):
    if 'dashCancel' in p: return p
    def rep(o,n):
        nonlocal p
        assert o in p,o[:80]; p=p.replace(o,n,1)
    # 1. the Dash button is never locked by an attack or a cast
    p,n=re.subn(r"else if\(k==='dash'\)\{off=[^;]*;why='Dash uses the whole body, so it plays alone\.';\}","else if(k==='dash'){off=false;}",p); assert n==1,'dash lock'
    # 2. pressing it cuts off whatever is playing
    rep("else if(k==='dash'){sel.dash=!sel.dash;}","else if(k==='dash'){sel.dash=!sel.dash; if(sel.dash)dashCancel(); else cancelNote='';}")
    rep("  const btn={}, dbtn={}; let moving=null;","""  const btn={}, dbtn={}; let moving=null;
  // the dash rule: top priority. It cuts a move off in its wind-up or its recovery, and the dash is invincible
  let cancelNote='', inv=0, invMats=null, invClock=0;
  function dashCancel(){ cancelNote='';
    const name=sel.tap?'combo'+sel.tap:sel.action?(sel.hand?'hand'+sel.action.slice(4):sel.action):(typeof holdPh!=='undefined'&&holdPh==='tsunami'?'tsunami':null);
    let late=false;
    if(name){ const a=running.get(name)||running.get(name+'Up'); const cts=CT[name]; if(a){ const t=a.time, ph=!cts?'':t<cts[0]?' in its wind-up':t>=cts[cts.length-1]?' in its recovery':' between its hits'; late=ph===' in its recovery';
      cancelNote='Dash cut off '+(sel.tap?'combo hit '+sel.tap:(LABEL[name]||name).toLowerCase())+' at '+t.toFixed(2)+' s'+ph; } }
    // a held attack's big finisher: cut in its wind-up it keeps its charge and starts again after the dash; cut after it has fired, the charge is spent
    if(typeof holdPh!=='undefined'){ if(name==='tsunami'&&late)holdT=0; holdPh='stream'; }
    sel.action=null; sel.tap=0; sel.hand=false; }
  function iframes(d){ if(!model)return; if(!invMats){ invMats=[]; model.traverse(o=>{ if(o.isMesh&&o.material&&o.material.emissive){ invMats.push(o.material); } }); }
    const on=sel.dash&&!sel.downed&&!rising; invClock+=d; inv+=((on?1:0)-inv)*Math.min(1,d*20); const k=inv<0.01?0:inv*(0.28+0.08*Math.sin(invClock*34));
    invMats.forEach(m=>{ m.emissive.setHex(0x9FD8FF); m.emissiveIntensity=k; }); }""")
    rep("parts='Whole body: dash '+dl;}","parts='Whole body: dash '+dl+' · invincible'+(cancelNote?' · '+cancelNote:'');}")
    rep("[sel.dash?'Dash':LABEL[sel.base],","[sel.dash?'Dash · invincible':LABEL[sel.base],")
    # the cut-off move fades out fast, so the dash reads as an instant cancel
    rep("a.__fade=a.blendMode===THREE.AdditiveAnimationBlendMode?0.12:FADE_OUT;","a.__fade=a.blendMode===THREE.AdditiveAnimationBlendMode?0.12:(sel.dash?FADE_FAST:FADE_OUT);")
    p,n=re.subn(r"driveStaff\(\); (?=\S)","iframes(d); driveStaff(); ",p,count=1); assert n==1,"frame hook"
    # 3. the rule text under the buttons
    p,n=re.subn(r"Dash and Downed use the whole body, so they play alone\.","Dash has top priority: press it during any attack or cast and it cuts that move off at once, in its wind-up or its recovery, and the dash is invincible (the pale blue tint). Downed uses the whole body, so it plays alone.",p)
    if n!=1: print('dashrule: rule text not found, add it by hand')
    return p
