# zh.py: Chinese text for Stonehide's review page (default language). Node names follow the
# game's own zh-Hans locale (src/i18n/locales/zh-Hans.json); everything else is new here.
NAMES = {
 'Bristle': '鬃怒', 'Basic attack': '普通攻击', 'Dash': '冲刺', 'Bellow': '咆哮', 'Rock Toss': '掷石',
 'Landslide': '山崩', 'Growlstone': '咆哮石', 'Fracture': '碎裂', 'Stone Ring': '石阵', 'Slab Throw': '掷盾',
 'Stone Cubs': '石崽', 'Slabguard': '盾守', 'Bodyguard': '护卫', 'Fault Line': '断层', 'Burrow': '掘地',
 'Rallying Cry': '战吼', 'Colossus': '巨像', 'Stoneheart': '石心', 'Heavy Slam': '重砸', 'Maul': '狂撕',
 'Bloodboil': '沸血', 'Savage Bite': '野性撕咬', 'Grindstone': '磨石', 'Badger Toss': '獾摔',
 'Iron Bristles': '铁鬃', 'Grudge': '记仇', 'Iron Briar': '铁棘丛', 'Iron Quills': '铁刺',
 'Counter Spin': '反击旋', 'Throw the stone': '扔出咆哮石', 'Slab pinball': '弹盾', 'Rubble is ammo': '碎石当弹药',
 'The cubs copy him': '石崽学样', 'Spike': '扣杀', 'Slab charge': '盾冲', 'Thorn slam': '棘刺摔',
 'Grudge bursts the quills': '记仇引爆铁刺', 'Bare Claws set': '空爪招式', 'Slabguard, Bare Claws': '盾守（空爪）',
 'Colossus, Bare Claws': '巨像（空爪）', 'Wall slam': '撞墙', 'Badger Toss into a wall': '獾摔撞墙',
 'Kick the stone': '踢石',
}
CHIPS = {
 'Class passive': '职业被动', 'Always on': '常驻', 'Taunt': '嘲讽', 'Helper': '帮手', 'Passive slot': '被动栏',
 'Zone': '领域', 'Guard': '防御', 'Move': '位移', 'Party': '团队', 'Big skill': '大招', 'Damage': '伤害',
 'Self': '自身', 'Burn': '燃血', 'Thorns': '反伤', 'Combo': '连携', 'Feral talent': '狂野天赋', 'Rule': '规则',
}
SECTIONS = {
 'Class passive': '职业被动', 'Attack and dash': '攻击与冲刺', 'Taunts and team play': '嘲讽与团队',
 'Stone and earth': '岩石与大地', 'Fury': '狂怒', 'Iron thorn': '铁刺', 'Combos': '连携', 'New moves': '新动作',
}
NODES = {
 'Quicken': '加速', 'Widen': '扩展', 'Tremor': '震颤', 'Anchor': '锚定', 'Crush': '碾压', 'Multiply': '倍增',
 'Reach': '延伸', 'Linger': '持久', 'Provoke': '挑衅', 'Sharpen': '磨砺', 'Ascend': '升华', 'Echo': '回响',
 'Snare': '缠绕', 'Galvanize': '激励', 'Resonance': '共鸣', 'Aegis': '庇护', 'Rampart': '壁垒', 'Retaliate': '报复',
}
UI = {
 'title': '石皮 技能',
 'sub': '全部通过 · 套装 1.6 · 26 个技能 · 8 个连携 · 用你的 Tripo 模型 · 平地，敌人画成木桩 · 特效是占位。',
 'shared': '每个技能也可以接：磨砺、升华、回响、缠绕、激励、共鸣、庇护和壁垒，有按键时还有报复。',
}
LINES = {
 # S13 Bristle
 'Free from the first room, no button.': '第一个房间就有，不用按键。',
 'Basic hits 1 and 3 and the dash taunt for free. Every 8 s he growls at a foe that is on an ally. Not on a boss.':
  '普攻第 1、3 击和冲刺免费嘲讽。每 8 秒，他对正在打队友的敌人低吼一次。对首领无效。',
 'Each foe taunted is a Stone: 3% less damage, up to 8. Each lasts 6 s, then flies at a foe within 4 u for 3.':
  '每嘲讽一个敌人得 1 层石：受到伤害少 3%，最多 8 层。每层持续 6 秒，然后飞向 4 u 内的敌人，造成 3 点伤害。',
 'A taunted foe that falls gives +1 max HP (up to +15 a level), and he grows 1% for every +5 (up to 15% taller).':
  '被嘲讽的敌人倒下时，最大生命 +1（每关最多 +15），每 +5 他长高 1%（最多高 15%）。',
 'A hit from a boss or champion, a shatter and a capped hit also give 1 Stone.':
  '被首领或勇士击中、碎裂、一次被封顶的伤害，也各给 1 层石。',
 # S14, S15
 'Shield bash 9, taunts 2 s. Fist hook 9.': '盾击 9，嘲讽 2 秒。勾拳 9。',
 'Overhead slam 14 + 4% HP; taunts every foe within 2 u for 3 s.': '举盾下砸 14 + 4% 生命；嘲讽 2 u 内所有敌人 3 秒。',
 'Two-paw shield charge, 2.2 u, untouchable.': '双爪举盾冲锋，2.2 u，无敌。',
 'Foes in the way are knocked aside, stunned 0.3 s and taunted 2 s.': '路上的敌人被撞开，眩晕 0.3 秒，嘲讽 2 秒。',
 'Out of Slabguard it is a Slab charge (C7).': '从盾守中冲刺就是盾冲（C7）。',
 # taunts
 'A roar 3 u round him: 6 damage, taunted 4 s.': '向周围 3 u 咆哮：6 点伤害，嘲讽 4 秒。',
 'A rock at the foe nearest his aim, up to 7 u: 12 + 3% HP, taunted 4 s.': '向准星最近的敌人扔石头，最远 7 u：12 + 3% 生命，嘲讽 4 秒。',
 'It stumbles 1.5 u toward him.': '敌人朝他踉跄 1.5 u。',
 'By the Growlstone he throws the stone (C1); by rubble, three rocks (C3).': '在咆哮石旁扔出咆哮石（C1）；在碎石旁扔三块石头（C3）。',
 'A strip 5 u long and 2.4 u wide slides back to him.': '一条长 5 u、宽 2.4 u 的地面朝他滑回来。',
 'Foes on it: 12, carried up to 3 u, taunted 3 s, slowed 30%.': '上面的敌人：12 点伤害，被带走最多 3 u，嘲讽 3 秒，减速 30%。',
 'Plants a Growlstone up to 5 u away for 8 s.': '在最远 5 u 处立一块咆哮石，持续 8 秒。',
 'Every 2 s it roars: foes within 3 u are taunted onto him and pay Stone.': '每 2 秒咆哮一次：3 u 内的敌人被嘲讽到他身上，并给他石层。',
 'A big blow within 2 u makes it roar at once, 1 u wider.': '2 u 内有重击时它立刻咆哮，范围大 1 u。',
 'His hits and taunts crack a foe. Then every hit from anyone adds a Crack (one per attacker each 0.5 s).':
  '他的攻击和嘲讽让敌人开裂。之后任何人的每次攻击都加 1 道裂痕（每个攻击者每 0.5 秒一道）。',
 'At 4 Cracks it shatters: 12 + 4% HP, stunned 1 s.': '4 道裂痕时碎裂：12 + 4% 生命，眩晕 1 秒。',
 'Heavy hits (Heavy Slam, Fault Line, Burrow, Badger Toss, wall slam) put 2 Cracks.': '重击（重砸、断层、掘地、獾摔、撞墙）加 2 道裂痕。',
 'Standing stones rise round him, 3.5 u, for 4 s. Walking foes cannot cross; foes inside are taunted 4 s.':
  '他周围 3.5 u 升起一圈立石，持续 4 秒。走路的敌人过不去；圈内敌人嘲讽 4 秒。',
 'Heroes and shots pass.': '英雄和投射物可以穿过。',
 'Throws the slab at the foe nearest his aim, up to 7 u. It bounces to 3 more within 4 u: 14 + 3% HP, taunted 3 s each.':
  '把石盾扔向准星最近的敌人，最远 7 u。再弹向 4 u 内的另外 3 个：各 14 + 3% 生命，嘲讽 3 秒。',
 'It flies back to his paw.': '石盾飞回他爪中。',
 'It also bounces off his stones (C2).': '也会在他的立石上反弹（C2）。',
 'Two stone cubs climb out for 10 s and run to foes attacking an ally.': '两只石崽爬出来，持续 10 秒，跑向正在打队友的敌人。',
 'Bites 6 a second; each bite taunts the foe onto him 2 s.': '每秒咬 6 点；每一口把敌人嘲讽到他身上 2 秒。',
 'They dig and roar with him (C4).': '它们跟他一起掘地和咆哮（C4）。',
 # stone
 'Holds the slab toward his aim for 3 s, walking at 60%. Shots that reach its 120° front stop there.':
  '朝准星举盾 3 秒，走速 60%。打到前方 120° 的投射物停在盾上。',
 'Front hits 40% smaller. Foes within 5 u in front are taunted 3 s.': '正面受到伤害少 40%。前方 5 u 内的敌人嘲讽 3 秒。',
 'Stopped shots fly back at the shooter for half damage.': '挡下的投射物飞回射手，造成一半伤害。',
 'Ends with a shove: 14 + 4% HP, pushed 1.5 u.': '结束时推盾：14 + 4% 生命，推开 1.5 u。',
 'Skills on himself work under it; any other press ends it.': '对自己的技能可以照常用；按其他键会结束。',
 'Hops in 0.4 s to the most hurt ally within 6 u. The landing taunts foes within 2.5 u for 3 s.':
  '0.4 秒跳到 6 u 内伤得最重的队友身边。落地嘲讽 2.5 u 内的敌人 3 秒。',
 'For 5 s half the damage that ally takes goes to him, and both take 15% less.': '5 秒内那位队友受到的伤害一半转给他，两人受到伤害都少 15%。',
 'After 0.4 s a crack runs 6 u: 30 + 6% HP, taunted 2 s.': '0.4 秒后一道裂缝延伸 6 u：30 + 6% 生命，嘲讽 2 秒。',
 'Foes on it are thrown up 0.6 s (the first 1 s), and so are foes within 1.5 u of him.': '裂缝上的敌人被掀飞 0.6 秒（前 1 秒内），他身边 1.5 u 的敌人也是。',
 'Its rubble slows 35% for 4 s.': '留下的碎石减速 35%，持续 4 秒。',
 'Digs in, tunnels up to 5 u, bursts up: 24 + 6% HP within 2.2 u.': '钻进地下，最远潜行 5 u，破土而出：2.2 u 内 24 + 6% 生命。',
 'Thrown up 0.6 s, taunted 3 s. Untouchable underground.': '掀飞 0.6 秒，嘲讽 3 秒。在地下时无敌。',
 'Leaves rubble where he comes up.': '出土处留下碎石。',
 'He and allies within 4 u: 20% less damage for 4 s, 20% more for 3 s.': '他和 4 u 内的队友：4 秒内受到伤害少 20%，3 秒内造成伤害多 20%。',
 'After 0.3 s he grows 40% taller into a stone giant for 8 s. Foes within 4 u are taunted 4 s.': '0.3 秒后变成高 40% 的石巨人，持续 8 秒。4 u 内的敌人嘲讽 4 秒。',
 '30% more max HP at the same share, 20% less damage, 20% more damage, 25% more reach.': '最大生命多 30%（生命比例不变），受到伤害少 20%，造成伤害多 20%，攻击距离多 25%。',
 'His Heavy Slam and hit 3 leave rubble.': '他的重砸和普攻第 3 击留下碎石。',
 'For 5 s no single hit takes more than 5% of his max HP (reduced first, then capped).': '5 秒内任何一次伤害都不超过他最大生命的 5%（先减伤，再封顶）。',
 'Each capped hit gives 1 Stone and a Crack, at most once a second.': '每次被封顶的伤害给 1 层石和 1 道裂痕，每秒最多一次。',
 # fury
 'After 0.3 s: 34 + 8% HP to up to 3 foes in front, +1 for each 1% damage reduction he has.': '0.3 秒后：对前方最多 3 个敌人 34 + 8% 生命，他每有 1% 减伤再 +1。',
 'It sends the Growlstone rolling 5 u. On a foe in the air it is a Spike (C5).': '能把咆哮石砸得滚出 5 u。砸到空中的敌人就是扣杀（C5）。',
 '6 swipes in 2 s, 7 + 1% HP each, walking at half speed.': '2 秒内 6 次爪击，每次 7 + 1% 生命，走速减半。',
 'Each swipe that hits: attacks 5% faster for 4 s, up to 30%.': '每次命中：攻速 +5%，持续 4 秒，最多 30%。',
 'Burns 10% of his health. For 6 s: 25% more damage, attacks 25% faster.': '燃烧自己 10% 生命。6 秒内：伤害 +25%，攻速 +25%。',
 'Lunges 1.5 u and bites: 28, plus 0.8 for each 1% health missing.': '前扑 1.5 u 咬一口：28，每少 1% 生命再 +0.8。',
 'A kill gives back half the cooldown.': '击杀返还一半冷却。',
 'Health he burns is kept as a debt (up to 20% max HP); the next bite adds it all.': '燃烧掉的生命记成血债（最多 20% 最大生命）；下一口全部加上。',
 '6 s of grinding dust round him. He loses 3% max HP a second (stops at 10%).': '他周围卷起 6 秒磨石尘。他每秒失去 3% 最大生命（降到 10% 为止）。',
 'Foes within 2.5 u lose 6% of his max HP a second.': '2.5 u 内的敌人每秒失去相当于他最大生命 6% 的生命。',
 'Grabs the foe nearest his aim within 1.5 u and, 0.55 s later, throws it up to 5 u.': '抓住 1.5 u 内准星最近的敌人，0.55 秒后扔出最远 5 u。',
 'It and foes within 1.5 u of the landing: 20 + 5% HP, stunned 0.6 s.': '它和落点 1.5 u 内的敌人：20 + 5% 生命，眩晕 0.6 秒。',
 # iron
 'For 5 s each hit he takes returns 60% (+3% HP) to the attacker, at any range.': '5 秒内每次受击都把 60%（+3% 生命）反给攻击者，不论远近。',
 'For 3 s he counts every hit and takes 20% less.': '3 秒内他记下每次受到的伤害，并且受到伤害少 20%。',
 'Then, 0.35 s later, he slams within 3 u: 20 + all he counted (up to 50% max HP).': '然后过 0.35 秒砸地 3 u：20 + 记下的全部伤害（最多 50% 最大生命）。',
 'The slam bursts every quilled foe (C9).': '这一砸引爆所有带铁刺的敌人（C9）。',
 'Thorns in a 2.4 u circle, up to 4 u away, for 5 s: 6 a second, slowed 25%.': '在最远 4 u 处长出 2.4 u 的铁棘圈，持续 5 秒：每秒 6，减速 25%。',
 'A foe that attacks from inside takes 6 more.': '在圈里攻击的敌人再受 6 点。',
 'A foe pushed or thrown into it is impaled (C8).': '被推进或扔进去的敌人被刺穿（C8）。',
 'A quill to each foe within 4 u (up to 8): 10.': '向 4 u 内每个敌人射一根铁刺（最多 8 个）：10。',
 'For 5 s a quilled foe takes 6 each time it attacks.': '5 秒内带铁刺的敌人每攻击一次受 6 点。',
 'A quilled foe that falls sends quills to 3 more within 3 u.': '带铁刺的敌人倒下时，向 3 u 内另外 3 个射出铁刺。',
 'Every 5th hit he takes, he spins: 14 + 3% HP to foes within 2 u. At most one spin a second.': '每受到第 5 次攻击就旋转一次：2 u 内敌人 14 + 3% 生命。每秒最多一次。',
 'It never cuts his combo.': '不会打断他的连击。',
 # combos
 'Rock Toss by the Growlstone throws the stone: 16 to foes within 1.5 u, taunted 3 s, and it roars at once.': '在咆哮石旁用掷石会扔出咆哮石：1.5 u 内敌人 16，嘲讽 3 秒，它立刻咆哮。',
 'The slab bounces off his stones and may hit a foe again.': '石盾在他的立石上反弹，可以再打中同一个敌人。',
 'Rock Toss by rubble throws three rocks and uses the rubble up.': '在碎石旁用掷石扔三块石头，碎石用掉。',
 'The cubs burst out with him for 8, and roar with him: taunted 2 s.': '石崽跟他一起破土，造成 8；跟他一起咆哮：嘲讽 2 秒。',
 'A foe thrown up is slammed down: 50% more, 10 to foes within 1.5 u.': '把掀飞的敌人砸回地面：伤害 +50%，1.5 u 内敌人受 10。',
 'The foes in front go with him, into a wall: wall slam.': '前面的敌人被他一起推走，撞到墙上就是撞墙。',
 'Thrown into the briar: impaled, 12 + 3% HP, quilled 5 s.': '扔进铁棘丛：刺穿，12 + 3% 生命，带铁刺 5 秒。',
 'Each quilled foe in the slam bursts: quills fly to 3 more within 3 u for 10.': '砸中的每个带铁刺敌人都会爆开：铁刺飞向 3 u 内另外 3 个，各 10。',
 # moves
 'The slab is gone: both paws swing as fists.': '没有石盾：两只爪子都当拳头挥。',
 'Claw rake, hook, both fists down. The dash is a shoulder ram.': '爪挠、勾拳、双拳下砸。冲刺变成肩撞。',
 'He rips a slab out of the floor and holds that. It breaks on the shove.': '他从地上撕起一块石板举着。推出去时石板碎掉。',
 'A giant with bare claws.': '空爪的石巨人。',
 'A foe he pushes or throws into a wall takes 10 + 3% HP more and is stunned 0.5 s.': '被他推或扔到墙上的敌人多受 10 + 3% 生命，并眩晕 0.5 秒。',
 'The thrown foe meets the wall: wall slam.': '扔出的敌人撞上墙：撞墙。',
 'Heavy Slam on the Growlstone rolls it 5 u: 16, knocked aside, taunted 3 s.': '对咆哮石用重砸，把它砸得滚出 5 u：16，撞开，嘲讽 3 秒。',
}
