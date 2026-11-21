import json, os
K='/tmp/claude-0/-home-user/32a8741f-483c-523d-bcd7-a3da532d6a06/scratchpad/tools/kit'
PARTY="(()=>{const w=window.__echoes.content.world();return w.entities().filter(e=>e.partyIndex!==undefined).sort((a,b)=>a.partyIndex-b.partyIndex).map(e=>Math.round(e.hp)+'/'+e.maxHp).join(' · ');})()"
FOES="(()=>{const w=window.__echoes.content.world();const f=w.entities().filter(e=>e.faction==='hostile'&&e.hittable&&e.kind!=='eshot').sort((a,b)=>a.id-b.id);return 'foes '+(f.length?f.map(e=>Math.round(e.maxHp-e.hp)).join(' · ')+' damage':'none left');})()"
BOTH="(()=>{const w=window.__echoes.content.world();const p=w.entities().filter(e=>e.partyIndex!==undefined).sort((a,b)=>a.partyIndex-b.partyIndex).map(e=>Math.round(e.hp)+'/'+e.maxHp).join(' · ');const f=w.entities().filter(e=>e.faction==='hostile'&&e.hittable&&e.kind!=='eshot');return p+' · foes '+f.length;})()"
def hp(n, kind=None): return "for(const e of w.entities()) if(e.faction==='hostile'&&e.hittable%s){e.maxHp=%d;e.hp=%d;}" % ((" && e.kind==='%s'" % kind) if kind else '', n, n)
def seeds(t, pts): return [t,'eval','for(const [x,z] of %s) globalThis.__reviewSeedAt(x,z);' % json.dumps(pts)]
def spawnAt(t, pts, kind='boar'): return [t,'eval',"for(const [x,z,h] of %s){const id=E.cmd('spawn','%s',x,z);const e=w.entities().find(q=>q.id===id);if(e){e.maxHp=h;e.hp=h;}}" % (json.dumps(pts), kind)]
def pinD(pts, t1, every=0.1):
    code="const d=w.entities().filter(e=>e.kind==='dummy').sort((a,b)=>a.id-b.id);%s.forEach((p,i)=>{if(d[i]){d[i].x=d[i].px=p[0];d[i].z=d[i].pz=p[1];}});" % json.dumps(pts)
    return [[round(k*every,2),'eval',code] for k in range(1,int(t1/every)+1)]
def walk(i, a, b, t0, t1, hpv, n=None):
    n = n or int((t1-t0)*10)
    return [[round(t0+(t1-t0)*k/n,2),'move',i,[round(a[0]+(b[0]-a[0])*k/n,2),round(a[1]+(b[1]-a[1])*k/n,2),hpv]] for k in range(1,n+1)]
def job(name, cap, slots, aim, allies, foes, seq, secs, live, setup='', guides=None, selfHp=None):
    j={'key':None,'pin':True,'fps':15,'pre':0.25,'name':'kit_'+name,'aim':aim,'slots':slots,'allies':allies,'dummies':foes,'seq':seq,'secs':secs,'live':live,'cap':cap}
    if setup: j['setup']=setup
    if guides: j['guides']=guides
    if selfHp is not None: j['selfHp']=selfHp
    n=name[1:] if name.startswith('S') else name
    open(os.path.join(K,'K%s.json'%n),'w').write(json.dumps([j],indent=1))
    open(os.path.join(K,'K%s.qs'%n),'w').write('')
area=lambda r,c: {'k':'area','r':r,'c':c}
rng=lambda r: {'k':'range','r':r,'c':[0,0]}
