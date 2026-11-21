# kit22.py: the kit 2.2 text for the page (K28 to K41): no will effects, no will colours, Echo in the passive,
# no ghost sword copies (Kesh's E1). mkpage.py applies it over its 2.1 SECTIONS.
EN = {
 'S11': ['Free from the first room, no button.', "Each cast draws a small Moon Silver ghost sword out of his blade, its will's character on the blade (剑, 屈, 水 or 热). It floats point-down behind his shoulder, the newest on the right. He holds two; a third pushes out the oldest.", "Echo 残响: every fourth skill press is cast again for half by a silver ghost of him, 0.4 s after his cast ends, from where he stood, in his style's form.", 'The sixth basic hit throws the newest ghost sword. Clip: four casts (the fourth echoes), then the six hits.'],
 'N_throw': ['His sword stays in his right paw; his open left paw flicks the newest ghost sword out, spinning like a disc: 4 u through every foe, 12.', 'It whirls 0.4 s, bursts for 6 within 1.5 u and flies back to his shoulder; the mark is kept. Second throw in the clip: no mark, a plain silver one that fades.'],
 'S14': ['A reverse-grip draw, four cuts in an X and an X; the strokes hang, then flare into one star.', '3.75 each to up to 6 foes in a 60° fan.'],
 'S15': ['Point dragging sparks, then a rising cut in a back turn that draws a tall moon.', '26 to up to 5 foes, 70° fan; +50% for each other skill landed in the last 2 s (up to 2).'],
 'S16': ['One turn draws a ring of light; it unrolls into the crescent. A cut line stays in the floor.', '6 u through every foe: 20.5.'],
 'N_cascade': ['Two wide sweeps, an overhead slam with a star on the floor, a swirl of blades that gathers foes in, then a dash through them.', '7 + 7, 10, 3 × 3 in the swirl, dash 20.'],
 'S18': ['25% more crit chance. A crit calls a small ghost blade that cuts the foe again for 30% of that hit.'],
 'S19': ['He tosses the sword up and snaps his open paw: a thin cut line opens on every foe within 4 u, 6.', 'He catches it and cuts down: every line bursts for 10, and 4 to the foes within 1.5 u of each.'],
 'S20': ['A salute; three ghost blades fan out behind him like wings. Flat, rising, overhead: three great waves, 7 u, 24 each.', 'The 2nd and 3rd deal half to a foe already hit.'],
 'S21': ['Coiled low, a thin aim line; the thrust bursts a shock cone behind the foe; he rips the blade out.', '26 to up to 2 foes in line.'],
 'S24': ['A reverse-grip stab, the point carves a line round his feet, then he rips it up: the rift races out and blade fins rise along it.', '5 u: 14 to every foe on it.'],
 'N_split': ['Hold to charge up to 1.2 s; the sword grows. Slam 1 u ahead.', 'Quick: 20 in 1.5 u. Full: 40 in 2.8 u.'],
 'N_ink': ['Rising slash, an X cut with ink spikes, a leap with three cuts and a burst in the air, then a dive into the floor.', '8, 6 + 6, 4 × 3, 6, landing 20 in 1.8 u.'],
 'S25': ['A spin on one foot, a cut across the floor: a fan of iron spikes lands standing.', "Radius 0.7 u for 5 s. A foe's first step on them: 8."],
 'S26': ['A 0.6 s guard, reverse grip. On a catch: a ring, one slow frame, a backhand that draws a full moon: 30 in a 90° arc.', 'A parried shot flies back at the shooter as a wave for 30.'],
 'S27': ['A low draw, a streak, still at the far end; a beat later a moon opens along the path.', '3.2 u: 24 to up to 4 foes. Marked 4 s: his next hit on that foe pops the mark for 12, a sure crit.'],
 'N_riptide': ['Overhead arc, a leap and stab down, a rising cut, a low crouched sweep.', '10, 12, 8, 10.'],
 'S29': ['A barrel-roll hop draws a full circle; it unfolds into the wave. One ripple where he was.', '2.5 u wide, 4 u: 14. He hops 1.5 u, untouchable.'],
 'N_ring': ['A ring of light, 2.5 u. Seven mirror images thrust across it one by one, then he thrusts the eighth: 5 each.', 'Then 剑花 and four bursts inside: 4 each. All in 4 s.'],
 'S31': ['The point draws a mirror of light; he steps back out of himself. The image turns its sword in slow wheels.', "Foes within 4 u turn on it for 3 s (never a boss or the tank's foes). Then it bursts in mirror shards: 12 within 2 u."],
 'S32': ['While he has taken no hit for 3 s, his hits deal 15% more.', 'A hit he takes ends it; it comes back after 3 s without one.'],
 'S33': ['A low corkscrew dash; the blade draws a spiral of strokes. He slides to a stop on one knee.', '2 u: 18 to up to 3 foes.'],
 'S34': ['A small leap, three flat turns in the air, each a wider ring; down with the point in the floor.', 'Five cuts of 4.'],
 'N_waltz': ['Floor crescent, big flat cut, flash dash, a ring of light, blades rise, rising cut, three beams that leave swords standing.', '6, 8, 6, 8, 6, 10, then 6 per beam.'],
 'S36': ['A no-hands cartwheel: two tilted rings cross like an X round him; after-images on landing.', '1.3 u: 10 to up to 6 foes. He runs 30% faster for 2 s.'],
 'S38': ['Every second the 3 nearest foes within 0.9 u take 4.'],
 'S39': ['He splits into after-images and is gone. Eight long strokes, each from a new side; he sheathes, and at the click they all flash.', 'Eight cuts of 5 on foes within 3 u, a different foe each time. Untouchable.'],
 'SP1': ['A giant spirit sword falls along his aim, 7 u long, 1.5 u wide: 34.'],
 'SP2': ['A great sword plants before him: 14 within 2.5 u.', 'While it stands, 3 s, he takes 40% less and nothing stops or moves him.'],
 'SP3': ['The floor is a mirror, 3 u: 12.', 'He heals 12 and every harm on him ends.'],
 'SP8': ['For 3 s he heals 4 a second and takes 30% less.', 'It ends in a ring, 3 u: 10.'],
 'SP9': ['A shock round him, 2.5 u: 14.', 'For 4 s nothing stops him and basic attacks are 20% faster.'],
 'C2': ['A foe that Blade Wheel carries into a wall takes 10.'],
 'C9': ['The patch scatters twice as wide.'],
 'S7': ['Gone with the count, and launches went in kit 2.2.'],
 'S35': ['Gone; Thousand Cuts came back.', 'A fast thin wave, 7 u, through every foe: 14.'],
 'E': ['Part of Sword Heart. Every fourth skill press is cast again by a silver ghost of him for half, 0.4 s after his cast ends, from where he stood, as he aimed.', 'Base clip, Blade Storm: he steps away and the ghost spins where he stood, 2.5 a cut.'],
}
ZH = {
 'S11': ['开局即有，无需按键。', '每次施放，从他的剑上抽出一柄小小的月银剑影，剑身上亮着其意的字（剑、屈、水或热），剑尖朝下浮在他肩后，最新的在右边。最多两柄，第三柄挤掉最旧的一柄。', '残响：每第四次按下技能，会在他施放结束 0.4 秒后，由一个银色残影在他原来的位置、以当前形态再施放一次，伤害减半。', '普攻第六击掷出最新的剑影。片段：四次施放（第四次出残响），然后六连击。'],
 'N_throw': ['长剑仍握在右爪；张开的左爪向前一弹，最新的剑影如飞盘般旋转飞出：4 u 内穿过所有敌人，12 点。', '原地回旋 0.4 秒，在 1.5 u 内爆发 6 点，然后飞回肩后；意印保留。片段中第二次投掷：没有意印，掷出一柄普通银色剑影，爆发后消散。'],
 'S14': ['反手拔剑，X 形四斩再 X 形；斩痕悬于空中，随后汇成一颗星。', '60° 扇形，每斩 3.75 点，最多 6 个敌人。'],
 'S15': ['剑尖拖地迸出火花，转身上挑腾空，划出一轮高耸的月。', '70° 扇形，26 点，最多 5 个敌人；2 秒内每命中过一个其他技能 +50%（最多 2 个）。'],
 'S16': ['转身一周画出光环，光环展开成新月飞出。地上留下一道斩痕。', '6 u，贯穿所有敌人：20.5 点。'],
 'N_cascade': ['两记大横扫，下劈在地上留下星形，剑刃旋涡把敌人聚拢，再冲刺穿过。', '7 + 7、10、旋涡内 3 × 3、冲刺 20。'],
 'S18': ['暴击率 +25%。暴击召来一柄小剑影，再斩该敌人一次，造成那一击 30% 的伤害。'],
 'S19': ['抛剑上空，张爪一捏：4 u 内每个敌人身上裂开一道细斩线，6 点。', '接剑下斩：每道斩线爆开 10 点，并对各自 1.5 u 内的敌人造成 4 点。'],
 'S20': ['举剑行礼，身后三把虚剑如翼展开。平斩、上挑、下劈：三道巨大剑波，7 u，各 24 点。', '第 2、3 道对已命中的敌人伤害减半。'],
 'S21': ['低身蓄势，一道细细的瞄准线；突刺在敌人身后炸出冲击锥，再拧剑拔出。', '直线上最多 2 个敌人 26 点。'],
 'S24': ['反手刺地，剑尖绕脚边刻出光线，再猛然挑起：裂痕冲出，剑鳍沿线升起。', '5 u：线上每个敌人 14 点。'],
 'N_split': ['按住蓄力最多 1.2 秒，长剑变大。向前 1 u 重砸。', '短按：1.5 u 内 20 点。蓄满：2.8 u 内 40 点。'],
 'N_ink': ['上挑、带墨刺的 X 斩、跃起空中三斩并爆发，最后俯冲入地。', '8、6 + 6、4 × 3、6，落地 1.8 u 内 20 点。'],
 'S25': ['单脚旋身，横斩地面：一扇铁刺飞出，立在地上。', '半径 0.7 u，持续 5 秒。敌人第一次踩上：8 点。'],
 'S26': ['反手持剑格挡 0.6 秒。接住时：一圈光环、一帧慢动作、反手画出满月：90° 弧内 30 点。', '被格开的飞弹化作剑波飞回射手，30 点。'],
 'S27': ['低身拔剑，一道流光，静立在尽头；一拍后整条路径上绽开一轮月。', '3.2 u：最多 4 个敌人 24 点。标记 4 秒：他再次命中该敌人时引爆标记，追加 12 点，必定暴击。'],
 'N_riptide': ['过顶弧斩、跃起下刺、上挑、低身横扫。', '10、12、8、10。'],
 'S29': ['横滚跃起画出圆环，圆环展开成剑波。原地留下一圈涟漪。', '宽 2.5 u，4 u：14 点。他跃开 1.5 u，无敌。'],
 'N_ring': ['一圈光环，2.5 u。七个镜像依次穿过，他亲自刺出第八刺：各 5 点。', '然后剑花与四次内爆：各 4 点。共 4 秒。'],
 'S31': ['剑尖画出一面光镜，他从自己身上退出。镜像缓缓转动剑花。', '4 u 内的敌人转向镜像 3 秒（首领和坦克的敌人除外）。随后碎成镜片爆开：2 u 内 12 点。'],
 'S32': ['3 秒内未受到攻击时，他的伤害 +15%。', '受到一击即中断；3 秒内不再受击后恢复。'],
 'S33': ['低身螺旋冲刺，剑刃画出螺旋斩痕。单膝滑停。', '2 u：最多 3 个敌人 18 点。'],
 'S34': ['小跳，空中三次平转，每圈更宽；落地剑尖插地。', '五斩，每斩 4 点。'],
 'N_waltz': ['地面新月、大平斩、闪身冲刺、光环、剑刃升起、上挑，三道光束留下立剑。', '6、8、6、8、6、10，每道光束 6。'],
 'S36': ['无手侧翻：两道倾斜的圆环交叉成 X；落地留下残影。', '1.3 u：最多 6 个敌人 10 点。2 秒内移速 +30%。'],
 'S38': ['每秒对 0.9 u 内最近的 3 个敌人造成 4 点。'],
 'S39': ['他分成残影后消失。八道长长的剑光，每道来自新的方向；收剑入鞘，咔的一声全部闪亮。', '3 u 内八斩，每斩 5 点，每次换一个敌人。无敌。'],
 'SP1': ['巨大的剑灵之剑沿瞄准方向落下，长 7 u、宽 1.5 u：34。'],
 'SP2': ['巨剑插在他身前：2.5 u 内 14。', '巨剑立着的 3 秒内，他受到的伤害减少 40%，任何效果都无法打断或移动他。'],
 'SP3': ['地面化为明镜，3 u：12。', '他回复 12 点生命，身上所有负面效果解除。'],
 'SP8': ['3 秒内他每秒回复 4，受到的伤害减少 30%。', '结束时放出一圈，3 u：10。'],
 'SP9': ['以他为中心的冲击，2.5 u：14。', '4 秒内任何效果都无法打断他，普攻速度提高 20%。'],
 'C2': ['被旋刃带着撞到墙上的敌人受 10 点。'],
 'C9': ['蒺藜散开两倍宽。'],
 'S7': ['随计数一同移除；挑飞也在 2.2 移除。'],
 'S35': ['已移除；千刃回归。', '快速细剑波，7 u，贯穿所有敌人：14。'],
 'E': ['剑心的一部分。每第四次按下技能，会在他施放结束 0.4 秒后，由一个银色残影在他原来的位置、按他瞄准的方向再施放一次，伤害减半。', '基础片段，剑岚：他走开，残影在他原来的位置旋转，每斩 2.5 点。'],
}
DROP = {'E1', 'E2', 'E3', 'L1', 'C1', 'C3', 'C5a', 'C5c', 'C10', 'C12'}
SEC_EN = {'fire': '剑意 Intent', 'earth': '不屈 Unbowed', 'water': '止水 Still Water', 'wind': '狂热 Fervour'}
SEC_ZH = {'fire': '剑意', 'earth': '不屈', 'water': '止水', 'wind': '狂热'}
CHIPS = {'SP3': ['Two marks', 'Heal']}
NODES = {'S32': 'Quicken'}
# the Echo card joins the passive section after Sword Heart; its Swift and Crescent clips on the form switch
ECHO = ('E', 'Echo 残响', None, ['Class passive'], None, EN['E'], None, None)
FORM_E = ('Lunge Strike, Swift form: the ghost thrusts again from where he stood, 13.', 'Keen Crescent, Crescent form: the ghost sends the wide crescent again, 10, and its burst at half.',
          '贯刺，疾形态：残影从他原来的位置再突刺一次，13 点。', '锐月，剑气形态：残影再放出一道宽月，10 点，爆发也减半。')
FORMS_FIX = {
 'N_basic': (None, 'A charge shot instead of the six hits. Hold: he sinks low, sword drawn back, open paw at the target; release to cut down or up (they alternate) and the 剑气 flies. Under 0.4 s: 8, 4 u, stops at the first foe. 0.4 to 1.2 s: 14 to 26, 5 to 6 u, through every foe. At 1.2 s it fires by itself as the last hit: 30, 7 u, wide, and the newest ghost sword flies with it (12, burst 6).',
             None, '普攻改为蓄力斩：按住时压低身形、剑收到身后，张开的左爪指向目标；松开后下斩或上挑（轮流），剑气飞出。不到 0.4 秒：8 点，4 u，停在第一个敌人。0.4 到 1.2 秒：14 到 26 点，5 到 6 u，贯穿所有敌人。1.2 秒时自动放出，算作最后一击：30 点，7 u，更宽，最新的剑影随之飞出（12，爆发 6）。'),
 'S16': ('He is the wave: a thrust 4 u.', None, '他就是剑波：一道 4 u 的突刺。', None),
 'S19': ('He thrusts 3 u; each foe he passes gets a cut line, and the lines burst.', 'A 剑风 carries the lines out to 6 u.', '突刺 3 u；途经的每个敌人身上裂开斩线，随后爆开。', '剑风把斩线带到 6 u。'),
 'S27': (None, 'He stays and throws a moon 剑气 6 u, with the same mark.', None, '原地不动，掷出 6 u 月形剑气，同样带标记。'),
}
HEAD_EN = 'Kit 2.2 · 26 skills in four wills · Base, Swift and Crescent forms · 10 Will specials · 6 combos · on your Tripo model · effects are stand-ins.'
HEAD_ZH = '技能 2.2 · 四种意共 26 个技能 · 基础、疾、剑气三种形态 · 10 种意志奥义 · 6 个连携 · 使用你的 Tripo 模型 · 特效为占位。'

# ---- kit 2.3 (Kesh 18 Nov 15:36 SGT: twelve form changes; K42 to K56) ----
EN.update({
 'S21': ['A thrust through the line; he drills round the blade, a back somersault tears it out, and a star opens behind the foes.', '2 u line, through every foe: 12, then 3 × 2, then 8 (and 4 within 1.2 u of the far end).'],
 'S25': ['He throws six ghost swords: they plant in a ring, 1.5 u, up to 4 u away, 8 to each foe there, and stand 5 s with a thread of light to his paw.', 'Press again (or wait 5 s): every sword flies back to his paw through every foe on its way, 4 each, at most 3 on one foe.'],
 'C9': ["Rift Cut, Ink Dive's landing or Skyblade Waltz's floor crescent touching the grove: each standing sword bursts once, 4 within 1 u."],
})
ZH.update({
 'S21': ['一记贯穿直线的突刺；他绕剑旋身钻刺，再后空翻拔剑，敌人身后绽开一颗星。', '2 u 直线，贯穿所有敌人：12，再 3 × 2，再 8（远端 1.2 u 内 4）。'],
 'S25': ['掷出六把剑影：插成半径 1.5 u 的剑环，最远 4 u，对其中每个敌人 8 点，立 5 秒，每把剑柄有一道光线连到他的爪上。', '再按一次（或 5 秒后）：每把剑穿过沿途所有敌人飞回爪中，各 4 点，同一敌人最多 3 把。'],
 'C9': ['裂痕斩、墨坠落地或天剑舞的地面月牙碰到剑林：每把立着的剑各爆一次，1 u 内 4 点。'],
})
RENAME = {'S25': ('Sword Grove 剑林', '剑林'), 'C9': ('Ring the grove', '剑林共鸣')}
CD = {'S25': '8 s'}
CHIPS.update({'C9': ['Sword Grove 剑林', 'Rift Cut']})
FORMS_FIX.update({
 'S14': (None, 'No cuts: he shoots four 剑气, 4 each, 6 u, in a narrow fan.', None, '不再近身斩：射出四道剑气，各 4 点，6 u，窄扇形。'),
 'S15': (None, 'Three hits: a 剑痕 mark on the floor ahead (4, it gathers the foes within 2.4 u), a sweep that pushes them back (6), a flat 剑气 (10, 5 u), then the original last hit: the rising cut (26, its edge reaches 2.6 u) with its tall moon 剑气 (14).',
         None, '三段：先在前方地上留下剑痕（4 点，把 2.4 u 内的敌人聚过来），横扫击退（6），横扫剑气（10，5 u），再接原本的末击：上挑（26，剑光及 2.6 u）与高月剑气（14）。'),
 'N_cascade': (None, 'As base; after the dash through he turns back and sweeps a 剑气 at them, 12, 6 u.', None, '与基础相同；冲刺穿过后回头横扫一道剑气，12 点，6 u。'),
 'S19': ('He thrusts 3 u; each foe he passes gets a cut line, and the lines burst. Holds up to 3 charges; each refills in the cooldown, one at a time, with 0.5 s between two casts.', None, '突刺 3 u；途经的每个敌人身上裂开斩线，随后爆开。最多 3 次充能；每次充能按冷却逐一恢复，两次施放间隔 0.5 秒。', None),
 'S21': ('The drill carries him 3.5 u through every foe (12, then 3 × 2); he lands past them facing back, and the star opens where he left them (8, and 4 within 1.2 u).',
         'He stays; a drilling 剑气 flies 6 u through every foe (12, then 3 × 2), hangs a beat at its end and opens into the star (8 within 1.2 u).',
         '钻刺带着他贯穿 3.5 u（12，再 3 × 2）；他落在敌群身后回身，星在他离开处绽开（8，1.2 u 内 4）。',
         '原地不动，一道旋钻剑气飞出 6 u 贯穿所有敌人（12，再 3 × 2），在尽头停一拍后绽成星（1.2 u 内 8）。'),
 'N_ink': ('The dive reaches 4 u. The rising slash throws the foes up and he dives with them: each one carried takes 8, and every foe at the landing takes 5 for each one carried (at most 4 count).', None,
           '俯冲距离 4 u。上挑把敌人挑飞，他带着它们一起俯冲：每个被带下的敌人 8 点，落点的每个敌人按带下的数量每个受 5 点（最多算 4 个）。', None),
 'S25': ('On the call he thrusts to the middle of the grove through every foe (10), and the swords burst in a ring where he lands (12 within 1.8 u).',
         'Planted up to 6 u. On the call each sword first spins a 剑风 ring (1.2 u, 4, at most 2 on one foe), then flies back.',
         '召回时他突刺到剑林中央，贯穿所有敌人（10），剑在他落点爆成一圈（1.8 u 内 12）。',
         '最远 6 u。召回时每把剑先旋出一圈剑风（1.2 u，4 点，同一敌人最多 2 圈），再飞回。'),
 'S26': (None, 'The answer is thrown as a 剑气 6 u. A parried shot flies back, and a 剑气 (21) follows it to the shooter.', None, '还击化作 6 u 剑气掷出。被格开的飞弹飞回，一道剑气（21）随之追向射手。'),
 'S27': ('He dashes back along the same line for half, and that hit pops the marks.', 'He stays and throws a moon 剑气 6 u with the same mark. Holds 2 charges, each refilling in the cooldown, one at a time, 0.5 s between casts.',
         '沿同一条线冲回，伤害减半，这一击引爆标记。', '原地掷出 6 u 月形剑气，带同样的标记。2 次充能，按冷却逐一恢复，两次施放间隔 0.5 秒。'),
 'N_ring': ('No images: he blinks across the ring himself, all eight thrusts, then blinks to the middle for the 剑花.', 'Cast away, 2.5 to 6 u: eight images thrust and do the 剑花; he stays where he is.',
            '没有镜像：他亲自闪身穿过剑环，八刺全由他完成，最后闪到中央舞剑花。', '脱手施放，2.5 到 6 u：八个镜像完成八刺与剑花；他留在原地。'),
 'S37': ('He stays. When the wheel ends, press again within 2 s: he appears where it stopped and sweeps, 12 in 1.7 u, aimed by itself at the foes the wheel gathered.', None,
         '他不跟随旋刃。旋刃停下后 2 秒内再按：他出现在旋刃停处横扫，自动朝向旋刃聚拢的敌人，1.7 u 内 12 点。', None),
})
HEAD_EN = HEAD_EN.replace('Kit 2.2', 'Kit 2.3')
HEAD_ZH = HEAD_ZH.replace('技能 2.2', '技能 2.3')
FORM_E = ('Lunge Strike, Swift form: the ghost drills through the line again from where he stood, at half.', FORM_E[1], '贯刺，疾形态：残影从他原来的位置再钻刺穿过一次，伤害减半。', FORM_E[3])
# Kesh 18 Nov 20:32 SGT: Fox Step redrawn in every style, Rift Cut redrawn in Swift
EN.update({
 'S33': ['Three fox steps: a blink forward-left with a rising cut, a blink across with a backhand, then a low corkscrew straight through. Each step leaves a crimson shade holding its cut; the shades go out one by one as he lands on one knee.',
         'About 3 u, untouchable: 6, 6, then 12, up to 3 foes each.'],
})
ZH.update({
 'S33': ['三步狐影：向左前闪身上挑一刀，横闪反手一刀，再低身螺旋直穿而过。每一步都留下一道赤色残影定格在出刀姿态；他单膝落地时，残影逐一熄灭。',
         '约 3 u，无敌：6、6，最后 12，每步最多 3 个敌人。'],
})
FORMS_FIX.update({
 'S24': ('He rides the rift: it opens at once, he blinks across it three times in a Z (4 each, fins burst where he crosses), front-flips to its end and plunges the sword in (8 within 1.4 u); the whole rift erupts back towards where he began (4).', None,
         '他乘着裂痕而行：裂痕当即展开，他呈 Z 字三次闪身横穿（每次 4，穿过处剑鳍迸出），前空翻落到裂痕尽头把剑插入（1.4 u 内 8）；整条裂痕向起点方向爆发（4）。', None),
 'S33': ('The steps hunt: up to four blinks, each straight through a different foe ahead (6 each), then the corkscrew through the last (12). When he lands, every shade he left cuts once more (4).',
         'He stays: a side step and a cut down throws a 剑气, the step back and the crossing cut throws another (an X 2 u ahead, 6 each), then a turn and a rising cut sends a spiral 剑气 5 u along the floor (12, up to 3 foes).',
         '步步追猎：最多四次闪身，每次直穿前方不同的敌人（各 6），最后螺旋穿过最后一个（12）。落地时他留下的每道残影再斩一次（4）。',
         '原地不动：侧步下劈掷出一道剑气，回步交叉斩再掷一道（在前方 2 u 交成 X，各 6），再转身上挑，螺旋剑气沿地面冲出 5 u（12，最多 3 个敌人）。'),
})
