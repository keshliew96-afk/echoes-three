# mkpage.py: Duskwing's ability review page (simple and clean: live clip, name, a line or two, key numbers).
# python3 mkpage.py [local]  -> ../site/index.html (local uses ../node_modules/three for the import map, else jsDelivr three@0.170.0)
import html, os, sys, shutil, base64
HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.join(HERE, '..', 'site')
LOCAL = len(sys.argv) > 1 and sys.argv[1] == 'local'
E = html.escape

def L(zh, en): return (zh, en)
CD = lambda s: L(f'冷却 {s}', f'Cooldown {s}')
BIG = L('大招', 'Big skill'); PAS = L('被动', 'Passive')

# (card id, number, (zh name, en name), chips, lines)
SECTIONS = [
 ('core', L('被动、普攻、冲刺', 'Passive, attack and dash'), L('', ''), [
  ('P', 'K5', L('夜猎', 'Night Hunt'), [L('职业被动', 'Class passive')], [
     L('从背后打，或打致盲、眩晕的敌人：伤害 +20%。流血的敌人、连击 15 以上也给这 20%（只算一次）。', 'A hit from behind, or on a blinded or stunned foe, deals 20% more. A bleeding foe, or a Combo of 15 or more, gives the same 20% (once).'),
     L('击杀：冲刺就绪，所有冷却 -1 秒。', 'A kill: the dash is ready and every cooldown loses 1 s.')]),
  ('B', 'K6', L('普攻', 'Basic attack'), [L('常驻', 'Always on')], [
     L('爪 4、爪 4、咬 6，然后三次闪到最近敌人的背后：5、5、8（模型页已通过）。右上角是连击数。', 'Claw 4, claw 4, bite 6, then three blinks to the back of the nearest foe: 5, 5, 8 (as passed on his model page). The Combo count is top right.')]),
  ('D', 'K7', L('冲刺', 'Dash'), [L('常驻', 'Always on')], [
     L('一闪，散成小蝙蝠再聚拢。最高优先，打断任何招式，无敌。', 'A blink: he splits into small bats and gathers. Top priority, cancels any move, untouchable.')]),
 ]),
 ('claw', L('爪 · 连斩', 'Claw'), L('翼爪近身，快而多段。', 'Wing claws up close: fast, many hits.'), [
  ('F1', 'F1', L('鹰掠', 'Hawk Drag'), [CD('7 s')], [L('低掠最远 4 u，脚爪抓住第一个敌人拖行 3 u，地上划出红沟：路上的敌人 8。一振翅甩出：16，击退 2 u；撞墙再 10，眩晕 0.5 秒。首领：沿它身上抓过，24。', 'He skims low up to 4 u, seizes the first foe in his foot talons and drags it 3 u, carving a red groove: 8 to foes on the path. One wing-beat flings it: 16, knocked 2 u; into a wall, 10 more and stun 0.5 s. A boss: he rakes along it as he passes, 24.')]),
  ('F2', 'F2', L('翻袍', 'Cloak Turn'), [CD('6 s')], [L('双翼像披风一样旋 0.6 秒：碰到披风的敌人射击全接住（不受伤），化成爪片甩回射手：射击伤害 + 8；1.2 u 内敌人 10。接住了就沿第一发的线冲到射手（最远 6 u）抓它：12。什么都没接住：冷却回一半。', 'He whirls his wings round him like a cape for 0.6 s: every foe shot that touches it is caught (no damage to him) and flung back at its shooter as claw shards: the shot\'s damage + 8; 10 to foes within 1.2 u. If he caught one, he streaks down the line of the first to its shooter (up to 6 u) and claws it: 12. Nothing caught: half the cooldown comes back.')]),
  ('F3', 'F3', L('翼轮', 'Wing Wheel'), [CD('7 s')], [L('展翼如刃，旋转冲过，1.6 u：三圈各 6。', 'Wings out like blades, he spins through at full run, 1.6 u: three turns of 6.')]),
  ('F4', 'F4', L('升天爪', 'Skyward Rip'), [CD('8 s')], [L('上挑：1.2 u 内 8，挑飞 0.8 秒；带一个敌人飞起，空中四爪各 4，再砸下：1.5 u 内 10。', 'A rising claw: 8 within 1.2 u, launched 0.8 s; he flies up with one foe, four cuts of 4, then spikes it down: 10 within 1.5 u.')]),
  ('F5', 'F5', L('绝命牙', 'Last Bite'), [CD('8 s')], [L('扑咬 1.5 u：24；敌人低于 30% 血时双倍；击杀后立刻就绪。', 'A lunge bite, 1.5 u: 24; double under 30% health; a kill readies it again.')]),
  ('F6', 'F6', L('扑杀', 'Pounce'), [CD('7 s')], [L('扑向 4 u 内一个敌人，按住 0.8 秒撕咬：五下各 4。', 'He leaps on one foe within 4 u, pins it 0.8 s and mauls: five hits of 4.')]),
  ('F7', 'F7', L('翼刃', 'Crescent Wings'), [CD('5 s')], [L('双翼一合：两道交叉的月刃飞 5 u，穿过所有敌人：各 9。', 'He snaps both wings shut: two crossing crescents fly 5 u through every foe: 9 each.')]),
  ('F8', 'F8', L('夜翔', 'Night Flight'), [CD('14 s'), BIG], [L('飞起 2.5 秒，无敌，移速 +50%；三次俯冲指针最近的敌人：1.5 u 内各 14。', 'He takes wing 2.5 s, untouchable, 50% faster; three dives on the foe nearest the pointer: 14 within 1.5 u each.')]),
 ]),
 ('blood', L('血 · 饮血', 'Blood'), L('咬、流血、血魔法，打到的会回到他身上。', 'Bites, bleeds and blood magic; what he cuts comes back to him.'), [
  ('F9', 'F9', L('血噬', 'Bloodbite'), [CD('4 s')], [L('深咬：80°、0.95 u 内最多 2 个敌人各 20；一半回血。', 'A deep bite: 20 to up to 2 foes, 80°, 0.95 u; half comes back.')]),
  ('F10', 'F10', L('放血', 'Open Vein'), [CD('5 s')], [L('一爪：10；流血 4 秒，每半秒 3，敌人走动时翻倍。', 'One claw: 10; it bleeds 3 each half second for 4 s, double while it moves.')]),
  ('F11', 'F11', L('血矢', 'Blood Lance'), [CD('4 s')], [L('血枪 6 u，穿过所有敌人：14；第一个敌人牵出一条血线，回血 4。', 'A lance of blood, 6 u, through every foe: 14; a thread from the first foe heals him 4.')]),
  ('F12', 'F12', L('蝠群', 'Bat Swarm'), [CD('10 s')], [L('4.5 u 内一处，1.3 u 宽，4 秒：每秒 5，减速 20%；四分之一回血。', 'A cloud of small bats on a spot within 4.5 u, 1.3 u wide, 4 s: 5 a second, slow 20%; a quarter comes back.')]),
  ('F13', 'F13', L('血棘', 'Blood Spikes'), [CD('7 s')], [L('一爪插地：血棘冲出 5 u，1 u 宽：16，挑飞 0.4 秒。', 'A claw into the floor: blood spikes run 5 u, 1 u wide: 16, launched 0.4 s.')]),
  ('F14', 'F14', L('血雾', 'Blood Mist'), [CD('12 s')], [L('化作 2 u 红雾 1.5 秒：无敌，以 70% 速度飘动；雾中敌人每半秒 4，减速 30%。', 'He bursts into red mist, 2 u, 1.5 s: untouchable, drifting at 70% speed; foes inside take 4 each half second, slowed 30%.')]),
  ('F15', 'F15', L('血沸', 'Boiling Blood'), [CD('12 s')], [L('5 秒：普攻快 40%；每一下溅射 1 u 内的敌人：3。', '5 s: basic attacks 40% faster; each basic hit splashes 3 to the foes within 1 u.')]),
  ('F16', 'F16', L('血月', 'Blood Moon'), [CD('18 s'), BIG], [L('头顶升起红月：2.4 u 内最多 10 个敌人各 30，致盲 1.5 秒；35% 回血。', 'A red moon over him: 30 to up to 10 foes within 2.4 u, blinded 1.5 s; 35% comes back.')]),
 ]),
 ('night', L('夜 · 影袭', 'Night'), L('闪现、隐身、背刺、致盲。', 'Blinks, Unseen, backstabs and blinding dark.'), [
  ('F17', 'F17', L('暮袭', 'Dusk Dive'), [CD('6 s')], [L('俯冲最远 3.6 u，无敌：落点 1.2 u 内最多 5 个敌人各 16。', 'A dive up to 3.6 u, untouchable: 16 to up to 5 foes within 1.2 u of where he lands.')]),
  ('F18', 'F18', L('瞬袭', 'Blink Strike'), [CD('5 s')], [L('闪到 5 u 内一个敌人背后，翼爪一刺：22，必定背刺。', 'He blinks behind one foe within 5 u and stabs with a wing claw: 22, always a backstab.')]),
  ('F19', 'F19', L('掠影', 'Flit'), [CD('7 s')], [L('后空翻掠开 2.8 u，无敌；原地留下夜雾 2 秒：每秒 4，致盲 1 秒。', 'A back flip 2.8 u away, untouchable; a puff of night stays 2 s: 4 a second, blind 1 s.')]),
  ('F20', 'F20', L('夜幕', 'Nightfall'), [CD('11 s')], [L('周身黑暗：2 u 内最多 8 个敌人各 6，致盲 2 秒。', 'Darkness round him: 6 to up to 8 foes within 2 u, blinded 2 s.')]),
  ('F21', 'F21', L('回声', 'Echo Screech'), [CD('9 s')], [L('70° 锥形尖啸，2.6 u：最多 6 个敌人各 10；之后 3 秒受伤 +25%。', 'A screech down a 70° cone, 2.6 u: 10 to up to 6 foes; each takes 25% more for 3 s.')]),
  ('F22', 'F22', L('影幕', 'Shadow Veil'), [CD('12 s')], [L('黑暗裹身：护盾 18，3 秒；1.2 u 内最多 4 个敌人各 8。', 'The dark folds round him: a shield of 18 for 3 s; 8 to up to 4 foes within 1.2 u.')]),
  ('F23', 'F23', L('归巢', 'Roost'), [CD('10 s')], [L('原地留下一个影子 6 秒。再按：化作蝙蝠回到影子，无敌；离开处 1.5 u 内敌人各 10。', 'He hangs a shade of himself where he stands, 6 s. Press again: he bursts into bats and gathers there, untouchable; 10 to the foes within 1.5 u of where he left.')]),
  ('F24', 'F24', L('死兆', 'Death Mark'), [CD('14 s'), BIG], [L('沉入 4 u 内一个敌人的影子，从它背后升起：12。3 秒内印记存下他对它伤害的 35%，然后撕开，无视防御。', "He sinks into one foe's shadow within 4 u and rises behind it: 12. For 3 s the mark keeps 35% of his damage to it, then tears open for that much, through all defence.")]),
 ]),
 ('passives', L('被动技能', 'Passive skills'), L('占一个技能格，不用按键。', 'Each takes a skill slot; no button.'), [
  ('F25', 'F25', L('夜翼', 'Night Wings'), [PAS], [L('每秒对 1.3 u 内最近的 3 个敌人各 3。', 'Every second, 3 to the 3 nearest foes within 1.3 u.')]),
  ('F26', 'F26', L('血嗅', 'Blood Scent'), [PAS], [L('低于 40% 血的敌人冒出红色烟缕；6 u 内有它时跑速 +20%，打它伤害 +20%。', 'A foe under 40% health carries a red wisp; he runs 20% faster while one is within 6 u, and his hits on it deal 20% more.')]),
 ]),
 ('compare', L('连击满对比', 'Full Combo compare'), L('', ''), [('CMP', 'F1', L('鹰掠 · 连斩：无连击 对 连击满', 'Hawk Drag · Rampage: no Combo vs full Combo'), [L('连斩风格', 'Rampage style')], [L('连击满 30（血涌）：每个动作用一半时间，伤害不变；冷却快 60%，闪避 30%。示例用鹰掠连斩：两次低掠、两次拖行、两次甩出，全是动作。左边 3.14 秒，右边 1.57 秒。', 'At full Combo, 30 (Bloodrush): every move in half the time for full damage; cooldowns 60% faster, 30% dodge. The sample is Hawk Drag in Rampage: two skims, two drags, two flings, all movement. Left 3.14 s, right 1.57 s.')])]),
 ('combos', L('组合技', 'Combos'), L('两个技能碰到一起时多出来的效果。十二个都选了。', 'What more happens when two of his moves meet. All twelve are taken.'), [
  ('C1', 'C1', L('血爆', 'Pop the vein'), [L('放血 + 绝命牙', 'Open Vein + Last Bite')], [L('绝命牙或血棘打流血的敌人：剩下的流血一次爆出（不暴击，不算一击）。', 'Last Bite or Blood Spikes on a bleeding foe brings the rest of its bleed out at once (no crit, not a hit).')]),
  ('C2', 'C2', L('空噬', 'Air bite'), [L('血棘 + 血噬', 'Blood Spikes + Bloodbite')], [L('血噬或绝命牙咬空中的敌人：把它砸下，伤害 +50%，1.5 u 内敌人各 10。', 'Bloodbite or Last Bite on a foe in the air slams it down: 50% more, and 10 to the foes within 1.5 u.')]),
  ('C3', 'C3', L('蝠追死兆', 'The swarm hunts the mark'), [L('蝠群 + 死兆', 'Bat Swarm + Death Mark')], [L('敌人带着死兆时，蝠群和夜翼只咬它，快一倍。', 'While a foe carries Death Mark, Bat Swarm and Night Wings bite only that foe, twice as often.')]),
  ('C4', 'C4', L('暗中回声', 'Screech in the dark'), [L('夜幕 + 回声', 'Nightfall + Echo Screech')], [L('在夜幕的黑暗或掠影的夜雾里放回声：一圈全打到，打中的敌人致盲重新计时。', "Echo Screech cast from inside Nightfall's dark or Flit's puff rings all round him, and the blind on the foes it hits starts again.")]),
  ('C5', 'C5', L('影随', 'The shade strikes too'), [L('归巢 + 血矢', 'Roost + Blood Lance')], [L('归巢的影子挂着时，在原地跟着放翼刃、血矢和回声，一半伤害。', 'While his Roost shade hangs, it repeats Crescent Wings, Blood Lance and Echo Screech from where it is, for half.')]),
  ('C6', 'C6', L('化蝠施放', 'Dash cast'), [L('冲刺 + 鹰掠', 'Dash + Hawk Drag')], [L('冲刺中按鹰掠、翼轮、血噬或翼刃：聚拢时立刻打出，大 30%（鹰掠掠得远 30%）。', 'Hawk Drag, Wing Wheel, Bloodbite or Crescent Wings pressed during the dash comes out as he gathers, at once, 30% wider (Hawk Drag skims 30% farther).')]),
  ('C7', 'C7', L('穿雾', 'Through the cloud'), [L('蝠群 + 血矢', 'Bat Swarm + Blood Lance')], [L('血矢或他的月刃穿过自己的蝠群或血雾：分成三支，各射一个附近的敌人，一半伤害。', 'A Blood Lance or a crescent of his through his Bat Swarm or Blood Mist comes out as three, each at a foe near it, for half.')]),
  ('C8', 'C8', L('血月饱饮', 'Feed the moon'), [L('流血 + 血月', 'Bleeds + Blood Moon')], [L('血月下所有流血快一倍，回到他身上的翻倍。', 'Under his Blood Moon every bleed runs twice as fast, and what comes back to him is doubled.')]),
  ('C9', 'C9', L('推血', 'Push the bleeder'), [L('放血 + 鹰掠', 'Open Vein + Hawk Drag')], [L('流血的敌人被击退、挑飞或带走时，那一秒流血翻倍。', 'A bleeding foe that is knocked back, launched or carried bleeds double for that second.')]),
  ('C10', 'C10', L('血沸蝠群', 'Boil the swarm'), [L('蝠群 + 血沸', 'Bat Swarm + Boiling Blood')], [L('蝠群在外时放血沸：蝠群飞回他身边，剩下的时间跟着他。', 'Boiling Blood cast while his Bat Swarm is out calls the swarm to him for the rest of its time.')]),
  ('C11', 'C11', L('夜杀', 'Kill in the dark'), [L('致盲 + 击杀', 'Blind + a kill')], [L('致盲中倒下的敌人炸成黑暗：1.4 u 内敌人致盲 1 秒。', 'A foe that falls while blinded bursts into darkness: the foes within 1.4 u are blinded 1 s.')]),
  ('C12', 'C12', L('天降', 'Out of the sky'), [L('夜翔 + 扑杀', 'Night Flight + Pounce')], [L('夜翔中按扑杀或绝命牙：立刻结束飞行扑向那个敌人，伤害 +50%；没用的俯冲作废。', 'Pounce or Last Bite pressed during Night Flight ends the flight on that foe at once: 50% more; the dives not yet made are lost.')]),
 ]),
]

# style forms: per card, one short line for each style built so far
FN = {'base': L('基础', 'Base'), 'ra': L('连斩', 'Rampage'), 'sa': L('饮血', 'Sanguine'), 'ph': L('影袭', 'Phantom'), 'ra2': L('连斩', 'Rampage'), 'sa2': L('饮血', 'Sanguine'), 'ph2': L('影袭', 'Phantom'), 'co2': L('组合', 'Combo')}
FT = {'ra': {
  'P': L('击杀：连击 +5。', 'A kill: 5 Combo.'),
  'B': L('按住攻击：闪击一直继续，每次换个敌人或方向：各 5。', 'Hold attack: the blinks go on, a different foe or side each time: 5 each.'),
  'D': L('小蝙蝠抓过路的敌人：各 5，算连击。', 'The bats claw each foe they pass: 5, and each counts for the Combo.'),
  'F1': L('甩完再掠向 3 u 内下一个敌人：第二次拖行，10；路上的 8。', 'After the fling he skims at the next foe within 3 u: a second drag, 10, and 8 on its path.'),
  'F2': L('翻袍持续 1.2 秒；每接住一发，连击 +3。', 'The whirl lasts 1.2 s, and each shot caught adds 3 Combo.'),
  'F3': L('每圈打中加一圈，最多六圈。', 'Each turn that hits adds a turn, up to six.'),
  'F4': L('空中八爪各 3；敌人弹起，再撕一次。', 'Eight air cuts of 3; the foe bounces and he rips it up once more.'),
  'F5': L('击杀后，下一扑够到 4 u。', 'After a kill the next lunge reaches 4 u.'),
  'F6': L('骑兽：骑在被按住的敌人背上 2 秒，用指针全速操控，撕 6 下各 3；撞到的敌人各 6，连击 +1；最后跳下砸地：1.2 u 内 8。冠军和首领不骑：原地撕 6 下各 3（+20%）。', 'Ride: he rides the pinned foe 2 s, steered with the pointer at full run, mauling six hits of 3; each foe it crashes into takes 6 and adds 1 Combo; he leaps off and slams: 8 within 1.2 u. A champion or boss is not ridden: six hits of 3 where it stands (20% more).'),
  'F7': L('再合一次翼：四道月刃成扇形。', 'A second snap: four crescents in a fan.'),
  'F8': L('五次俯冲，各 10。', 'Five dives of 10.'),
  'F9': L('三下快咬，各 8；同一敌人一下比一下重 20%。', 'Three quick bites of 8, each on the same foe 20% harder than the last.'),
  'F10': L('他每打它一下，流血 +0.5 秒，最多 8 秒。', 'Each hit of his on it adds 0.5 s of bleed, up to 8 s.'),
  'F11': L('三支细血枪接连射出，各 6。', 'Three thin lances one after another: 6 each.'),
  'F12': L('蝠群跟着他 5 秒：他每打中一下，一只蝙蝠咬那个敌人：2。', 'The swarm flies with him 5 s: after each of his hits a bat bites that foe: 2.'),
  'F13': L('三排短血棘成扇形，3 u，接连冲出：各 8。', 'Three short rows in a fan, 3 u, one after another: 8 each.'),
  'F14': L('雾中连击不掉；聚拢时旋爪：1.6 u 内 10。', 'The Combo cannot fall in the mist; he gathers in a claw spin: 10 within 1.6 u.'),
  'F15': L('每次击杀 +1 秒，最多 10 秒。', 'Each kill adds 1 s, up to 10 s.'),
  'F16': L('红月挂 4 秒：月下每一下算两次连击，连击不掉。', 'The moon hangs 4 s: under it each hit counts twice for the Combo, and the Combo cannot fall.'),
  'F17': L('打中后 1.5 秒内可再按：最多三次俯冲，之后各 12。', 'A dive that hits can be pressed again within 1.5 s: up to three dives, 12 after the first.'),
  'F18': L('闪三次：三个敌人，或一个敌人的三面：各 9。', 'Three blinks: three foes, or three sides of one: 9 each.'),
  'F19': L('离开时甩出两道月刃：各 8。', 'He throws two crescents as he leaves: 8 each.'),
  'F20': L('黑暗中给每个致盲的敌人一爪：6。', 'In the dark he cuts each blinded foe once: 6.'),
  'F21': L('回声弹回来：从背后再打一次，一半伤害。', 'The echo comes back: it hits them again from behind for half.'),
  'F22': L('没有护盾：3 秒内三次攻击打空，每次回一爪：8。', 'No shield: the next three hits on him within 3 s miss, and each miss is answered with a claw: 8.'),
  'F23': L('影子挂着时，跟着出爪打 1.5 u 内的敌人，三分之一伤害。', 'While it hangs, the shade copies his basic claws at the foes within 1.5 u of it, for a third.'),
  'F24': L('他每打它一下，印记 +0.2 秒，最多 5 秒。', 'Each hit on it adds 0.2 s to the mark, up to 5 s.'),
 }, 'sa': {
  'P': L('击杀：他把它喝掉，回血 6。右下角是生命；满血以上变成血盾，最多 24。', 'A kill: he drinks it, 6 health. Health is bottom right; above full it turns into a blood shield, up to 24.'),
  'B': L('咬住不放，吸血：10，一半回血。', 'The bite holds on and drinks: 10, and half comes back.'),
  'D': L('小蝙蝠咬过路的敌人：各 4，全部回血。', 'The bats bite each foe they pass: 4, and all of it comes back.'),
  'F1': L('拖着时咬它：12，一半回血；红沟留 2 秒成血路：每半秒 3，全部回血。', 'He bites while he drags: 12, half comes back; the groove stays 2 s as a blood trail: 3 each half second, all of it comes back.'),
  'F2': L('每接住一发，回血 4。', 'Each shot caught heals him 4.'),
  'F3': L('翼尖甩出一圈血，2.6 u：4，流血 3 秒 6。', 'The wing tips throw a ring of blood out to 2.6 u: 4, bleeding 6 over 3 s.'),
  'F4': L('空中咬住不放：1 秒 18，一半回血；然后松口让它掉下去。', 'In the air he bites and holds on: 18 over 1 s, half comes back; then he lets it drop.'),
  'F5': L('用它击杀：回血 12。', 'A kill with it heals 12.'),
  'F6': L('一口长咬：20，一半回血。', 'One long bite: 20, and half comes back.'),
  'F7': L('一道血月刃：14；它穿过敌人飞回来，再打一半，每个敌人回血 1，最多 6。', 'One blood crescent: 14; it flies back to him through the foes for half and brings 1 health for each foe, up to 6.'),
  'F8': L('每次俯冲抓起一个敌人，咬了再扔：14，回血 5；落地 1.2 u 内 6。', 'Each dive he carries a foe up, bites it and drops it: 14, heals 5; 6 within 1.2 u where it falls.'),
  'F9': L('全部回血；敌人流血 3 秒 8。', 'All of it comes back; the foe bleeds 8 over 3 s.'),
  'F10': L('流血一半回血；敌人倒下时，流血跳到最近的敌人。', 'Half the bleed comes back; when the foe falls the bleed jumps to the nearest foe.'),
  'F11': L('每个敌人一条血线：各 2，最多 10；尽头一滩血，1.2 u，3 秒：每半秒 4。', 'A thread from every foe: 2 each, up to 10; it ends in a pool, 1.2 u, 3 s: 4 each half second.'),
  'F12': L('1.8 u 宽，一半回血；最后蝙蝠飞回来：回血 6。', '1.8 u wide, half comes back; at the end the bats fly home: 6 health.'),
  'F13': L('血棘立 3 秒：碰到的敌人 4，流血；然后融化流回来：每个打中的敌人回血 1。', 'The spikes stand 3 s: a foe that touches them takes 4 and bleeds; then they melt and flow back: 1 health for each foe hit.'),
  'F14': L('2.5 秒，伤害全部回血。', '2.5 s, and all it deals comes back.'),
  'F15': L('每一下普攻回血 2。', 'Each basic hit heals him 2.'),
  'F16': L('全部回血；红月挂 4 秒，每秒从月下每个敌人吸 3。', 'All of it comes back; the moon hangs 4 s and drinks 3 a second from each foe under it.'),
  'F17': L('落地留下一滩血，1.5 u，3 秒：每半秒 4，全部回血。', 'The landing leaves a pool of blood, 1.5 u, 3 s: 4 each half second, all of it comes back.'),
  'F18': L('拔出爪子：1.5 u 内各 6，回血 6。', 'He tears the claw out: 6 to the foes within 1.5 u, heals 6.'),
  'F19': L('夜雾换成血蝙蝠：每秒 4，全部回血。', 'The puff is blood bats: 4 a second, all of it comes back.'),
  'F20': L('致盲的敌人流血：2 秒 8，一半回血。', 'Blinded foes bleed 8 over 2 s; half comes back.'),
  'F21': L('这 3 秒内，他打它们每一下回血 2。', 'For those 3 s each of his hits on them heals him 2.'),
  'F22': L('护盾结束时，剩下的护盾变成回血。', 'When the shield ends, what is left of it heals him.'),
  'F23': L('回到影子时，拿回这段时间失去的一半血。', 'On the return he gets back half the health he lost since.'),
  'F24': L('撕开的伤害一半回血。', 'Half the tear comes back.'),
 }, 'ph': {
  'P': L('背刺必暴击，无视一半防御。2.5 秒不攻击不施法就隐身；击杀后隐身 1.5 秒。', 'A backstab is a sure crit and ignores half the defence. After 2.5 s with no attack or cast he is Unseen; a kill leaves him Unseen 1.5 s.'),
  'B': L('一闪代替三闪：他不见了，然后背后一记重爪：18。', 'One blink in place of three: he is gone, then one great claw in its back: 18.'),
  'D': L('聚拢后隐身 1 秒；冲向 3 u 内的敌人会聚拢在它背后。', 'He gathers Unseen for 1 s; a dash at a foe within 3 u gathers behind it.'),
  'F1': L('反着拖：把它拖出敌群，拖向最近的队友（没有就往回拖）；甩出是背刺：20，致盲 1 秒。', 'He drags it the other way: out of its pack toward the nearest ally (or straight back); the fling is a backstab: 20, blind 1 s.'),
  'F2': L('隐身 1 秒落到射手背后：那一爪是背刺，18。', 'He arrives Unseen 1 s behind the shooter: the claw is a backstab, 18.'),
  'F3': L('化作一圈蝙蝠飞出 2.6 u 再飞回：8 和 8；聚拢在指针最近的敌人背后。', 'He bursts into a ring of bats out 2.6 u and back: 8 and 8; he gathers behind the foe nearest the pointer.'),
  'F4': L('不挑飞：他向上消失，落在它背后：30，眩晕 0.5 秒。', 'No launch: he is gone upward and falls on its back: 30, stun 0.5 s.'),
  'F5': L('闪到 5 u 内最弱的敌人背后咬颈；击杀后隐身 1.5 秒。', 'He blinks to the weakest foe within 5 u and bites its neck from behind; a kill leaves him Unseen 1.5 s.'),
  'F6': L('从黑暗里落到它背上：眩晕 1 秒，每一下都是背刺。', 'He drops on its back out of the dark: stun 1 s, every hit a backstab.'),
  'F7': L('闪到月刃尽头，回砍最后一个敌人的背：14。', 'He blinks to where the crescents end and cuts back at the last foe hit: 14.'),
  'F8': L('他飞时房间变黑；最后从黑暗里一次俯冲：1.5 u 内 40。', 'The room goes dark while he flies; one dive out of the dark at the end: 40 within 1.5 u.'),
  'F9': L('闪到 3 u 内指针最近的敌人背后，咬颈：26。', 'He blinks behind the foe nearest the pointer within 3 u and bites its neck: 26.'),
  'F10': L('从背后：14；1.5 秒后整段流血一次爆开：24。', 'From behind: 14; after 1.5 s the whole bleed bursts at once: 24.'),
  'F11': L('钉住第一个敌人 0.5 秒，他顺着血线闪到它背后：10 + 14。', 'It pins the first foe 0.5 s and he blinks along the thread to its back: 10 + 14.'),
  'F12': L('蝠群围着他 4 秒：他在里面隐身，蝠群咬 1.3 u 内的敌人。', 'The swarm is round him 4 s: he is Unseen inside it and it bites the foes within 1.3 u.'),
  'F13': L('一圈血棘围住 5 u 内一个敌人：16，困 1.2 秒；打它每一下都是背刺。', 'A ring of spikes closes on one foe within 5 u: 16, held 1.2 s; every hit on it is a backstab.'),
  'F14': L('黑雾：里面的敌人致盲；他隐身聚拢在指针最近的敌人背后。', 'Black mist: foes inside are blinded; he gathers Unseen behind the foe nearest the pointer.'),
  'F15': L('不加速：每一下普攻都闪到那个敌人背后。', 'No speed: each basic hit blinks him behind its foe.'),
  'F16': L('日食：4 u 内 20，致盲 2 秒；他隐身 3 秒。', 'An eclipse: 20 within 4 u, blinded 2 s; he is Unseen 3 s.'),
  'F17': L('不俯冲：直接在 4.5 u 内指针最近的敌人背后：它 22，其他 8。', 'No dive: he is behind the foe nearest the pointer within 4.5 u: 22 to it, 8 to the others.'),
  'F18': L('两次充能；用它击杀还一次。', 'Two charges; a kill with it gives one back.'),
  'F19': L('跳开 4.5 u，隐身 2 秒。', '4.5 u away, and he is Unseen 2 s.'),
  'F20': L('3 u 宽，3 秒；他站在里面就隐身。', '3 u wide, 3 s; he is Unseen while he stands in it.'),
  'F21': L('一圈 5 u，没有伤害：每个敌人露背 4 秒，他从哪边打都算背刺。', 'A ring, 5 u, no damage: every foe shows its back 4 s; his hits on it are backstabs from any side.'),
  'F22': L('没有护盾：隐身 3 秒；出隐身第一下 +40%。', 'No shield: Unseen 3 s; his first hit out of it deals 40% more.'),
  'F23': L('影子挂 10 秒；回去后隐身 2 秒。', 'It hangs 10 s; he returns Unseen 2 s.'),
  'F24': L('印记存 50%；撕开时它倒下，死兆立刻就绪。', 'The mark keeps 50%; if the tear fells the foe, Death Mark is ready again.'),
 }}

# new options, not passed (R1a to R12b, from the design thread's DUSKWING_NEW_OPTIONS.md, 18 Nov); the passed forms above stay as they are
RID = {}
# Kesh 19 Nov ("those look good, use those"): every new option replaces its style's line; a combo's added beat joins its text
COADD = {}
def NW(f, cid, rid, zh, en):
    RID[(f, cid)] = rid
    if f == 'co2': COADD[cid] = L(zh, en)
    else: FT[f[:-1]][cid] = L(zh, en)
NW('ph2', 'F9', 'R1a', '闪到 4 u 内流血最多的敌人背后（没有就找指针最近的），咬伤口：26；再把 2 秒的流血一次拿出。', 'He blinks behind the foe with the most bleed within 4 u (else the one nearest the pointer) and bites the wound: 26, and 2 s of its bleed come out at once.')
NW('ph2', 'F14', 'R1b', '黑雾：里面的敌人致盲；他聚拢在 3 秒内最后打他的敌人背后（没有就找指针最近的）：反击一爪 16，背刺，然后隐身 1 秒。', 'Black mist: foes inside are blinded; he gathers behind the foe that last hit him in the last 3 s (else nearest the pointer): a revenge claw, 16, a backstab, then Unseen 1 s.')
NW('ph2', 'F17', 'R1c', '和 4.5 u 内一个敌人换位：它背对着他站在他原来的地方，他打它的背：22；落点 1.2 u 内敌人 8。首领不换位：他出现在它背后，+20%。', 'He swaps places with a foe within 4.5 u: it stands where he stood, its back to him, and he strikes it: 22; 8 to the foes within 1.2 u of where he lands. A boss is not swapped: he appears behind it, 20% more.')
NW('ph2', 'F16', 'R2a', '日食：4 u 内 20，致盲 2 秒；他隐身 3 秒。隐身结束时，他第一下打中的敌人头上落下黑月：2 u 内 24，致盲 1 秒。', 'An eclipse: 20 within 4 u, blinded 2 s; he is Unseen 3 s. When it ends, the black moon falls on the foe his first hit lands on: 24 within 2 u, blind 1 s.')
NW('ph2', 'F19', 'R2b', '掠到 6 u 内最近的队友身边（没有就离开瞄准 4.5 u），隐身 2 秒；那个队友 2 秒内下一击算背刺：+20%，不必暴击。', "He flits to the nearest ally within 6 u (else 4.5 u away from the aim), Unseen 2 s; that ally's next hit within 2 s is a backstab: 20% more, no sure crit.")
NW('ph2', 'F22', 'R2c', '收翼 3 秒：打向他的一击穿过去（不伤，一次），标记扔的敌人；出翼第一下闪到它背后：+40%，背刺。', 'He folds into his wings 3 s: a hit thrown at him passes through (no damage, once) and marks the thrower; his first hit out blinks him behind it: 40% more, a backstab.')
NW('ph2', 'F23', 'R2d', '影子挂 10 秒；回影子时化作蝙蝠飞过中间的敌人，抓每个的背：各 12，背刺；聚拢后隐身 2 秒。', 'It hangs 10 s; the return flies through the foes between him and the shade as bats, raking each back: 12, a backstab; he gathers Unseen 2 s.')
NW('ph2', 'F13', 'R3a', '血棘圈困住一个敌人：16，困 1.2 秒；3 秒内任何英雄打它的第一下 +40%（他的算背刺）。', 'The spike ring holds one foe: 16, held 1.2 s; the first hit any hero lands on it within 3 s deals 40% more (his is a backstab).')
NW('ph2', 'F21', 'R3b', '尖啸找到 6 u 内最弱的敌人：只标记它 5 秒，没有伤害；他打它从哪边都算背刺，+30%。', 'The screech finds the weakest foe within 6 u: only it is marked, 5 s, no damage; his hits on it are backstabs from any side and deal 30% more.')
NW('ph2', 'F6', 'R4a', '沉进自己的影子，从敌人脚下的地里升起：10；用翅膀裹住它，困 1 秒，五下各 4，每一下都是背刺。', 'He sinks into his own shadow and rises out of the floor under the foe: 10; he wraps it in his wings, held 1 s, five hits of 4, every hit a backstab.')
NW('ra2', 'F11', 'R5a', '三支血枪，一支比一支强：6、8、10。', 'Three lances, each stronger than the last: 6, 8, 10.')
NW('ra2', 'F18', 'R5b', '一闪，每 10 连击多一闪，最多四闪，每次尽量换一个敌人：各 9。', 'One blink, plus one for every 10 Combo, up to four; a new foe each time while there is one: 9 each.')
NW('ra2', 'F16', 'R6a', '红月挂 4 秒：月下每一下算两次连击，连击不掉；月落时砸下：每 1 连击 1 伤害，最多 40，打 2.4 u 内所有敌人；连击留着。', 'The moon hangs 4 s: each hit under it counts twice for the Combo, and the Combo cannot fall; when it sets it crashes: 1 for each Combo point, up to 40, to every foe within 2.4 u; he keeps the Combo.')
NW('ra2', 'F12', 'R7a', '蝠群留在原地，随连击变大：每 5 连击 +0.2 u（30 时 2.5 u），每 10 连击每秒 +1（30 时 8）。', 'The swarm stays on its spot and grows with his Combo: 0.2 u more per 5 Combo (2.5 u at 30), 1 more a second per 10 Combo (8 at 30).')
NW('ra2', 'F23', 'R8a', '影子只复制收尾一击（普攻第 6 下和每个技能最后一下），打它 2 u 内的敌人：一半伤害，两倍范围。', "The shade copies only his finishers (basic hit 6 and each skill's last hit) at the foes within 2 u of it: half damage, twice the area.")
NW('sa2', 'F12', 'R9a', '1.8 u 宽，一半回血；最后蝙蝠落下成一滩血，1.5 u，3 秒；他站在里面每半秒回血 3，最多 18。', '1.8 u wide, half comes back; at the end the bats fall as a pool of blood, 1.5 u, 3 s; he heals 3 each half second while he stands in it, up to 18.')
NW('sa2', 'F8', 'R10a', '每次俯冲抓起一个敌人挂在空中；最后全部拉到一处，一次咬穿：各 14，各回血 5；一起摔下：1.5 u 内 10。精英在地上被咬。', 'Each dive plucks a foe up and hangs it in the air; at the end all are pulled over one spot and he bites through them in one pass: 14 each, heals 5 each; they fall together: 10 within 1.5 u. Champions are bitten on the floor.')
NW('sa2', 'F3', 'R12a', '翼尖甩出一圈血，2.6 u：4，流血 3 秒 6；流血结束时，跳一次到 2 u 内最近的没流血的敌人：又 3 秒 6。', 'The wing tips throw a ring of blood out to 2.6 u: 4, bleeding 6 over 3 s; when a bleed from the ring runs out it jumps once to the nearest foe within 2 u that is not bleeding: 6 over 3 s again.')
NW('sa2', 'F20', 'R12b', '不流血：每个致盲的敌人一条血线连到他，2 秒：每秒各 3，全部回血。', 'No bleed: a red thread from each blinded foe to him for 2 s: 3 a second each, all of it comes back.')
NW('co2', 'C1', 'R11a', '爆开时致盲 1.2 u 内敌人 1 秒。', 'The burst blinds the foes within 1.2 u for 1 s.')
NW('co2', 'C4', 'R11b', '尖啸把敌人拉近 1 u。', 'The ring pulls the foes 1 u toward him.')
NW('co2', 'C12', 'R11c', '落下像一次俯冲：那个敌人 1.5 u 内 10。', 'It lands as a dive: 10 within 1.5 u of the foe.')
NEWF = []  # no separate switches any more: the picks are the styles now
FORMS_ON = [f for f in ['ra', 'sa', 'ph'] if FT[f]]

def bi(p):
    zh, en = p
    return f'<span class="zh">{E(zh)}</span><span class="en">{E(en)}</span>'

# knees (19 Nov): cards whose clip now bends the knees, from the knee audit (tools/knees.json: card -> most bend, degrees)
import json as _json
KN = _json.load(open(os.path.join(HERE, 'knees.json')))
KNEE = L('膝 · 新', 'Knees · new')
def kneed(cid): return False and any(KN.get(k, 0) > 3 for k in [cid] + [f + ':' + cid for f in FORMS_ON])

def card(c):
    cid, num, name, chips, lines = c
    if cid == 'CMP':
        ch = ''.join(f'<span class="chip">{bi(x)}</span>' for x in chips); ps = ''.join(f'<p>{bi(x)}</p>' for x in lines)
        st = ''.join(f'<div class="stage"><canvas data-id="{k}" width="800" height="500" aria-label="{E(name[1])}"></canvas><button type="button" class="pp" aria-label="Pause">❚❚</button></div>' for k in ['CMP_LO', 'CMP_HI'])
        return (f'<article class="skill cmp" id="CMP" data-form="base"><div class="pair">{st}</div>'
                f'<div class="txt"><div class="head"><span class="num">{num}</span><h3>{bi(name)}</h3></div><div class="meta">{ch}</div>{ps}</div></article>')
    if cid in COADD: lines = list(lines) + [COADD[cid]]
    ch = ''.join(f'<span class="chip">{bi(x)}</span>' for x in chips)
    if kneed(cid):
        if KN.get(cid, 0) > 3: kl = KNEE
        else: fl = [f for f in FORMS_ON if KN.get(f + ':' + cid, 0) > 3]; kl = (KNEE[0] + '：' + '、'.join(FN[f][0] for f in fl), KNEE[1] + ': ' + ', '.join(FN[f][1] for f in fl))
        ch = f'<span class="chip kn">{bi(kl)}</span>' + ch
    ps = ''.join(f'<p>{bi(x)}</p>' for x in lines)
    fs = [f for f in FORMS_ON if cid in FT.get(f, {})]
    nf = [f for f in NEWF if cid in FT.get(f, {})]
    sw = ''
    if fs or nf:
        sw = '<div class="seg forms" role="group" aria-label="Style">' + ''.join(f'<button type="button" data-f="{f}" aria-pressed="{str(f == "base").lower()}">{bi(FN[f])}</button>' for f in ['base'] + fs) + '</div>'
        if nf:
            sw += ('<div class="newrow"><span class="newtag">' + bi(L('新，未通过', 'New, not passed')) + '</span><div class="seg forms newf" role="group" aria-label="New options">'
                   + ''.join(f'<button type="button" data-f="{f}" aria-pressed="false">{RID[(f, cid)]} · {bi(FN[f])}</button>' for f in nf) + '</div></div>')
        ps = f'<div class="fx" data-f="base">{ps}</div>' + ''.join(f'<div class="fx" data-f="{f}"><p class="fline">{bi(FT[f][cid])}</p></div>' for f in fs)
        ps += ''.join(f'<div class="fx" data-f="{f}"><p class="fline"><b class="newid">{RID[(f, cid)]}</b> {bi(FT[f][cid])}</p></div>' for f in nf)
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
ALLF = ''
if FORMS_ON:
    ALLF = ('<div class="seg allforms" role="group" aria-label="Style for every card"><button type="button" data-f="base" aria-pressed="true"><span class="zh">全部基础</span><span class="en">All base</span></button>'
      + ''.join(f'<button type="button" data-f="{f}" aria-pressed="false"><span class="zh">全部{FN[f][0]}</span><span class="en">All {FN[f][1]}</span></button>' for f in FORMS_ON) + '</div>')
ORDER = sorted(RID.items(), key=lambda kv: (int(''.join(c for c in kv[1] if c.isdigit())), kv[1]))
NEWBOX = ''  # the knees note went when Kesh passed them (19 Nov)
SUB = L('实时 3D，真实速度。基础形态（被动、普攻、冲刺和 26 个技能）、三种风格（连斩、饮血、影袭）和十二个组合技。点画面暂停。',
        'Live 3D at real speed. Base forms (the passive, basic attack, dash and the 26 skills), all three styles (Rampage, Sanguine, Phantom) and the twelve combos. Click a clip to pause.')
RULES = L('背刺：从背后打，伤害 +20%。隐身：敌人不会把他当目标，他的第一下结束隐身，从哪边打都算背刺。首领不会被挑飞或按住，那一下伤害 +20%。',
          'Backstab: a hit from behind deals 20% more. Unseen: foes do not pick him as a target; his first hit ends it and is a backstab from any side. A boss is never launched or pinned; that hit deals 20% more instead.')
page = ('<meta charset="utf-8">\n' if LOCAL else '') + f'''<title>Duskwing skills</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;600&display=swap">
<style>{CSS}</style>
<script type="importmap">{{"imports":{{"three":"{three}","three/addons/":"{addons}"}}}}</script>
<div class="wrap" data-lang="zh">
<header>
  <div class="tools">
    <div class="seg speed" role="group" aria-label="Speed"><button type="button" data-s="1" aria-pressed="true">1×</button><button type="button" data-s="0.5" aria-pressed="false">0.5×</button><button type="button" data-s="0.25" aria-pressed="false">0.25×</button></div>
    {ALLF}
    <div class="seg lang" role="group" aria-label="Language"><button type="button" data-l="zh" aria-pressed="true">中文</button><button type="button" data-l="en" aria-pressed="false">English</button></div>
  </div>
  <h1>{bi(L('Duskwing 技能', 'Duskwing skills'))}</h1>
  <p class="sub">{bi(SUB)}</p>
  <p class="rules">{bi(RULES)}</p>
  <nav>{nav}</nav>
  {NEWBOX}
</header>
{body}
</div>
<script type="module">
import * as W from './dw.js';
import {{ DEFS, FORMS }} from './defs.js';
import './ra.js';
import './sa.js';
import './ph.js';
import './co.js';
const wrap = document.querySelector('.wrap');
const store = {{ get(k) {{ try {{ return localStorage.getItem(k); }} catch (e) {{ return null; }} }}, set(k, v) {{ try {{ localStorage.setItem(k, v); }} catch (e) {{}} }} }};
function lang(l) {{ wrap.dataset.lang = l; document.documentElement.lang = l === 'zh' ? 'zh-Hans' : 'en'; W.setLang(l); store.set('dw-lang', l);
  document.querySelectorAll('.lang button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.l === l))); }}
function speed(s) {{ W.setSpeed(+s); store.set('dw-speed', s); document.querySelectorAll('.speed button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.s === s))); }}
document.querySelectorAll('.lang button').forEach((b) => b.addEventListener('click', () => lang(b.dataset.l)));
document.querySelectorAll('.speed button').forEach((b) => b.addEventListener('click', () => speed(b.dataset.s)));
lang(store.get('dw-lang') === 'en' ? 'en' : 'zh'); speed(['1', '0.5', '0.25'].includes(store.get('dw-speed')) ? store.get('dw-speed') : '1');
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
document.querySelectorAll('.newlinks a').forEach((a) => a.addEventListener('click', () => {{ const [id, f] = a.dataset.go.split(':'); const art = document.getElementById(id); if (art) setForm(art, f); }}));
{{ const cmp = document.getElementById('CMP'); if (cmp) {{ const [lo, hi] = [...cmp.querySelectorAll('canvas')].map((cv) => cv.closest('.stage')); const cl = lo.querySelector('canvas'), ch = hi.querySelector('canvas');
  const card = (cv) => W.cardOf(cv); const step = () => {{ const a = card(cl), b = card(ch); if (a && b && b.T) {{ if (a.visible) b.t = (a.t * 2) % b.T; if (b.paused !== a.paused) {{ b.paused = a.paused; hi.classList.toggle('paused', a.paused); hi.querySelector('.pp').textContent = a.paused ? '▶' : '❚❚'; }} }} requestAnimationFrame(step); }}; requestAnimationFrame(step);
  hi.addEventListener('click', (e) => {{ e.stopPropagation(); lo.click(); }}, true); }} }}
wrap.classList.add('loading');
W.start();
import('./duskwing-model.js').then((m) => {{ const s = atob(m.default), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return W.loadHim(u.buffer); }}).then(() => wrap.classList.remove('loading')).catch((e) => {{ wrap.classList.remove('loading'); wrap.classList.add('failed'); console.error(e); }});
</script>
'''
os.makedirs(SITE, exist_ok=True)
open(os.path.join(SITE, 'index.html'), 'w').write(page)
for f in ['dw.js', 'poses.js', 'defs.js', 'ra.js', 'sa.js', 'ph.js', 'co.js', 'knees.js']: shutil.copy(os.path.join(HERE, f), os.path.join(SITE, f))
mp = os.path.join(SITE, 'duskwing-model.js')
if not os.path.exists(mp) or os.path.getmtime(mp) < os.path.getmtime(os.path.join(HERE, 'duskwing.glb')):
    open(mp, 'w').write('// Duskwing, rigged with his passed clips (GLB, base64)\nexport default "' + base64.b64encode(open(os.path.join(HERE, 'duskwing.glb'), 'rb').read()).decode() + '";\n')
print('ok', len(page))
