# Duskwing: skills and talent paths

**Version 1.2, 2026-11-18. Design only** (the feature freeze holds). 1.2 adds the twelve combos
(section 6; Kesh, 19:05 Singapore time: "all"). 1.1 has Kesh's picks of
17:09 Singapore time (section 5): the hunter's 20% also comes from a bleeding foe and from 15
Combo, the Combo speeds the basic attack too, a hit with a floor warning is never dodged, and
area leech is a third. Version 1.0 is kept as `DUSKWING_KIT_1.0.md`. Kesh, 16:39 Singapore time:
an assassin whose job is to kill 脆皮 foes and who sometimes leaves the team's range; three play
styles (1 combo: the higher the combo, the more CDR, the faster the skill animation and the more
dodge; 2 leech: he heals himself by hitting; 3 blink, invisible, split into bats: 潜行 behind a
foe and backstab for penetrating, crit damage, burst and leave) and the elements blood, bat,
blink, assassin, backstab. Numbers, motions, the damage formula sort and the reasons are in
`DUSKWING_NOTES.md`; other games' ideas are in `DUSKWING_IDEA_LIST.md`. All numbers are first
guesses. Answer by line number.

## 1. In one look

- **K1.** One pool of 26: 8 Claw 爪, 8 Blood 血, 8 Night 夜, 2 passives. He holds 4.
- **K2.** Three paths: **Rampage 连斩** (the Combo: faster and faster), **Sanguine 饮血** (he
  drinks what he cuts), **Phantom 影袭** (unseen, behind the foe, one great burst). One pick per
  tier from any path.
- **K3.** The tier I talent sets his style and re-shapes every skill he holds (section 4). A
  skill of the style's own kind keeps its move and gets more; most of the others change shape.
- **K4.** 80 health, the fastest hero. Each style has its own way to live away from the healer:
  Rampage dodges, Sanguine drinks, Phantom is not seen.

## 2. Passive, basic attack, dash, words

- **K5. Night Hunt 夜猎 (passive).**
  1. **Backstab 背刺.** A hit from behind a foe, or on a blinded or stunned foe, deals 20% more.
     The same 20% (once, not twice) lands on a **bleeding** foe, and on every foe while his
     **Combo is 15 or more**: so every style has its own way to it.
  2. **The kill.** When a foe falls within 2 s of his hit, his dash is ready and every skill
     cooldown loses 1 s. Each tenth of a champion's or boss's health that he takes counts as a
     kill.
  3. **Each style gives the kill its shape.** Rampage: 5 Combo. Sanguine: he drinks it: 6
     health. Phantom: he is Unseen 1.5 s.
- **K6. Basic attack.** As passed on his model page, six hits in 1.35 s: claw 4, claw 4, bite 6,
  then three blinks, each to the back of the foe nearest the pointer: 5, 5, 8.
  - Rampage: while attack is held the blinks go on, a different foe or side each time: 5 each.
  - Sanguine: the bite holds on and drinks: 10, and half comes back.
  - Phantom: one blink in place of three: he is gone, then one great claw in its back: 18.
- **K7. Dash.** As passed: a blink; he splits into small bats and gathers. Top priority,
  untouchable, cancels any move.
  - Rampage: the bats claw each foe they pass: 5, and each counts for the Combo.
  - Sanguine: the bats bite each foe they pass: 4, and all of it comes back.
  - Phantom: he gathers Unseen for 1 s; a dash at a foe within 3 u gathers behind it.
- **K8. Combo 连击.** Always counted and shown: each hit is 1; it is lost 3 s after his last
  hit; being hit does not lose it. The number has no top; its power stops at 30. Alone it gives
  the passive's 20% at 15; the Rampage talents read the rest.
- **K9. Unseen 隐身.** Foes do not pick him as a target. It ends with his first hit, which is a
  backstab from any side. Floor warnings and area hits still hurt him.
- **K10. Bleed 流血.** Damage over time on one foe. **Comes back** means he heals that share of
  what the skill dealt.
- **K11.** A boss is never launched, pinned or held: that hit deals 20% more instead. Blind on a
  boss lasts a fifth of its time.

## 3. The talent grid

| Tier | Rampage 连斩 | Sanguine 饮血 | Phantom 影袭 |
|---|---|---|---|
| I Style | **T1 Bloodrush 连击**: every skill takes its Rampage form. Each Combo point: his skills and basic attack play faster, his cooldowns run faster, he dodges more. At 30: every move in half the time for full damage, cooldowns 60% faster, 30% dodge (never a hit with a floor warning) | **T2 Blood Drinker 饮血**: every skill takes its Sanguine form. 15% of the damage he deals comes back as health (5% from area hits, zones and bleeds); health above full becomes a blood shield, up to 24, for 6 s | **T3 Nightcloak 夜隐**: every skill takes its Phantom form. A backstab is a sure crit and ignores half the foe's defence. After 2.5 s with no attack and no cast he is Unseen |
| II Power | **T4 Killing Pace 杀势**: 1% more damage for each Combo point, up to 30% | **T5 Open Wounds 血流不止**: every hit makes the foe bleed for 25% of that hit over 3 s | **T6 First Blood 先手**: backstabs deal 30% more; 60% on a foe he has not hurt yet |
| III Trick | **T7 Twin Fangs 双牙**: every fourth hit lands twice; the second is a ghost claw for half | **T8 Blood Pact 血契**: a skill on cooldown can be cast once more for 15% of his health | **T9 Shade 残影**: his dash and blink skills leave a shade for 2 s that foes attack; it bursts into bats: 8 within 1.5 u, blind 0.5 s |
| IV Reach | **T10 Wingspan 展翼**: claws, wings and bites reach 30% farther and sweep 30% wider | **T11 Red Tide 血潮**: blood areas are 30% wider; threads, lances and crescents reach 30% farther | **T12 Far Step 远遁**: the dash, blinks, dives and flits go 30% farther; darkness is 30% wider |
| V Capstone | **T13 Carnage 血舞**: at every 30 Combo (30, 60, 90 …) all goes still for a breath: a claw mark opens on every foe within 6 u, then all tear at once: 24 each | **T14 Blood Tithe 血偿**: all the health he regains is also stored, up to 40. When it is full his next skill throws it out: 40 to every foe within 3 u, through all defence | **T15 Killing Hour 月黑风高**: when all his skills are ready his eyes light. His first cast opens 4 s in which every hit is a backstab and deals 30% more; then he is Unseen 2 s |

## 4. The 26 skills and their forms

"adds" keeps the move and puts more on it. "changes" replaces it. In a Phantom form every hit
that says "back" or "behind" is a backstab.

| # | Skill (cooldown) | Base | Rampage 连斩 | Sanguine 饮血 | Phantom 影袭 |
|---|---|---|---|---|---|
| | **Claw 爪** | | | | |
| F1 | Talon Rake 爪击 (6 s) | a wide rake of both wing claws, 150°, 1.2 u: 15 to up to 5 foes, knocked back 0.6 u | adds: two more rakes of 6; no knock back | adds: the cuts bleed: 8 over 3 s | changes: he blinks through the foes and rakes their backs: 18 |
| F2 | Thousand Claws 千爪 (6 s) | eight claw strikes in 1 s, 60°, 1.3 u: 3 each; then a cross tear: 10 | adds: hold the key: it goes on up to 2 s more, 3 a strike | changes: the cross tear is a bite: 10, and the blood of all eight strikes flies to him: heals 8 | changes: all on one foe: a strike from each of eight sides, then the tear in its back: 14 |
| F3 | Wing Wheel 翼轮 (7 s) | he spins with his wings out like blades, 1.6 u, at full run: three turns of 6 | adds: each turn that hits adds a turn, up to six | adds: the wing tips throw a ring of blood out to 2.6 u: 4, bleeding 6 over 3 s | changes: he bursts into a ring of bats that flies out 2.6 u and back: 8 and 8; he gathers behind the foe nearest the pointer |
| F4 | Skyward Rip 升天爪 (8 s) | a rising claw: 8 within 1.2 u, launched 0.8 s; he flies up with one foe: four cuts of 4, then spikes it down: 10 within 1.5 u | adds: eight air cuts of 3; the foe bounces and he rips it up once more | changes: in the air he bites and holds on: 18 over 1 s, half comes back; then he lets it drop | changes: no launch: he is gone upward and falls on its back: 30, stun 0.5 s |
| F5 | Last Bite 绝命牙 (8 s) | a lunge bite, 1.5 u: 24; double under 30% health; a kill readies it again | adds: after a kill the next lunge reaches 4 u | adds: a kill with it heals 12 | changes: he blinks to the weakest foe within 5 u and bites its neck from behind; a kill leaves him Unseen 1.5 s |
| F6 | Pounce 扑杀 (7 s) | he leaps on one foe within 4 u, pins it 0.8 s and mauls: five hits of 4 | adds: then he springs to the next foe within 3 u: three hits of 4; up to three foes | changes: one long bite: 20, half comes back | changes: he drops on its back out of the dark: stun 1 s, every hit a backstab |
| F7 | Crescent Wings 翼刃 (5 s) | he snaps both wings shut: two crossing crescents fly 5 u through every foe: 9 each | adds: a second snap: four crescents in a fan | changes: one blood crescent: 14; it flies back to him through the foes for half and brings 1 health for each foe, up to 6 | changes: he blinks to where the crescents end and cuts back at the last foe they hit: 14 |
| F8 | Night Flight 夜翔 (big, 14 s) | he takes wing for 2.5 s, untouchable, 50% faster; three dives fall on the foe nearest the pointer: 14 within 1.5 u each; he lands with the last | adds: five dives of 10 | changes: each dive he carries a foe up, bites it and drops it: 14, heals 5; 6 within 1.2 u where it falls | changes: the room goes dark while he flies; one dive out of the dark at the end: 40 within 1.5 u |
| | **Blood 血** | | | | |
| F9 | Bloodbite 血噬 (4 s) | a deep bite: 20 to up to 2 foes, 80°, 0.95 u; half comes back | changes: three quick bites of 8; each on the same foe 20% harder than the last | adds: all of it comes back; the foe bleeds 8 over 3 s | changes: he blinks behind the foe nearest the pointer within 3 u and bites its neck: 26 |
| F10 | Open Vein 放血 (5 s) | a claw across one foe: 10; it bleeds 3 each half second for 4 s, double while it moves | adds: each hit of his on it adds 0.5 s of bleed, up to 8 s | adds: half the bleed comes back; when the foe falls the bleed jumps to the nearest foe | changes: from behind: 14, and after 1.5 s the whole bleed bursts out at once: 24 |
| F11 | Blood Lance 血矢 (4 s) | a lance of blood, 6 u, through every foe: 14; a thread from the first foe heals him 4 | changes: three thin lances one after another: 6 each | adds: a thread from every foe: 2 each, up to 10; it ends in a pool, 1.2 u, 3 s: 4 each half second | changes: it pins the first foe 0.5 s and he blinks along the thread to its back: 10 + 14 |
| F12 | Bat Swarm 蝠群 (10 s) | a cloud of small bats on a spot within 4.5 u, 1.3 u wide, 4 s: 5 a second, slow 20%; a quarter comes back | changes: the swarm flies with him 5 s: after each of his hits a bat bites that foe: 2 | adds: 1.8 u wide, half comes back; at the end the bats fly home: heals 6 | changes: the swarm is round him 4 s: he is Unseen inside it and it bites the foes within 1.3 u |
| F13 | Blood Spikes 血棘 (7 s) | a claw into the floor: blood spikes run 5 u, 1 u wide: 16, launched 0.4 s | changes: three short rows in a fan, 3 u, one after another: 8 each | adds: the spikes stand 3 s: a foe that touches them takes 4 and bleeds; then they melt and flow back: 1 health for each foe hit | changes: a ring of spikes closes on one foe within 5 u: 16, held 1.2 s; every hit on it is a backstab |
| F14 | Blood Mist 血雾 (12 s) | he bursts into red mist, 2 u wide, 1.5 s: untouchable, drifting at 70% speed; foes inside take 4 each half second, slowed 30% | adds: the Combo cannot fall in the mist; he gathers in a claw spin: 10 within 1.6 u | adds: 2.5 s, and all it deals comes back | changes: black mist: foes inside are blinded; he gathers Unseen behind the foe nearest the pointer |
| F15 | Boiling Blood 血沸 (12 s) | 5 s: basic attacks 40% faster; each basic hit splashes: 3 to the foes within 1 u of it | adds: each kill adds 1 s, up to 10 s | adds: each basic hit heals him 2 | changes: no speed: each basic hit blinks him behind its foe |
| F16 | Blood Moon 血月 (big, 18 s) | a red moon over him: 30 to up to 10 foes within 2.4 u, blinded 1.5 s; 35% comes back | adds: the moon hangs 4 s: under it each hit counts twice for the Combo and the Combo cannot fall | adds: all of it comes back; the moon hangs 4 s and drinks: 3 a second from each foe under it | changes: an eclipse: 20, 4 u wide, blinded 2 s; he is Unseen 3 s |
| | **Night 夜** | | | | |
| F17 | Dusk Dive 暮袭 (6 s) | a dive up to 3.6 u, untouchable: 16 to up to 5 foes within 1.2 u of where he lands | adds: a dive that hits can be pressed again within 1.5 s: up to three dives, 12 after the first | adds: the landing leaves a pool of blood, 1.5 u, 3 s: 4 each half second, all of it comes back | changes: no dive: he is behind the foe nearest the pointer within 4.5 u: 22 to it, 8 to the others |
| F18 | Blink Strike 瞬袭 (5 s) | he blinks behind one foe within 5 u and stabs with a wing claw: 22, always a backstab | changes: three blinks: three foes, or three sides of one: 9 each | adds: he tears the claw out: 6 to the foes within 1.5 u, heals 6 | adds: two charges; a kill with it gives one back |
| F19 | Flit 掠影 (7 s) | he flits 2.8 u away from the aim, untouchable; a puff of night stays 2 s: 4 a second, blind 1 s | adds: he throws two crescents as he leaves: 8 each | changes: the puff is blood bats: 4 a second, all of it comes back | adds: 4.5 u, and he is Unseen 2 s |
| F20 | Nightfall 夜幕 (11 s) | darkness round him: 6 to up to 8 foes within 2 u, blinded 2 s | adds: in the dark he cuts each blinded foe once: 6 | adds: blinded foes bleed 8 over 2 s; half comes back | adds: 3 u wide, 3 s; he is Unseen while he stands in it |
| F21 | Echo Screech 回声 (9 s) | a screech down a 70° cone, 2.6 u: 10 to up to 6 foes; each takes 25% more for 3 s | adds: the echo comes back: it hits them again from behind for half | adds: for those 3 s each of his hits on them heals him 2 | changes: a ring, 5 u, no damage: every foe shows its back for 4 s: his hits on it are backstabs from any side |
| F22 | Shadow Veil 影幕 (12 s) | the dark folds round him: a shield of 18 for 3 s; 8 to up to 4 foes within 1.2 u | changes: no shield: the next three hits on him within 3 s miss, and each miss is answered with a claw: 8 | adds: when the shield ends, what is left of it heals him | changes: no shield: he is Unseen 3 s, and his first hit out of it deals 40% more |
| F23 | Roost 归巢 (10 s) | he hangs a shade of himself where he stands, 6 s. Press again: he bursts into bats and gathers there, untouchable; 10 to the foes within 1.5 u of where he left | adds: while it hangs, the shade copies his basic claws at the foes within 1.5 u of it, for a third | adds: on the return he gets back half the health he lost since | adds: it hangs 10 s; he returns Unseen 2 s |
| F24 | Death Mark 死兆 (big, 14 s) | he sinks into one foe's shadow within 4 u and rises behind it: 12. For 3 s the mark keeps 35% of the damage he deals to it, then tears open for that much, through all defence | adds: each hit on it adds 0.2 s to the mark, up to 5 s | adds: half the tear comes back | adds: the mark keeps 50%; if the tear fells the foe, Death Mark is ready again |
| | **Passives** (no form) | | | | |
| F25 | Night Wings 夜翼 | every second, 3 to the 3 nearest foes within 1.3 u | | | |
| F26 | Blood Scent 血嗅 | a foe under 40% health carries a red wisp; he runs 20% faster while one is within 6 u, and his hits on it deal 20% more | | | |

## 5. Picks

**Closed. Kesh, 2026-11-18 17:09 Singapore time:** "1a, the backstab bonus apply to bleeded target
and reached X combo too, so the other 2 play style also benefit from it. 2a 3b 4a 5a 6a 7a.
A1 a A2 a A3 b A4 b A5 b".

1. a, with his rule: the passive is Night Hunt 夜猎, and its 20% also lands on a bleeding foe
   and at 15 Combo (K5). The 15 for his "X", and that it is the 20% only (not a true backstab
   for Phantom), were confirmed by him at 19:15 ("1 ok").
2. a: no leech outside the Sanguine path; today's 8% goes.
3. b: the Combo speeds the basic attack too (T1).
4. a: Unseen comes by itself after 2.5 s of waiting (T3).
5. a: Rampage 连斩, Sanguine 饮血, Phantom 影袭.
6. a: blood is the dark red of his claw marks, with a Dusk Rose glow.
7. a: the pool as listed, to be judged again on the ability page.

Audit: A1 a the Combo stays when he is hit (K8). A2 a a tenth of a boss's health is a kill (K5).
A3 b foes retarget at once when he goes Unseen. A4 b a hit with a floor warning is never dodged
(T1). A5 b area hits, zones and bleeds return a third (T2).

## 6. Combos (all twelve taken)

Each is one small rule between two skills, or a skill and his dash; none needs a talent. Notes
in `DUSKWING_COMBO_IDEAS.md`.

| # | Name | The rule |
|---|---|---|
| C1 | Pop the vein 血爆 | Last Bite or Blood Spikes on a bleeding foe brings the rest of its bleed out at once |
| C2 | Air bite 空噬 | Bloodbite or Last Bite on a foe in the air slams it down: 50% more, and 10 to the foes within 1.5 u |
| C3 | The swarm hunts the mark | While a foe carries Death Mark, Bat Swarm and Night Wings bite only that foe, twice as often |
| C4 | Screech in the dark 暗中回声 | Echo Screech cast from inside Nightfall's dark or Flit's puff rings all round him, and the blind on the foes it hits starts again |
| C5 | The shade strikes too 影随 | While his Roost shade hangs, it repeats Crescent Wings, Blood Lance and Echo Screech from where it is, for half |
| C6 | Dash cast 化蝠施放 | Talon Rake, Wing Wheel, Bloodbite or Crescent Wings pressed during the dash comes out as he gathers, at once, 30% wider |
| C7 | Through the cloud 穿雾 | A Blood Lance or a crescent of his through his Bat Swarm or Blood Mist comes out as three, each at a foe near it, for half |
| C8 | Feed the moon 血月饱饮 | Under his Blood Moon every bleed runs twice as fast, and what comes back to him is doubled |
| C9 | Push the bleeder | A bleeding foe that is knocked back, launched or carried bleeds double for that second |
| C10 | Boil the swarm 血沸蝠群 | Boiling Blood cast while his Bat Swarm is out calls the swarm to him for the rest of its time |
| C11 | Kill in the dark 夜杀 | A foe that falls while blinded bursts into darkness: the foes within 1.4 u are blinded 1 s |
| C12 | Out of the sky 天降 | Pounce or Last Bite pressed during Night Flight ends the flight on that foe at once: 50% more |
