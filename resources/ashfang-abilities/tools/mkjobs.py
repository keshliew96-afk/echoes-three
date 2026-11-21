import json
R='boar'
def J(name,cap,secs,seq,foes,fox=(-2,0),aim=(2,0),**kw):
    d=dict(name=name,cap=cap,secs=secs,fox=list(fox),aim=list(aim),foes=[[R,x,z] for x,z in foes],seq=seq); d.update(kw); return d
line3=[(0.2,0.3),(1.3,-0.4),(2.4,0.35)]
pack=[(0.1,0.5),(0.3,-0.6),(1.2,0.1),(0.9,1.0),(1.1,-1.1)]
jobs=[
 J('S11','Bladesong · the count, the song, the orbs',6.0,[[0.3,'combo'],[1.9,'cast','flurry',[0,0]],[2.4,'cut',1],[2.9,'combo'],[4.5,'cast','flurry',[0,0]]],[(-0.9,0.3),(-0.8,-0.5),(-1.2,0.6)],fox=(-2,0),aim=(0,0),focus=(-1,0)),
 J('S12','Basic attack · cut, rising cut, thrust, spin cut (strong)',2.6,[[0.3,'combo']],[(-1.1,0.25),(-1.0,-0.45),(-0.6,0.7)],aim=(0,0),focus=(-1,0)),
 J('S13','Dash · thrust through, 8 to each, +2 count',2.0,[[0.3,'dash',[1,0]]],[(-0.6,0.2),(0.2,-0.25)],fox=(-2,0),aim=(2,0),focus=(-0.5,0)),
 # fire
 J('S14','Flurry · four cuts, burn',2.6,[[0.3,'cast','flurry',[0,0]]],[(-1.25,0.2),(-1.3,-0.35),(-1.0,0.6)],aim=(0,0),focus=(-1.2,0)),
 J('S15','Crescent Finisher · reads the count',4.0,[[0.3,'combo'],[1.9,'cast','crescent_finisher',[0,0]]],[(-1.1,0.25),(-1.0,-0.45),(-1.2,0.6)],aim=(0,0),focus=(-1.2,0),setup="__AF.count(18)"),
 J('S16','Flame Crescent',2.4,[[0.3,'cast','flame_crescent',[3,0]]],line3,focus=(0.2,0)),
 J('S17','Flare Wave · bursts on the first foe',2.4,[[0.3,'cast','flare_wave',[3,0]]],[(1.3,0.1),(1.9,0.9),(2.1,-0.7),(1.0,-1.6)],focus=(0.2,0)),
 J('S18','Crimson Edge (passive) · crits burn',4.4,[[0.3,'combo'],[2.1,'combo']],[(-1.1,0.25),(-1.0,-0.45),(-0.7,0.65)],aim=(0,0),focus=(-1.2,0),setup="__AF.passive('crimson_edge')"),
 J('S19','Flashfire · lights the ring',2.6,[[0.4,'cast','flashfire',[1,0]]],[(-0.5,1.6),(1.0,1.0),(1.4,-0.9),(-0.6,-1.6),(-2.6,0.6),(4.0,0.3)],fox=(0,0),aim=(2,0),focus=(0,0)),
 J('S20','Triple Crescent · three great waves',3.0,[[0.3,'cast','triple_crescent',[3,0]],[0.3,'eval',"__AF.set({tripleAim:[{x:3,z:-1.2},{x:3,z:0},{x:3,z:1.2}]})"]],[(1.0,-0.7),(1.6,0.2),(2.4,0.8),(2.8,-0.2),(1.4,1.4)],focus=(0.5,0)),
 # earth
 J('S21','Lunge Strike · stun',2.2,[[0.3,'cast','lunge_strike',[0,0]]],[(-0.9,0.0),(-0.2,0.05),(-0.8,1.0)],aim=(0,0),focus=(-1.2,0)),
 J('S22','Hilt Bash · the pommel, a full stun',2.2,[[0.3,'cast','hilt_bash',[0,0]]],[(-1.25,0.05),(-0.9,0.9)],aim=(0,0),focus=(-1.4,0)),
 J('S23','Stone Crescent · stops at the first foe',2.4,[[0.3,'cast','stone_crescent',[3,0]]],[(1.3,0.0),(1.9,0.7),(1.8,-0.75),(3.2,0.1)],focus=(0.3,0)),
 J('S24','Ground Wave · a crack under every foe',2.4,[[0.3,'cast','ground_wave',[3,0]]],line3,focus=(0.3,0)),
 J('S25','Caltrops · stone, the first step stuns',2.6,[[0.3,'cast','caltrops',[0,0]]],[(-0.1,0.25),(0.2,-0.3)],aim=(0,0),focus=(-1,0)),
 J('S26','Riposte · parry, answer, stun',2.6,[[0.35,'shoot',0],[0.5,'cast','riposte',[0,0]]],[(-0.9,0.2),(-0.8,-0.5),(2.4,0.0)],aim=(0,0),focus=(-0.6,0)),
 # water
 J('S27','Moonfang · dash cut, marks, slow',2.4,[[0.3,'cast','moonfang',[2,0]]],[(-0.8,0.2),(-0.1,-0.3),(0.6,0.25)],fox=(-2.2,0),aim=(2,0),focus=(-0.4,0)),
 J('S28','Flowing Blade · three cuts on the move',2.4,[[0.3,'cast','flowing_blade',[0,1],[0,1]]],[(-1.0,0.2),(-1.0,1.0),(-2.5,1.4)],fox=(-2,-0.5),aim=(-1,0.5),focus=(-1.6,0.4)),
 J('S29','Tide Crescent · wide wave, hop back',2.6,[[0.3,'cast','tide_crescent',[3,0],[-1,0]]],[(0.6,-0.9),(1.0,0.4),(1.7,1.0),(1.9,-0.2)],fox=(-0.6,0),aim=(3,0),focus=(0,0)),
 J('S30','Blade Rain · eight blades fall',2.8,[[0.3,'cast','blade_rain',[1.5,0]]],[(1.2,0.6),(1.8,-0.5),(1.0,-0.8),(2.3,0.4)],aim=(1.5,0),focus=(0,0)),
 J('S31','Mirror Image · holds foes, bursts',4.4,[[0.3,'cast','mirror_image',[1,0]],[0.9,'eval','__AF.walk(-1.6,0.4,0.7)']],[(-0.3,1.3),(0.6,0.9),(0.9,-0.7),(-0.6,-1.4)],fox=(0,0),aim=(2,0),focus=(-0.6,0)),
 J('S32','Cold Edge (passive) · every 4th hit slows; 15% more to slowed',4.4,[[0.3,'combo'],[2.1,'combo']],[(-1.15,0.15)],aim=(0,0),focus=(-1.3,0),setup="__AF.passive('cold_edge')"),
 # wind
 J('S33','Fox Step · dash cut, thrown up',2.2,[[0.3,'cast','fox_step',[2,0]]],[(-0.9,0.2),(-0.2,-0.3)],fox=(-2,0),aim=(2,0),focus=(-0.8,0)),
 J('S34','Blade Storm · pulls in, five cuts while walking',2.4,[[0.3,'cast','blade_storm',[1,0]]],[(-1.6,0.6),(1.8,0.4),(0.2,1.9),(0.6,-1.7),(-0.6,-0.8)],fox=(0,0),aim=(2,0),focus=(0,0)),
 J('S35','Gale Crescent · pushes 2 u back',2.4,[[0.3,'cast','gale_crescent',[3,0]]],line3,focus=(0.6,0)),
 J('S36','Blade Dance · thrown up',2.4,[[0.3,'cast','blade_dance',[1,0]]],[(-0.9,0.5),(0.8,0.6),(0.2,-1.0),(-0.6,-0.7)],fox=(0,0),aim=(2,0),focus=(0,0)),
 J('S37','Whirlwind Slash · gathers the pack',3.2,[[0.3,'cast','whirlwind_slash',[3,0]]],[(-0.6,0.3),(0.6,-0.5),(1.4,0.4),(2.0,-0.2)],fox=(-2,0),aim=(2,0),focus=(0.2,0)),
 J('S38','Razor Wake (passive) · cuts every second; third in a row throws up',4.2,[],[(-1.3,0.25),(-2.0,-0.6)],fox=(-2,0),aim=(0,0),focus=(-1.8,0),setup="__AF.passive('razor_wake')"),
 J('S39','Thousand Cuts · the blur',2.6,[[0.3,'cast','thousand_cuts',[1,0]]],[(-0.3,0.8),(1.3,1.0),(1.6,-0.6),(0.2,-1.2),(0.8,0.1)],fox=(-1.2,0),aim=(1,0),focus=(0.2,0)),
 # rules and combos
 J('B1','Skill, cut, skill · the strong cut throws a wave',3.6,[[0.3,'cast','flurry',[0,0]],[1.0,'cut',1],[1.7,'cast','lunge_strike',[0,0]],[2.4,'cut',1]],[(-1.2,0.2),(-1.25,-0.4),(1.0,0.1),(2.2,-0.2)],aim=(0,0),focus=(-0.6,0)),
 J('B2','Two orbs · the third cast pushes out the oldest',4.0,[[0.3,'cast','flame_crescent',[3,0]],[1.3,'cast','gale_crescent',[3,0]],[2.4,'cast','stone_crescent',[3,0]]],[(1.3,0.0),(2.2,0.4)],focus=(0.0,0)),
 J('S7','Juggle · cuts on foes in the air count double',3.2,[[0.3,'cast','blade_dance',[1,0]],[0.85,'cut',3]],[(0.75,0.15),(0.8,-0.5),(0.5,0.7)],fox=(0,0),aim=(2,0),focus=(0.3,0)),
 J('L1','Light and set off · Flame Crescent, then Flashfire',3.2,[[0.3,'cast','flame_crescent',[3,0]],[1.3,'cast','flashfire',[3,0]]],[(1.0,0.2),(1.8,-0.3),(2.6,0.3),(1.9,1.4),(2.6,-1.3)],fox=(0,0),aim=(3,0),focus=(1,0)),
 J('C1','Wind fans fire · Flame Crescent on one, Gale Crescent through it',3.2,[[0.3,'cast','flame_crescent',[2,1.2]],[1.3,'cast','gale_crescent',[2,1.2]]],[(1.6,1.0),(2.0,2.0),(2.6,0.4),(1.0,-0.8)],fox=(0,0),aim=(2,1.2),focus=(1,0.5)),
 J('C2','Wall slam · Gale Crescent into a wall',2.6,[[0.3,'cast','gale_crescent',[3,0]]],[(1.0,0.0),(1.4,0.6)],fox=(-1,0),aim=(3,0),focus=(1,0),setup="__AF.wall(3.4,0.2,0.5,2.6)"),
 J('C3','Spike · Fox Step throws up, Crescent Finisher slams down',3.0,[[0.3,'cast','fox_step',[2,0]],[0.85,'cast','crescent_finisher',[1,0]]],[(-0.6,0.15),(0.0,-0.3),(0.5,0.9)],fox=(-2,0),aim=(2,0),focus=(-0.6,0)),
 J('C4','Bat it away · Blade Dance, then Stone Crescent',3.0,[[0.3,'cast','blade_dance',[1,0]],[0.85,'cast','stone_crescent',[2,0]]],[(0.75,0.1),(2.8,0.5),(3.0,-0.4)],fox=(0,0),aim=(2,0),focus=(1.2,0)),
 J('C5a','Coloured whirl · Whirlwind Slash, then Flame Crescent',3.2,[[0.3,'cast','whirlwind_slash',[3,0]],[0.9,'cast','flame_crescent',[3,0]]],[(-0.4,0.3),(0.6,-0.4),(1.4,0.4)],fox=(-2,0),aim=(2,0),focus=(0.2,0)),
 J('C5b','Coloured whirl · Whirlwind Slash, then Stone Crescent',3.2,[[0.3,'cast','whirlwind_slash',[3,0]],[0.9,'cast','stone_crescent',[3,0]]],[(-0.4,0.3),(0.6,-0.4),(1.4,0.4)],fox=(-2,0),aim=(2,0),focus=(0.2,0)),
 J('C5c','Coloured whirl · Whirlwind Slash, then Tide Crescent',3.2,[[0.3,'cast','whirlwind_slash',[3,0]],[0.9,'cast','tide_crescent',[3,0]]],[(-0.4,0.3),(0.6,-0.4),(1.4,0.4)],fox=(-2,0),aim=(2,0),focus=(0.2,0)),
 J('C6','The image throws too · Mirror Image, then Triple Crescent',4.0,[[0.3,'cast','mirror_image',[3,0]],[0.8,'eval','__AF.walk(0,1.4,0.6)'],[1.6,'cast','triple_crescent',[3,0.5]]],[(1.6,0.6),(2.4,1.2),(2.6,-0.2),(3.2,0.6)],fox=(-1,-0.8),aim=(3,0.5),focus=(0.8,0.2)),
 J('C7','Burst the image · Mirror Image, then Moonfang through it',3.0,[[0.3,'cast','mirror_image',[2,0]],[0.9,'cast','moonfang',[2,0]]],[(-0.2,1.1),(0.6,-0.9),(1.1,0.6)],fox=(-1.6,0),aim=(2,0),focus=(-0.2,0),seq2=None),
 J('C8','Sent back · Riposte returns the shot as a wave',3.0,[[0.35,'shoot',0],[0.5,'cast','riposte',[3,0]]],[(3.0,0.0),(2.2,0.9)],fox=(-1,0),aim=(3,0),focus=(0.8,0)),
 J('C9','Kick the caltrops · Caltrops, then Ground Wave',3.2,[[0.3,'cast','caltrops',[0.4,0]],[1.3,'cast','ground_wave',[3,0]]],[(0.5,0.2),(0.3,-0.3),(1.6,0.5)],fox=(-1.2,0),aim=(3,0),focus=(0.3,0)),
 J('C10','Fire spin · Flurry on one, then Blade Storm in the pack',3.2,[[0.3,'cast','flurry',[1,0]],[1.0,'cast','blade_storm',[1,0]]],[(0.75,0.1),(-0.8,0.6),(0.2,-0.95),(-0.3,1.6),(-1.4,-0.6)],fox=(0,0),aim=(2,0),focus=(0,0)),
 J('C11','Dash strike · Lunge Strike pressed during the dash',2.6,[[0.3,'dash',[1,0]],[0.4,'cast','lunge_strike',[2,0]]],[(1.6,0.05),(2.4,0.0)],fox=(-1.8,0),aim=(3,0),focus=(0.4,0)),
 J('C12','Quench · Flashfire, then Blade Rain',3.2,[[0.3,'cast','flashfire',[1,0]],[1.1,'cast','blade_rain',[1.6,0]]],[(1.2,0.5),(1.9,-0.4),(1.2,-0.9),(2.2,0.6)],fox=(0,0),aim=(2,0),focus=(0.8,0)),
]
mixes=[('M1','Blaze','flame_crescent','flare_wave'),('M2','Quake','stone_crescent','ground_wave'),('M3','Flood','tide_crescent','tide_crescent'),('M4','Tornado','gale_crescent','gale_crescent'),
 ('M5','Firestorm','flame_crescent','gale_crescent'),('M6','Magma','flame_crescent','stone_crescent'),('M7','Steam','flame_crescent','tide_crescent'),('M8','Mud','stone_crescent','tide_crescent'),('M9','Sandstorm','stone_crescent','gale_crescent'),('M10','Frost','tide_crescent','gale_crescent')]
for n,name,a,b in mixes:
    jobs.append(J(n,f'{name} · Fusion: two casts, the mix fires',{'Tornado':5.4,'Magma':5.0,'Mud':5.0}.get(name,4.2),[[0.3,'cast',a,[3,0]],[1.2,'cast',b,[3,0]]],[(1.3,0.6),(2.1,-0.3),(2.8,0.7),(1.6,-1.2),(3.0,-1.0)],fox=(-0.6,0),aim=(3,0),focus=(1.0,0),setup="__AF.set({fusion:true,mixDist:2.6})"))
for j in jobs: j.pop('seq2',None)
json.dump(jobs,open('all.json','w'))
print(len(jobs))
