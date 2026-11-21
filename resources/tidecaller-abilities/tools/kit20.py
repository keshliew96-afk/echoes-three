# kit 2.2 page text: Flood's lines, the Tsunami and Bubble lines that changed, which cards are new to Kesh, and what still needs his mark
FL = {
 'P': L('涨潮：拍会在被拍的敌人脚下留一个水洼（1.2 u，4 秒）。静水只浸湿，不伤害；碰在一起的水算一片。', 'Flood: a Crash leaves a puddle (1.2 u, 4 s) under each foe it crashes. Still water soaks and does no damage; water that touches is one piece.'),
 'B': L('水流停在一处 1 秒就积水：一个水洼，长到 2 u。海啸走过的整条路留成水，6 秒。', 'Where the stream stays 1 s it pools: one puddle that grows to 2 u. The tsunami leaves its whole path as water, 6 s.'),
 'D': L('下潮的地方沉成一个水塘，2.6 u，8 秒。', 'Where she steps off, the tide sinks into a pond, 2.6 u, 8 s.'),
 'F1': L('添塘：水弹落地炸开：1.5 u 内 14，留下水塘 2 u，6 秒；打在自己的水上也一样留一个。', 'Pond-maker: the bolt bursts where it lands: 14 within 1.5 u, and leaves a pond, 2 u, 6 s, on her own water too.'),
 'F2': L('开渠：水柱的线留成水渠（1.5 u 宽，6 秒）。渠水很急：踩进去的小敌人被冲到尽头，拍岸。', "Canal: the jet's line stays as a canal (1.5 u wide, 6 s) with a fast current: a small foe that steps in is swept to its far end and Slams."),
 'F3': L('摔水：把抓住的敌人摔进她最近的水里：它摔倒，那片水里 3 u 内的敌人各 12。', 'Dunk: the grabbed foe is dunked into her nearest water: it lands flat, and every foe in that water within 3 u takes 12.'),
 'F4': L('逐水：在她的水里，石片在站在水里的敌人之间跳，最多 8 跳：各 10，最后 16。', 'Pond-hopper: in her water the stone skips from foe to foe standing in it, up to 8 skips: 10 each, the last 16.'),
 'F5': L('赶水：扇形把打中的敌人冲向她最近的水，最多 2.5 u。', 'Sweep-in: the fan washes the foes it hits up to 2.5 u toward her nearest water.'),
 'F6': L('画水：水珠滚到哪里，哪里留下静水（宽 1 u，6 秒）。笔画围成一圈，圈里灌满。松开：在笔画尽头爆开。', "Paint: the orb trails still water wherever it rolls (1 u wide, 6 s). A stroke that closes a loop fills the floor inside. Let go: it bursts at the stroke's end."),
 'F7': L('伏雷：抛进她的水里就沉下去，在水下游向离指针最近的敌人，从脚下炸开：2.5 u 内 18 到 36。水里没人就等着，最多 8 秒。', 'Sleeper: lobbed into her water it sinks, swims under it to the foe nearest the pointer and goes up there: 18 to 36 within 2.5 u. No foe in the water: it waits, up to 8 s.'),
 'F8': L('开闸：不出水柱。2 秒里水从杖脚涌出铺开：一片海，长 8 u、宽 5 u，留 8 秒。浪头：拍 24。关闸时整片海回拍一次：16。', 'Open the gate: no beam. For 2 s water pours out at the staff: a sea 8 u long and 5 u wide, 8 s. Its front: Crash 24. When the gate shuts the sea slaps back once: 16.'),
 'F9': L('涨环：站在自己的水里放：环浪把这片水里的小敌人带到水边，再甩出 1 u：22。', 'Spreading ring: cast standing in her water, the ring carries the small foes in it out to the edge and 1 u beyond: 22.'),
 'F10': L('滚潮：浪在她的水上不停，水有多长滚多长（最多 10 u），越滚越大：每 2 u 水 +4，到 32。', 'Roll-up: over her water the wave rolls on as far as the water goes (up to 10 u) and grows: 4 more for each 2 u, to 32.'),
 'F11': L('连潮：冷却 6 秒。每片水涨出边外 1 u，那里的敌人也挨打；涨出的水留 9 秒。9 秒内再唤：22。', 'Tide on tide: cooldown 6 s. Every piece spills 1 u past its edge and hits the foes there too; that rim stays 9 s. Cast again within 9 s: 22.'),
 'F12': L('搅水：漩涡碰着她的水时，每秒 4 和减速传遍整片水。', 'Stir: while the pool touches her water, its 4 a second and its slow run through that whole piece.'),
 'F13': L('瀑潭：瀑布下的水潭越铺越宽，4 秒到 5 u。再按：整个水潭里的敌人各 16。水潭留 6 秒。', 'Plunge pool: under the fall a pool spreads, to 5 u wide at 4 s. Press again: 16 to every foe in the pool. The pool stays 6 s.'),
 'F14': L('破浪：踏浪 2.5 秒；身后留下水路（2 u 宽，6 秒），经过的敌人被吸到水路上。', 'Bow wave: she rides 2.5 s; the wave lays a road of water behind her (2 u wide, 6 s) and draws the foes she passes onto it.'),
 'F15': L('撞水：落点 4 u 内她的水向中间合拢，把水里的小敌人带过来：18，眩晕 0.5 秒。水再流回去。', 'Pond clap: her water within 4 u of the spot folds in and carries its small foes there: 18, stun 0.5 s. Then the water runs back.'),
 'F16': L('排空：全房间的水流向她，拖着水里的敌人；然后爆开：40，每吸一处水 +6、远 0.3 u（最多 5 处）。水用光，只留脚下一个塘。', 'Drain: all her water in the room runs to her, dragging its foes; then the burst: 40, 6 more and 0.3 u farther out for each water drained (up to 5). The water is spent; one pond is left.'),
 'F17': L('凌波：落在她的水上的一步不算数：最多六步。水上的涟漪宽一倍（3 u）。', 'Water walk: a step that lands on her water is free: up to six steps. A ripple on her water is twice as wide (3 u).'),
 'F18': L('溢泡：10 的泡泡；每个打它的敌人脚下多一个水洼。破了：队友站的地方留下水塘，3 u，6 秒。', 'Spill: a 10 bubble; each foe that hits it gets a puddle under its feet. It pops: a pool stays where the friend stands, 3 u, 6 s.'),
 'F19': L('悬雨（你的设计）：雨如基础；每秒三滴停在空中，1 秒后射向水流下的敌人：每滴 2。雨停后地面留成水塘，6 秒。', 'Hanging rain (your design): the base rain; each second three drops hang, and 1 s later hit the foe her stream is on: 2 each. After the rain its floor stays as a pool, 6 s.'),
 'F20': L('喷涌：在她的水上，喷口 3 u 内的水一起掀起：站在上面的敌人各 16，挑飞。', 'Blowout: on her water, the water within 3 u of the vent goes up with it: 16 to every foe on it, launched.'),
 'F21': L('陷水：在她的水上：目标和 1.5 u 内的小敌人陷到脖子，1.5 秒不能动；然后被抛出：各 12。', 'Sink: on her water, the foe and the small foes within 1.5 u sink to the neck, held 1.5 s; then they are thrown out: 12 each.'),
 'F22': L('鱼跃：在自己的水下不走表（最多 3.5 秒）。一跃跳向指针（最多 4 u），落水溅开：2 u 内 14，水下每秒 +4、远 0.4 u。', 'Porpoise: under her own water the clock does not run (3.5 s at most). One great leap to the pointer (up to 4 u): 14 within 2 u, and 4 more and 0.4 u farther out for each second under.'),
 'F23': L('共潮：队友站在她的水里时，打浸湿的敌人算小拍：+30%，浸湿用掉。', 'Shared water: while the friend stands in her water, their hits on a soaked foe are a small Crash: 30% more, and the soak is spent.'),
 'F24': L('水乡：水穹宽 5 u；最多五条水渠从它流出：先连她 8 u 内的水，其余流到外面最近的敌人脚下。塌下后再留 8 秒。', 'Lagoon: the dome is 5 u wide; up to five canals run out of it: to her waters within 8 u first, the rest to the nearest foes outside. They stay 8 s after it falls.'),
}
SU = {
 'P': L('海啸：拍溅出的水浸湿 1.5 u 内别的敌人。', "Tsunami: a Crash's spent water soaks the other foes within 1.5 u."),
 'B': L('海啸 3 秒就来，宽一倍（2.6 u），把小敌人卷到尽头（6 u）。', 'The tsunami comes after 3 s, is twice as wide (2.6 u) and carries small foes to its end (6 u).'),
 'D': L('下潮后浪不停：再滚 5 u，宽一倍（2.6 u）：10，推 1.5 u。', 'The tide rolls on 5 u, twice as wide (2.6 u): 10, pushed 1.5 u.'),
 'F1': L('浪头：水弹如基础；它停下的地方横着立起一道浪，宽 4 u，再滚 2 u：14，推 1 u。', 'Wave head: the bolt as the base; where it stops a wave rises across her aim, 4 u wide, and rolls 2 u on: 14, pushed 1 u.'),
 'F3': L('甩浪：不抓人。水鞭在身前扫半圈（4 u），鞭下一道浪跟着扫：12；最多 5 个小敌人被卷到尽头，堆成一堆。', "Whip wave: no grab. The whip sweeps a half circle (4 u) with a wave under its whole length: 12; up to 5 small foes are carried to the arc's end in one heap."),
 'F10': L('三叠浪：三道浪一道比一道大：2.2 u、3.5 u、5 u；每道 8，推 1.2 u。浸湿的每次滑更远，第三道才拍；撞墙会撞击。', 'Three Crests: three crests, each bigger: 2.2 u, 3.5 u, 5 u; 8 each, pushed 1.2 u each. A soaked foe slides farther each time; the third is the Crash; one pushed into a wall Slams.'),
 'F15': L('夹击：两道浪撞在一起：20，不眩晕，夹在中间的敌人被挤出 3 u。', 'Vice: the two waves crush together: 20, no stun; foes caught between squirt out 3 u.'),
 'F17': L('蹬浪：三步落地没有涟漪。最后一步，尾巴一扫，一道浪顺来路打回去，步数越多越大：8、16 或 24。', 'Kick waves: the steps leave no ripple. On the last landing one wave runs back down her trail, bigger for each step: 8, 16 or 24.'),
}
BU = {
 'P': L('泡沫：拍会在最近的队友身上留一个 8 的泡泡。', 'Bubble: a Crash leaves an 8 bubble on the nearest friend.'),
 'F9': L('泡锤（你的设计）：水流下的敌人被封进泡泡（12，浸湿）；她把它挑高再砸下，原地三次：每下一圈浪，1.8 u 内 12，泡里的 6；第三下泡泡破：拍 22。', 'Bubble flail (your design): the foe her stream is on is caught in a bubble (12, soaked); she slams it down where it stands three times: each slam 12 within 1.8 u, 6 to the foe inside; the third pops it: Crash 22.'),
}
NEW20 = {('fl', k) for k in FL} | {('su', k) for k in ('P', 'B', 'D', 'F1', 'F3', 'F10', 'F17')} | {('bu', 'P'), ('bu', 'F9')}
FLAG = {}  # his five calls were settled on 21 Nov (all a), so no card carries a note
OPEN = [
 L('蹬浪留下（不换回对调）', 'Kick waves stay, in place of Swap'),
 L('三叠浪一道比一道大', 'Three Crests grows'),
 L('不设专打首领的风格', 'No style is the boss path'),
 L('悬雨的雨针只打一个敌人', "The Hanging rain's needles hit one foe"),
 L('共潮不改', 'Shared water stays as it is'),
]
