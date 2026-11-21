
cut('<div class="wrap">', '<script src="https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js">', BODY)
rep('<script src="wolf-model.js"></script>', '<script src="slag-model.js"></script>')
rep("META=window.MODEL_META, U=2.3;", "META=window.MODEL_META, U=1.7;")
rep("const VIOLET=0x8F63EE, EMBER=0xFF5A36, DUST=0x8d8478;", "const EMBER=0xFF5A36, DUST=0x8d8478;")
rep("const LABEL={idle:'Idle',walk:'Walk',turnL:'Turn left',turnR:'Turn right',pounce:'Pounce',rend:'Rend',howl:'Moon Howl',call:'Call the pack',enrage:'Enrage',hurt:'Hurt',heavyHit:'Heavy hit',spawn:'Spawn',death:'Death'};",
    "const LABEL={idle:'Idle',walk:'Walk',turnL:'Turn left',turnR:'Turn right',slam:'Slam',hurt:'Hurt',spawn:'Spawn',death:'Death'};")
rep("const ACTIONS=['pounce','rend','howl','call','enrage','heavyHit'];", "const ACTIONS=['slam'];")
rep("const NEAR=2.05, FAR=4.5; let HOME=NEAR; // where the hero stands, in u, in front of him: the game's stand-off, and further out for the Pounce\n  const WALK=1.7, RAGEWALK=2.1, TURN=2*Math.PI/3.0, LEAP=54/60;",
    "const NEAR=1.4, FAR=3.0; let HOME=FAR; // where the hero stands, in u, in front of it: inside the slam's ring, and further out to walk\n  const WALK=1.25, RAGEWALK=1.25, TURN=Math.PI*0.75;")
rep("blob.scale.set(0.5,1.25,1); blob.position.set(0,0.004,0);", "blob.scale.set(0.75,0.45,1); blob.position.set(0,0.004,0);")
rep("orbit.minDistance=2.5;", "orbit.minDistance=1.0;")
rep("const VIEWS={Close:{p:[5.0,2.5,6.8],t:[0,1.0,1.2]},'Game zoom':{p:[0,10.6,9.4],t:[0,0.6,1.2]},Side:{p:[11,1.5,1.0],t:[0,1.2,1.0]},Front:{p:[0.8,1.7,11],t:[0,1.1,0]},Back:{p:[-3.6,3.0,-8.2],t:[0,1.0,0.6]},Top:{p:[0,14,0.4],t:[0,0.4,1.0]}};",
    "const VIEWS={Close:{p:[4.8,2.6,4.4],t:[0,0.8,0.8]},'Game zoom':{p:[0,10.6,9.4],t:[0,0.5,1.0]},Side:{p:[8.0,1.8,1.0],t:[0,0.8,1.0]},Front:{p:[0.6,1.8,7.4],t:[0,0.8,0]},Back:{p:[-2.8,2.8,-5.6],t:[0,0.9,0.3]},Top:{p:[0,10,1.0],t:[0,0.3,1.0]}};")
rep("  toggle('rage',()=>rage,v=>{rage=v;});\n", "")
rep("const UPPER=/^(neck1|neck2|head|jaw|earL|earR|tail1|tail2|tail3|maneF|maneR)\\./;", "const UPPER=/^(chest|head|clv[LR]|arm[LR]|fore[LR]|hand[LR])\\./;")
rep("state:()=>({shot:shot&&shot.name,rage:[rage,+rageW.toFixed(2)],hipY:+bones.hips.getWorldPosition(new THREE.Vector3()).y.toFixed(2),tele:[ringT.visible,coneT.visible],",
    "state:()=>({shot:shot&&shot.name,hipY:+bones.hips.getWorldPosition(new THREE.Vector3()).y.toFixed(2),tele:tele.visible,heat:+heat.toFixed(2),core:+core.toFixed(2),pool:pool.visible,hero:[+dummy.position.x.toFixed(2),+dummy.position.z.toFixed(2)],")
rep("'Down. Press Death again to spawn him back in.'", "'Down. Press Death again to spawn it back in.'")
FX = open(S + '/_fx.js').read()
rep("totalEmissiveRadiance+=vec3(0.42,0.26,1.0)*uGlow.x*vMask.x", "float lava=smoothstep(0.13,0.22,diffuseColor.g)*step(0.3,diffuseColor.r-diffuseColor.b); totalEmissiveRadiance+=vec3(1.0,0.86,0.5)*1.3*uGlow.x*vMask.x*lava")
rep("vec3(0.55,0.22,0.9)*uGlow.y*vMask.y", "diffuseColor.rgb*uGlow.y*lava")
cut("  // ---- effects (dim on purpose", "  const STEP=", FX)
rep("const STEP={FL:[0,'fHoofL'],HR:[0.08,'hHoofR'],FR:[0.5,'fHoofR'],HL:[0.58,'hHoofL']};", "const STEP={HL:[0.1,'toeL'],HR:[0.6,'toeR']};")
rep("if(fxOn)sparks(pt(bones.head,[0,-0.03,0.1]),6,0xfff4e0,1.6,0.25); }", "if(fxOn)sparks(pt(bones.chest,[0,0.1,0.2]),6,0xb8b0a4,1.1,0.25); }")
s = s.replace('NTRI', f'{ntri:,}').replace('NMB', f'{mb:.1f}').replace('DEAD_MM', str(round(max(0, -dd) * 1000))).replace('WALK_MM', str(round(max(0, -lw) * 1000))).replace('SLAM_MM', str(round(max(0, -sw) * 1000))).replace('SLIDE_MM', '0 mm' if slide < 1 else f'up to {slide:.0f} mm').replace('POP_DEG', '0' if pop < 0.05 else f'up to {pop:.1f}°')
for bad in ('CLAWS', 'rune', 'summon', 'buds', 'throat', 'LEAP', 'maneF', 'VIOLET', 'muzzle', 'idleFx', 'rope', 'toll', 'mouth', 'bridle', 'kite', 'lunge', 'ripple', 'gills', 'rage', 'spear', 'sack', 'paste', 'mound', 'mAmt', 'clods', 'ringT', 'SCALE'):
    i = s.find(bad, s.index('<script>\n(function'))
    if i >= 0: print('LEFTOVER', bad, s[max(0, i - 60):i + 60].replace('\n', ' '))
os.makedirs(out, exist_ok=True)
open(out + '/index.html', 'w').write(s); print('ok', len(s), 'tris', ntri, 'death', dd, 'lunge', lw)
