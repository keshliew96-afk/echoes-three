# mkpage.py: Windbriar's ability review page (simple and clean: live clip, name, a line or two, key numbers).
# python3 mkpage.py [local]  -> ../site/index.html (local uses ./three for the import map, else jsDelivr three@0.170.0)
import html, os, sys, shutil
HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.join(HERE, '..', 'site')
LOCAL = len(sys.argv) > 1 and sys.argv[1] == 'local'
E = html.escape

def L(zh, en): return (zh, en)
CD = lambda s: L(f'冷却 {s}', f'Cooldown {s}')
BIG = L('大招', 'Big skill'); HOLD = L('按住蓄力', 'Hold to draw'); PAS = L('被动', 'Passive')

# (card id, number, (zh name, en name), chips, lines)
SECTIONS = [
 ('core', L('被动、普攻、冲刺', 'Passive, attack and dash'), L('', ''), [
  ('P', 'W5', L('顺风', 'Tailwind'), [L('职业被动', 'Class passive')], [
     L('每放一个技能得一层顺风（6 秒，最多 3 层）：每层跑速、攻速 +5%。', 'Each skill she casts gives one Tailwind for 6 s, up to three: 5% run speed and 5% attack speed each.'),
     L('满 3 层时，下一轮普攻的最后一箭变成风矢，三层用掉。右上角三片羽毛是层数。', 'At three, the last shot of her next basic combo is the Gale Arrow, and the three are spent. The three feathers top right are the count.')]),
  ('GA', 'W5', L('风矢', 'Gale Arrow'), [L('顺风 3 层', 'At three Tailwinds')], [
     L('一支巨大的风箭，7 u，穿过所有敌人：30。', 'One great wind arrow, 7 u through every foe: 30.')]),
  ('B', 'W6', L('普攻', 'Basic attack'), [L('常驻', 'Always on')], [
     L('射、射，然后平弓三箭：12、12、3 × 6，射程 4.5 u（模型页已通过）。', 'Shot, shot, then the flat bow with three arrows: 12, 12, 3 × 6, reach 4.5 u (as passed on her model page).')]),
  ('D', 'W7', L('冲刺', 'Dash'), [L('常驻', 'Always on')], [
     L('空翻 2.6 u，无敌，三支追踪箭各 5。最高优先，可打断前摇和后摇。', 'A somersault, 2.6 u, untouchable, three homing arrows of 5. Top priority: it cancels a wind-up or recovery.')]),
 ]),
 ('shot', L('狙 · 单体', 'Shot · one foe'), L('拉弓、瞄准、一箭定胜负。', 'Drawn shots, aimed shots, sniper play.'), [
  ('F1', 'F1', L('贯矢', 'Piercing Shot'), [CD('3 s')], [L('一箭贯穿 5.5 u 直线上的所有敌人：30。', 'One arrow through every foe on a 5.5 u line: 30.')]),
  ('F2', 'F2', L('满弦箭', 'Power Shot'), [CD('6 s'), HOLD], [L('按住拉弓，最多 0.8 秒；风箭 8 u：点射 24，满弦 48，之后每多一个敌人少 10%。', 'Hold to draw, up to 0.8 s; a wind arrow, 8 u: 24 on a tap, 48 at full draw, 10% less for each foe after the first.')]),
  ('F3', 'F3', L('猎印', "Hunter's Mark"), [CD('6 s')], [L('12；该敌人 3 秒内受伤 +30%。', '12; the foe takes 30% more for 3 s.')]),
  ('F4', 'F4', L('钉矢', 'Pinning Arrow'), [CD('7 s')], [L('20，眩晕 0.75 秒；把它钉到身后 2.5 u 内的敌人或墙上：两者眩晕 1 秒。', '20, stun 0.75 s; ties the foe to a foe or wall within 2.5 u behind it: both stunned 1 s.')]),
  ('F5', 'F5', L('连珠', 'Rapid Fire'), [CD('9 s')], [L('1.5 秒内向 6 u 内一个敌人连射十箭，可半速走动：每箭 5。', '1.5 s: ten arrows at one foe within 6 u, walking at half speed: 5 each.')]),
  ('F6', 'F6', L('绝矢', 'Kill Shot'), [CD('8 s')], [L('24；敌人血量低于 30% 时双倍；击杀后立即可再用。', '24; double under 30% health; a kill readies it again.')]),
  ('F7', 'F7', L('鹰踞', 'Eagle Stance'), [CD('12 s')], [L('半跪 4 秒：普攻伤害 +60%，射程 +3 u，多穿一个敌人；走动即结束。', 'She kneels 4 s: basic shots 60% more, 3 u farther, through one more foe; walking ends it.')]),
  ('F8', 'F8', L('贯日', 'Skypiercer'), [CD('14 s'), BIG, HOLD], [L('按住拉弓，最多 1 秒；巨大的螺旋风箭，10 u：点射三段各 8，满弦六段；小怪被带到箭的尽头。', 'Hold to draw, up to 1 s; a giant spiral wind arrow, 10 u: three hits of 8 on a tap, six at full draw; small foes are carried to its end.')]),
 ]),
 ('rain', L('雨 · 群体', 'Rain · many foes'), L('扇射、环射、箭雨，清杂怪。', 'Fans, rings and rains to clear packs.'), [
  ('F9', 'F9', L('散矢', 'Volley'), [CD('4.5 s')], [L('窄长扇形三箭，6 u，30°，三箭贴得很近：各 14。', 'A long narrow fan of three, 6 u, 30°, the arrows close together: 14 each.')]),
  ('F10', 'F10', L('箭雨', 'Rain of Arrows'), [CD('11 s')], [L('1.4 u 宽的箭雨，4 秒：每半秒 7，减速 25%。', 'A rain 1.4 u wide, 4 s: 7 each half second, slow 25%.')]),
  ('F11', 'F11', L('绽矢', 'Burst Arrow'), [CD('7 s')], [L('箭落地后爆开：1.5 u 内 18；飞出六片碎羽：各 6。', 'The arrow lands, then bursts: 18 within 1.5 u; six shards fly out: 6 each.')]),
  ('F12', 'F12', L('旋矢', 'Whirl Shot'), [CD('8 s')], [L('转一圈，射出十二支箭的环：3 u 内每个敌人 16。', 'One spin, a ring of twelve arrows: 16 to each foe within 3 u.')]),
  ('F13', 'F13', L('弹矢', 'Ricochet'), [CD('6 s')], [L('背身一箭，在敌人之间弹跳六次：各 10。', 'One arrow from behind her back hops foe to foe, six hits: 10 each.')]),
  ('F14', 'F14', L('旋风矢', 'Tornado Shot'), [CD('8 s')], [L('箭化作 2 u 的旋风，2.5 秒：把敌人吸进来，每 0.4 秒射一箭：6 × 6。', 'The arrow becomes a whirlwind, 2 u, 2.5 s: pulls foes in and shoots one every 0.4 s: 6 × 6.')]),
  ('F15', 'F15', L('棘阱', 'Briar Trap'), [CD('9 s')], [L('放下 0.75 u 的陷阱；踩中合上：眩晕 0.7 秒，3 秒内每半秒 8。', 'A trap, 0.75 u; it snaps: stun 0.7 s, 8 each half second for 3 s.')]),
  ('F16', 'F16', L('万箭', 'Arrowstorm'), [CD('14 s'), BIG], [L('一箭射向天空；5 u 宽的箭幕从她面前向外推进 8 u：三次各 14。', 'One arrow to the sky; a curtain of arrows 5 u wide sweeps 8 u away from her: three hits of 14.')]),
 ]),
 ('kata', L('斗 · 近身', 'Kata · close in'), L('弓斗术：踢、风、位移、近距离快射。', '弓斗术: kicks, wind, steps and quick short-range shots.'), [
  ('F17', 'F17', L('羽扇', 'Feather Fan'), [CD('5 s')], [L('近距离散射五箭，3.2 u：各 9。', 'Five arrows in a close spray, 3.2 u: 9 each.')]),
  ('F18', 'F18', L('跃射', 'Vault Shot'), [CD('6 s')], [L('后空翻 1.6 u，无敌，空中一箭：18，减速 30%。', 'A backflip, 1.6 u, untouchable; one arrow from the air: 18, slow 30%.')]),
  ('F19', 'F19', L('月弧踢', 'Crescent Kick'), [CD('5 s')], [L('后空翻踢：1.5 u 内 14，挑飞 0.6 秒；再射一个被挑飞的敌人：12。', 'A backflip kick: 14 within 1.5 u, launched 0.6 s; she shoots one launched foe: 12.')]),
  ('F20', 'F20', L('聚风', 'Windknot'), [CD('8 s')], [L('像棍一样舞弓：风把那一点 4 u 内的敌人拉到中心：8，减速 40%。', 'She whirls the bow like a staff: wind pulls every foe within 4 u of the spot to its centre: 8, slow 40%.')]),
  ('F21', 'F21', L('旋风腿', 'Cyclone Kick'), [CD('7 s')], [L('三记旋踢，1.8 u：各 6，最后一脚推开 1.5 u；每转射一箭：6。', 'Three spinning kicks, 1.8 u: 6 each, the last pushes 1.5 u; each spin looses an arrow: 6.')]),
  ('F22', 'F22', L('弓击', 'Bow Sweep'), [CD('4 s')], [L('弓击两下，1.5 u：8、8；弓弦近射一箭：14，击退 2 u。', 'Two strikes with the bow, 1.5 u: 8, 8; the string snaps an arrow point-blank: 14, 2 u back.')]),
  ('F23', 'F23', L('御风', 'Windrun'), [CD('12 s')], [L('3 秒：跑速 +40%，敌方子弹穿身而过，边跑边射。', "3 s: she runs 40% faster, foes' shots pass through her, she shoots at full run.")]),
  ('F24', 'F24', L('鹰坠', 'Eagle Dive'), [CD('10 s')], [L('高跳，无敌，向下射五箭：各 6；然后脚跟下砸：1.8 u 内 16，挑飞。', 'She leaps high, untouchable, and shoots five arrows down: 6 each; then dives heel first: 16 within 1.8 u, launch.')]),
 ]),
 ('passives', L('被动技能', 'Passive skills'), L('占一个技能格，不用按键。', 'Each takes a skill slot; no button.'), [
  ('F25', 'F25', L('隼望', 'Kestrel Watch'), [PAS], [L('一只风隼绕着她飞；每秒射 4 u 内最近的敌人：6。', 'A wind kestrel circles her; each second it shoots the nearest foe within 4 u: 6.')]),
  ('F26', 'F26', L('脱兔', 'Fleet Foot'), [PAS], [L('冲刺或任何空翻后，接下来三次普攻快 50%，伤害 +20%。', 'After her dash or any flip, her next three basic shots are 50% faster and deal 20% more.')]),
 ]),
 ('combos', L('组合技', 'Combos'), L('两个技能之间的一条小规则，不需要天赋。绿色数字是组合技多出来的。', 'One small rule between two skills; no talent needed. Jade numbers are what the combo adds.'), [
  ('C1', 'C1', L('一箭穿结', 'Thread the knot'), [L('钉矢 + 聚风 / 旋风矢', 'Pinning Arrow + Windknot / Tornado Shot')], [L('钉矢射进被聚风或旋风矢拉到一起的敌人：最多三个，全部眩晕 1 秒。', 'Pinning Arrow into foes gathered by Windknot or Tornado Shot ties up to three: all stunned 1 s.')]),
  ('C2', 'C2', L('撞墙', 'Wall slam'), [L('任何击退或带着走', 'Any knock or carry')], [L('被她踢到或带到墙上的敌人：10，眩晕 0.5 秒。磐皮的石板和石环也算墙。', "A foe she knocks or carries into a wall takes 10 and is stunned 0.5 s. Stonehide's slab and Stone Ring count.")]),
  ('C3', 'C3', L('空射', 'Air shot'), [L('所有箭', 'All her arrows')], [L('她的箭对空中的敌人伤害 +30%，不管是谁挑飞的。', 'Her arrows deal 30% more to a foe in the air, whoever launched it.')]),
  ('C4', 'C4', L('下砸', 'Spike'), [L('鹰坠 / 绝矢', 'Eagle Dive / Kill Shot')], [L('鹰坠的脚跟或绝矢打中空中的敌人：把它砸下去，伤害 +50%，1.5 u 内的敌人再受 10。', "Eagle Dive's heel or Kill Shot on a foe in the air slams it down: 50% more, and 10 to foes within 1.5 u.")]),
  ('C5', 'C5', L('穿风', 'Through the twister'), [L('任何箭 + 旋风矢', 'Any arrow + Tornado Shot')], [L('她的箭穿过自己的旋风矢，出来变成三支，各射一个附近的敌人，伤害减半。', 'An arrow of hers through her Tornado Shot comes out as three, each at a foe near it, for half.')]),
  ('C6', 'C6', L('雨随风走', 'The rain rides the wind'), [L('箭雨 + 聚风 / 旋风矢', 'Rain of Arrows + Windknot / Tornado Shot')], [L('聚风或旋风矢放在她的箭雨上，箭雨跟着走。', 'Windknot or Tornado Shot cast on her Rain of Arrows takes the rain with it.')]),
  ('C7', 'C7', L('隼追印记', 'The kestrel hunts the mark'), [L('隼望 + 猎人印记', "Kestrel Watch + Hunter's Mark")], [L('隼只射有猎人印记的敌人，射速翻倍。', "Kestrel Watch shoots only the foe with Hunter's Mark, twice as often.")]),
  ('C8', 'C8', L('踢入陷阱', 'Kick them in'), [L('棘阱 + 任何推、拉、带', 'Briar Trap + any push, pull or carry')], [L('被推、拉或带进棘阱的敌人：眩晕 1.4 秒，第一秒伤害翻倍。', 'A foe pushed, pulled or carried into Briar Trap: the stun is 1.4 s and its first second deals double.')]),
  ('C9', 'C9', L('射爆', 'Shoot the arrow'), [L('绽矢 + 任何箭', 'Burst Arrow + any arrow')], [L('她的任何一箭射中插在地上的绽矢，立刻炸开，范围翻倍。', 'Any arrow of hers that hits her standing Burst Arrow sets it off at once, twice as wide.')]),
  ('C10', 'C10', L('空中引弦', 'Dash draw'), [L('冲刺 + 蓄力', 'Dash + any draw')], [L('冲刺不打断蓄力：空翻时继续拉弓，可以在空中放箭。', 'A dash does not cancel a draw: she keeps drawing through the somersault and can loose in it.')]),
  ('C11', 'C11', L('空中施放', 'Sky cast'), [L('冲刺 + 散矢 / 羽扇 / 旋矢 / 绽矢', 'Dash + Volley / Feather Fan / Whirl Shot / Burst Arrow')], [L('冲刺中按这几个技能：从空翻最高点往下射，范围 +30%。', 'Pressed during the dash, they are shot down from its top and cover 30% more.')]),
  ('C12', 'C12', L('满帆', 'Full sail'), [L('御风 + 顺风', 'Windrun + Tailwind')], [L('御风让顺风立刻满 3 层，御风期间顺风不会消退。', 'Windrun fills Tailwind to three at once, and the Tailwinds do not run out while it lasts.')]),
 ]),
]


# style forms: per card, one short line for each style built so far (Deadeye 穿杨 first)
FN = {'base': L('基础', 'Base'), 'de': L('穿杨', 'Deadeye'), 'vo': L('万箭', 'Volley'), 'ga': L('弓斗', 'Gale')}
FT = {'de': {
 'GA': L('风矢变成她下一次满弦射击：停在第一个敌人身上，42，无视防御。', 'The Gale Arrow is her next full drawn shot. It stops in the first foe: 42, ignoring its defence.'),
 'B': L('每一箭都要拉弓：按住攻击。轻按 12，满弦（0.75 秒）26，射程 6.5 u，多穿一个敌人。', 'Every shot is a drawn shot: hold attack. A tap is 12, a full draw (0.75 s) is 26, reach 6.5 u, through one more foe.'),
 'D': L('三支箭都射向光标旁边的敌人。', 'All three arrows at the foe nearest the pointer.'),
 'F1': L('背射：从侧面或背后射中多 50%（敌人朝向看得见）。', 'Flank: a hit on its side or back takes 50% more (you can see which way it faces).'),
 'F2': L('满月：在闪光那一刻松手：77，踉跄。早了晚了都只有 48。', 'Sweet spot: let go on the glint: 77 and a stagger. Early or late is only 48.'),
 'F3': L('悬赏：标记 5 秒；它倒下时，她所有冷却减 3 秒。', 'Bounty: a 5 s mark; if it falls, every cooldown drops 3 s.'),
 'F4': L('痛链：钉在一起的两个敌人 4 秒内分担一半伤害。', 'Pain link: the two tied foes share half of their damage for 4 s.'),
 'F5': L('劈箭：五次满弦射进同一个点；第五箭劈开前四支：30。', 'Split the shaft: five draws into one spot; the fifth splits them all: 30.'),
 'F6': L('斩杀：小怪低于 15% 直接倒下；首领低于 30% 吃三倍。', 'Execute: small foes under 15% fall at once; bosses under 30% take triple.'),
 'F7': L('压制：架势里每一箭击退 0.6 u 并减速。', 'Push-back: each stance shot knocks back 0.6 u and slows.'),
 'F8': L('猎巨：穿过小怪，扎进第一个大敌人：六段全中。', 'Big game: it passes small foes and buries in the first big one: all six hits.'),
 'F9': L('断招：三箭打断三个蓄力动作：各 20。', 'Interrupt: three arrows break three wind-ups: 20 each.'),
 'F10': L('天坠：1.5 秒后落下一支巨箭：70。要预判敌人走位。', 'Sky Bolt: one giant arrow falls 1.5 s later: 70. Lead the foe.'),
 'F11': L('爆退：贴身爆开：36；爆风把她推后 3 u。', 'Recoil blast: point-blank, 36; the blast throws her 3 u back.'),
 'F12': L('准星轮：八支箭悬在一个敌人头上；谁打中它都落下一支：8。', 'Spotter wheel: eight arrows over one foe; anyone\'s hit drops one: 8.'),
 'F13': L('折射：碰墙反弹，最多四次：每个敌人 22。', 'Bank shot: it bounces off walls up to four times: 22 a foe.'),
 'F14': L('风眼：定住一个敌人 1 秒，再把它甩上天：24。', 'Eye hold: it holds one foe 1 s, then flings it up: 24.'),
 'F15': L('绊线：第一个跨过的敌人绊倒 1 秒，3 秒内不能跳。', 'Tripwire: the first foe across trips for 1 s and cannot leap for 3 s.'),
 'F16': L('箭篱：箭幕的箭插在地上 5 秒，当掩体。', 'Arrow hedge: the curtain\'s arrows stand 5 s as cover.'),
 'F17': L('留羽：她留下的羽毛 2 秒后射她最后打的敌人：24。', 'Feather sentry: the feather she leaves shoots her last foe 2 s later: 24.'),
 'F18': L('接矢：空中停 0.6 秒接住飞来的子弹；一记满弦（30）全部射回去。', 'Catch: she hangs 0.6 s catching shots; one full shot (30) sends them back.'),
 'F19': L('弦月斩：飞出一道月弧，越远越重：20 到 60。', 'Crescent cut: a flying crescent, harder with range: 20 to 60.'),
 'F20': L('孤狼：把其他敌人吹开，只打中间那一个：36。', 'Lone wolf: it blows the others off one foe and strikes it: 36.'),
 'F21': L('报复：三箭都追最后打中队友的敌人：各 16。', 'Avenger: all three arrows hunt the foe that last hit the team: 16 each.'),
 'F22': L('破甲：34，防御降 30%，4 秒。', 'Armour break: 34, its defence 30% lower for 4 s.'),
 'F23': L('滑步架：跑完滑进一个免费的 2 秒鹰踞。', 'Slide stance: the run ends in a slide into a free 2 s Eagle Stance.'),
 'F24': L('枪坠：箭头朝下扑向光标处的敌人：60，钉住。', 'Spear dive: an arrow-first dive on the pointer\'s foe: 60, pinned.'),
}}
FT['vo'] = {
 'GA': L('风矢在第一个敌人身上碎开（20），变成七支风箭向后散开：各 10。', 'It breaks on the first foe (20) into seven wind arrows that fan out behind it: 10 each.'),
 'B': L('第一、二箭各分成三支（12 和两支 6），最后一下是五支。', 'Shots one and two split in three (12 and two of 6); the last is five arrows.'),
 'D': L('三支箭射三个敌人。', 'The three arrows go to three foes.'),
 'F1': L('弧矢：她瞄出一道弧线，8 u，绕过敌群穿过线上每个敌人：各 26。', 'Curve line: the line bends on an arc she aims, 8 u, through the pack: 26 each.'),
 'F2': L('风压：满弦的风把线两侧 1.5 u 的敌人拉到线上，再一起穿过：各 20。', 'Pressure line: a full draw drags foes within 1.5 u into its line, then pierces them: 20 each.'),
 'F3': L('照明：命中 12；3 u 内的敌人受到所有人的伤害 +20%，4 秒。', 'Flare: 12; foes within 3 u take 20% more from everyone for 4 s.'),
 'F4': L('网矢：一张 2 u 的网：各 14，眩晕 0.5 秒，再减速。', 'Net: a 2 u net: 14 each, stun 0.5 s, then slowed.'),
 'F5': L('赶羊：十箭扫过 90°，各 5，把敌人往扫的终点推。', 'Herding sweep: ten arrows sweep 90°, 5 each, nudging foes toward where it ends.'),
 'F6': L('清点：每个低于 30% 的敌人一箭，最多六个：各 24。', 'Cull: one arrow to each foe under 30%, up to six: 24 each.'),
 'F7': L('曲射：架势里每一箭落地炸开 1.5 u。', 'Mortar: each stance shot falls as a 1.5 u burst.'),
 'F8': L('风墙：贯日沿线立成风墙 3 秒，敌人过不去：碰到每半秒 6。', 'Wind wall: the drill stands up as a wall for 3 s that foes cannot cross: 6 a half second.'),
 'F9': L('涂羽：中扇的敌人被涂上羽记 3 秒；她下一个技能再打每个羽记：各 8。', 'Painted fan: foes hit are painted 3 s; her next skill hits each again: 8.'),
 'F10': L('跳雨：每秒跳到 4 u 内最密的敌群。', 'Hopping rain: each second the rain hops to the thickest pack within 4 u.'),
 'F11': L('连爆：六块碎片落地再各炸一次：8。', 'Cluster: each of the six shards bursts again: 8.'),
 'F12': L('陀螺：箭环立起来滚出 5 u：经过的敌人各 16。', 'Spinning top: the ring stands up and rolls 5 u: 16 to each foe passed.'),
 'F13': L('蛛网：六跳在敌人之间留下丝 3 秒：碰到 6，减速 30%。', 'Web: six hops leave threads between the foes for 3 s: 6 and slow 30%.'),
 'F14': L('卷天：旋风把 2 u 内的敌人卷上天 1.5 秒，再射。', 'Updraft: the twister lifts every foe within 2 u for 1.5 s and shoots them.'),
 'F15': L('连环阱：三个陷阱用绳连着；一个合上，绳把另两个上的敌人拖过来。', 'Linked traps: three traps on a cord; when one snaps, the others drag their foes to it.'),
 'F16': L('交叉：两道箭幕从左右扫进来，在瞄准处交叉：各 3 × 10。', 'Crossfire: two curtains sweep in from both sides and cross over her aim: 3 × 10 each.'),
 'F17': L('扇风：一扇，90° 3 u 内各 9，吹退 2 u，飞来的子弹落地。', 'Gust: one flap, 9 in a 90°, 3 u cone, blown 2 u back; shots in flight drop.'),
 'F18': L('替身：敌人打羽毛替身 2 秒，它炸成八箭：各 8。', 'Decoy: foes attack a feather decoy for 2 s; it bursts into eight arrows of 8.'),
 'F19': L('跳珠：被踢飞的敌人落在谁身上就把谁弹起，最多五个：各 10。', 'Bouncing launch: the launched foe launches the one it lands on, up to five: 10 each.'),
 'F20': L('双结：两个风结，两群敌人撞在一起：各 4，眩晕 0.4 秒。', 'Two knots: two knots drag the packs into each other: 4 each, stun 0.4 s.'),
 'F21': L('扬尘：3 u 的沙尘 3 秒，里面的敌人被致盲，打不中。', 'Dust cloud: a 3 u dust cloud for 3 s blinds the foes in it; their hits miss.'),
 'F22': L('连波：冲击沿着挨在一起的敌人一个传一个：各 10。', 'Ripple: the strikes\' shock runs through every foe touching another: 10.'),
 'F23': L('回马箭：跑的每一秒，向身后扇射五箭：各 6。', 'Parting fans: each second of the run, a fan of five behind her: 6 each.'),
 'F24': L('箭泉：落地的坑喷箭 1.5 秒：3 u 内每 0.3 秒 3。', 'Fountain: the landing crater sprays arrows 1.5 s: 3 every 0.3 s within 3 u.'),
}
FT['ga'] = {
 'GA': L('改：空翻踢甩出 3 u 的风环：24，把敌人拉到她身边挑飞。', 'Changes: her flip kick throws a 3 u ring of wind: 24; foes are pulled in and launched.'),
 'B': L('改：五拍弓斗术，弓扫、胯射、后踢、空翻踢。', 'Changes: a five-beat 弓斗术: bow sweep, hip shots, back kick, flip kick.'),
 'D': L('加：最后一记下坠踢：1.5 u 内 8。', 'Adds: it ends in a dive kick: 8 within 1.5 u.'),
 'F1': L('追射：回旋后踢把敌人踢飞 3 u；箭追上去钉住它：30。', 'Chase: a back kick flies the foe 3 u; the arrow chases it and nails it: 30.'),
 'F2': L('蓄腿：按住蓄一记回旋踢：20，满蓄 2.5 u 内 40。', 'Wound kick: hold to wind a spin kick: 20, up to 40 within 2.5 u.'),
 'F3': L('连印：五个节拍被她的近身命中逐个打掉；第五个爆开：18。', 'Beat mark: five pips popped by her close hits; the fifth bursts: 18.'),
 'F4': L('弹弓：她顺着绳把自己弹向被系住的敌人：飞踢 30。', 'Slingshot: she slings herself at a tied foe: a flying kick, 30.'),
 'F5': L('影踢：三记重踢各 10，每踢击退 2.5 u 换个方向，她闪到它背后再踢；第四踢挑飞 8，空中补一箭 24。', 'Shadow kicks: three hard kicks of 10, each knocks it 2.5 u another way and she blinks behind it; the fourth launches it for 8, one arrow in the air for 24.'),
 'F6': L('骑射：骑在敌人身上 1 秒操纵它走，再往下射：24，低于 30% 翻倍。', 'Ride: she rides a foe 1 s, steering it, then shoots down: 24, double under 30%.'),
 'F7': L('风井：俯冲砸地留下风井 4 秒，把敌人拉进来；她自由行动；最后风爆 24。', 'Wind well: a dive slam leaves a wind well 4 s that drags foes in; she moves freely; then it bursts: 24.'),
 'F8': L('矢枪：巨箭当长枪转一圈，再投出去钻穿。', 'Arrow spear: she spins the giant arrow as a spear, then throws it.'),
 'F9': L('穿裆：从敌人身下滑过，往上射三箭：各 16，挑飞。', 'Slide shot: she slides under a foe and shoots three up: 16 each, launch.'),
 'F10': L('收雨：一圈箭雨 2 秒内向中心收拢，把敌人赶进去。', 'Closing rain: a ring of rain closes in over 2 s, herding foes inward.'),
 'F11': L('爆步：借爆炸冲出 3 u 穿过敌人：各 16。', 'Blast ride: she rides the blast 3 u through foes: 16 each.'),
 'F12': L('踢轮：把箭轮踢出 3 u，原地锯 2 秒。', 'Kicked saw: she kicks the arrow wheel 3 u; it saws for 2 s.'),
 'F13': L('踩头：踩四个头，各一脚（8）；最后一箭 20。', 'Head hop: four heads, a kick each (8); the last shot: 20.'),
 'F14': L('回旋风：旋风滚回她身边，一路拖着敌人。', 'Homecoming twister: a twister rolls back to her, pulling foes along.'),
 'F15': L('荆鞭：3 u 的荆条鞭：各 8，打倒 0.4 秒。', 'Briar lash: a 3 u vine whip: 8 each, knocked flat 0.4 s.'),
 'F16': L('推浪：箭幕变成墙，推着前面的敌人走：3 × 10。', 'Bulldoze: the curtain pushes every foe ahead of it: 3 × 10.'),
 'F17': L('风车：羽钻钻进一个敌人 1.5 秒：24；附近的敌人被吸过去贴着它。', 'Pinwheel: a feather drill on one foe 1.5 s: 24; near foes are pulled against it.'),
 'F18': L('换位：她蹬一个敌人，两个换位：18。', 'Switch: she springs off a foe and they trade places: 18.'),
 'F19': L('空中连踢：追着被踢飞的敌人空中三脚：各 6。', 'Air juggle: three kicks after the launched foe: 6 each.'),
 'F20': L('蹴鞠：敌群卷成风球，她带球 2 秒，再一脚抽射。', 'Cuju: the pack becomes a wind ball she dribbles 2 s, then kicks.'),
 'F21': L('卸力：转身时挨的近战打空，出手的敌人被踢：10。', 'Parry spin: melee hits on her miss; each attacker is kicked: 10.'),
 'F22': L('撞头：用弓把两个敌人的头撞在一起：各 15，眩晕。', 'Head clap: the bow knocks two foes\' heads together: 15 each, stun.'),
 'F23': L('折风：跑步中每个急转弯是一记旋踢：12。', 'Zigzag: each sharp turn in the run is a spin kick: 12.'),
 'F24': L('陷坑：脚跟钻地，地面下陷 2 秒，敌人滑进去。', 'Sinkhole: a heel drill sinks the floor for 2 s; foes slide in.'),
}
FORMS_ON = ['de', 'vo', 'ga']
NEW25 = {('de', 'F1'), ('de', 'F10'), ('de', 'F11'), ('de', 'F12'), ('de', 'F13'), ('de', 'F14'), ('de', 'F15'), ('de', 'F16'), ('de', 'F17'), ('de', 'F18'), ('de', 'F19'), ('de', 'F2'), ('de', 'F20'), ('de', 'F21'), ('de', 'F23'), ('de', 'F24'), ('de', 'F3'), ('de', 'F4'), ('de', 'F5'), ('de', 'F6'), ('de', 'F7'), ('de', 'F9'), ('ga', 'F1'), ('ga', 'F11'), ('ga', 'F12'), ('ga', 'F14'), ('ga', 'F15'), ('ga', 'F16'), ('ga', 'F17'), ('ga', 'F18'), ('ga', 'F19'), ('ga', 'F2'), ('ga', 'F20'), ('ga', 'F21'), ('ga', 'F22'), ('ga', 'F23'), ('ga', 'F24'), ('ga', 'F3'), ('ga', 'F4'), ('ga', 'F5'), ('ga', 'F6'), ('ga', 'F8'), ('ga', 'F9'), ('vo', 'F1'), ('vo', 'F10'), ('vo', 'F12'), ('vo', 'F13'), ('vo', 'F14'), ('vo', 'F15'), ('vo', 'F16'), ('vo', 'F17'), ('vo', 'F18'), ('vo', 'F19'), ('vo', 'F2'), ('vo', 'F20'), ('vo', 'F21'), ('vo', 'F22'), ('vo', 'F23'), ('vo', 'F24'), ('vo', 'F3'), ('vo', 'F4'), ('vo', 'F5'), ('vo', 'F6'), ('vo', 'F8'), ('vo', 'F9')}  # rebuilt for kit 2.5, not passed yet
MOT = {('base', 'F7'), ('de', 'F7'), ('vo', 'F7'), ('ga', 'F7'), ('ga', 'F6'), ('ga', 'F13'), ('ga', 'F1'), ('ga', 'F2'), ('ga', 'F3'), ('ga', 'F4'), ('ga', 'F5'), ('ga', 'F8'), ('ga', 'F9'), ('ga', 'F11'), ('ga', 'F12'), ('ga', 'B'), ('ga', 'GA'), ('ga', 'D')} | {('ga', f'F{n}') for n in range(14, 25)} | {('de', f) for f in ('F1', 'F3', 'F4', 'F9', 'F12', 'F13', 'F15', 'F20', 'F22')} | {('vo', f) for f in ('F2', 'F3', 'F4', 'F5', 'F8', 'F9', 'F10', 'F11', 'F12', 'F14', 'F15', 'F16', 'F17', 'F20', 'F23', 'F24')}  # new motion from the 19 Nov street-dance / Dragon Nest pass, not passed yet
MOTB = '<span class="newb"><span class="zh">新动作 · 未通过</span><span class="en">New motion, not passed</span></span>'
PASSED = {('ga', 'F5')}  # Kesh 19 Nov 15:38 SGT: Shadow kicks passed; 15:58 SGT "mark all pass": every new form and motion passed (set below)
PASSB = '<span class="newb passb"><span class="zh">已通过</span><span class="en">Passed</span></span>'
NEWB = '<span class="newb"><span class="zh">新 · 未通过</span><span class="en">New, not passed</span></span>'
PASSED |= MOT | NEW25

def bi(p):
    zh, en = p
    return f'<span class="zh">{E(zh)}</span><span class="en">{E(en)}</span>'

# knees (19 Nov): cards whose clip now bends the knees, from the knee audit (tools/knees.json: card -> most bend, degrees)
import json as _json
KN = _json.load(open(os.path.join(HERE, 'knees.json')))
KNEE = L('膝 · 新', 'Knees · new')
def kneechip(cid):
    return ''  # the knees passed (Kesh 19 Nov): no more chips
    if KN.get(cid, 0) > 3: kl = KNEE
    else:
        fl = [f for f in FORMS_ON if KN.get(f + ':' + cid, 0) > 3]
        if not fl: return ''
        kl = (KNEE[0] + '：' + '、'.join(FN[f][0] for f in fl), KNEE[1] + ': ' + ', '.join(FN[f][1] for f in fl))
    return f'<span class="chip kn">{bi(kl)}</span>'

def card(c):
    cid, num, name, chips, lines = c
    ch = kneechip(cid) + ''.join(f'<span class="chip">{bi(x)}</span>' for x in chips)
    ps = ''.join(f'<p>{bi(x)}</p>' for x in lines)
    fs = [f for f in FORMS_ON if cid in FT.get(f, {})]
    sw = ''
    if fs:
        sw = '<div class="seg forms" role="group" aria-label="Style">' + ''.join(f'<button type="button" data-f="{f}" aria-pressed="{str(f == "base").lower()}">{bi(FN[f])}</button>' for f in ['base'] + fs) + '</div>'
        bb = f'<p class="fline">{PASSB}</p>' if ('base', cid) in PASSED else ''
        ps = f'<div class="fx" data-f="base">{bb}{ps}</div>' + ''.join(f'<div class="fx" data-f="{f}"><p class="fline">{PASSB if (f, cid) in PASSED else MOTB if (f, cid) in MOT else NEWB if (f, cid) in NEW25 else ""}{bi(FT[f][cid])}</p></div>' for f in fs)
    return (f'<article class="skill" id="{cid}" data-form="base"><div class="stage"><canvas data-id="{cid}" width="800" height="500" aria-label="{E(name[1])}"></canvas>'
            f'<button type="button" class="pp" aria-label="Pause">❚❚</button></div>'
            f'<div class="txt"><div class="head"><span class="num">{num}</span><h3>{bi(name)}</h3></div>'
            f'<div class="meta">{ch}</div>{sw}{ps}</div></article>')

nav = ''.join(f'<a href="#{s[0]}">{bi(s[1])}</a>' for s in SECTIONS)
body = ''
for sid, title, intro, cards in SECTIONS:
    it = f'<p class="intro">{bi(intro)}</p>' if intro[0] else ''
    body += f'<section id="{sid}"><h2>{bi(title)}</h2>{it}' + ''.join(card(c) for c in cards) + '</section>'

three = './three/build/three.module.js' if LOCAL else 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js'
addons = './three/examples/jsm/' if LOCAL else 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/'

CSS = open(os.path.join(HERE, 'style.css')).read()
ALLF = ('<div class="seg allforms" role="group" aria-label="Style for every card"><button type="button" data-f="base" aria-pressed="true"><span class="zh">全部基础</span><span class="en">All base</span></button>'
  + ''.join(f'<button type="button" data-f="{f}" aria-pressed="false"><span class="zh">全部{FN[f][0]}</span><span class="en">All {FN[f][1]}</span></button>' for f in FORMS_ON) + '</div>')
page = ('<meta charset="utf-8">\n' if LOCAL else '') + f'''<title>Windbriar skills</title>
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
  <h1>{bi(L('Windbriar 技能', 'Windbriar skills'))}</h1>
  <p class="sub">{bi(L('实时 3D，真实速度。每张卡可以切换基础、穿杨、万箭、弓斗形态，顶上可以一次全部切换。最后是十二个组合技。点画面暂停。', 'Live 3D at real speed. Each card switches between its base, Deadeye, Volley and Gale forms; the switch at the top changes every card. The twelve combos are at the end. Click a clip to pause.'))}</p>
  <p class="rules">{bi(L('拉弓的技能按住蓄力，松开放箭；点一下立刻射出，伤害减半。踢、推、挑飞也会移动被嘲讽的敌人；可以无限挑空。首领不会被移动，那一下伤害 +20%。', 'Drawn shots are held: let go to shoot; a tap shoots at once for half. Kicks, pushes and launches move taunted foes too, and a foe can be launched again and again. A boss is never moved; that hit deals 20% more instead.'))}</p>
  <nav>{nav}</nav>

</header>
{body}
</div>
<script type="module">
import * as W from './wb.js';
import {{ DEFS, FORMS }} from './defs.js';
const wrap = document.querySelector('.wrap');
const store = {{ get(k) {{ try {{ return localStorage.getItem(k); }} catch (e) {{ return null; }} }}, set(k, v) {{ try {{ localStorage.setItem(k, v); }} catch (e) {{}} }} }};
function lang(l) {{ wrap.dataset.lang = l; document.documentElement.lang = l === 'zh' ? 'zh-Hans' : 'en'; W.setLang(l); store.set('wb-lang', l);
  document.querySelectorAll('.lang button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.l === l))); }}
function speed(s) {{ W.setSpeed(+s); store.set('wb-speed', s); document.querySelectorAll('.speed button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.s === s))); }}
document.querySelectorAll('.lang button').forEach((b) => b.addEventListener('click', () => lang(b.dataset.l)));
document.querySelectorAll('.speed button').forEach((b) => b.addEventListener('click', () => speed(b.dataset.s)));
lang(store.get('wb-lang') === 'en' ? 'en' : 'zh'); speed(['1', '0.5', '0.25'].includes(store.get('wb-speed')) ? store.get('wb-speed') : '1');
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
import('./windbriar-model.js').then((m) => {{ const s = atob(m.default), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return W.loadHer(u.buffer); }}).then(() => wrap.classList.remove('loading')).catch((e) => {{ wrap.classList.remove('loading'); wrap.classList.add('failed'); console.error(e); }});
</script>
'''
os.makedirs(SITE, exist_ok=True)
open(os.path.join(SITE, 'index.html'), 'w').write(page)
for f in ['wb.js', 'defs.js', 'knees.js']: shutil.copy(os.path.join(HERE, f), os.path.join(SITE, f))
import base64
open(os.path.join(SITE, 'windbriar-model.js'), 'w').write('// Windbriar, rigged with her ability clips (GLB, base64)\nexport default "' + base64.b64encode(open(os.path.join(HERE, 'windbriar.glb'), 'rb').read()).decode() + '";\n')
print('ok', len(page))
