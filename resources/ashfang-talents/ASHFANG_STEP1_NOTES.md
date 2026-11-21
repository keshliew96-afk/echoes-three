# Ashfang, step 1: path 1 play style and how the element sword works

**2026-11-17. Design only.** Nothing here is in the game (feature freeze). These are the notes behind
the two short pick lists sent to Kesh in the thread. The kit and talent docs come after his picks,
in the same shape as Stonehide's and Mosslight's.

Kesh's ask (2026-11-17 14:11 Singapore time), in his words:

- Path 1: "think as a normal swordman, what is the common playstyle? list down let me pick one."
- Path 2 (decided): "ranged playstyle, swordman attack now shoot 剑气 to attack enemy".
- Path 3 (decided): "附魔剑士: can enchance sword with element, fire/earth/water/wind, fire burn enemy
  mean deal dot, earth stun, water slow, wind knockback or blow up". How the element works is open:
  his idea 1 is a tier I talent that swaps the element by a button so all enchant skills follow it;
  his idea 2 is orbs, where each element skill cast stores an orb and at 3 orbs a skill is cast by
  itself from the mix (from Dota's Invoker); or a better idea.

Ashfang today (v0.5.366, `src/sim/skills.js`): 11 skills. Fast many-hit cuts (Flurry, Blade Storm,
Blade Dance), two dashes that cut (Fox Step, Moonfang), a parry (Riposte), a finisher that grows
with the skills landed before it (Crescent Finisher), two passives (Razor Wake, Crimson Edge, the
second adds crit), Lunge Strike and Caltrops. His dash is a thrust that cuts along the way.

---

## A. Path 1: common swordsman play styles

| # | Style | How it plays | Seen in | For | Against |
|---|---|---|---|---|---|
| 1 | 连击 Combo (my pick) | Every hit adds to a combo count. The higher the count, the faster and harder he hits. Taking a hit or stopping lets it fall. | Devil May Cry, Hades, Yasuo | Fits today's kit. Sword waves and element hits count too, so it mixes with paths 2 and 3. The 爽 of a count that climbs. | Needs a clear counter on screen. |
| 2 | 弹反 Counter | Parry at the right moment, then a big cut back. | Sekiro, Fiora, Jax | High skill, big payoff. Riposte is already here. | Weak in a room of many small foes; the AI seat plays it badly; in co-op the tank holds the foes' aim. |
| 3 | 一闪 Dash cuts | He cuts through foes with dashes. A kill gives the dash back. | Master Yi, Genji, Katarina | Very fast. | Close to Duskwing, who blinks. Path 2 and 3 would then have no close-range partner. |
| 4 | 居合 One cut | Sheathe, hold, one huge cut. Crits. Finishes low foes. | Yone, Samurai Jack style, Monster Hunter long sword | Opposite feel to Combo: slow and heavy. Big numbers. | Slow against crowds. A held charge fights the dash rule (dash cancels it). |
| 5 | 流血 Bleed and drain | Cuts stack a bleed. He heals from bleeding foes. | Darius, Aatrox | Good in long fights. | Bleed is a damage over time like fire in path 3. Draining blood is Duskwing's. |
| 6 | 旋风 Whirlwind | Wide spins and sweeps through crowds. | Garen, Diablo's Barbarian | Easy to play. | Little skill. Blade Storm and Blade Dance already do it as skills. |

**Why 1.** The three paths should not fight each other, because a build takes one pick per tier
from any path. A combo count is fed by any hit, so a sword wave (path 2) or a burning cut (path 3)
feeds it. It is also the "tempo" path of the template (tempo, weight, conversion): path 2 becomes
reach and path 3 becomes effects. Second choice: 4, if he wants a slow heavy path beside the two
others.

---

## B. Path 3: how the element sword works

The four elements, as he set them: fire burns (damage over time), earth stuns, water slows, wind
knocks back or throws up.

| # | How | For | Against |
|---|---|---|---|
| a | His idea 1. A tier I talent adds a swap button. All enchant skills follow the sword's element. | Full control. Easy to explain. | One more key in a game that already uses Q E C X, F, G, dash and attack. Four elements on one key means up to three presses in a fight. Players park on the one best element. |
| b | His idea 2. Each skill has its own element. A cast stores an orb. Three orbs cast a skill by themselves, chosen by the mix. | The pop at three orbs feels great. No new key. | He holds 4 skills from a random draft, so he cannot steer the mix. Three orbs of four elements make 20 mixes to learn, build and translate. A build with no element skills gets nothing from the path. |
| c | Mine (my pick). The four skill keys are the four elements: Q fire, E earth, C water, X wind. The skill on a key takes that key's element. Casting it also turns the sword to that element, so basic attacks carry it until the next cast. | No new key. Works with any skills he drafts. He swaps element by casting, which he does anyway. The build choice is which skill goes on which key (a many-hit skill on fire, a wide skill on wind). | The player must remember four keys and four colours. The HUD has to tint the four slots. |
| d | c, plus his orbs in a small form, as a later tier of the same path. Each cast stores an orb of its element. The third orb lets go a free cut that carries all three effects. Three alike is the big version of that element. | Keeps his Invoker idea. Only four big versions to learn, no table: each orb adds its own effect. | More to build than c alone. |
| e | Mixes on the foe. A hit on a foe that carries another element sets off a mix (fire and wind spread the burn, water and earth root). | Deep. | Six pairs to learn and build. The most work and the most words. |
| f | The sword turns by itself. Every third basic hit moves it to the next element. | No key, nothing to learn. | No control. |

**Why c, with d on top.** A talent has to work alone (Mosslight T1): the tier I pick of path 3 must
give elements to a hero who took no other path 3 talent and drafted any four skills. Idea b fails
that test and idea a passes it at the price of a key. Tying the element to the slot passes it with
no key, and four slots for four elements is an exact fit. His orb idea then sits on top as the
Trick or the Capstone tier, where the three-orb cut is the reward.

How the element is added to a skill (c): one rule, not 26 times 4 versions. The skill keeps its
shape and damage; the element adds its small effect to each foe hit (a burn, a short stun, a slow,
a push) and tints the trail. To be measured later: stuns stay under the game's rule (1 s at most,
then the foe cannot be stunned for a while; bosses are not stunned), so earth needs a second small
effect for bosses.

Colours, to settle in the kit (colour rule, `.claude/rules/visuals.md`): heroes never wear Ember
`#FF5A36` or Violet. Fire would be the blade template's gold fire (`#FFB43C`) or Hearth Amber
`#E8A23D`. Earth would be Earth Ochre `#8F6B45`. Water and wind need colours that are not the
Tide Caller's Deep Cobalt or Windbriar's Wind Jade; candidates are a pale aqua (`#7FE0F2`, the
frost bomb's) and his own Moon Silver `#E7E3F0`. His plain cuts stay Fox Crimson `#E8577A`.

Open for later, not asked now: what wind does (push away, or throw up so foes can be hit in the
air); whether path 2's sword waves carry the element (I think yes).

---

## C. Kesh's answers (2026-11-17 14:21 Singapore time)

- **Path 1 is decided:** "main combo + a bit of dash cut + a bit of bladestorm, so this 2 also have
  combo count". Combo is the main style; dash cuts and blade storm are part of the path and their
  hits build the combo count.
- **Path 3:** he asked how many mixes idea b has with 2 orbs. Answer: 10 (4 pure, 6 mixed), order
  not counted. Sent with first names: Blaze, Quake, Flood, Tornado; Firestorm (fire + wind), Magma
  (fire + earth), Steam (fire + water), Mud (earth + water), Sandstorm (earth + wind), Frost (water
  + wind). Open pick: the element comes from the skill itself (a, his) or from the key (b, mine).
  Note for the kit: Magma's floor patch must not read as an Ember floor warning.

## D. Kesh's objection to key elements with 2 orbs (2026-11-17 14:23 Singapore time)

His words: "b not possible, if choose b, it mean force player do nothing and wait for the cd for
same skill Q in order to use fire + fire, if the cd is 20+ second, that would ruin the gameplay
feel". He is right: with one element per key, a pure mix needs the same key twice.

Fixes sent:

1. (my pick) The basic attack makes orbs too. A cast turns the sword to its key's element and
   stores one orb. The last hit of the basic combo stores one orb of the sword's element. Two orbs
   fire the mix and clear. Skill then basic combo is pure; skill then another skill is mixed. With
   path 2 the last sword wave of the combo stores the orb.
2. Drop the four pure mixes; six mixed pairs stay.
3. No orbs: key elements only.

To settle in the kit if 1 is taken: how long an orb lasts, what the sword's element is before the
first cast in a room (none, so basic attacks store nothing until a skill is cast), and whether a
release has its own short cooldown so fast builds do not fire a mix every second.

## E. Kesh turned down all three fixes (2026-11-17 14:26 Singapore time)

His words: "(1) too easy make mistake, cause player usually is holding mouse 1 while cast skill, (2)
drop the pure one make it less fun, (3) no fun at all. Think another idea, otherwise just use mine
(a) idea".

What the mechanic must do, from his three objections so far:

- Never make the player wait on one skill's cooldown to finish a mix.
- The basic attack must not change the orbs, because the attack button is held all fight.
- The pure mixes stay. The orbs stay.

New ideas sent:

1. (my pick) Element keys + orbs, his idea 1 and idea 2 together. Keys 1 to 4 (d-pad on a gamepad)
   turn the sword to fire, earth, water, wind. Every skill cast takes the sword's element and stores
   one orb of it. Two orbs fire the mix and clear. Pure: stay and cast any two skills. Mixed: cast,
   press another element key, cast. Works with any four skills, so the tier I talent works alone.
   The skills themselves have no element; the path gives it.
2. Double tap: key elements; pressing the same key again right after the cast stores a second orb.
   Risk: mashing a key gives the pure mix by mistake, and a pure mix costs one cooldown where a
   mixed one costs two.
3. His (a). Read two ways: the swap button (then 1 is that plus orbs), or the skill itself has the
   element (then fire + fire needs two fire skills among his four, or the wait comes back).

To settle in the kit if 1 is taken: four keys or one cycling key; which keys (1 to 4 are free
today: skills are Q E C X, F interact, G tonic, K camp class); how long an orb lasts; whether a
release has a short cooldown of its own.

## F. Kesh dropped "the skill itself has the element" (2026-11-17 14:27 Singapore time)

His words: "my (a) idea also not good, cause not all skill pool is with element, for those ranged
play style skill or combo style, those skill no need element". So the skills carry no element of
their own; path 3 gives it. Idea 1 of section E fits that. Waiting on his "1".

## G. Kesh: "your new way too many keys to press for player" (2026-11-17 14:29 Singapore time)

Four element keys are out. What the mechanic must do, all his objections together:

- No waiting on one skill's cooldown to finish a mix.
- The basic attack never changes the orbs (the attack button is held all fight).
- The pure mixes stay. The orbs stay.
- The skills carry no element of their own; path 3 gives it.
- No pile of new keys.

Ideas sent:

1. (my pick) Choose each key's element at camp. With the talent he sets an element on Q, E, C and
   X; two keys may share one. A cast stores that key's orb; two orbs fire the mix. A pure mix uses
   two different skills on same-element keys, so no cooldown wait. Layouts: four different (six
   mixes, no pure), two and two (two pure, one mix), two, one and one (one pure, three mixes), up
   to all four alike (one pure only). Changing is free at camp, like the talents themselves.
2. One swap key (his first idea) plus orbs: the key cycles the sword's element; every cast stores
   an orb of it. Up to three taps to reach an element.
3. A lone orb turns pure: key elements; if no second cast follows in 2 s the orb fires the pure
   mix by itself. He holds other skills back for 2 s.

## H. DECIDED (2026-11-17 14:32 Singapore time)

His words: "i decide to use back my (a) idea, so it have the 随机性 because skill from pool is
random. Then for swordman skill all need to have one element, then it solve everything."

So: every skill in Ashfang's pool has one element built in. A cast stores an orb of the skill's
element. Two orbs cast the mix by themselves (10 mixes, the four pure ones kept). Which mixes a
run can make depends on the four skills the draft gave him. Step 1 is closed; the kit is next.
