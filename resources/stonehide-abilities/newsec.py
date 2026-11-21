# newsec.py: the overnight review's "New, not passed" options (18 to 19 Nov), English and Chinese side by side.
# Motion cards: (clip, name en, name zh, [(en, zh), ...]). Video vid/new-<clip>.mp4, passed v10 left, new v11 right.
MOTION = [
 ('heavySlam', 'Heavy Slam', '重砸', [
  ('Falls like a tree: he rocks back behind the upright slab, then topples onto it with his feet planted.', '像树一样倒下：在竖起的盾后向后仰，然后双脚不动，扑倒在盾上。'),
  ('No more slab over the head and hop: Fault Line keeps that.', '不再举盾过头再跳：留给断层。')]),
 ('grudgeSlam', "Grudge's slam", '记仇的重砸', [
  ('He coils to his right, the slab rises edge first beside his left shoulder, and he chops it down.', '他向右拧身蓄力，盾以边缘先从左肩旁升起，然后劈下。'),
  ('Heavy breaths after it. No roar: Bellow keeps that.', '之后大口喘气。不再怒吼：留给咆哮。')]),
 ('colossus', 'Colossus', '巨像', [
  ('He sets the slab on its edge beside him and flexes one arm, head level.', '他把盾立在身旁，单臂鼓起肌肉，头保持水平。'),
  ('No arms-wide roar: Bellow keeps that.', '不再张开双臂怒吼：留给咆哮。')]),
 ('stoneheart', 'Stoneheart', '石心', [
  ('A statue: breath in, wide stance, the free arm hangs, a shiver that dies away, a slow breath out.', '像雕像：吸气，宽站，空手垂下，一阵渐弱的颤抖，慢慢呼气。'),
  ('No fist to the chest: Bloodboil keeps that.', '不再捶胸：留给沸血。')]),
 ('plant', 'Stone Ring', '石阵', [
  ('He lifts like a barrel: slab and fist low and wide, then up to his chest on his toes, looking left, then right.', '像抬木桶：盾和拳先放低张开，再踮脚抬到胸前，先看左再看右。'),
  ('No knock of the slab on the floor: Stone Cubs keeps that.', '不再用盾敲地：留给石崽。')]),
 ('digUp', 'Burrow, coming up', '掘地（钻出）', [
  ('He wipes the dirt off his face with the back of the free paw and flicks his head once.', '他用空手的手背擦掉脸上的土，再甩一下头。'),
  ('No wet-dog shake: Iron Bristles keeps that.', '不再像湿狗一样抖：留给铁鬃。')]),
 ('quills', 'Iron Quills', '铁刺', [
  ('He curls into a ball, hugging himself, and shakes the quills off his back.', '他缩成一团抱住自己，把背上的刺抖出去。'),
  ('No arms-wide roar: Bellow keeps that.', '不再张开双臂怒吼：留给咆哮。')]),
 ('boil', 'Bloodboil', '沸血', [
  ('Fists to the chest, then a wide bull stance: head low, a fist cocked at his hip, shoulders heaving, one snort.', '双拳捶胸，然后宽站成公牛姿势：低头，一拳收在腰边，肩膀起伏，喷一下鼻息。')]),
 ('bristle', 'Iron Bristles', '铁鬃', [
  ('The shake is the whole move: it dies away, the ears flick, he settles. No opening up at the end.', '抖动就是整个动作：抖完，耳朵一弹，站好。结尾不再张开。')]),
 ('toss', 'Rock Toss', '掷石', [
  ('The wrist cocks back, snaps through the release, then settles with a small shake.', '手腕先向后扣，出手时甩出，再轻轻一抖放松。')]),
 ('scatter', 'Iron Briar', '铁棘丛', [
  ('The open paw leads the sweep, then flicks over at the end of the throw.', '张开的手掌带着横扫，扔出时手腕一翻。')]),
 ('faultLine', 'Fault Line', '断层', [
  ('Heavy breaths through the long hold on the slab, ears flat until he lets go.', '压在盾上的长停顿里大口喘气，耳朵贴平，直到松手。')]),
 ('haul', 'Landslide', '山崩', [
  ('Mesh fix: the tail no longer dips under the floor in the heave.', '模型修正：拉回时尾巴不再穿进地面。')]),
 ('hop', 'Bodyguard', '护卫', [
  ('Mesh fix: the slab no longer touches his chin at the top of the hop.', '模型修正：跳到最高点时盾不再碰到下巴。')]),
]

# The longer load: one option for every move with a 0.10 s lead. Video vid/new-L-<clip>.mp4, half speed.
LOAD = ('Longer load', '更长的蓄力', [
  ('The load before the effect lasts twice as long, so the effect lands 0.155 s after the press instead of 0.10 s. The strike keeps its speed.', '效果前的蓄力时间加倍，所以效果在按键后 0.155 秒落下，而不是 0.10 秒。出手速度不变。'),
  ('It would change the kit rule for every skill except the four passed wind-ups. Four samples, half speed.', '这会改动除了四个已通过的长蓄力以外每个技能的套装规则。四个示例，半速播放。')],
  ['toss', 'throw', 'bite', 'scatter'])

# Kit cards: (id, name en, name zh, chip en, chip zh, [(en, zh), ...]). No video: these are ideas to pick before building.
KIT = [
 ('K1', 'Rock Toss', '掷石', 'Skill', '技能', [
  ('Same idea as Slab Throw: throw a thing at the foe nearest his aim.', '和掷盾同一个想法：把东西扔向瞄准处最近的敌人。'),
  ('New: he lobs the rock at the spot he aims, up to 7 u. It lands 0.5 s later: every foe within 1.3 u takes 12 (+3% HP), is taunted 4 s and stumbles 1.5 u toward him.', '新：他把石头抛向瞄准的地点，最远 7 u。0.5 秒后落地：1.3 u 内每个敌人受到 12（+3% 生命）伤害，被嘲讽 4 秒，并向他踉跄 1.5 u。'),
  ('It flies over stones and briar. Throw the stone and Rubble is ammo stay.', '它会越过石头和铁棘丛。“扔出咆哮石”和“碎石当弹药”保留。')]),
 ('K2', 'Iron Bristles', '铁鬃', 'Skill', '技能', [
  ('Same idea as the Iron Hide style: hits he takes go back to the foe.', '和铁皮流派同一个想法：他受到的伤害返还给敌人。'),
  ('New: for 5 s a foe that hits him in melee is pushed 1.5 u and slowed 40% for 1.5 s, once per foe a second. No damage back.', '新：5 秒内，近战打中他的敌人被推开 1.5 u，并减速 40% 1.5 秒，每个敌人每秒一次。不反伤。'),
  ('The push counts for Wall slam and the briar.', '这次推开算作撞墙和铁棘丛。')]),
 ('K3', 'Bodyguard', '护卫', 'Skill', '技能', [
  ('Same idea as the Take the Blow style: part of an ally\'s damage goes to him.', '和代受流派同一个想法：队友受到的一部分伤害转给他。'),
  ('New: he hops to the most hurt ally within 6 u and they swap places. The ally is lifted to his spot in 0.4 s and cannot be hit while it moves.', '新：他跳向 6 u 内受伤最重的队友并与其交换位置。队友在 0.4 秒内被送到他原来的位置，移动中不会被击中。'),
  ('His landing taunts every foe within 2.5 u for 3 s, and every foe that was attacking that ally.', '他落地时嘲讽 2.5 u 内所有敌人 3 秒，以及所有正在攻击那名队友的敌人。'),
  ('My guess: in co-op the swap moves another player, which some may not like.', '我的猜测：联机时交换会移动另一位玩家，有人可能不喜欢。')]),
 ('K4', 'Mountain', '山岳', 'Bedrock style', '基岩流派', [
  ('Same idea as Colossus: living stone, much less damage, nothing moves him, foes round him taunted.', '和巨像同一个想法：化为活石，大幅减伤，无法被移动，嘲讽周围敌人。'),
  ('New: when his health falls below 30%, for 5 s each Stone is worth 9% less damage instead of 3%, and the stop rises to 80%. Once every 40 s.', '新：生命低于 30% 时，5 秒内每块石头减伤 9%，而不是 3%，上限升到 80%。每 40 秒一次。'),
  ('No taunt and no "cannot be moved": Colossus keeps those.', '不嘲讽，也不免位移：留给巨像。')]),
 ('K5', 'Bloodboil', '沸血', 'Skill', '技能', [
  ('Same idea as the Blood Price style: burn his own health to hit harder.', '和血价流派同一个想法：燃烧自己的生命来打得更狠。'),
  ('New: he burns 10% of the health he has now. For 4 s he runs 40% faster, and each foe he walks into is shoved 0.6 u aside and takes 8 (+2% HP), once per foe.', '新：他燃烧当前生命的 10%。4 秒内移动速度提高 40%，撞到的每个敌人被推开 0.6 u 并受到 8（+2% 生命）伤害，每个敌人一次。'),
  ('My worry: it is a little like the dash. The dash is one burst; this is 4 s of running through.', '我的顾虑：它有点像冲刺。冲刺是一下爆发，这是 4 秒的横冲直撞。')]),
 ('K6', 'Grudge', '记仇', 'Skill', '技能', [
  ('Same idea as the Pent-up Iron style: store the damage, then let it all out round him.', '和积铁流派同一个想法：储存伤害，再在身边一次放出。'),
  ('New: for 3 s he marks every foe that hits him and takes 20% less. Then iron spikes burst under each marked foe, anywhere within 8 u: 20 (+4% HP), thrown up 0.6 s.', '新：3 秒内，他标记每个打中他的敌人，并减伤 20%。然后 8 u 内每个被标记的敌人脚下冒出铁刺：20（+4% 生命），击飞 0.6 秒。'),
  ('Quilled foes it hits still burst.', '被它击中的带刺敌人照样爆刺。')]),
 ('K7', 'Iron Briar', '铁棘丛', 'Skill', '技能', [
  ('Shares one line with Iron Quills: a foe that attacks takes 6.', '和铁刺有一句相同：攻击的敌人受到 6。'),
  ('New: drop "a foe that attacks from inside takes 6 more". The damage each second and the slow stay.', '新：删掉“在里面攻击的敌人多受 6”。每秒伤害和减速保留。')]),
 ('K8', 'Long Thorns', '长刺', 'Ironthorn style', '铁刺流派', [
  ('Shares a part with Counter Spin: when he is hit, foes within 2 u are hurt.', '和反击旋有一部分相同：他被打时，2 u 内的敌人受伤。'),
  ('New: drop the shards when he is hit. His thorn areas grow 35% (it was 25%), and the Iron store still holds half as much again.', '新：删掉被打时的刺伤。他的刺类范围扩大 35%（原来 25%），铁储量多一半保留。')]),
 ('K9', 'Stone Cubs', '石崽', 'Skill', '技能', [
  ('Shares a job with the Growlstone: helpers that taunt foes off his allies.', '和咆哮石有同一个任务：把敌人从队友身上嘲讽走的帮手。'),
  ('New: each bite holds the foe in place 0.4 s instead of taunting it. The roar with Bellow stays.', '新：每次咬住让敌人定住 0.4 秒，不再嘲讽。随咆哮一起吼保留。')]),
]

# Close views of every other move, so each can be judged near (the page's own clips are at play zoom).
CLOSE = [('bellow', 'Bellow', '咆哮'), ('rally', 'Rallying Cry', '战吼'), ('summonStone', 'Growlstone', '咆哮石'),
 ('callCubs', 'Stone Cubs', '石崽'), ('grind', 'Grindstone', '磨石'), ('throw', 'Slab Throw', '掷盾'),
 ('catch', 'Slab Throw, catch', '掷盾（接住）'), ('digDown', 'Burrow, going down', '掘地（钻入）'), ('maul', 'Maul', '狂撕'),
 ('bite', 'Savage Bite', '野性撕咬'), ('grab', 'Badger Toss', '獾摔'), ('spin', 'Counter Spin', '反击旋'),
 ('guardUp', 'Slabguard', '盾守'), ('shove', 'Slabguard, shove', '盾守（推）'), ('combo', 'Basic attack', '普通攻击'), ('grudgeBrace', 'Grudge, the count', '记仇（计数）')]
