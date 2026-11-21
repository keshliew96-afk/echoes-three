import sys,shutil,re
S='/tmp/claude-0/-home-user/c6e5249c-651a-5d08-9e09-1bd0fe313c84/scratchpad/'
H={'tripo':('build2.mjs',19.3,14.9),'fox':('build2.mjs',14.7,17.7),'harew':('build3.mjs',19.8,28.6),'otterw':('build3.mjs',32.6,39.8),'beetlew':('build3.mjs',19.3,19.1),'batw':('build3.mjs',31.3,27.2)}
for d,(b,L,R) in H.items():
    p=S+d+'/'+b; s=open(p).read()
    if 'TOEQ' in s: print(d,'already'); continue
    shutil.copy(p,p.replace('.mjs','.pretoe.mjs')); shutil.copy(S+d+'/clips.mjs',S+d+'/clips.pretoe.mjs')
    a="  // keep the soles on the floor"
    assert s.count(a)==1
    s=s.replace(a,"""  // walk and run: no splayed feet. Each leg turns about its own length (hip to ankle) until the foot's heel-to-toe line points straight ahead
  if(pose._toes)for(const s of ['L','R']){const leg=bones[idx('leg'+s)],foot=bones[idx('foot'+s)],sg=s==='L'?1:-1;
    for(let it=0;it<3;it++){tv.copy(TOEQ[s]).applyQuaternion(foot.getWorldQuaternion(qa)); const err=Math.atan2(tv.x,tv.z)-sg*TOE_KEEP*D;
      tv.setFromMatrixPosition(foot.matrixWorld).sub(tw.setFromMatrixPosition(leg.matrixWorld)).normalize(); leg.parent.getWorldQuaternion(qb);
      leg.quaternion.premultiply(qa.copy(qb).invert().multiply(qc.setFromAxisAngle(tv,err)).multiply(qb)); leg.updateWorldMatrix(false,true);}}
"""+a)
    a="\napplyPose({});\n"; assert s.count(a)==1
    s=s.replace(a,a+"""// the heel-to-toe line of each foot as modelled (CFG.toe: degrees turned out, measured from the footprint), kept in the foot's own frame
const TOE_KEEP=2, tw=new THREE.Vector3(), qc=new THREE.Quaternion(), TOEQ={};
if(CFG.toe){for(const s of ['L','R']){const sg=s==='L'?1:-1,a=CFG.toe[s]*D; TOEQ[s]=new THREE.Vector3(sg*Math.sin(a),0,Math.cos(a)).applyQuaternion(bones[idx('foot'+s)].getWorldQuaternion(new THREE.Quaternion()).invert());}
  for(const [name,c] of Object.entries(CLIPS))if(/^(walk|run)/.test(name))c.toes=true;}
""")
    a="\n  return pose;\n"; assert s.count(a)==1
    s=s.replace(a,"\n  if(c.toes)pose._toes=1;\n  return pose;\n")
    open(p,'w').write(s)
    c=open(S+d+'/clips.mjs').read()
    c+="\n// how far each foot is turned out as modelled, degrees (measured from the footprint, review-kit/splay): walk and run turn the legs in by this much so the toes point straight ahead\nCFG.toe={L:%s,R:%s};\n"%(L,R)
    open(S+d+'/clips.mjs','w').write(c); print(d,'patched')
