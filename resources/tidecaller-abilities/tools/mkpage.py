# mkpage.py: the Tide Caller's ability review page (simple and clean: live clip, name, a line or two, key numbers).
# python3 mkpage.py [local]  -> ../site/index.html (local uses ../node_modules/three for the import map, else jsDelivr three@0.170.0)
import html, os, sys, shutil, base64
HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.join(HERE, '..', 'site')
LOCAL = len(sys.argv) > 1 and sys.argv[1] == 'local'
E = html.escape

def L(zh, en): return (zh, en)
CD = lambda s: L(f'冷却 {s}', f'Cooldown {s}')
BIG = L('大招', 'Big skill'); PAS = L('被动', 'Passive'); NEW = L('新', 'New')
SO = L('浸', 'Soak'); CR = L('拍', 'Crash'); WE = L('湿', 'Wet')

# (card id, number, (zh name, en name), chips, lines)
SECTIONS = [
 ('core', L('被动、普攻、冲刺', 'Passive, attack and dash'), L('', ''), [
  ('P', 'R5', L('潮起潮落', 'Ebb and Flow'), [L('职业被动', 'Class passive')], [
     L('浸湿 4 秒：小敌人慢 15%，被推、被甩多滑 50%。精英减半，首领只有状态。', 'Soaked, 4 s: a small foe is 15% slower and slides 50% farther when moved. Elites half; a boss the status only.'),
     L('【浸】浸湿；【拍】对浸湿的 +60%，用掉浸湿；【湿】对浸湿的更强，浸湿保留。', '【Soak】soaks; 【Crash】60% more on a soaked foe and spends it; 【Wet】more on a soaked foe, the soak stays.')]),
  ('B', 'R6', L('普攻', 'Basic attack'), [L('常驻', 'Always on')], [
     L('按住：水流 4.5 u，每 0.2 秒 3。满 5 秒：海啸，拍 28，6 u，击退，然后浸湿（模型页已通过）。', 'Hold: a stream, 4.5 u: 3 each 0.2 s. After 5 s, a tsunami: Crash 28, 6 u, knocked back, then soaked (as passed).')]),
  ('D', 'R7', L('冲刺', 'Dash'), [L('常驻', 'Always on')], [
     L('乘潮 2.8 u，无敌；湿路留 3 秒：慢 30%，浸湿（模型页已通过）。', 'She rides a tide 2.8 u, untouchable; the wet path stays 3 s: 30% slower, soaked (as passed).')]),
 ]),
 ('stream', L('流', 'Stream'), L('水流、水弹、水柱。', 'Streams, bolts and jets.'), [
  ('F1', 'F1', L('河流弹', 'Riverbolt'), [CD('2.5 s'), SO, WE], [L('水弹 5 u：14。【湿】穿过浸湿的敌人继续飞。', 'A bolt, 5 u: 14. 【Wet】it goes on through a soaked foe.')]),
  ('F2', 'F2', L('激流', 'Torrent'), [CD('6 s'), CR], [L('水柱贯穿 5.5 u 一条线：18。', 'A jet through a 5.5 u line: 18.')]),
  ('F3', 'F3', L('水鞭', 'Water Whip'), [CD('5 s'), NEW, SO, WE], [L('抓住 4 u 内第一个敌人，甩到指针处：12。【湿】浸湿的摔倒。', 'Grabs the first foe within 4 u and throws it to the pointer: 12. 【Wet】a soaked foe lands flat.')]),
  ('F4', 'F4', L('打水漂', 'Skipping Stone'), [CD('6 s'), NEW, SO, WE], [L('沿瞄准方向跳四次：各 10，最后 16。【湿】每打中一个浸湿的多跳一次。', 'Four skips along her aim: 10 each, the last 16. 【Wet】one more skip for each soaked foe it hits.')]),
  ('F5', 'F5', L('泼水', 'Spray'), [CD('4 s'), NEW, SO, WE], [L('快速宽扇形 3 u：10。【湿】已浸湿的变透湿：下一次拍不用掉浸湿。', 'A quick wide fan, 3 u: 10. 【Wet】a soaked foe is drenched: its next Crash does not spend the soak.')]),
  ('F6', 'F6', L('潮珠', 'Tide Orb'), [CD('7 s'), NEW, SO, CR], [L('按住：水珠跟着指针，每 0.3 秒 4。松开：爆开，拍 14。', 'Hold: an orb follows the pointer: 4 each 0.3 s. Let go: it bursts, Crash 14.')]),
  ('F7', 'F7', L('深水弹', 'Depth Charge'), [CD('8 s'), NEW, CR], [L('按住蓄力，把水球抛过一切：拍 18 到 36。', 'Hold, then lob a water ball over everything: Crash 18 to 36.')]),
  ('F8', 'F8', L('决堤', 'Floodgate'), [CD('14 s'), BIG, NEW, CR], [L('杖插地：巨流 8 u，2 秒，每 0.25 秒 8；她慢慢转向。', 'The staff planted: a great beam, 8 u, 2 s: 8 each 0.25 s; she turns slowly.')]),
 ]),
 ('wave', L('浪', 'Wave'), L('浪、天落、唤潮、漩涡。', 'Waves, the sky fall, the tide and pools.'), [
  ('F9', 'F9', L('碎浪', 'Breaker'), [CD('8 s'), CR], [L('周身环浪：22，击退 1 u。', 'A ring round her: 22, knocked back 1 u.')]),
  ('F10', 'F10', L('怒涛', 'Crashing Wave'), [CD('9 s'), CR], [L('100° 浪，2.2 u：20，推 1.2 u。', 'A wave, 100°, 2.2 u: 20, pushed 1.2 u.')]),
  ('F11', 'F11', L('唤潮', 'Call the Tide'), [CD('9 s'), NEW, CR], [L('她所有的水和身边 2 u 的地面一起涌起成浪：站在里面的敌人 16；那些水多留 2 秒。', 'All her water and the floor within 2 u of her rise as waves: 16 to foes standing in it; that water lasts 2 s longer.')]),
  ('F12', 'F12', L('漩涡', 'Whirlpool'), [CD('12 s'), SO], [L('漩涡 5 秒：每秒 4，减速，拖向中心；在里面被拍后马上再浸湿。', 'A pool, 5 s: 4 a second, slows, drags foes to its centre; a foe in it is soaked again at once after a Crash.')]),
  ('F13', 'F13', L('天落', 'Sky Fall'), [CD('10 s'), NEW, SO, CR], [L('她一指，一道圆形瀑布从天而降落在那里，4 秒：冲掉飞进来的子弹；下面的敌人浸湿、慢 40%。再按：整道瀑布一口气砸下，拍 16。', 'She points, and a round waterfall pours from the sky onto the spot, 4 s: it washes down shots that fly into it; foes under it are soaked and 40% slower. Press again: the whole fall drops at once, Crash 16.')]),
  ('F14', 'F14', L('踏浪', 'Wave Rider'), [CD('9 s'), NEW, SO], [L('踏浪 1.5 秒，转向自如：经过的敌人各 14。', 'She surfs a wave she steers, 1.5 s: 14 to foes she passes.')]),
  ('F15', 'F15', L('合浪', 'Clapping Waves'), [CD('8 s'), NEW, CR], [L('两道浪从两侧合拢：18，眩晕 0.5 秒。', 'Two waves rise at the sides of a spot and clap shut: 18, stun 0.5 s.')]),
  ('F16', 'F16', L('大漩涡', 'Maelstrom'), [CD('16 s'), BIG, CR], [L('拉近 3 u 内一切，然后爆开：40。', 'Pulls everything within 3 u inward, then bursts: 40.')]),
 ]),
 ('spring', L('泉', 'Spring'), L('位移、泡泡、雨、泉、给队友的水。', 'Moves, bubbles, rain, springs and water for friends.'), [
  ('F17', 'F17', L('涟漪步', 'Ripple Step'), [CD('7 s'), SO], [L('3 秒内最多三步，每步 1.6 u，无敌；每次落地涟漪 1.5 u：6，浸湿；留下水洼 3 秒，每秒 6。', 'Up to three steps within 3 s, 1.6 u each, untouchable; each landing spreads a ripple, 1.5 u: 6, soaks; a puddle stays 3 s: 6 a second.')]),
  ('F18', 'F18', L('泡泡护盾', 'Bubble Ward'), [CD('11 s'), SO], [L('指针下的队友得到 14 的泡泡，4 秒；破了浸湿 1 u 内的敌人。', 'A 14 bubble, 4 s, on the friend under the pointer; its pop soaks the foes within 1 u.')]),
  ('F19', 'F19', L('骤雨', 'Rain Squall'), [CD('14 s'), SO], [L('雨 6 秒：每秒 3，减速 25%；浸湿持续 8 秒。', 'Rain, 6 s: 3 a second, slow 25%; its soak lasts 8 s.')]),
  ('F20', 'F20', L('间歇泉', 'Geyser'), [CD('7 s'), NEW, SO, WE], [L('0.6 秒后喷发：16，挑飞 0.8 秒。【湿】浸湿的飞两倍高。', 'A spot erupts 0.6 s later: 16, launched 0.8 s. 【Wet】a soaked foe flies twice as high.')]),
  ('F21', 'F21', L('水牢', 'Water Prison'), [CD('9 s'), NEW, CR, SO], [L('泡泡封住第一个敌人：浮空 1.5 秒。【拍】破开 12；【浸】破开浸湿周围。', 'A bubble seals the first foe: afloat 1.5 s. 【Crash】it pops: 12. 【Soak】the pop soaks.')]),
  ('F22', 'F22', L('潜游', 'Otter Dive'), [CD('10 s'), NEW, SO], [L('潜到地下最多 2 秒，无敌；钻出：14，挑飞。', 'She swims under the floor up to 2 s, untouchable; she surfaces: 14, launched.')]),
  ('F23', 'F23', L('河赐', "River's Gift"), [CD('10 s'), NEW, SO], [L('5 秒内队友的攻击浸湿并溅射 4。', "For 5 s a friend's hits soak and splash 4.")]),
  ('F24', 'F24', L('水穹', 'Tidal Dome'), [CD('16 s'), BIG, NEW, SO, CR], [L('水穹 5 秒：里面的队友受伤 -25%，敌人浸湿、减速。【拍】塌下：24。', 'A dome, 5 s: friends inside take 25% less; foes inside are soaked and slowed. 【Crash】it falls in: 24.')]),
 ]),
 ('passives', L('被动技能', 'Passive skills'), L('占一个技能格，不用按键，没有风格形态。', 'Each takes a skill slot; no button, no style forms.'), [
  ('F25', 'F25', L('潮池', 'Tidepool'), [PAS, SO], [L('每秒对 2.5 u 内最近的 2 个敌人各 5。', 'Every second, 5 to the 2 nearest foes within 2.5 u.')]),
  ('F26', 'F26', L('如鱼得水', 'Home Waters'), [PAS, NEW, WE], [L('在自己的水上腹滑，快 20%。【湿】浸湿的敌人留下湿脚印（她的水，2 秒）。', 'On her own water she slides on her belly, 20% faster. 【Wet】soaked foes leave wet footprints (her water, 2 s).')]),
 ]),
 ('combos', L('组合技', 'Combos'), L('两个技能碰到一起时多出来的效果。十二个都选了。', 'What more happens when two of her moves meet. All twelve are taken.'), [
  ('C1', 'C1', L('珠落漩涡', 'Park the orb'), [L('漩涡 + 潮珠', 'Whirlpool + Tide Orb')], [L('潮珠在漩涡上松开不爆：在漩涡里绕圈继续打，漩涡结束时才爆。', 'A Tide Orb let go over her Whirlpool does not burst: it circles in the pool, still ticking, and bursts when the pool ends.')]),
  ('C2', 'C2', L('雨入漩涡', 'Rain feeds the pool'), [L('漩涡 + 骤雨', 'Whirlpool + Rain Squall')], [L('骤雨下的漩涡，雨下多久它就转多久。', 'A Whirlpool under her Rain Squall lasts as long as the rain.')]),
  ('C3', 'C3', L('泉顶水牢', 'Geyser under the prison'), [L('水牢 + 间歇泉', 'Water Prison + Geyser')], [L('封住的敌人下面放间歇泉：泡泡被顶上天爆开，翻倍，淋到下面整群敌人。', 'A Geyser under a sealed foe shoots the bubble up; it pops in the air: doubled, over the whole pack below.')]),
  ('C4', 'C4', L('水上漂', 'More water, more skips'), [L('打水漂 + 地上的水', 'Skipping Stone + water on the floor')], [L('打水漂每落在她的水上就多跳一次，最多 8 次（湿路也算）。', 'Each time Skipping Stone lands on her own water it skips once more, up to 8 (the wet path counts).')]),
  ('C5', 'C5', L('穹顶雨', 'Rain under the dome'), [L('水穹 + 间歇泉', 'Tidal Dome + Geyser')], [L('水穹里的间歇泉撞到顶变成雨，淋穹里每个敌人：各 16。', 'A Geyser inside her Tidal Dome hits the roof and rains on every foe inside: 16 each.')]),
  ('C6', 'C6', L('浪卷天落', 'The wave takes the fall'), [L('天落 + 怒涛或踏浪', 'Sky Fall + Crashing Wave or Wave Rider')], [L('怒涛或踏浪冲过她的天落，把瀑布一起拖走：浪宽 4 u，多算天落的 16。', "Crashing Wave or Wave Rider through her Sky Fall drags the fall along: 4 u wide, with the fall's 16 too.")]),
  ('C7', 'C7', L('乘浪施放', 'Dash cast'), [L('冲刺 + 泼水', 'Dash + Spray')], [L('乘潮时按泼水、碎浪、怒涛或河流弹：留到落地，从浪顶无前摇放出。', 'Spray, Breaker, Crashing Wave or Riverbolt pressed during the tide ride comes off the crest as she lands, with no wind-up.')]),
  ('C8', 'C8', L('鞭打水牢', 'Whip the bubble'), [L('水牢 + 水鞭', 'Water Prison + Water Whip')], [L('水鞭打封住的敌人：甩两倍远，泡泡落地就爆。', 'Water Whip on a sealed foe throws it twice as far, and the bubble pops where it lands.')]),
  ('C9', 'C9', L('顺流弹', 'Bolt down the wet path'), [L('冲刺 + 河流弹', 'Dash + Riverbolt')], [L('河流弹顺着冲刺留下的湿路跑到尽头，穿过路上所有敌人。', 'A Riverbolt fired along her wet path rides it to its end, through every foe on it.')]),
  ('C10', 'C10', L('沉底', 'Sink the charge'), [L('深水弹 + 地上的水', 'Depth Charge + water on the floor')], [L('深水弹打到站在她水里的敌人：从下面爆开，挑飞 0.8 秒。', 'A Depth Charge on foes standing in her water bursts from below: launched 0.8 s.')]),
  ('C11', 'C11', L('河赐护泡', 'Blessed bubble'), [L('河赐 + 泡泡护盾', "River's Gift + Bubble Ward")], [L('同一个队友身上有两者：泡泡破了，河赐重新计 5 秒。', "On a friend with both: when the bubble pops, the gift's 5 s start again.")]),
  ('C12', 'C12', L('雨润', 'Rain on the garden'), [L('她的水 + 苔光', 'Her water + Mosslight')], [L('她的雨、漩涡、水流和浪按苔光的浇水规则浇灌种子和植物。', "Her rain, pools, currents and waves water Mosslight's seeds and plants, by Mosslight's own rule.")]),
 ]),
]

FN = {'base': L('基础', 'Base'), 'fl': L('涨潮', 'Flood'), 'su': L('海啸', 'Tsunami'), 'bu': L('泡沫', 'Bubble')}
# kit 2.0: forms Kesh has not seen yet (a small chip), and the changes that still need his mark (an amber line)
exec(open(os.path.join(HERE, 'kit20.py')).read())
FT = {
 'fl': FL,
 'su': {
  'B': L('海啸 3 秒就来，把小敌人卷到尽头（6 u）。', 'The tsunami comes after 3 s and carries small foes to its end (6 u).'),
  'D': L('下潮后浪不停：再滚 3 u，1.3 u 宽：10，推 1.5 u。', 'The tide rolls on 3 u, 1.3 u wide: 10, pushed 1.5 u.'),
  'F1': L('连撞：敌人被推 2.5 u，撞到的再推下去，最多三个。', 'Cradle: the foe is shoved 2.5 u; the foe it bumps is shoved on, up to three.'),
  'F2': L('分海：把水柱上的敌人向两边各抛 1.5 u。', "Part the sea: throws the line's foes 1.5 u out to both sides."),
  'F3': L('抡摔：抡着敌人转一圈（撞到的敌人 8），再甩出 5 u。', 'Flail: swings the foe round her (8 to foes it hits), then throws it 5 u.'),
  'F4': L('接力浪：每个水花（6）把敌人抛到下一个：一路送 4.5 u。', 'Conveyor: each splash (6) throws its foes on to the next: 4.5 u down the line.'),
  'F5': L('倒卷：水落到敌人身后，把它们冲到她脚下。', 'Drag-in: it falls behind the foes and washes them to her feet.'),
  'F6': L('卷珠：吞下最多 3 个小敌人带着走；松开：甩出去。', 'Pick-up: it swallows up to 3 small foes and carries them; let go: they are thrown.'),
  'F7': L('拍地：小漩涡把敌人卷到一起，然后一道瀑布从天而降砸在上面，把每个敌人拍进地里。', 'Slam down: a small whirlpool drags the pack into one knot, then a waterfall drops from the sky on it and Slams every foe under it into the floor.'),
  'F8': L('洪峰：她在身后抛起三个小水球；水球和她一起射出水刀，汇成一条河（每次 4），推着敌人走；撞墙翻倍。', 'Flood crest: she lobs three small water balls up behind her; they and she fire jets together, a river (4 each) that pushes the pack along; double on a wall.'),
  'F9': L('跃浪：环浪把她抛起，落在指针处再来一圈。', 'Leap: the ring throws her up; she lands at the pointer as a second ring.'),
  'F10': L('三叠浪：浪不只拍一下，连着滚出三道，每道 8，推 1.2 u（共 3.6 u）；浸湿的敌人每次滑更远，还保持浸湿；撞墙会撞击。', 'Three Crests: the wave rolls on as three crests: 8 each, pushed 1.2 u each (3.6 u in all); a soaked foe slides farther each time and stays soaked; one pushed into a wall Slams.'),
  'F11': L('聚潮：每道浪把敌人甩向指针 3 u：16，拍；它们撞在一起。', 'Gathering tide: each wave throws its foes 3 u toward the pointer: 16, Crash; they Slam where they meet.'),
  'F12': L('沉渊：中心的敌人被吞 2 秒，然后吐成一堆，眩晕。', 'Abyss: foes at the centre are swallowed 2 s, then spat out in one pile, stunned.'),
  'F13': L('潮环：再按时，瀑布的水潭向外炸成一圈浪，把下面的敌人推出 2 u（浸湿的更远）：拍 16。', 'Ring out: on the press, its pool bursts outward as a ring wave and throws the foes under it 2 u out (soaked ones farther): Crash 16.'),
  'F14': L('浪尖：浪峰时再按，浪碎开：拍 28，击倒。', 'Crest: press again as the wave peaks: it breaks: Crash 28, knocked flat.'),
  'F15': L('夹击：两道墙撞在一起：20，不眩晕，夹在中间的敌人被挤出 3 u。', 'Vice: the walls crush together: 20, no stun; foes caught between squirt out 3 u.'),
  'F16': L('瀑压：挑飞 1.2 秒；一道瀑布从天而降把它们砸下，落地成环：12。', 'Fall slam: launched 1.2 s; a waterfall drops from the sky and slams them down into a ring: 12.'),
  'F17': L('对调：和一个敌人换位置，它摔倒在她的水洼里。', 'Swap: she trades places with a foe: it lands flat in her puddle.'),
  'F18': L('借浪：泡泡 10；队友踏浪 4 秒，更快，把敌人撞开：8。', 'Lend a wave: a 10 bubble; the friend rides a wave 4 s: faster, and bumps foes aside: 8.'),
  'F19': L('水旋：不减速；三根水旋乱走，各卷起一个敌人砸到另一个身上。', 'Spouts: no slow: three spouts wander: each lifts a foe, spins it and drops it on another.'),
  'F20': L('托抛：在顶点，一道浪把挑飞的敌人抛到指针 3 u。', 'Toss: at the top a wave throws the launched foes 3 u to the pointer.'),
  'F21': L('牵走：封住的敌人被水绳牵着跟她走 2 秒；再按：甩一圈，把泡泡扔到指针处（5 u 内）爆开，砸到敌人就撞。', 'Tow: the sealed foe follows her on a rope of water 2 s; press again: she swings it once and throws it to the pointer (5 u), where it pops; onto a foe it Slams.'),
  'F22': L('围鱼：绕着敌人游一圈，圈里的全被卷到中心相撞。', 'Round-up: swim a ring round foes: all inside are swept to its centre and Slammed.'),
  'F23': L('送球：甩给队友的敌人到了就眩晕，队友下一击 +30%。', "Alley-oop: a foe thrown to the friend arrives stunned and takes 30% more from their next hit."),
  'F24': L('弹球：敌人出不去；穹壁当墙相撞，再弹回来。', 'Pinball: foes cannot leave; its skin is a wall for Slam and bounces them back.'),
 },
 'bu': {
  'B': L('水流带泡泡：连打 2 秒让小敌人浮空 1 秒；泡沫海啸给经过的队友 10 的泡泡。', '2 s of stream floats a small foe 1 s; the foam tsunami leaves a 10 bubble on friends it passes.'),
  'D': L('浪顶合拢成 10 的泡泡罩住她，3 秒。', 'She steps off in a 10 bubble, 3 s.'),
  'F1': L('弹泡：泡泡在敌人和墙之间弹 4 次：8；队友可以接住。', 'Bouncer: a bubble bounces off foes and walls 4 times: 8; a friend can catch it.'),
  'F2': L('洗礼：水柱上的队友被洗掉减速、灼烧和诅咒。', 'Wash: friends on the line are washed clean of slows, burns and curses.'),
  'F3': L('救援：水鞭把队友裹进 12 的泡泡，把敌人从他身上扯开。', 'Rescue: the whip wraps a friend in a 12 bubble and yanks the foes off them.'),
  'F4': L('浮雷：每个水花留下一个泡泡，飘向敌人爆开：10。', 'Drift mines: each splash leaves a bubble that drifts to a foe and pops: 10.'),
  'F5': L('滑泡：泡沫留 4 秒，跑或冲过的敌人摔倒。', 'Foam floor: foam stays 4 s: a foe that runs or charges across it falls.'),
  'F6': L('护卫珠：引到队友身上护住（14）；每跳打它周围的敌人。', 'Guardian orb: steered onto a friend it guards them (14); its ticks hit the foes round them.'),
  'F7': L('浮垫：落地变成泡泡筏，上面的队友不怕灼烧和减速地面。', 'Raft: it lands as a raft of bubbles: friends on it ignore burning and slowing ground.'),
  'F8': L('泡浪：杖插地，2 秒吹出一道 8 u 的泡泡浪；小敌人被封进泡泡吹到尽头（精英一半远），泡泡破：20，拍，浸湿，摔在地上。', 'Bubble wave: the staff planted, she blows a wave of bubbles down the 8 u line for 2 s; small foes are sealed and blown to its end (an elite half as far): the bubble pops: 20, Crash, soaks, and they fall flat.'),
  'F9': L('护身泡：12；三个泡泡绕身 5 秒，每个挡一下再爆。', 'Guard bubbles: 12; three bubbles circle her 5 s: each stops one hit, then pops.'),
  'F10': L('糊脸：泡沫，12；被打中的敌人致盲 1.2 秒，瞄准的攻击都打空。', 'Faceful: foam, 12: foes it hits are blinded 1.2 s: aimed blows and shots miss.'),
  'F11': L('泡涌：不伤害；水里的敌人浮起 1.2 秒，落地浸湿；水里的队友（她也算）得到 10 的泡泡。', 'Bubbling up: no damage: foes in her water float 1.2 s and land soaked; friends in it, her too, get a 10 bubble.'),
  'F12': L('定海：站在里面的队友不会被眩晕、推、拉或击倒。', 'Steady water: friends standing in it cannot be stunned, pushed, pulled or knocked flat.'),
  'F13': L('回礼：瀑布像肥皂膜一样薄；冲掉的子弹被泡泡包着飘回射手：各 6。', 'Return: the fall is thin as a soap film; the shots it washes down float back to who fired them in bubbles: 6 each.'),
  'F14': L('掀泡：她踏浪经过的敌人一个个被泡泡托起。', 'Bubble wake: each foe she rides past is lifted in a bubble behind her.'),
  'F15': L('爆响：两个大泡泡相撞爆开：18，不眩晕；4 u 内所有蓄力被打断。', 'Bang: two great bubbles meet and pop: 18, no stun; every wind-up within 4 u breaks.'),
  'F16': L('水獭替身：不拉人；留下一只水做的水獭：敌人打它 3 秒，然后爆开：40。', 'Decoy: no pull: she leaves an otter of water: foes attack it 3 s, then it bursts: 40.'),
  'F17': L('踩泡：每步踩在指针附近最近的队友或敌人头上（3 u 内），弹起落到 1 u 外；队友得到 8 的泡泡，小敌人浮起 0.6 秒，落地浸湿。', 'Bubble hop: each step bounces off the head of the friend or foe nearest the pointer (3 u) and lands 1 u beyond; a friend gets an 8 bubble, a small foe floats 0.6 s and lands soaked.'),
  'F18': L('跳泡：破了就跳到下一个队友，最多三次。', 'Hop: when it pops it hops to the next friend, up to three.'),
  'F19': L('沉泡：每秒粘一个泡泡；满四个定身，然后全爆。', 'Heavy bubbles: each second sticks a bubble on a foe; at four it is rooted, then they pop.'),
  'F20': L('泡泉：泉口留 5 秒，每秒吹一个泡泡给最近的队友。', 'Bubble fountain: the vent stays 5 s and blows a bubble a second to the nearest friend.'),
  'F21': L('存伤：泡泡存下封住的敌人受到的所有伤害，然后加 30% 还给它。', 'Store: the bubble keeps all damage dealt to the sealed foe, then pays it back, 30% more.'),
  'F22': L('水遁：从房间里她的任意一片水中立刻钻出。', 'Water door: she comes up at once from any of her water in the room.'),
  'F23': L('倒影：队友的下一个技能（大招也算）放两次，第二次 40%。', "Reflection: the friend's next skill, a big one too, is cast twice: the second for 40%."),
  'F24': L('同舟：水穹是一个大泡泡，替里面的队友挨所有打，最多 60。', 'Same boat: the dome is one great bubble: it takes every hit meant for the friends inside, up to 60.'),
 },
}
FORMS_ON = ['fl', 'su', 'bu']
for _k, _v in SU.items(): FT['su'][_k] = _v
for _k, _v in BU.items(): FT['bu'][_k] = _v

def bi(p):
    zh, en = p
    return f'<span class="zh">{E(zh)}</span><span class="en">{E(en)}</span>'

def newchip(f, cid): return f'<span class="chip new20">{bi(L("新", "New"))}</span> ' if (f, cid) in NEW20 else ''
def flag(f, cid): return f'<p class="flag">{bi(FLAG[(f, cid)])}</p>' if (f, cid) in FLAG else ''

def card(c):
    cid, num, name, chips, lines = c
    ch = ''.join(f'<span class="chip">{bi(x)}</span>' for x in chips)
    ps = ''.join(f'<p>{bi(x)}</p>' for x in lines)
    fs = [f for f in FORMS_ON if cid in FT.get(f, {})]
    sw = ''
    if fs:
        sw = '<div class="seg forms" role="group" aria-label="Style">' + ''.join(f'<button type="button" data-f="{f}" aria-pressed="{str(f == "base").lower()}">{bi(FN[f])}</button>' for f in ['base'] + fs) + '</div>'
        ps = f'<div class="fx" data-f="base">{ps}</div>' + ''.join(f'<div class="fx" data-f="{f}"><p class="fline">{newchip(f, cid)}{bi(FT[f][cid])}</p>{flag(f, cid)}</div>' for f in fs)
    return (f'<article class="skill" id="{cid}" data-form="base"><div class="stage"><canvas data-id="{cid}" width="800" height="500" aria-label="{E(name[1])}"></canvas>'
            f'<button type="button" class="pp" aria-label="Pause">❚❚</button></div>'
            f'<div class="txt"><div class="head"><span class="num">{num}</span><h3>{bi(name)}</h3></div>'
            f'<div class="meta">{ch}</div>{sw}{ps}</div></article>')

nav = ''.join(f'<a href="#{s[0]}">{bi(s[1])}</a>' for s in SECTIONS)
body = ''
for sid, title, intro, cards in SECTIONS:
    it = f'<p class="intro">{bi(intro)}</p>' if intro[0] else ''
    body += f'<section id="{sid}"><h2>{bi(title)}</h2>{it}' + ''.join(card(c) for c in cards) + '</section>'

three = '../node_modules/three/build/three.module.js' if LOCAL else 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js'
addons = '../node_modules/three/examples/jsm/' if LOCAL else 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/'
CSS = open(os.path.join(HERE, 'style.css')).read()
ALLF = ('<div class="seg allforms" role="group" aria-label="Style for every card"><button type="button" data-f="base" aria-pressed="true"><span class="zh">全部基础</span><span class="en">All base</span></button>'
      + ''.join(f'<button type="button" data-f="{f}" aria-pressed="false"><span class="zh">全部{FN[f][0]}</span><span class="en">All {FN[f][1]}</span></button>' for f in FORMS_ON) + '</div>')
SUB = L('实时 3D，真实速度。基础形态（被动、普攻、冲刺和 26 个技能）、三种风格（涨潮、海啸、泡沫）和十二个组合技。点画面暂停。',
        'Live 3D at real speed. Base forms (the passive, basic attack, dash and the 26 skills), all three styles (Flood, Tsunami, Bubble) and the twelve combos. Click a clip to pause.')
RULES = L('蓝色水滴：浸湿。拍：对浸湿的 +60%。撞：被甩到墙或别的敌人身上（墙 10 + 眩晕 0.5 秒，敌人各 6；海啸卡按「重浪」天赋演示，翻倍）。浮空：不能行动，最多 2 秒。首领不会被移动或浮空，那一下 +20%。',
          'Blue drop: soaked. Crash 拍: 60% more on a soaked foe. Slam 撞: thrown into a wall or another foe (a wall 10 + stun 0.5 s, a foe 6 each; the Tsunami cards show it doubled, as the Heavy Swell talent does). Afloat: cannot act, 2 s at most. A boss is never moved or held: that hit deals 20% more.')
page = ('<meta charset="utf-8">\n' if LOCAL else '') + f'''<title>Tide Caller skills</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;600&display=swap">
<style>{CSS}.passed{{display:inline-block;margin:4px 0 2px;padding:3px 10px;border-radius:999px;font-weight:600;font-size:13px;background:#DDF3E3;color:#1F6B3A}}.passed.wait{{background:#FBEBC8;color:#7A5200}}.chip.new20{{background:#3F7FE6;color:#fff;border-color:#3F7FE6}}.flag{{margin:6px 0 0;padding:6px 10px;border-left:3px solid #D9A21B;background:#FDF4DC;color:#5E4300;border-radius:4px;font-size:13.5px}}.open{{max-width:560px;margin:8px 0 4px;padding:8px 12px 8px 30px;border-left:3px solid #D9A21B;background:#FDF4DC;color:#5E4300;border-radius:4px;font-size:14px}}.open li{{margin:2px 0}}.openh{{margin:10px 0 0;font-weight:600;font-size:14px}}@media (prefers-color-scheme:dark){{.passed{{background:#173A24;color:#8FE0A8}}.passed.wait{{background:#3D2E0A;color:#F2CF7A}}.flag,.open{{background:#2E240B;color:#F2D995;border-left-color:#C99A2B}}}}</style>
<script type="importmap">{{"imports":{{"three":"{three}","three/addons/":"{addons}"}}}}</script>
<div class="wrap" data-lang="zh">
<header>
  <div class="tools">
    <div class="seg speed" role="group" aria-label="Speed"><button type="button" data-s="1" aria-pressed="true">1×</button><button type="button" data-s="0.5" aria-pressed="false">0.5×</button><button type="button" data-s="0.25" aria-pressed="false">0.25×</button></div>
    {ALLF}
    <div class="seg lang" role="group" aria-label="Language"><button type="button" data-l="zh" aria-pressed="true">中文</button><button type="button" data-l="en" aria-pressed="false">English</button></div>
  </div>
  <h1>{bi(L('潮语者 Tide Caller 技能', 'Tide Caller skills'))}</h1>
  <p class="passed">{bi(L('基础技能和泡沫：已通过 · 11 月 19 日', 'Base skills and Bubble: passed · 19 Nov'))}</p>
  <p class="passed">{bi(L('水效全部通过 · 11 月 20 日', 'Water effects all passed · 20 Nov'))}</p>
  <p class="passed wait">{bi(L('套路 2.2 · 带「新」的卡等你打分：涨潮 27、海啸 7、泡沫 2', 'Kit 2.2 · cards with a New chip are for your marks: Flood 27, Tsunami 7, Bubble 2'))}</p>
  <p class="rules">{bi(L('11 月 21 日：水刀换成涨潮，狂澜改成海啸。评审跑了三轮：查设计、查重复、补细节。', '21 Nov: Flood stands where Jet stood, and Surge is now Tsunami. Three critic rounds: fit, repeats, details.'))}</p>
  <p class="rules">{bi(L('你定了（11 月 21 日，全选 a）：', 'Settled by you (21 Nov, all a): '))}{bi(L('；'.join(x[0] for x in OPEN) + '。', '; '.join(x[1] for x in OPEN) + '.'))}</p>
  <p class="rules">{bi(L('11 月 20 日：水的特效按你的 15 张重绘图换了新样子（水流、海啸、环浪、水柱、水弹、水花、泡泡、雨、漩涡、湿地、喷泉、水墙、水罩、水鞭、浸湿）。', '20 Nov: the water effects take the look of your 15 repaints (stream, tsunami, ring wave, jet, bolt, splash, bubble, rain, whirlpool, wet floor, geyser, wall, dome, whip, Soaked).'))}</p>
  <p class="sub">{bi(SUB)}</p>
  <p class="rules">{bi(RULES)}</p>
  <nav>{nav}</nav>
</header>
{body}
</div>
<script type="module">
import * as W from './tc.js';
import {{ DEFS, FORMS }} from './defs.js';
import './fl.js';
import './su.js';
import './bu.js';
import './co.js';
const wrap = document.querySelector('.wrap');
const store = {{ get(k) {{ try {{ return localStorage.getItem(k); }} catch (e) {{ return null; }} }}, set(k, v) {{ try {{ localStorage.setItem(k, v); }} catch (e) {{}} }} }};
function lang(l) {{ wrap.dataset.lang = l; document.documentElement.lang = l === 'zh' ? 'zh-Hans' : 'en'; W.setLang(l); store.set('tc-lang', l);
  document.querySelectorAll('.lang button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.l === l))); }}
function speed(s) {{ W.setSpeed(+s); store.set('tc-speed', s); document.querySelectorAll('.speed button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.s === s))); }}
document.querySelectorAll('.lang button').forEach((b) => b.addEventListener('click', () => lang(b.dataset.l)));
document.querySelectorAll('.speed button').forEach((b) => b.addEventListener('click', () => speed(b.dataset.s)));
lang(store.get('tc-lang') === 'en' ? 'en' : 'zh'); speed(['1', '0.5', '0.25'].includes(store.get('tc-speed')) ? store.get('tc-speed') : '1');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
document.querySelectorAll('canvas[data-id]').forEach((cv) => {{
  const c = W.addCard(DEFS[cv.dataset.id], cv); const st = cv.parentElement; const pp = st.querySelector('.pp');
  const set = (p) => {{ c.paused = p; st.classList.toggle('paused', p); pp.textContent = p ? '▶' : '❚❚'; pp.setAttribute('aria-label', p ? 'Play' : 'Pause'); }};
  if (reduce) set(true);
  st.addEventListener('click', () => set(!c.paused));
  const art = cv.closest('article'); art._card = c;
}});
function setForm(art, f) {{ const id = art.id; const btn = art.querySelector(`.forms button[data-f="${{f}}"]`); if (!btn) return;
  art.dataset.form = f; art.querySelectorAll('.forms button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.f === f)));
  art._card.setDef(f === 'base' ? DEFS[id] : FORMS[f][id]); }}
document.querySelectorAll('.forms button').forEach((b) => b.addEventListener('click', () => setForm(b.closest('article'), b.dataset.f)));
document.querySelectorAll('.allforms button').forEach((b) => b.addEventListener('click', () => {{
  document.querySelectorAll('.allforms button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  document.querySelectorAll('article.skill').forEach((a) => setForm(a, a.querySelector(`.forms button[data-f="${{b.dataset.f}}"]`) ? b.dataset.f : 'base')); }}));
wrap.classList.add('loading');
W.start();
import('./otter-model.js').then((m) => {{ const s = atob(m.default), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return W.loadHim(u.buffer); }}).then(() => wrap.classList.remove('loading')).catch((e) => {{ wrap.classList.remove('loading'); wrap.classList.add('failed'); console.error(e); }});
</script>
'''
os.makedirs(SITE, exist_ok=True)
open(os.path.join(SITE, 'index.html'), 'w').write(page)
for f in ['tc.js', 'poses.js', 'defs.js', 'fl.js', 'su.js', 'bu.js', 'co.js', 'knees.js']: shutil.copy(os.path.join(HERE, f), os.path.join(SITE, f))
mp = os.path.join(SITE, 'otter-model.js')
if not os.path.exists(mp) or os.path.getmtime(mp) < os.path.getmtime(os.path.join(HERE, 'otter.glb')):
    open(mp, 'w').write('// The Tide Caller, rigged with her passed clips (GLB, base64)\nexport default "' + base64.b64encode(open(os.path.join(HERE, 'otter.glb'), 'rb').read()).decode() + '";\n')
print('ok', len(page))
