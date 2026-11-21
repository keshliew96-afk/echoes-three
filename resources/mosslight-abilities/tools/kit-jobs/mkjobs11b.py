import sys; sys.path.insert(0,'/tmp/claude-0/-home-user/32a8741f-483c-523d-bcd7-a3da532d6a06/scratchpad/k11')
from helpers import *
FL="const w=window.__echoes.content.world();const f=w.entities().filter(e=>e.faction==='hostile'&&e.hittable&&e.kind!=='eshot'&&e.hp>0);"
DUST="(()=>{"+FL+"return 'dusted '+f.filter(e=>e.reviewDustUntil>w.tick).length+' of '+f.length+' foes';})()"
SLOW="(()=>{"+FL+"const p=w.entities().filter(e=>e.partyIndex!==undefined).sort((a,b)=>a.partyIndex-b.partyIndex).map(e=>Math.round(e.hp)+'/'+e.maxHp).join(' · ');const s=f.filter(e=>e.status&&e.status.slow&&e.status.slow.untilTick>w.tick).length;return p+' · slowed '+s+' of '+f.length;})()"
TOSS="(()=>{"+FL+"const t=f.filter(e=>e.reviewTossAt!=null&&w.tick<e.reviewTossAt+e.reviewTossTicks);return 'foes '+f.map(e=>Math.round(e.maxHp-e.hp)).join(' · ')+' damage'+(t.length?' · tossed '+t.length+' for '+(t[0].reviewTossTicks/60).toFixed(1)+' s':'');})()"
job('C41','C41 · Pollen Mark, then Pollen Gust dusts the pack',['pollen_mark','hearthsong'],[0,-1.8],[[-1.3,1.8,1],[1.3,1.8,1],[0,2.6,1]],[],[spawnAt(0.05,[[0,-1.9,400],[-0.7,-5.2,400],[0,-5.6,400],[0.7,-5.2,400]]),[0.15,'key','q'],[0.75,'key','e']],5.0,DUST)
job('C46','C46 · Nectar Burst slows the foes',['nectar_burst'],[0.3,-2.3],[[0,-2.0,0.45],[0.9,-2.6,0.5],[-3.4,2.0,0.6]],[],[spawnAt(0.05,[[0.2,-3.4,300],[1.2,-3.5,300]]),[0.4,'key','q']],4.5,SLOW)
job('C50','C50 · Wild Thicket under the Elder Oak tosses 1.5 s',['guardian_bond','wild_thicket'],[0,-3.0],[[0,-1.6,1],[1.0,-1.8,1],[-1.0,-1.8,1]],[],[spawnAt(0.05,[[0,-3.2,300],[0.9,-3.5,300],[-0.9,-3.5,300]]),[0.3,'key','q'],[1.0,'key','e']],5.5,TOSS)
open('/tmp/claude-0/-home-user/32a8741f-483c-523d-bcd7-a3da532d6a06/scratchpad/k11/live_dust.txt','w').write(DUST)
print('ok')
