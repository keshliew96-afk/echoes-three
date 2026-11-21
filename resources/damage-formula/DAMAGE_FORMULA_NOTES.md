# 伤害公式：细节笔记 (notes)

**版本 1.2.1，2026-11-18。**（1.2.1：Ashfang 的归类换成他的设计线程按 2.4 做的，N42 到 N46。） 配合 `DAMAGE_FORMULA.md`（短的那份，D1 到 D42）。这里是细节，编号 N1 到 N66。
Kesh 的选择已写入："1a, 2a, 3a, 4a, 5b, 6a, 7a, 8a"，加上护盾、效果抵抗，和"有防御的怪血量只稍微调低"；12:01 又定了"9a 无上限, 10b, 11b, 12b"，12:23 定了"13a"。
只是设计稿，冻结期间不进游戏。所有数字是初步猜测，没有在游戏里量过。

读过的东西：repo `gauntlet` v0.5.366 的 `src/sim/combat.js`、`src/sim/status.js`、`src/sim/relics.js`、
`src/sim/affixes.js`、`src/data/difficulty.js`、`docs/BUILD_BRIEF.md` §9 和 §23.8、`docs/TALENTS.md`；
Mosslight 天赋 3.4 和 kit 2.0 改动表；Stonehide 天赋 1.6；Ashfang kit 2.0 和天赋 2.1。

---

## 1. 今天游戏里的伤害是怎么算的

- **N1.** 现在只有一条管线（`applyDamage`）：技能威力 → 攻击者的 inspired 和神龛加成 → 遗物增伤 →
  一次暴击判定（5%，× 1.5）→ 目标的 exposed、ward、Boss 窗口、遗物减伤 → 护盾 → 扣血。
- **N2.** 没有攻击力属性，没有防御，没有抗性，没有伤害类型（BUILD_BRIEF §9 明文写着）。技能直接写固定数字。
- **N3.** 持续伤害今天只是每跳调用一次同样的管线，所以每一跳都能暴击。
- **N4.** 同一种状态重复施加时取最大值、不叠加（§23.8）。新公式的"同名取最大"沿用这条。

## 2. 今天的东西归到哪个区

| | 今天的东西 | 归入 |
|---|---|---|
| N5 | 技能威力、普攻威力；怪的威力 × 关卡倍率（`dmgMul`）；Tidecaller 的 Crash 技能对 soaked 的 +60%（写在技能上的条件，N16） | 基础伤害区 |
| N6 | 暴击 5% 和 × 1.5；Keen 节点的暴击率；Lethality 的 × 2.2（= 暴伤 +70%）；遗物的暴击率和暴伤；Nightfall Veil 的必暴 | 暴击区 |
| N7 | inspired；神龛的 might；遗物的增伤（Ashen Crown 等） | 增伤区 |
| N8 | exposed；Prey 节点 25%；诅咒让队伍多受的伤 | 易伤区 |
| N9 | ward；神龛的 ward；遗物的减伤；Vesper Hush | 减伤区 |
| N10 | Boss 的撞晕、力竭、淬火窗口（× 1.25 到 1.3） | 破绽区（6a，已定） |
| N11 | 无敌帧、Ram 的角盾、招架 | 公式之前：没有伤害，也不掷暴击 |
| N12 | 护盾 | 公式之后，扣血之前 |
| N13 | 没有 | 抗性区和防御区今天都等于 1 |

- **N14. 会和今天不一样的地方：**
  1. 今天 inspired、神龛 might、遗物增伤是互相乘的；进了同一个增伤区就改成相加。只有同时有两种以上才看得出差别。
  2. 持续伤害不再暴击。
  3. 遗物的减伤今天是互相加的（最多 90%）；5b 之后每件各自相乘。
  4. 精英、冠军、Boss 有了防御，血量只稍微调低，所以没有减防的打法打它们会慢一些（D39）。

## 3. 每个区的补充规则

- **N15. 基础伤害区。** 三种东西放这里：
  1. 卡面数字（Lunge Strike 的 26）。
  2. 属性加成：Stonehide 的"+X% 最大生命"、Weight of stone 的 +1 每 1% 减伤、Blood Price 的"烧掉的血 × 2"。
  3. 技能自身倍率：写在那个技能或连招上的条件。Crescent Finisher 每个技能 +50%，Spike +50%，Crush × 1.5，Boss 免疫控制时的 +20%，"第二道波对已命中的怪减半"，"原来那一击的 70%"。这些互相乘（所以 Spike 加 Crush 仍是已通过的 × 2.25）。
- **N16. 怎么分"技能自身倍率"和"增伤"。** 写在一个技能上、只管那一击的，是技能自身倍率。挂在英雄或队友身上、管他所有伤害的，是增伤。
- **N17. 暴击区。** 每次伤害只掷一次。暴击率超过 100% 的部分今天没有用处（以后可以做成一条遗物：溢出转暴伤）。
- **N18. 增伤区。** 带条件的增伤也在这里相加：Calm Edge +15%，Keen Point +25%，Honed Wave +25%。
- **N19. 易伤区。** "只对某个英雄生效"的易伤（See Through：只多受 Ashfang 的伤害）也在这里，只是别人打时不算。
- **N20. 减伤区（5b）。** 每个来源各自相乘，没有上限：20% 和 30% 是 1 − 0.8 × 0.7 = 44%，不是 50%。同一个状态重复给仍然取最大，不自己乘自己。攻击者的虚弱也是其中一个乘数。这会改 Stonehide 已通过的规则，见 N47。
- **N21. 抗性区（选项 1a）。** 形态用游戏已有的数据：近战（`melee_arc`、接触）、远程（`projectile`）、范围（`nova`、`ground_aoe`）、持续（DoT）。
  - 小怪没有抗性也没有弱点。精英的词缀、冠军、Boss 可以有一个弱点或一个抗性。
  - 弱点多于抗性，永远没有免疫：免疫会让一种打法在一个房间里完全没用，不爽。
  - 弱点要在血条旁边有图标。
- **N22. 防御区（选项 2a）。** 公式 100 ÷（100 + 防御）：防御 25 是 × 0.8，40 是 × 0.71，50 是 × 0.67。
  - 减防（怪身上的减益）和无视防御（英雄身上的加成）相加，最多 100%，这时防御区回到 1。
  - 血量只稍微调低（Kesh）：精英 −5%，冠军 −8%，Boss −10%。没有减防的打法：精英约慢 19%，冠军约 29%，Boss 约 35%。减防 50% 打 Boss 就回到只慢约 13%，真实伤害完全不受影响。这三个血量数字是最先要量的。
  - 英雄默认防御 0。以后遗物或天赋可以给。
  - 小怪防御是 0，所以减防对小怪没用。这是有意的：减防是打精英和 Boss 的工具。

## 4. 每种伤害的补充规则

- **N23. 命中、施放、伤害是三件事。**
  - 施放 cast：给印记、进冷却、触发 Blood Price。
  - 命中 hit：触发击中特效（D8）。
  - 造成伤害：四种类型都算。Mosslight 的 Sap、吸血、伤害统计都按最后扣掉的血量算，不看类型。
  - 例子：Ashfang 的 special 不是施放，但是命中，是直伤。Afterimage 的重复也一样。
- **N24. DoT。**
  - 每跳 = 每跳基础 × 增伤 × 易伤 × 减伤 × 抗性 × 防御，默认每秒一跳。
  - 同一个技能的 DoT 重新施加就刷新；不同技能的 DoT 可以同时在一只怪身上。
  - **引爆**（把剩下的 DoT 一次打完）：还是 DoT 类型，不暴击，按剩余量算。现在没有技能用它（Ashfang 的 Settle 随剑痕一起去掉了），留给以后。
  - DoT 的一跳不算命中。Kit 里已通过的例外保留：Mosslight 的荆棘每秒算一次命中，会吵醒睡着的怪；nightmares 不会。
  - 击杀算在上 DoT 的人头上。
- **N25. 附加伤害。** 它自己有基础数字，自己掷暴击（选项 3a）。它不算命中，所以不给印记、不叠层、不触发精英的 Thorned 反伤。
- **N26. 真实伤害。**
  - 不暴击，不吃增伤，不吃目标的易伤，无视减伤、抗性、防御。
  - 只有"真实伤害倍率"能放大它，而且倍率之间相加：Iron Hide 30% + Barbs 10% + Reckoning 70%，上限 150%。这就是 Stonehide 已通过的 thorn rule。
  - 对 Boss 和冠军翻倍这类写法，算在倍率里（铁储爆发）。
  - 不算命中，所以反甲永远不会被反甲再弹回来（今天精英的 Thorned 词缀会反伤，没有这条就会循环）。
  - 怪的普通攻击不用真实伤害。只留给机制惩罚（比如狂暴）。
- **N27. 召唤物和植物。** 它们的伤害算主人的，吃主人此刻的增伤和暴击。
- **N28. 治疗（8a，已定）。** 治疗 = 基础治疗 × 暴击区 × 治疗加成区（施法者，相加）× 受疗区（目标，相加）。
  Rings 的 +2% 和 sweetened 的 +30% 都在受疗区相加，这是 Mosslight 已通过的写法。诅咒的减疗是另一个乘数。Sap 的灌注不暴击（已通过）。
  持续治疗（Moss）不暴击，和 DoT 对称；今天游戏里每次治疗都能暴击，所以这是一个改动。

## 5. 三位英雄归类

我的归类，等各自的 kit 线程确认。没列出来的技能都是直伤。

**Mosslight**

| | 东西 | 归入 |
|---|---|---|
| N29 | 荆棘、Creeping Moss 的缠绕、大雨、nightmares、Rootsnare 和 Puffcap 和萤火虫的每秒伤害、Deep Roots 留下的荆棘 | DoT |
| N30 | Thorn moss（打她护着的队友的怪受 6）、Pollen Gust 的撞墙 +10 | 附加伤害 |
| N31 | 萤火虫的 exposed、Puffcap 的 20%、被吵醒的 20% | 易伤区（同名取最大） |
| N32 | Bark 10% | 减伤区 |
| N33 | Bounty：被灌注的队友 +10% | 增伤区 |
| N34 | Reap 存 Sap | 四种伤害都算 |

**Stonehide**

| | 东西 | 归入 |
|---|---|---|
| N35 | Stone、Stubborn、Slabguard、Colossus、Rallying Cry | 减伤区，各自相乘（N47） |
| N36 | Bare Claws 多受 20% | 他自己身上的易伤区（1.2 × 0.76 = 91%，和已通过的一样） |
| N37 | Bare Claws 25%、Bloodlust 10%、Bloodboil 25%、Colossus 20% | 增伤区，相加（4a）：四个全开是 +80% |
| N38 | Iron Hide、Barbs、Reckoning、Iron Bristles 的反伤；Long Thorns 的刺；铁储爆发；弹回去的子弹 | 真实伤害 |
| N39 | Blood Price 的加成、Weight of stone、"+% 最大生命"、Crush、Spike | 基础伤害区 |
| N40 | Blood Price、Grindstone、Bloodboil 的烧血 | 生命消耗，不是伤害 |
| N41 | Stoneheart 的单击封顶、Take the Blow 的转移、Deathless | 公式之后（D15） |

**Ashfang**（他的设计线程按设计 2.4 归的，全文在 `/mnt/project-files/ashfang-talents/ASHFANG_TALENT_PATHS.md` 的 T46；我原来按 kit 2.0 的归类作废）

| | 东西 | 归入 |
|---|---|---|
| N42 | 普攻六击、冲刺突刺、所有技能、形态加的突刺和剑气和剑风、十个 special；Echo 残响和 Afterimage 的重复（"一半"在基础区） | 直伤 |
| N43 | Crimson Edge 的鬼刃（暴击时，那一击基础的 30%）、Spirit Swords 的剑气（4）、Razor Wake 的切割、撞墙的 10 | 附加伤害 |
| N44 | 剑意印记、Lingering Will、One Mind、Keen Point、Honed Wave、Calm Edge | 增伤区，相加 |
| N45 | Moonfang 标记 20%、See Through 20% | 易伤区（不同名，相加 40%） |
| N46 | 不屈印记、Lingering Will、Unmoved 40%、Still Mountain 30% | 减伤区，各自相乘 |

- 他没有 DoT 了（剑痕、Settle、"暴击留剑痕"都去掉了），也没有真实伤害。
- 控制只剩 Mirror Image 的嘲讽；Blade Wheel 的带走和 Radiant Cascade 的聚怪是位移，Boss 不吃，kit 的"+20%"对这两个照旧（13a）。
- 形态和抗性：基础形态和 Swift 是近战，剑气是远程，剑风和爆发是范围。所以 Swift 和 Crescent 会碰到不同的弱点。
- 他的设计线程的结论：公式里没有和他的 kit 对不上的地方。

## 6. 减伤相乘之后，Stonehide 要跟着改的（5b）

这些是他的 kit 和天赋文件里已通过的行。我没有动那两个文件，等他的线程来改。

- **N47.** "减伤相加，停在 60%"（kit S6，天赋 T2）改成各自相乘，没有上限。
  - 常见的 Stone 24% 加 Stubborn 30%：原来 54%，现在 1 − 0.76 × 0.7 = 47%。
  - 八样全开（Stone、Stubborn、Slabguard、Colossus、Rallying Cry、Grudge、Bodyguard、节点 ward）：原来 60%，现在约 89%。
  - 平时稍微脆一点，全开时硬很多。要量。
- **N48.** Stubborn 的后半句"上限升到 70%"没有上限可升了，这半句失效。要给它换一句，或者去掉。
- **N49.** Weight of stone 读"他的总减伤"：改读相乘后的总数，+60 的封顶不变。
- **N50.** Rallying Cry 给自己的 ward"是相加不是相乘"（T22 第 14 条）：现在和别的一样相乘。
- **N51.** Mountain 的 75%（12b）：不再是"替换"，也乘进去。Stone 加 Stubborn 加 Mountain 是 87%，全开约 97%。Weight of stone 里"Mountain 算 60"那句也要跟着改。
- **N52.** Ashfang 的不屈印记、Unmoved、Still Mountain 和 Mosslight 的 Bark 本来就没有写上限，只是从相加变成相乘，差别很小。

## 7. 护盾的补充

- **N53. 今天的护盾：** 只有队伍能有；一个人身上一条记录，重复给取较大；Bulwark 节点是唯一会累加的；上限是最大生命的 50%。新规则（D33，9a）：每层护盾自己一条记录，自己的量和计时；不同来源相加；50% 的上限取消。
- **N54. 今天谁给护盾（没有逐个数完）：** 游戏里现有坦克的 Iron Stance 和 Shield Wall、Bulwark 和 Brace 节点、Tidecaller 的 Bubble Ward、Duskwing 的 Vampire 节点、Bellwright 的 Cloister 节点，还有一些遗物和消耗品。新 kit 里 Mosslight 没有护盾，Stonehide 不给自己护盾，Ashfang 没有。所以公式现在主要是给以后的英雄和遗物用的。
- **N55. 怪以后也可以有护盾**（今天没有）。打怪的护盾算英雄造成的伤害。
- **N56. 例子。** 一个"最大生命 10% + 8"的护盾给 150 血的人：（15 + 8）= 23；施法者护盾加成 +20% 是 27.6；暴击（× 1.5）是 41.4。他有 30% 减伤时，没暴击的这层盾能挡住约 39 点打过来的伤害。
- **N61. 没有总上限之后，谁来管住护盾：** 每层的计时、技能的冷却、"同一个技能不多开一层"。要量的第一件事：一个队伍能不能让护盾一直比怪的伤害长得快。杠杆是每层的时长。

## 8. 效果抵抗的补充

- **N57. 例子。** Mosslight 的睡眠 3 秒，带 Long Season（+30%），打在一只冠军（抵抗 30%）身上：3 × 1.3 × 0.7 = 2.7 秒。
  Stonehide 的 Fracture 眩晕 1 秒打在精英（20%）身上是 0.8 秒；有 Long Season 之类的延长时，算完再卡 1 秒的上限。
- **N58. 各英雄的控制：** Mosslight 的定身、睡眠、减速；Stonehide 的嘲讽和 Fracture 的眩晕；Ashfang 只剩 Mirror Image 的嘲讽。都按 D35 缩短。
  不缩短的：Ashfang 的 Blade Wheel 带走和 Radiant Cascade 聚怪；Mosslight 的抛起和 Pollen Gust 的吹飞；Stonehide 的 Reckoning 钉子（它是标记，不是控制）。
- **N59. 英雄被控制：** 怪的减速、缠绕、眩晕打在英雄身上，也按英雄的效果抵抗缩短。Ashfang 的 Unmoved、Last Stand 和 Stonehide 的 Mountain 是"免疫"，比抵抗高一级，照旧。
- **N62. Boss 的 80%（11b）改了游戏今天的规则：** 今天 Boss 免疫减速、眩晕、致盲（`status.js` 的 `boss_immune`），而且眩晕会打断怪正在蓄的招。所以 D40 加了三条保护；没有它们，一个 0.25 秒的眩晕就能一直打断 Boss 的大招。
- **N63. 三份 kit 里说"Boss 免疫"的句子：** Ashfang kit S6 和 S48（+20%），Stonehide kit 的 Fracture、Wall slam、Stone Ring 等（"a boss is not stunned"），Mosslight kit 的各个减速和定身（"a boss is not slowed"、"a boss is only slowed, never held"）。13a（已定）：这些句子的效果都保留，Boss 另外吃到很短的控制，所以这些句子不用改。
- **N64. Mosslight 的 Evergreen 在 Boss 身上变得有用：** 睡眠 3 秒 × Long Season 1.3 × Boss 0.2 = 0.78 秒。以前是 0。
- **N65. Tidecaller 的 soaked** 今天在 Boss 身上最多减速 5%。他的 kit 还没重做，这条先不动。
- **N66. 冠军** 今天不免疫控制，现在是 30% 抵抗，所以控制在冠军身上比今天短一些。
- **N60. 以后可以加的杠杆：** "无视效果抵抗"（像减防之于防御），给控制流的英雄或遗物。这次没做。

## 9. 解冻后怎么做

- 一个系统一份实现：全部在 `src/sim/combat.js` 的 `applyDamage` 里，多一个 `type`（direct、dot、bonus、true）；
  各区的读取放 `src/sim/status.js`；调校数字放在模块顶部的冻结表里。
- 九个 goldens：什么都没装时每个区是 1。DoT 和真实伤害不暴击，但旧版单关跑法里仍要照样掷那一次（像 `forceCrit` 那样只掷不用），种子流才不会变。
- `hit` 事件带上类型和"是否算命中"，伤害数字和打击反馈按它区分。颜色到时按 `.claude/rules/visuals.md` 定，这里不定颜色。
- BUILD_BRIEF §9 写着"No armor/resists/damage types"，需要一条新的裁定（A25）来替换它。
- 护盾公式和"不同来源相加"放 `src/sim/status.js` 的护盾写入端；效果抵抗放同一个文件的 `apply`，在现有的时长上限之前。
- 新名词要十种语言：防御、减防、易伤、附加伤害、真实伤害、弱点、破绽、效果抵抗、护盾加成。
- 一个探针 `tools/damage-formula-probe.mjs`：每个区单独开、全开、四种类型各打一次，对照手算。

## 10. 猜的和没做的

- 猜的：Boss 的三条保护（D40）；所有上限和防御数值；精英、冠军、Boss 的血量调低多少；效果抵抗 20% 和 30%、最短 0.25 秒；每个技能的归类；DoT 默认每秒一跳。
- Ashfang 已经由他的设计线程按设计 2.4 归好（T46）。Stonehide 和 Mosslight 的归类还是我的，等他们的设计线程来对。
- 没碰：Windbriar、Duskwing、Tide Caller、Bellwright 的归类（他们的 kit 还没重做）。
- 一个以后可以谈的爽点：把所有数字显示放大 10 倍（8 变 80）。不影响公式，这次没做。
