import sys; sys.path.insert(0,'/tmp/claude-0/-home-user/32a8741f-483c-523d-bcd7-a3da532d6a06/scratchpad/k11')
from helpers import *
DUM900="for(const e of w.entities()) if(e.kind==='dummy'){e.maxHp=900;e.hp=900;}"
# A3
job('C40','C40 · Leaf Gale over seeds: Spitters 3 u in front',['wind_wall'],[0,-2.2],[[-0.9,1.3,0.5],[0.9,1.3,0.5],[0,2.2,0.6]],[[-1.6,-5.6,'mantis'],[0,-5.8,'mantis'],[1.6,-5.6,'mantis']],[seeds(0.15,[[-1.2,-1.4],[0,-1.2],[1.1,-1.5]]),[0.45,'key','q']],6.5,PARTY,setup=hp(300),selfHp=0.8)
# A4
job('C41','C41 · Pollen Mark, then Pollen Gust dusts the pack',['pollen_mark','hearthsong'],[0,-1.8],[[-1.3,1.8,1],[1.3,1.8,1],[0,2.6,1]],[],[spawnAt(0.05,[[0,-1.9,400],[-0.7,-5.0,400],[0,-5.4,400],[0.7,-5.0,400]]),[0.15,'key','q'],[0.75,'key','e']],5.0,FOES)
# A5
job('C42','C42 · Pollen Mark: the turret and Spitters feed the party',['pollen_mark'],[0,-3.4],[[-2.6,-1.2,0.5],[2.6,-1.2,0.55],[0,0.9,0.6]],[[0,-3.6],[0.9,-3.8],[-0.9,-3.8]],[seeds(0.1,[[1.7,-2.3],[-1.7,-2.3]]),[0.2,'rdown'],[0.9,'rup'],[1.4,'key','q']]+pinD([[0,-3.6],[0.9,-3.8],[-0.9,-3.8]],7.5),7.5,PARTY,setup=DUM900,selfHp=0.8)
# A6
job('C43','C43 · Elder Oak keeps the Forest Spirit 10% under its crown',['guardian_bond','forest_spirit'],[0,-2.6],[[0.4,-2.6,0.8],[-0.5,-3.0,0.8],[1.6,0.8,0.8]],[],[[0.3,'key','q'],[2.0,'hold','a',2.0]],7.0,PARTY,selfHp=0.8)
# A7
job('C44','C44 · Drowsy Spores, then Sapping Vine heals 8 a tick',['drowsy_spores','spirit_bolt'],[0,-3.6],[[0.9,0.7,0.4],[-3.0,2.5,1],[3.0,2.5,1]],[],[spawnAt(0.05,[[0,-3.8,300],[0.8,-4.1,300],[-0.8,-4.1,300]]),[0.2,'key','q'],[0.9,'key','e']],5.6,PARTY)
# A8
job('C45','C45 · Creeping Moss under the Rain Cloud: all four in 3 s',['rain_cloud','creeping_moss'],[0.5,-0.6],[[0.6,-0.8,0.4],[1.3,-0.2,0.6],[-0.5,-0.9,0.6]],[],[[0.3,'key','q'],[0.9,'key','e']],5.5,PARTY,selfHp=0.9)
# A9
job('C46','C46 · Nectar Burst slows the foes',['nectar_burst'],[0.3,-2.3],[[0,-2.0,0.45],[0.9,-2.6,0.5],[-3.4,2.0,0.6]],[],[spawnAt(0.05,[[0.2,-3.4,300],[1.2,-3.5,300]]),[0.4,'key','q']],4.5,BOTH)
# A10
job('C47','C47 · Pollen Gust through the Rain Cloud waters all',['rain_cloud','hearthsong'],[3,0],[[1.4,0.3,0.4],[-2.8,2.4,1],[-2.8,-2.4,1]],[[6.4,0]],[seeds(0.1,[[4.0,0.6],[4.6,-0.7]]),[0.3,'key','q'],seeds(3.2,[[3.3,-0.8],[3.3,1.1]]),[3.6,'key','e']]+pinD([[6.4,0]],7.0),7.0,PARTY,setup=DUM900)
# A11
job('C48','C48 · A dusted foe falls and leaves a seed',['pollen_mark'],[0,-3.0],[[0,-2.2,1],[0.9,-2.4,1],[-0.9,-2.4,1]],[],[spawnAt(0.05,[[0,-3.2,40],[0.8,-3.4,40],[-0.8,-3.4,40]]),[0.2,'key','q']],5.5,FOES)
# A12
job('C49','C49 · Forest Spirit: the near Spitter lives 2 s longer',['forest_spirit'],[2.4,-3.2],[[-3.4,2.4,1],[-4.2,1.2,1],[-4.4,2.8,1]],[[2.4,-3.2]],[seeds(0.1,[[0.9,-1.0],[4.8,-3.0]])]+pinD([[2.4,-3.2]],10.6),10.6,FOES,setup=DUM900)
# A13
job('C50','C50 · Wild Thicket under the Elder Oak tosses 1.5 s',['guardian_bond','wild_thicket'],[0,-3.0],[[0,-1.6,1],[1.0,-1.8,1],[-1.0,-1.8,1]],[],[spawnAt(0.05,[[0,-3.2,300],[0.9,-3.5,300],[-0.9,-3.5,300]]),[0.3,'key','q'],[1.0,'key','e']],5.5,FOES)
print('ok')
