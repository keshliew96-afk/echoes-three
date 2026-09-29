# ECHOES WEB — BUILD BRIEF (v1.0, 2026-08-15)

This is the single self-contained implementation spec for the Three.js web build of
**Echoes**, translated from the approved GameStudio design corpus (game concept R3,
combat GDD, build/draft/shop GDDs, HUD/UX specs, art bible). A builder with NO other
context implements from this document alone. The binding visual/responsiveness
quality bar is `docs/REFERENCE_BAR.md` (same folder) — every rendered frame is
judged against its 10 checks and its responsiveness bar. Where this brief and a
memory of the original docs disagree, THIS BRIEF WINS (scoping rulings are listed
in Appendix A).

**Elevator pitch**: top-down party action roguelike. You play the Healer — a chibi
mouse in a bell cloak — leading three AI critter allies (badger Tank, fox Swordsman,
hare Archer) through an 8-room run against corrupted beasts. Hades-grade combat
responsiveness; skills drafted mid-run; a tiny pool of nodes that *reinterpret*
per skill (Bounce on a heal = chain-heal; Siphon on a heal = your heals damage
enemies). Runs bookend in a warm camp scene. Storybook-warm party vs. a world
going wrong.

---

## 1. Locked stack & global conventions

- **Stack**: Vite + three.js (already installed: `three ^0.185`, `vite ^8`),
  vanilla ES modules, NO TypeScript. Post stack via `EffectComposer`
  (UnrealBloomPass + custom vignette/color-grade ShaderPass). No external asset
  downloads of any kind — all geometry, textures, sprites, and audio are
  generated in code (primitives, LatheGeometry, CanvasTexture, DataTexture,
  WebAudio synthesis).
- **Coordinate system**: gameplay happens on the ground plane **XZ** (y = up).
  Camera is 3/4 top-down. Mouse aim = raycast from camera through cursor to the
  y=0 plane.
- **Units**: **1 world unit = 100 design-px**. All design numbers below are given
  in world units already converted (original px in parentheses where useful).
  Character standing height ≈ 1.05 u.
- **Simulation**: fixed **60 Hz tick** (16.666 ms) via accumulator; render frames
  interpolate visual positions but NEVER mutate sim state. All cooldowns/timers
  are **integer tick counts**. No gameplay logic reads wall-clock time.
- **RNG**: two streams. (a) *Gameplay stream*: one seeded PRNG (mulberry32 or
  splitmix32) created at run start; consumed ONLY by gameplay-affecting rolls
  (crits, wave rolls, draft draws, room frame). (b) *Cosmetic stream*: unseeded
  `Math.random` for VFX jitter, foliage placement, particle spread. Never cross
  the streams.
- **Spawn ordinal**: a per-run monotonic counter assigned to every spawned entity
  (actors, projectiles, zones). It is the universal deterministic tiebreak.
  Never use engine object ids for tiebreaks.
- **Input abstraction**: game logic never reads DOM events directly. Input layer
  converts raw events into the closed intent vocabulary (§5) each tick; AI
  controllers emit the same intents. One controller interface for humans and AI.
- **Density ceilings (hard)**: ≤40 concurrent enemies · ≤150 live projectiles ·
  ≤20 simultaneous telegraphs · ≤12 timed zones + 4 auras · ≤12 simultaneous
  damage numerals (oldest fades early) · ≤40 persistent kill decals (oldest
  removed).
- **Performance**: 60 fps desktop target, no >100 ms hitches during waves.
  Canvas fully responsive: on window resize, renderer + composer + camera update
  same frame; HUD overlay rescales (see §17). No layout breakage at any aspect
  from 1024×640 up.

---

## 2. Run overview

- One run = **8 rooms**: rooms 1–6 combat, room 7 shop (fixed), room 8 boss
  (fixed). Of rooms 1–6, exactly **2 are `defend`** rooms and 4 are `kill_all`
  (positions rolled from the seeded stream at run start; room 1 is always
  kill_all so onboarding stays simple — scoping ruling A3). Boss room = kill_all
  over boss + adds.
- The **run frame** (defend positions, path pairings, reward-side randomization)
  is rolled once at run start from the seeded stream and is immutable.
- Victory = clear room 8. Defeat = all 4 party members Downed simultaneously
  (the ONLY defeat rule). Defeat precedence: on a tick satisfying both defeat
  and clear, defeat wins.
- Rooms 1–5 clear → **path choice**: 2 doors, each showing only
  `{win_condition, reward_type}`; every pairing has exactly one `skill`-reward
  and one `node`-reward option (side randomized, pre-rolled). Room 1's reward is
  always a Skill draft. Rooms 6→7 and 7→8 are fixed transitions (no choice).
- Between-rooms only (`combat_active == false`): draft screen, socket screen,
  shop, path choice. Zero build interaction mid-combat (Pillar: Fight Fast,
  Build Slow).
- The **camp hub scene** bookends runs: game boots into Camp; "Begin Run"
  interaction starts room 1; run end (victory or defeat screen) returns to Camp.
  All run state (skills, nodes, Glint, HP, cooldowns) is wiped at run end.
- One continuous 60 Hz sim clock runs through every state; cooldowns keep
  ticking during reward/shop/path screens (they saturate during dwell) and are
  NEVER reset by any path.

---

## 3. Controls (keyboard + mouse only)

| Input | Action |
|---|---|
| WASD | 8-directional movement (pre-normalized; no faster diagonals) |
| Mouse | Aim (world position under cursor) |
| Right-click (hold) | Basic attack, hold-to-repeat; first shot immediate on press |
| Space | Dodge roll (i-frames) |
| 1 / 2 / 3 / 4 | Skills, slot-indexed |
| R | Rally (all allies regroup at player position) |
| E (hold) | Revive channel on adjacent downed ally (5.0 s) |
| Tab | Cycle enemy mark (party-shared focus target) |
| F1–F4 (or portrait click) | Heal-target override toggle per party member |
| B | Open Socket screen (between rooms only; blocked while a draft is pending) |
| Esc / Enter / arrows / Space | Meta-screen navigation per §18 rules |

Movement is instant (no acceleration). Moving never affects aim; aiming never
slows movement. Character yaw turns smoothly toward aim (3D adaptation, ruling
A1); body leans slightly toward the move vector so kiting reads (fire forward,
run backward).

---

## 4. Simulation core (binding rules)

Each tick, two phases:

1. **Continuous phase** — apply `move`/`aim`/held states, advance dashes,
   projectiles, channels, zone clocks.
2. **Discrete phase** — resolve accepted discrete actions in strict total order:
   ① deferred maturations (projectile impacts, delayed Echo recasts) by
   ascending spawn ordinal of the carrying entity; multi-hits within one
   delivery near→far, ties by ascending target id. ② actor resolutions: party by
   `party_index` 0–3 (player = 0), then enemies by spawn ordinal. Per actor:
   targeting/party commands first (`target_cycle`, `target_select`, `rally` —
   never suppressed), then skills ascending slot 0–3, then basic-attack fire
   (slot 4). ③ technique continuations (Bounce hops, Detonate bursts, spawned
   pools) nest depth-first immediately after their triggering impact.
   ④ persistent-zone scheduled ticks, ascending zone spawn ordinal.
- Each resolution sees earlier same-tick mutations (two same-tick smart heals
  pick two different targets).
- A character Downed mid-tick loses its not-yet-executed resolutions silently.

**Intent vocabulary (closed list — humans and AI both act only through these)**:
`move` (Vec2, continuous) · `aim` (world pos, continuous) · `basic_attack`
(held bool) · `dodge` · `skill_1..4` · `rally` (player-only) · `revive_hold`
(held) · `target_cycle` (player-only) · `target_select 0–3` (player-only).
One discrete intent of each kind per tick; duplicates denied. Denied intents are
no-ops (no queue, no refund) but emit
`intent_denied(reason ∈ {on_cooldown, empty_slot, priority_suppressed,
duplicate_in_tick, not_anchor, revive_occupied})` for HUD nudges (§17).

---

## 5. Movement, dodge, basic attack

- **Move**: `velocity = dir × move_speed`. 8-dir, instant.
- **Dodge roll**: fixed dash, **i-frames for the full travel window**.
  Direction = this tick's move vector; if zero, dash toward aim. Direction and
  speed locked at activation. Defaults: distance **1.8 u**, duration **0.25 s**
  (speed 7.2 u/s = 3× run), cooldown **1.2 s** (own timer, outside the skill
  pipeline). Wall contact terminates the dash (no slide); collision is **swept**
  per tick (7.2 u/s tunnels thin walls if point-sampled). Activation while flush
  against a wall = zero travel, zero i-frames, full cooldown spent.
  During the dash all skill/basic fires are suppressed (`priority_suppressed`);
  targeting/rally never suppressed. Same-tick dodge beats skill fires, basic
  fires, and a revive-channel start. After the dash, a still-held basic attack
  restarts its full interval (hard reset). While i-framed, an incoming hit
  creates **no damage instance at all** (no crit roll, no RNG draw). The dash
  smear/afterimage VFX IS the i-frame signal and ends exactly at dash end.
- **Basic attack**: free (no cooldown resource), hold-to-repeat at the class
  `attack_interval`; first shot immediate. Ranged classes fire a projectile at
  the cursor; melee classes swing an arc on live aim hitting ALL targets in the
  arc. Damage = `basic_attack_power`, then crit roll.

---

## 6. Skills & delivery shapes

- 4 slots, cooldown-gated, no mana, **instant cast** (press → fire → cooldown
  starts). No cast bars; animation never gates movement or recasting. No global
  cooldown; no input buffering. Cooldown floor: `cd_final = max(0.5 s, cd)`.
  Cooldown-reduction is a multiplicative duration modifier. Cooldowns tick in
  sim time, persist across rooms, never reset.
- **Delivery shapes (closed set of 6)**, stats drawn from
  `{power, cooldown, range, area, count}`:

| Shape | range | area | count |
|---|---|---|---|
| `projectile` | max travel u | splash radius (0 = single target) | simultaneous bolts, fanned symmetric about aim, 12° spacing (n=2 → ±6°) |
| `melee_arc` | reach u | arc **half-angle** ° (live unquantized aim) | max targets, nearest-first |
| `nova` (self burst) | — | burst radius u | max targets |
| `ground_aoe` (at cursor, clamped to range) | max placement u | zone radius u | — |
| `aura` (self-attached field) | — | field radius u | — |
| `direct` (auto-target) | eligibility radius u | — | recipients = bottom-N by HP fraction |

- Count-capped shapes filter to eligible targets (living, not i-framed) first;
  ties by spawn ordinal. `count_final = max(1, floor(count))`; arc half-angle
  clamped 10–90°.
- **Projectiles**: straight line, `pos(t) = origin + aimDir × speed × t`;
  expire at `range/speed`; impact beats same-tick expiry; swept collision.
  Speeds are per-skill data, 4.0–6.5 u/s.
- **Zones** (`ground_aoe`): tick cadence 1.0 s, first tick 1.0 s after
  placement; each zone tick creates normal instances (own crit roll; i-frame /
  Downed suppression applies).
- Aim exactly on the caster: direction shapes reuse last valid aim; ground_aoe
  uses the cursor as-is.

---

## 7. Party classes & stats

Player controls the **Healer** (party_index 0, party anchor). AI drives Tank,
Swordsman, Archer (fixed 4-skill kits, no build growth — the player's build
grows, allies' don't; that's the intended power curve).
*PARTY (2026-09-27, ruling A16): superseded — every character grows a build
(§25); the kits below are the allies' STARTING loadouts.*

| Stat | Healer (mouse) | Tank (badger) | Archer (hare) | Swordsman (fox) |
|---|---|---|---|---|
| max_hp | 100 | 150 | 80 | 95 |
| move_speed u/s | 2.40 | 2.10 | 2.50 | 2.65 |
| attack_interval s | 0.5 | 0.65 | 0.4 | 0.35 |
| basic_attack_power | 8 | 9 | 12 | 11 |
| basic geometry | projectile 5.2 u/s, range 5.0 | arc reach 0.90, half-angle 50° | projectile 5.6 u/s, range 4.5 | arc reach 0.75, half-angle 40° |
| crit | 0.05 chance / 1.5× mult (all classes, damage AND heals; strict `roll < chance`) | | | |

### Healer skills (player) — 2 starting + 6 draftable
`archetype ∈ {damage, heal, passive}` drives node reinterpretation (§15).

| Skill | Archetype / shape | power | cd s | range | area | count | notes |
|---|---|---|---|---|---|---|---|
| **Mending Bolt** (start, slot 1) | heal / projectile | 22 | 3.5 | 5.0 | 0 | 1 | heal bolt, speed 5.2 u/s; hits first ally in path (passes enemies) |
| **Swift Mend** (start, slot 2) | heal / direct | 14 | 2.5 | 3.2 | — | 1 | smart-target instant heal |
| Nova Bloom | heal / nova | 16/target | 7 | — | 1.4 | 3 | |
| Sanctuary | heal / ground_aoe | 6/tick | 9 | 3.8 | 1.0 | — | duration 4 s (4 ticks) |
| Spirit Bolt | damage / projectile | 18 | 4 | 4.8 | 0 | 1 | speed 5.0 u/s |
| Warding Aura | **passive** / aura | 3/tick | — | — | 0.9 | — | always-on field around Healer, 1.0 s cadence, heals allies inside |
| Guardian Bond | heal / direct | 12 each | 6 | 3.4 | — | 2 | bottom-2 HP allies |
| Restorative Wave | heal / melee_arc | 15 | 5 | 1.1 | 55° | 4 | |

Warding Aura occupies a skill slot when drafted but has no activation (its slot
icon renders as a passive glyph, never a cooldown wipe).

### Ally kits (fixed, all damage)
*PARTY (ruling A16): these are each ally's starting loadout inside an 8-skill
class pool (§25.2); the AI-cast line below still governs these four skills.*
**Tank (badger)**: Heavy Slam (arc 34, 5 s, 1.00/40°, cap 3) · Brutal Cleave
(arc 16/target, 4 s, 0.95/80°, cap 6) · Ground Crack (ground_aoe 10/tick, 8 s,
range 2.6, radius 0.9, 4 s) · Whirling Guard (nova 20/target, 9 s, 1.3, cap 5).
**Archer (hare)**: Piercing Shot (projectile 30, 3 s, 5.5, speed 6.2) · Volley
(projectile 14/bolt, 4.5 s, 4.8, count 3 fan, speed 5.4) · Detonating Charge
(ground_aoe 12/tick, 7 s, range 4.2, radius 0.85, 3 s) · Sundering Nova (nova
16/target, 8 s, 1.1, cap 4).
**Swordsman (fox)**: Flurry (arc 11/hit, 3 s, 0.80/60°, cap 6) · Lunge Strike
(arc 26, 4 s, 1.30/30°, cap 2) · Blade Storm (nova 14/target, 7 s, 1.0, cap 5) ·
Caltrops (ground_aoe 8/tick, 6.5 s, range 2.0, radius 0.70, 5 s).

AI casts a kit skill when: target in shape range ∧ off cooldown; skills fire
ascending slot; AI basic-attacks between casts.

---

## 8. Targeting & command verbs

- **Heal smart-target** (`direct` heals): lowest-HP-fraction living ally (self
  included) within range; self is exempt from the range test so there is never
  "no target". Tiebreak: caster first, then ascending party_index (never
  distance). Multi-recipient = bottom-N; a forced override recipient is excluded
  from the remaining N−1 picks.
- **Override (F1–F4 / portrait click)**: durable toggle per caster. Press = set;
  same key again = clear; other key = replace; room clear = clear. A valid
  override forces the recipient; an invalid one (downed/out of range) falls back
  to smart-target WITHOUT clearing and resumes when valid. Self-select legal.
- **Enemy mark (Tab)**: party-shared. First press = nearest enemy to player;
  repeats cycle outward by distance (ties ascending spawn id); past farthest
  wraps to nearest; recomputed fresh each press. Cleared on mark death or room
  clear. Steers allies and AI `direct` casts only — NEVER the player's aimed
  shapes. Empty room: no-op. Marked enemy shows a Signal Blue reticle glyph.
- **Rally (R, player-only, no cooldown)**: captures the player's position that
  tick; every ally breaks engagement (including revive channels) and moves
  there. On arrival hold with no re-engagement for **1.0 s**, then resume.
  Re-press re-points immediately. Unavailable to everyone while the player is
  Downed. HUD confirm: simultaneous expanding-ring flash on all 4 portraits.

---

## 9. Damage, healing, crits, and the juice contract

**Instance pipeline** (identical for player, ally, and enemy sources):
base = skill `power` or `basic_attack_power` → one crit roll from the seeded
stream in resolution order → `final = base × (1.5 if roll < 0.05 else 1)`.
No armor/resists/damage types. Heals clamp at max_hp. A **`full_heal` event**
fires per instance when `pre_clamp > 0 ∧ current + pre_clamp ≥ max_hp`
(inclusive — an AoE topping 3 allies fires 3 events; feeds Detonate-on-heal).
Downed characters are OUTSIDE the pipeline: no instance ever targets them, no
roll is drawn. I-framed targets likewise produce no instance.

**Juice contract — every hit must land with ALL of (Hades bar, binding):**
1. **Hit flash**: victim mesh flashes white ~3 frames (emissive/color modulation,
   never material swap).
2. **Damage number**: pops on EVERY hit (see §17 world-space).
3. **Knockback**: non-boss enemies get a positional impulse away from the hit —
   0.12 u over 80 ms on basic hits, 0.30 u on skill hits; swept vs. walls; boss
   immune. Party members are never knocked back (readability ruling A5).
4. **Hitstop**: global sim pause 2 ticks on melee-arc connects, 3 ticks on kill
   blows (cap: no stacking above 4 ticks per 20-tick window).
5. **Sound slot**: a distinct WebAudio synth cue per event family (§21).
6. **Kill**: squash-stretch death pop + particle burst + persistent ground decal
   (dark splat, cosmetic-stream rotation/scale, fades after ~20 s, cap 40).
7. **Screenshake**: small (≤0.06 u camera offset, ≤120 ms) on player-adjacent
   explosions and kills; never on ordinary hits.

- **Tuning note (certification fix round 1, 2026-09-09):** two §9 numbers moved
  because the round-1 scorers could not SEE them on the frame.
  - **#3 knockback** 0.12 u basic / 0.30 u skill over 5 ticks -> **0.34 u /
    0.72 u over 10 ticks**. A Thorn Boar closes at 2.0 u/s = 0.033 u per tick,
    so the authored impulse was fully eaten back inside 4 ticks: the
    certification probe measured **0.03 u of net travel** on a hit and all
    three scorers marked the hit as landing without consequence. Everything
    else about #3 is unchanged (swept vs walls, boss immune, party never
    knocked back), and the impulse still never stacks — a repeat hit re-arms it.
  - **#7 screenshake** is now emitted by the sim as a `screenshake` event
    (`{cause, amp, durationSec, x, z}`) instead of being inferred render-side
    from `death`. Kills keep the authored ceilings exactly (0.06 u / 120 ms);
    the two heaviest events only — **boss stomp and quake landing** — run
    **180 ms** at the same 0.06 u amplitude, because a 120 ms shake almost
    never intersects a 150 ms capture cadence and the round-1 scorers recorded
    "0 screenshake events / torch centroid stable +-2 px". The render side
    clamps every event to amp <= 0.06 u and duration <= 200 ms.
  - Hits now also carry `dirX`/`dirZ` (the unit impact direction) so the
    render side can throw its debris spray ALONG the hit.
- **Implementation note (certification fix round 2, 2026-09-10):** no §9 number
  moved. #4 hitstop is now requested for BOTH halves of the contract — the
  2-tick melee-arc pause was never wired, so only kill blows paused the sim.
  Two rulings make the authored cap behave: (a) every damage instance carries
  its `shape`, and a `melee_arc` instance that does NOT kill requests
  `HITSTOP.meleeTicks`; a LETHAL arc connect takes the 3-tick kill pause
  instead, never both; (b) requests landing on the SAME sim tick — a 6-target
  Brutal Cleave, the Tank and the Swordsman connecting together, an arc whose
  third victim dies — TOP UP to the strongest cause (kill 3 > arc 2) instead of
  stacking 2+2+3, because the tick freezes as one impact moment either way.
  Stacking would have emptied the 4-per-20 window budget on a single swing and
  starved the next kill. `hit` events now carry `shape` and `hitstop` events
  carry `cause: 'melee_arc' | 'kill'` plus the tick's running `total`.

Player spawn/skill VFX must never use Ember Danger or God-stuff Violet (§19).

---

## 10. Downed & revive contract

- HP ≤ 0 (any source) → **Downed**: crawls at 0.8 u/s (movement only), cannot
  act, cannot be damaged or killed. Pose collapses horizontal; accent color
  desaturates toward charcoal; identity ring stays visible.
- **Manual revive**: any living party member holds **E** while stationary (zero
  move intent) within **0.6 u** of a downed ally. One reviver per body (second
  attempt denied `revive_occupied`). After **5.0 s** uninterrupted → target
  restored to **30% max_hp**, both mobile.
- **Breaks** (progress resets to 0, never resumes): nonzero move, dodge, skill
  cast, *fresh* attack press, or the reviver going Downed (target stays down).
  The breaking intent executes normally that tick. A held attack carried into
  the channel is consumed silently (neither fires nor breaks). Same-tick dodge +
  channel start: dodge wins.
- **Repeat-revive diminishing** (same character, same room, manual only):
  30% → −10 pp per repeat, floor 10%; resets each room.
- **Room clear**: every Downed member revives free at 30% (exempt from
  diminishing).
- **All four Downed simultaneously ⇒ run ends (defeat).**
- HUD/world feedback: hollow Bone radial ring + hold-E glyph over the body and
  on the portrait; channel fills clockwise from 12 o'clock in Parchment;
  interrupt = reverse drain at 2× speed + one 2 px lateral portrait shake.

---

## 11. Enemies, waves, telegraphs, boss

Act-1 family: corrupted beasts. NEVER round warm low-set eyes, never bell-cloak
silhouettes — those are party-exclusive. Each enemy has exactly one corruption
tell (angular growth / faint violet eye-glint).

| Stat | **Thorn Boar** (melee rusher) | **Spitting Mantis** (ranged shooter) | **The Hollow Stag** (boss) |
|---|---|---|---|
| HP | 20 | 15 | 1800 (tuned — see note below; authored 200) |
| move u/s | 2.0 | 1.6 (repositions to keep range) | 1.8 |
| damage | contact 8 | shot 10 | primary 15 · secondary 12 |
| attack cd | 0.8 s per target | 2.5 s | primary 4.0 s · secondary 2.5 s |
| range | contact (0.35 u) | engage 3.5 u | see attacks |
| telegraphed? | no | yes (0.7 s) | primary yes (0.7 s) · secondary no |

- **Tuning note (Round D2, 2026-09-03):** the Stag's authored 200 HP was never
  validated against this section's own kit numbers — measured party output is
  ~220 opening burst + ~120 dps sustained, which killed the boss in 0.95 s with
  all three add phases inside half a second. HP is now 1800 so the fight spans
  the quake cadence and the three add waves, and add phases are additionally
  spaced ≥ one quake cycle (4.0 s) apart. No hidden immunity; numerals stay
  equal to HP deltas.
- Enemy projectile speed 4.0 u/s (always slower than the player's 5.2, by
  design). Enemy attack VFX use the Ember family; enemy damage resolves through
  the same instance pipeline (i-frames/Downed suppress entirely).
- **Targeting**: every enemy independently targets the nearest living non-Downed
  party member, re-evaluated continuously — no threat table, no coordination.
  In defend rooms while the objective lives, the candidate set is
  {party} ∪ {objective}, same nearest-wins rule (interposition IS the defense);
  reverts on objective death.
- **Telegraphs**: Ember Danger `#FF5A36` ground decal at the impact zone
  (opacity pulse 2 Hz) + hazard chevron, visible ≥0.7 s before resolution.
  Structural cadence rule: no two player-targeted telegraphs resolve within
  1.2 s of each other — enforced by an encounter director capping simultaneous
  telegraphing attackers at **2** and staggering attack-cast starts by ≥1.2 s
  (applies across boss + adds too).
- **Waves — kill_all rooms**: 2–3 sequential waves (seeded roll) of 3–5 enemies,
  each enemy 60% Boar / 40% Mantis (seeded). Spawn at arena-edge spawn points
  with a 0.8 s spawn telegraph (violet shimmer, not Ember). Next wave at
  previous-wave-dead OR 2.0 s after previous wave fully spawned +
  wave-interval 8 s, whichever first. Clear predicate: schedule exhausted ∧ no
  living enemies ∧ ≥1 party member not Downed (evaluated end of tick).
- **Defend rooms**: objective = **the Waystone**, a static rune monolith,
  150 HP, warm amber rune glow. `defend_timer` = **45 s**. Waves at t = 0, 12,
  24, 36 s (3–4 enemies each, same mix), and run to completion regardless of
  objective state. Clear: timer expires ∧ objective alive (survivors despawn).
  Objective death = **soft-fail**: room reward forfeited (silently — no reward
  event), room converts to kill-all-remaining with the same remaining schedule,
  leash anchor flips to the party that tick, run continues, stipend still paid
  on clear.
- **Boss — The Hollow Stag** (room 8): a corrupted stag, party-height ×2.2,
  violet-white veined antlers, the room's single brightest light source
  (feverish warm boss-light; room a stop darker than normal Act-1).
  - *Antler Quake* (primary, telegraphed): Ember decal ring radius 1.6 u at the
    current target's position, 0.7 s warning, then burst 15 dmg. cd 4.0 s.
  - *Trample* (secondary, untelegraphed): short lunge at nearest party member
    within 1.5 u, contact 12 dmg. cd 2.5 s.
  - Adds: at 75% / 50% / 25% HP, spawn 2 Boars + 1 Mantis (concurrent cap ≤7 in
    the boss room). Boss cannot be marked past leash rules; boss immune to
    knockback. Clear = boss and adds all dead. Boss HP bar top-center with name
    plate.
- **Tuning note (certification fix round 1, 2026-09-09):** the rank-and-file
  corruption tell moves from **God-stuff Violet to INDIGO** (hue 228, one long
  step off Signal Blue's 200 deg). §19.1 reserves violet for
  corruption/boss/Defeat, and all three round-1 scorers read the Thorn Boar's
  violet thorn ridge and the Spitting Mantis's violet eye-glint as a colour-
  discipline break: if a wave-1 boar wears violet, the Hollow Stag's rack and
  the corrupted monolith stop meaning anything. Each enemy still carries
  **exactly one** tell — only its hue changed, into the indigo-night family the
  hides already live in. Violet stays exclusive to the Stag, the monolith and
  the 0.8 s spawn shimmer (a spawn IS corruption arriving, and it is an event,
  not a body).
- **Room clear**: surviving enemies enter Retreating (ignore players, stop
  attacking, despawn ~1 s); zero further instances or RNG draws.

---

## 12. Ally AI (Tank / Swordsman / Archer)

- **Leash**: reference = the room's live `leash_anchor` (party anchor in
  kill_all/boss/shop; the Waystone in defend until soft-fail flips it). Radius
  **3.4 u**. Beyond the leash with no valid in-range target → disengage and move
  to anchor; re-engage only once within 0.8 × radius. Marked targets are
  leash-capped — never pursued past the boundary. Anchor tracking follows a
  Downed anchor's crawl.
- **Targeting**: no mark → all allies attack the enemy nearest to the
  leash_anchor (one shared computation = natural focus fire), ties by spawn
  ordinal. Player's Tab-mark overrides for all allies, honored live; if the mark
  dies/leaves range it is NOT cleared — fall back to nearest-to-anchor, resume
  when valid. Approach: steer to own attack/skill range (melee reach for
  Tank/Swordsman, projectile range for Archer). Obstacle-aware steering is
  sufficient (arenas are open with edge props — full navmesh not required;
  ruling A6). Ally separation: 0.26 u soft push.
- **Revive AI**: serial rescue, priority = player's body first, then
  longest-Downed; reviver = nearest eligible ally with HP ≥ 30% of own max.
  Eagerness unconditional: the nearest eligible ally breaks off combat
  immediately and channels. Rally interrupts an AI channel (reset, not resume).
- AI allies never dodge-roll and never set heal overrides; AI heal casts (none
  in MVP kits) would use smart-target.

---

## 13. Rooms & run lifecycle

**Room-clear boundary sequence (fixed order from the clear tick):**
1. `combat_active := false`
2. Every live combat entity ends: projectiles, zones, surviving enemies despawn
   (no instance may land after the clear tick)
3. All Downed party members revive at 30% max_hp
4. Targeting state clears: mark → none, heal overrides cleared, rally point
   cleared
5. `room_cleared` event (stipend +12 Glint for combat rooms)
6. Reward presentation (skipped if forfeited) → path choice (rooms 1–5) →
   transition fade
7. Next room's first tick: `combat_active := true`

**Persistence across rooms**: cooldown timers (skills + dodge — keep ticking),
party HP + Downed state, owned skills + socket assignments, bench nodes, Glint,
RNG stream state, run frame + room index. **Cleared each boundary**: targeting
state, projectiles/zones. **Wiped at run end**: everything.

**Arenas** (hand-built layout pool, seeded pick): combat playfield ≈ 24×16 u
inside walls; 3 layout variants (prop arrangement + spawn points differ).
Shop room ≈ 12×10 u. Boss arena ≈ 18×18 u. Camp ≈ 16×12 u. Walls block movement
and projectiles; wall visual height ≤ 70–80% of character height (never fully
occludes; a character behind a wall stays partly visible + identity ring always
visible).

---

## 14. Glint economy

| Value | Number |
|---|---|
| starting_glint | 0 |
| clear stipend | +12 per combat-room clear (incl. boss, incl. after defend soft-fail) |
| wallet at shop (deterministic) | 0 + 12×6 = **72** |
| shop prices | common **15** · rare **20** · legendary **25** (M4c; were 25 / 30 / 35) |
| shelf | **4 cards**: 2 common + 1 rare + 1 legendary (M4c; was 3, one per rarity) |
| invariants | all 4 = 15+15+20+25 = 75 > 72 (never the whole shelf) · any 3 ≤ 60 ≤ 72 (any 3 affordable) |
| clear spoils | **+2 nodes** to the bench per combat-room clear, rooms 1–6 (M4c; commons + rares from the usable pool; forfeited with the reward on a defend soft-fail) |

*PARTY (ruling A16): every character has its own purse with these numbers;
the Healer's purse is this wallet (§25.5).*
Wallet: integer ≥ 0, atomic spend; insufficient funds → `currency_denied` no-op
(item never hidden or greyed for price). Wiped at run end. Glint UI color Pale
Gold `#D9B872` with a ≥24 px coin icon.

**Tuning note (M4c, 2026-09-22 — the user's skill/socket correction).** With
at most 4 skills and **8 sockets on every skill** (§15.2) the build has 32
sockets to feed instead of 16, and the v0.5.x supply (≤ 5 node drafts + 2 of 3
shop cards ≈ 7 nodes a run) left three quarters of them empty. Node supply is
therefore: clear spoils (2 per combat clear, 12 a run), node drafts
(unchanged, §16), and a 4-card shelf priced 15/20/25 so the deterministic 72
Glint buys three. Measured on the default-build autopilot (Act I, seeds 1–3):
spoils 12 + drafted 4 + purchased 3 per run; the party reaches the Stag with
19 of 32 sockets filled (≥ 50%, the M4c supply gate).

**Tuning note (fix-M4a-r4, 2026-09-27 — a full build keeps progressing;
CONTENT4-F1).** In the linear campaign a carried build fills all 32 sockets
by the Level 2 Stag (a Level-3 start arrives 32/32 from its grant), and the
vacant-socket filter then emptied every pool: Level 3 gave no reward, no
spoils and an empty shelf while the wallet held ~115 Glint. Binding now:
every node pool is **layered**. The FILL layer (`usable_by_party`, §15.5 —
a vacant socket where the node works) is drawn first, exactly as before; only
when it cannot serve a draw does the **UPGRADE layer** step in: nodes with no
vacant usable socket that **outrank** a socketed node — the occupant is dead
weight on its skill (grey or +0) or of a lower rarity (common < rare <
legendary, the ladder the shelf prices by), the candidate is live there and
within its limit with the occupant out. Clear spoils top up from the upgrade
layer's commons + rares, a node reward (or a skill reward substituted by a
node) draws from it, and an empty shelf stratum takes the same rarity from
it — each card and offer names the swap ("⇧ upgrades Spirit Bolt · replaces
Quicken"). The spoils are still commons + rares, so a drop is short only
when no common or rare outranks anything any more (the page says so); the
empty reward page is only for a COMPLETE build (4 skills, no node fills or
outranks a socket — "BUILD COMPLETE · Nothing outranks your build"). Measured
(Node, default autopilot, seeds 1–5): Level 3 of a carried campaign 0 / 0 / 0
→ spoils 5–7, drafted 4, purchased 1–2 (Level-3 start: 6–8 / 4 / 1–3); every
Level 3 reward offer is an upgrade node; the build at the L3 Stag holds 1–3
commons / 21–23 rares / 6–8 legendaries; Levels 1–2 draw exactly as before
until their rows fill (goldens bit-identical), and the §4.2 band holds for
campaigns from Levels 1, 2 and 3.

---

## 15. Build system — nodes, sockets, reinterpretation

### 15.1 Node pool (MVP: 4 stat + 4 technique)

| Node | Kind | Rarity | Limit/skill | Effect |
|---|---|---|---|---|
| **Sharpen** | stat | common | 2 | +25% power (additive_pct) |
| **Quicken** | stat | common | 2 | −15% cooldown (additive_pct on duration) |
| **Multiply** | stat | rare | 1 | +1 count (additive_flat) |
| **Ascend** | stat | legendary | 1 | ×2 power (multiplicative) |
| **Bounce** | technique | common | 2 | see matrix |
| **Siphon** | technique | common | **1** | see matrix |
| **Echo** | technique | rare | 1 | see matrix |
| **Detonate** | technique | rare | 1 | see matrix |

### 15.2 Sockets
**USER CORRECTION (2026-09-22, binding — supersedes the v1.0 cap system and
every "8 skill slots" line of §23 / PLAN):** the player equips **at most 4
skills**, and **every skill — actives and passives alike — has 8 sockets**.
**No socket has a rarity cap: any node of any rarity fits any socket.**
- 8 sockets per skill (`SOCKETS_PER_SKILL`, src/core/constants.js), numbered
  1–8, one node per socket. The old slot-A-`rare` / slot-B-`legendary` /
  passive-`rare` caps, their `cap` denial reason and the A/B cap chips are
  gone.
- Unsocketed nodes live on an **uncapped bench** (provenance `drafted` /
  `purchased` / `spoils`). Socket/unsocket free and unlimited — but ONLY while
  `combat_active == false`. **Repetition** (kept): copies of a node on one
  skill (incl. the candidate) ≤ its limit (§15.1, §23.4).
- Hard blocks (§16 rejection shake + `socket_denied`): `limit`, `full` (all 8
  taken, slot omitted), `no_such_slot`, `combat_active`, `not_on_bench`,
  `skill_not_owned`. Grey stays advisory (§15.5).
- **Legendaries on a passive** (now legal, so each has a defined
  reinterpretation instead of a cap verdict): **Ascend** = ×2 pulse power (the
  §15.4 stat pipeline — Warding Aura 3 → 6 per pulse); **Resonance** = every
  3rd pulse of that aura resolves at ×2 (per-skill counter shared with casts,
  persists across rooms, resets at run end; the Echo Reapply bonus pulse never
  advances it; `resonance_proc { pulse: true }`).
- **Auto-fill** (one policy, sim-side `autoFill()`; the socket screen's F / pad
  Y / button and the default-build autopilot both call it): bench order, each
  node to the owned skill where it is LIVE (never grey, never saturation-
  inert), within its limit, with a vacant socket, preferring the skill with
  the fewest filled sockets (ties: the lower skill slot). **Upgrade swap
  (fix-M4a-r4):** a bench node with no vacant live socket replaces the
  weakest socketed node it **outranks** (`upgradeFor()`: a grey / +0
  occupant first, then a lower rarity; the node live there and within its
  limit with the occupant out; ties: the lower skill slot, then the lower
  socket) — the occupant banks to the bench. A fill raises the socket count
  and a swap raises the build's rank sum, so auto-fill terminates.

### 15.3 Technique reinterpretation matrix (authored numbers)

| Node | On damage skill | On heal skill | On passive (Warding Aura) |
|---|---|---|---|
| **Bounce** | impact ricochets to the nearest OTHER enemy within 2.2 u, full resolved power, 1 hop per copy | heal chains to the next-lowest-HP OTHER ally within 2.2 u, full resolved power, 1 hop per copy | **GREY** |
| **Siphon** | caster self-heals for `0.25 × flat-stage power` per instance | damages the nearest enemy within 2.0 u of the healed ally for `0.25 × flat-stage power` (tie → lowest spawn id; none → "nobody near" fizzle cue at the ally) | **GREY** |
| **Echo** | full recast at the same aim/target 1.0 s later at **50%** resolved power | full recast 1.0 s later at **100%** power | *Reapply*: one bonus full-strength aura pulse every 3.0 s while the aura persists |
| **Detonate** | kills by this skill explode: 50% resolved power damage burst, radius 1.2 u | `full_heal` events from this skill burst-heal allies within 1.2 u for 50% resolved power | **GREY** |

Technique rules: fire ascending socket index (1 → 8; duplicate Bounce = 2
hops). **Depth-1 rule**: technique-produced output never triggers techniques
(a Bounce hop doesn't re-bounce; a Detonate burst never re-detonates or feeds
Siphon); Echo recasts are new resolutions producing primary events but an echo
never re-arms its own echo (one per cast). Siphon amount is computed from the
FLAT-stage power (base at MVP) — immune to %/× nodes, crit, and clamps; its
card always shows: *"converts 25% of base healing — unmodified by any other
socket, crit, or buff."*

**Shape capabilities** (what makes a technique cell live): retargetable-impact =
{projectile, direct} (Bounce needs it) · Siphon/Detonate/Echo-active = any
active skill · Echo-passive needs a persistent aura. Grey therefore lands as:

| Skill | Bounce | Siphon | Echo | Detonate | Quicken | Multiply |
|---|---|---|---|---|---|---|
| Mending Bolt (heal proj) | live (chain) | live (drain) | live | live | live | live (2-bolt heal fan) |
| Swift Mend (heal direct) | live (chain) | live | live | live | live | live (bottom-2) |
| Nova Bloom (heal nova) | GREY | live | live | live | live | live (cap 3→4) |
| Sanctuary (heal zone) | GREY | live (per tick per occupant) | live | live | live | GREY (no count stat) |
| Spirit Bolt (dmg proj) | live (ricochet) | live (self-heal) | live | live (kills explode) | live | live (2-bolt fan) |
| Warding Aura (passive) | GREY | GREY | live (reapply) | GREY | GREY (no cooldown stat) | GREY |
| Guardian Bond (heal direct) | live | live | live | live | live | live (bottom-3) |
| Restorative Wave (heal arc) | GREY | live | live | live | live | **saturation-inert** (count 4 = whole party; realizes +0) |

Sharpen and Ascend are live on every skill (power is always a stat key).

### 15.4 Stat resolution pipeline
Per stat key: `base → +flat → ×max(0, 1 + Σ additive_pct) → ×Π multiplicative →
techniques → clamps (cd ≥ 0.5 s)`. Two Sharpens = +50% applied once
(22 → 33, never 22×1.25²). Worked examples (bindable tests):
Sharpen+Ascend on Mending Bolt: 22 → 27.5 → **55**. Quicken on Mending Bolt:
3.5 → **2.975 s**. Siphon on Mending Bolt: drain always **5.5**; on Spirit
Bolt: self-heal **4.5**. Multiply on Restorative Wave: 4 → 5 but ally pop = 4 ⇒
realized **+0** (saturation-inert).

### 15.5 Display contract (grey / inert / verdict — binding)
- **Grey** (technique cell GREY, or stat key absent from the skill): legal to
  socket, contributes nothing; advisory warning before socketing; shown as
  hollow icon + diagonal strike-through. Never blocked.
- **Saturation-inert** (Multiply where realizable delta = 0): non-grey but
  currently +0 — distinct marker (hollow icon + "+0" caption), NEVER reusing
  the grey strike treatment. Live-preview copy: "+1 target — currently +0 (all
  4 allies already hit)".
- **Card verdicts**: draft/shop cards show "fits your kit" (∃ owned skill where
  it's non-grey and non-inert) vs. "nothing in your kit uses this yet"; a
  per-skill breakdown is behind an explicit toggle (Space), never hover-only.
- **Never encode state by color alone** — every state has a shape/glyph channel.
- Draft/shop pools filter by `usable_by_party` (∃ owned skill + vacant socket
  where the node is non-grey and within its limit — M4c: no cap clause).
  fix-M4a-r4: that is the FILL layer; when it cannot serve a draw, the
  UPGRADE layer (§14 note — nodes that outrank a socketed node) serves it,
  and the card shows "⇧ upgrades <skill> · replaces <node>" instead of the
  kit verdict.

---

## 16. Draft, shop, path flow

- *PARTY (ruling A16): after every combat room the draft page is the PARTY
  page — one such card per character, the player's own card focused first
  (§25.6); everything below holds per card.*
- **Draft** = ONE candidate card, take-or-decline, no reroll, no confirm dialog,
  no reopen. Skill pool = the draftable healer skills (15 after §23.3) − owned
  (`free_skill_slots = 4 − owned`: at most 4 skills, M4c — a 5th skill is
  never offered). *PARTY (ruling A17, the user's rule, 2026-09-27): with 4
  skills owned a skill reward STAYS a skill reward — a SWAP offer: one Healer
  skill not owned (pool = all 17 Healer skills − owned; with both starting
  skills owned this is exactly the 15-skill draftable draw), and the player
  chooses which of the 4 it REPLACES (the Replaces selector, §25.6) or Leaves
  and keeps the loadout; the replaced skill returns to the pool, its nodes to
  the bench with the auto-fill offer. A skill promise never becomes a node
  any more.* Node pool = the 17
  nodes filtered by `usable_by_party`. Uniform seeded draw from the pool sorted ascending id.
  Empty promised NODE pool → substitute a skill (a swap offer when 4 are
  owned) with an explicit line ("nothing in your kit sockets a Node —
  offering a Skill instead"); both empty → "the run moves on" +
  Continue. (fix-M4a-r4: the node pool is layered — fill, then upgrade, §14
  note — so "both empty" means the build is COMPLETE; the card reads "BUILD
  COMPLETE · Nothing outranks your build", never "spent".) Declines have no memory. Taken skill → first empty slot; taken node
  → bench (never auto-socketed). Taking a node chains straight into the Socket
  screen with the candidate pre-focused (M4c: IN HAND, the cursor on the socket
  the auto-fill policy picks, so Enter places it). The page names the room's
  clear spoils ("Spoils → bench: …") — already on the bench either way.
- **Socket screen** (B key / pad View between rooms, or chained): the 4 skills
  as rows of 8 sockets in socket order (M4c layout: one page, no scrolling
  from 1024×576 to 2560×1440), the bench as grouped chips, a detail line; live
  preview on the node in hand × the focused socket with computed contribution
  and reason, plus a per-row verdict (◆ live / ⊘ grey / +0 inert / ⊘ limit /
  ⊘ full); hard blocks (limit / full) = rejection shake + block glyph; grey =
  advisory, proceeds. One cursor for keyboard (arrows/WASD, Enter pick /
  place / move, X remove, F auto-fill, 1–4 rows, Tab bench), mouse (hover,
  click, right-click remove) and gamepad (D-pad, A, B, X, Y, LB/RB). Esc
  banks the candidate to bench.
- **Shop (room 7, one visit)**: 4 node cards (M4c; 2 common + 1 rare + 1
  legendary) drawn without replacement from the live filtered pool at room
  activation (fewer eligible → show fewer). Prices by rarity 15/20/25 (M4c)
  on plaques below the card; Glint balance in the top context
  strip; "you own N" line when applicable. Purchase = whole-card click →
  price-stamp flash → card departs to bench; no backfill/sell-back/reroll.
  Insufficient funds: plaque emphasis + one ~300 ms shake, item stays. Empty
  shelf: "nothing left to sell you". Advance → boss (one-way). Esc inert.
  - **Tuning note (certification fix round 1, 2026-09-09):** the shop is the ONE
    meta screen that is not a full-veil "flat storybook card page". Round-1
    certification scored the shop frame 10–12/20 with three independent scorers
    agreeing on the cause: a full-screen charcoal modal over a 65–90% veil,
    parked exactly on the party (FLAT 52.9%, LUMA >160 1.26%, zero entities in
    frame, no shop light of its own). The shelf is therefore now a COMPACT
    ORNATE PANEL (wood grain + brass, ~920×355 design px) docked above the
    command bar, over a ~12% dim (`#run-veil.rn-light`), so the lit arena, its
    torches and the party stay in frame. Everything §16 actually specifies is
    unchanged: 3 cards (4 at 15/20/25 since M4c), plaques BELOW the card at 25/30/35, Glint strip, "you
    own N", whole-card click → stamp → bench, one ~300 ms denial shake with the
    item never greyed or hidden for price, Advance one-way, Esc inert. Every
    other meta screen (draft, path, victory, defeat) keeps the §16 full veil.
  - **Tuning note (certification fix round 2, 2026-09-10):** the shelf is
    NIGHT-GRADED and the shop dim is COOL. Round-2 certification scored the
    shop frame's check 2 ("layered light") 1/2 on two of three scorecards with
    the same cause: "no cool pole — cool 5.7% against the reference's 76.4%;
    the frame is amber panel vs green field". The round-1 shelf was warm brown
    edge to edge (panel box HUEMIX warm 97.3 / cool 1.6). It now runs a warm
    pool under the peddler's lantern falling off through slate to deep indigo
    at the rim (panel box warm 40.1 / cool 59.5), casts an indigo rather than a
    neutral-black shadow, and the `#run-veil.rn-light` dim keeps its round-1
    alphas (6% centre, 10% mid, 24% edge) but is tinted deep indigo instead of
    Void Charcoal. The §19.1 palette is untouched — brass, Pale Gold plaques,
    the Hearth Amber Advance lamp and the Bone / Signal Blue / Hearth Amber
    rarity rims all keep their authored colours, and no HUD (Zone-1) plate is
    re-tinted; this note covers the shop PAGE's own wood only. The §16
    ornament diamond on the title rail is now a drawn brass lantern (a light
    SOURCE for the pool that was already there), and the purchase
    choreography's window moved from 620 ms to 2100 ms: a harness screenshot
    costs several hundred ms of page time, so the shorter window was
    photographable only once and a scorer measured "0.00% changed" three
    frames running. Everything §16 specifies about the transaction (whole-card
    click, stamp, departure to bench, one ~300 ms denial shake, item never
    greyed for price) is unchanged.
- **Path choice** (after rooms 1–5): two door panels (160×220 design-px), each
  showing ONLY a win-condition glyph + reward-type glyph; `free_skill_slots`
  displayed at screen level. A/D or arrows focus, Enter commits under the
  **fresh-press rule** (a held Enter from the previous screen never commits).
  Irreversible; Esc inert.
- All meta screens: flat storybook card pages, non-diegetic, Zone 1 HUD persists
  beneath; enter/exit ≤300 ms fades; interactive within 350 ms.
  - **Tuning note (certification fix round 4, 2026-09-10) — the settle
    window.** A/D are WASD in combat and choose-left/right on every page, and
    a page is on screen ~10 ms after the clearing kill. Certification B-r3
    (F1) measured a strafing tap landing in that instant retargeting the draft
    to Decline, and the next Enter — the key the page advertises — destroying
    the reward with no confirmation (12 of 12 rewards lost across two
    real-input runs); the draft's focus also never re-initialised, so one D
    armed Decline on every later reward. Binding now: (1) every page opens
    with its focus on its primary (draft: Take; path: door 0) and never
    inherits a focus from the page before it; (2) for **300 ms** after a page
    opens, navigation (A/D/←/→) and commit (Enter/Space) keys are dropped,
    and any key already down at open — or pressed before the page settled —
    must be released and pressed again before it counts; a **carry-over key**
    (a key with a combat meaning and no page meaning: 1–4, W/S, R, E, Tab,
    F1–F4) restarts the 300 ms, capped at 1 s after open, because it is
    evidence the hands are still running the fight pattern (measured: the
    certB3-b2b strafe lands "A@146 · 2@271 · 3@334 · D@396" on a fresh page);
    (3) Esc is honoured at once (it has no combat meaning) and stays the
    decline path. After the window the documented bindings apply unchanged.
    "Interactive within 350 ms" holds for still hands; a lone choose key after
    a quiet 300 ms counts exactly as documented. Probe surface:
    `runUi().sinceOpenMs / settled / settleInMs / carryMs / graceMs`.

---

## 17. HUD spec

Implementation: a DOM overlay (`#hud` root) above the canvas. The root is
designed at **1920×1080 virtual px** and uniformly scaled by
`min(innerWidth/1920, innerHeight/1080)` (centered, letterbox margins
transparent) so all px values below hold at every window size. World-space
elements (§ Zone 3) are three.js sprites/decals OR DOM nodes projected each
frame — builder's choice per element; damage numbers are pooled DOM nodes.

**Grammar**: HUD = calm geometric instrument panel — rounded-rects, colors
limited to Void Charcoal `#221F1B` plates, Warm Grey `#9C9186`, Parchment
`#F4EFE6` text/glyphs, Bruise Umber `#4E463F` incoming-damage numerals, plus
semantic colors. HUD never adopts environment tinting. Typography: rounded
humanist sans stack (`system-ui` rounded stack), `font-variant-numeric:
tabular-nums` for ALL HP/timer/damage numerals. Floors: HUD text ≥16 px,
numerals ≥20 px. Combat text always sits on an opaque charcoal plate.

**Zone 1 — Command Bar (bottom-center; the only permanent UI; persists under
meta screens)**: 4 party portraits (player + 3 allies, left group) + 4 skill
slots (in slot order = execution order) + dodge slot (right).
- **Portrait** 64×64: rendered head of the actual character model (render each
  class model to a 128² RenderTarget once at load), class-accent frame, HP bar
  in class accent on a charcoal track. States: Healthy (>50%) static · Hurt
  (25–50%) bar length only · Critical (<25%): frame+track value-pulse
  charcoal↔bone at 2 Hz, inner frame 1→3 px, persistent ≥20 px HP numeral
  (character art never tints) · Downed: horizontal portrait treatment + hollow
  Bone radial ring with hold-E glyph · Being-revived: ring fills clockwise in
  Parchment · Revive-interrupted: reverse drain at 2× + single 2 px shake ·
  Selected override (F1–F4/click): static 2 px Hearth Amber outline · Hover:
  chrome +1 value step only. Full tile = click region.
- **Cooldowns** (one grammar for skills + dodge): clockwise radial wipe from 12,
  70% charcoal overlay; <1.0 s remaining → ≥20 px Parchment numeral; ready-pop =
  120 ms scale 1.0→1.15→1.0 + plate flash charcoal→warm-grey. Empty slot = dim
  hollow frame. Passive skill slot = static glyph, no wipe.
- **Denial nudges** (~150–200 ms, restart on repeat, icon-level only, never
  alarms): `on_cooldown` → wipe nudge · `empty_slot` → frame blink ·
  `priority_suppressed` → ready-icon skip-pulse. Grey-socketed-node marker on a
  slot: hollow icon + diagonal strike, persistent, static.
- **Rally confirm**: outer expanding-ring flash on all 4 portraits at once
  (distinct from Critical's inner pulse; must composite with it).

**Zone 2 — Room banner (top-center, contextual, ≤300 ms fade in/out)**:
defend → Waystone HP bar + `current/max` numeral + countdown timer; kill_all →
wave progress cue ("Wave 2/3" + remaining pips); boss → ornate boss HP bar +
name plate ("THE HOLLOW STAG"). Zones 1+2 combined ≤ ~15% of screen height;
center screen stays clear.

**Zone 3 — world-space** ("render at the thing"):
- Ember telegraph decals (ground, ≤3 Hz pulse) — the ONLY red-orange.
- Signal Blue mark reticle on the Tab-marked enemy (glyph, never a fill).
- Identity rings: soft ground ellipse under each party member in class-accent
  hex, constant opacity, exempt from all palette/lighting shifts, visible under
  occlusion.
- Revive ring: Parchment radial fill on a charcoal backing disc, concentric
  OUTSIDE the downed ally's identity ring, ≥48 px on screen.
- Damage numbers: outgoing = Parchment, rise-and-fade, scale with magnitude;
  incoming (party) = Bruise Umber with Parchment outline, drops with lateral
  shake; heals = Bright Heal `#5FE873` rising with a "+HP" glyph. 2 px contrast
  outline, no plate. Cap 12 simultaneous; oldest fades early.
- Siphon fizzle cue ("nobody near") momentary at the healed ally.

**Reduced-motion note** (nice-to-have, not a block gate): decorative overshoot
drops to static flash; telegraph decals hold static peak but keep the fill
sweep.

---

## 18. Meta screens & camp

- **Victory screen**: warm high-key wash — the only screen where the
  environment matches party warmth. Run summary + "Return to Camp".
- **Defeat screen**: soft God-stuff violet-white wash regardless of act
  (theatrical curtain-call, not harsh); wry tone ("The gods applaud.");
  "Return to Camp". Vignette: static violet, fade-in ≤600 ms, ≤12% screen width
  from edges, never touching text.
- **Camp hub** (bookends runs): 3/4 top-down night scene — deep indigo/teal
  ambient, one **Hearth-Fire** as the single warm light source everything
  composes toward (campfire with glow halo + fireflies/motes). Prop density
  3–5× a combat room (target ≥12 distinct prop types per the reference bar:
  tents/bedrolls, market-stall shell, rune monolith, anvils, weapon rack with a
  glowing item, crates, barrels, fences, hanging lanterns, torches, cart,
  grass tufts, dirt path with hue variation). The four party critters idle
  around the fire (idle bob, ear/tail motion). Corruption never touches Camp.
  Interaction: walk the Healer to the glowing run-portal / gate marker and
  press E → "Begin Run" → fade to room 1. No shop/talents in camp at MVP.

---

## 19. Art direction (binding)

### 19.1 Palette

| Name | Hex | Exclusive role |
|---|---|---|
| Warm Grey | `#9C9186` | Party base neutral, HUD chrome |
| Hearth Amber | `#E8A23D` | Positive UI, Legendary rarity, selection, Victory, camp fire |
| Sage Cloak | `#33513C` | Healer accent |
| Ember Danger | `#FF5A36` | Enemy telegraphs + enemy attack VFX ONLY — never party/heal/UI-positive |
| Bright Heal | `#5FE873` | ALL heal output — never damage |
| God-stuff Violet | `#B79CF0` (peak `#F1ECFA`) | Corruption/boss/Defeat ONLY — never friendly |
| Signal Blue | `#4FA3D9` | Rare rarity frames + mark reticle glyph; in combat HUD glyph/ink only, never fills |
| Void Charcoal | `#221F1B` | Universal outline ink, HUD plates |
| Parchment | `#F4EFE6` | HUD ink, outgoing damage numerals, progress rings |
| Bruise Umber | `#4E463F` | Party-damage numerals only |
| Bone | `#C9C2B3` | Common rarity, downed/neutral rings |
| Pale Gold | `#D9B872` | Glint currency |
| Class accents | Healer `#33513C` · Tank `#6B6157` · Swordsman `#6B2E3A` · Archer `#6E7A3F` | rings, HP bars, cloak trim |

Color discipline per frame: ≤3 hue families + reserved accents (indigo-night /
amber-warmth / violet-arcane in camp; green-woodland / warm-party / ember-danger
in Act-1 combat). Colorblind fence: no state communicated by color alone —
danger = ground decal + chevron; heal = rising particles + "+HP" glyph;
Legendary = shimmer sweep (never pulses); telegraphs pulse (never shimmer).

### 19.2 Characters — chibi 3-mass builds (procedural, three.js primitives)
Shared family treatment (all four party members):
- **Three-mass rule**: one head mass + one body/bell-cloak mass + one prop
  mass. Head = **40–45% of standing height** (~1.05 u total). Cloak body via
  `LatheGeometry` bell profile. Paws = single rounded mitten spheres, no
  digits.
- **Toon shading**: `MeshToonMaterial` with a 3-step gradient `DataTexture`.
- **Outlines**: inverted-hull second mesh (backface, scale ~1.04, Void
  Charcoal) on every character and hero prop — reads as the ~2 px storybook
  ink line.
- **Eyes**: large dark bean/dot eyes set in the LOWER two-thirds of the head,
  plus a tiny white glint — party/friendly-exclusive treatment.
- **Contact shadow**: soft dark blob sprite under every entity (incl.
  projectiles) + the class-accent identity ring under party members.
- Per class silhouette (one varied trait each):
  - **Healer (mouse)**: softest closed bell cloak in Sage `#33513C`, small
    round ears, short snout, staff held center-low with a glowing gem (Bright
    Heal glow sprite; the gem brightens on cast).
  - **Tank (badger)**: widest stance, lowest center, head-stripe two-tone, the
    party's ONLY rectangular mass — a squared pauldron/shield block at the
    shoulder.
  - **Swordsman (fox)**: narrow forward-leaning wedge (~8° body lean — the only
    asymmetric lean), long sharp snout, big pointed ears, white-tipped tail,
    sword as a diagonal line off the roundness.
  - **Archer (hare)**: tallest thinnest vertical mass, very long upright ears,
    bow held to one side forming an open negative-space arc.
- **Procedural animation** (no keyframe assets): idle breathe (y-scale ±2%,
  ear/tail sway from the cosmetic stream), walk bob + lean toward move vector,
  cast = quick squash-stretch + prop raise, hurt flinch, downed = collapse to
  horizontal + accent desaturates toward charcoal. Mid-action frames must show
  anticipation/impact poses (reference-bar motion check).
- **Enemies**: quadruped/insect low-poly silhouettes (boar wedge, mantis
  stick), desaturated cool-tinted vs. the party's warmth, angular eye slits or
  faint violet glints, exactly one violet corruption tell each. Boss stag scale
  2.2×, veined antlers with violet glow sprites.

### 19.3 Act-1 combat environment ("uneasy pastoral woodland")
- Baseline: saturated greens 55–65% HSV sat, hue 70–110°; warm:cool light
  ratio ≈ 70:30 (warm hemisphere/directional key + cool fill); dappled
  low-moderate value contrast.
- **No dead ground** (<20% of frame flat single-color): ground plane gets
  vertex-color hue noise, dirt-path patches, scatter decals (moss, cracks,
  leaf litter — canvas-generated), instanced grass tufts (InstancedMesh, ≥300
  instances), small flowers.
- Props ring the arena edges: 6–10 distinct silhouettes per combat room, ≥8
  types across variants (dry-stone wall segments, mill fragment, stumps,
  boulders, fence posts, lanterns/torch stakes with glow halos, a corrupted
  monolith with violet veining as the act's tell). None taller than the Tank;
  ≥60% of floor navigable; center stays readable.
- Walls exactly 1 value-step darker than the adjoining floor. ≤2 value steps
  per surface plane (+1 near light sources). Flat fills; gradients only for
  large light falloff. No micro-texture.
- Every light emitter (torch, gem, portal, projectile) carries an additive
  radial glow sprite. Fireflies/motes drift (cosmetic stream).
- **Tuning note (certification fix round 1, 2026-09-09):** the run arenas run
  their key at ~0.5x and their cool fill at ~0.65x of the shared Act-1 rig
  (`mood` in `env/variants.js`). At 1.0x the rooms read as flat daylight —
  round 1 measured LUMA buckets 0-2 at 7% of the combat frame against the
  reference's 48%, with bucket 0 empty, i.e. no black point for the fire pools
  to read against. At the stopped-down rig the same frame measures buckets 0-2
  at 44% with a torch pool at display 103 over ground at 36 (2.9x), and the
  warm:cool split stays on this section's 70:30 (warm 37.5% : cool 14.7% of the
  frame's non-foliage coloured pixels). Prop clusters are also aimed at the
  FRAME's edges rather than the arena's: the 3/4 rig (fov 45, distance 12,
  elevation 52) only shows world z from -8 to about +4.6, so a ring authored at
  the arena's south wall never appears on screen.
- **Tuning note (certification fix round 2, 2026-09-10):** the run arenas paint
  the floor **night-first**. This section's baseline reads as a saturated green
  field with cool "only in shadow pockets", and round 2 measured what that
  produces: combat HUEMIX **warm 40.0 / foliage 52.0 / cool 8.0** against the
  reference's **22.5 / 1.1 / 76.4**, with the darkest region of the frame
  reading warm 47.1 / cool 13.6 (a brown-olive shadow) and LUMA bucket 0 at 7%
  against 27%. All three scorers rejected check 2 on the same clause: there is
  no cool pole for the fire pools to read against. A field whose BASE is green
  cannot carry that funnel — every shade pocket painted on top of it is a
  puddle on a lawn.
  So the polarity is inverted, which is what all four reference screenshots do:
  the base fill is the SHADE end (a deep saturated indigo-teal, `ground.nightBase`
  in env/variants.js), the §19.3 green arrives as the lit dapple stamps where
  the canopy opens, and the instanced grass tufts + flowers carry the brief's
  hue 70-110 / sat 0.55-0.65 turf on top. Per-variant: lit `l` 0.39/0.42/0.355
  -> 0.30/0.325/0.275, shade 196-197/0.26 -> 202-203/0.38, `coolLift` 6 -> 22,
  `dirtL` 0.255/0.30/0.285 -> 0.20/0.235/0.225 (the beaten track was the frame's
  brightest large surface, i.e. a warm river with no emitter over it).
  Measured after, same seed and same certified frame conditions: combat HUEMIX
  **warm 36.6 / foliage 15.0 / cool 48.4**, LUMA buckets 0+1 = 44% against the
  reference's 48%, an open-grass box (400,120,500,220) at cool 73.4% with SAT
  0.572 — inside this section's 0.55-0.65 grass bar — and the reserved heal
  band on a pure-grass box down from 1032 px to 523. The camp (env/camp/*)
  keeps the authored polarity: its spec is already a night spec and its frame
  scored 20/20.
- Shop room: one dense stall cluster under a single warm pooled lantern
  (Shopkeep's Lantern), act palette visible at room edges. Boss room: a stop
  darker/desaturated; boss = brightest emitter.

### 19.4 VFX color + layering rules
- **Every attack effect = ≥3 layers**: white-hot core + colored glow +
  particles/trail. Player heals: Bright Heal core + green glow + rising motes +
  "+HP" glyph. Player damage bolts: warm parchment-white core + amber glow +
  trail. Enemy shots: white core + Ember glow + trail. Boss/corruption: violet.
- Z-order (top→bottom): projectiles > characters > enemy telegraphs > friendly
  ground VFX > environment. Projectiles always render above all environment.
- Instant impacts hold ≥3–5 frames. Kills leave persistent decals. AoE zones =
  layered translucent blobs + particles + ticking numbers inside.
- Friendly shadows/zones must never resemble Ember telegraph decals.

### 19.5 Post stack (EffectComposer, always on)
`RenderPass → UnrealBloomPass (threshold ≈ 0.85, strength ≈ 0.5, radius ≈ 0.4)
→ ShaderPass(grade)` where `grade` = vignette (soft, ~0.35 strength at
corners) + color grading (slight warm lift in camp/act-1, gentle contrast S-
curve, ~5% saturation boost on the party layer left untouched — grade the
whole frame subtly; party saturation is authored in materials, not the grade).
`renderer.outputColorSpace = SRGBColorSpace`, ACES filmic tone mapping.
Resize-safe: composer + passes resized with the renderer.

- **Tuning note (certification fix round 1, 2026-09-09):** the vignette runs at
  **0.82** with the falloff opening at normalised radius 0.40, not the ~0.35
  written above, and it is **shadow-protected** (weighted from 0.30x of the
  darkening at black to full strength above display ~100) with a cool tint into
  the darkened corners. Reason, measured: at 0.35-and-below the combat frame's
  BOTTOM CORNERS came out BRIGHTER than its centre (BL 120.6 / BR 119.2 against
  centre 103.8) — no vignette at all — against the reference's centre 71.5 with
  corners 18.1-42.1. All three round-1 scorers scored check 7 down for it. At
  0.82/0.40 the same frame measures corners 45.9/37.1/30.4/32.6 against centre
  66.6 (1.8x, reference 2.3x) while >160 5.84% / >200 1.63% stay at or above
  the reference benchmark. A plain multiply at that strength scales an 8x8
  block's channel SPREAD by the same factor as its mean and collapsed the dark
  half of every night frame into flat dead ground (check 1: boss FLAT 5.6% ->
  22.4%), which is why the darkening is shadow-weighted and why the grade also
  carries a **static screen-locked dither** (+-3.7/255 in the shadows, tapering
  to +-0.4/255 above display ~120) — the standard fix for a dim gradient
  quantising into 8-bit bands. With it, FLAT reads 1.3-1.9% on all four
  certification frames. The grade additionally carries a shadow SPLIT-TONE
  (shadows multiplied toward indigo, the lit range untouched): that is the
  "cool wash" §19.3 asks the unlit half of an Act-1 room to carry, and it is
  what makes the grade visible in frame at all.

- **Tuning note (certification fix round 2, 2026-09-10):** three numbers move,
  all of them measured against the round-2 combat frame.
  (a) The split-tone's ramp opens at **smoothstep(0.02, 0.55)** with multiplier
  **(0.76, 0.88, 1.18)**, not (0.03, 0.42) / (0.84, 0.90, 1.10). At the old
  ramp a shadow pixel at display 27 received a 1% blue lift — i.e. the "cool
  wash" was invisible exactly where it was needed, and the reference lens's own
  darkest-region probe (box 1100,700,500,200) read warm 47.1 / cool 13.6. After:
  the same box reads **warm 33.1 / cool 40.9**. Above display ~140 the mix
  factor is 0.99, so the fire pools, the party and every emitter core are
  untouched.
  (b) The vignette's COOL TINT is no longer weighted by the shadow-protected
  `ve` — that gave a torch pool near a frame edge the full indigo multiply and a
  dark corner almost none of it, which is backwards. The tint now rides the
  vignette radius and fades out with luminance
  (`min(1, v*1.35) * (1 - smoothstep(0.10, 0.55, vlm))`, multiplier
  (0.66, 0.85, 1.20)); the darkening itself is unchanged.
  (c) Bloom strength **1.35** (was 1.15) and the flame texture's white core
  becomes a plateau (env/flame.js): stops (255,253,248,1.0) / (255,251,240,0.95)
  at 42% / (252,240,205,0.62) at 62%, radius 33 -> 38 px. `GAIN_MAX` is NOT
  touched — its derivation is that no COLOURED stop may clear the bloom
  threshold — and every added stop stays near-neutral (HSV sat 0.06 / 0.19)
  and under that budget. All three lenses scored check 7 down on one number,
  LUMA >200 0.632% against the reference's 1.427% with the top buckets empty;
  after, the combat frame measures **>160 4.510% / >200 0.775% / 16 of 16
  buckets, 0.086% above display 240** (reference 3.418 / 1.427 / 16 / 0.132)
  and the boss frame **2.948 / 1.387 / 16**. The party is still not blown:
  box 600,500,220,230 measures >200 0.022%.
  (d) env/colors.js EMBER_GLOW pool/halo keep their 0.26 / 0.20 Parchment
  shares and gain a LINEAR multiplier instead (x1.25 / x1.18). Whitening the
  tint was the first attempt at buying the mid-bright band a night floor needs
  between its black point and its emitter cores, and it worked on luma — but it
  pushed the pools under the analyzer's s>0.35 gate and the frame's amber-band
  count fell 138848 -> 66354 px, which is the evidence the scorers read as
  "the warm pools exist". A scalar multiply leaves HSV hue and saturation
  exactly where they were (both are scale-invariant) and adds the light on top:
  amber 140551 px with >160 at 4.510%.

---

## 20. Module architecture (proposal — builder may refine inside these seams)

```
echoes-three/
  index.html            vite.config.js        (exist)
  src/
    main.js             — boot, resize, fixed-tick accumulator loop, scene swap (camp/run)
    core/
      constants.js      — every tuning number in this brief, one file, exported frozen
      rng.js            — seeded gameplay stream + cosmetic stream
      clock.js          — 60 Hz accumulator, hitstop, interpolation alpha
      events.js         — tiny pub/sub event bus
      input.js          — DOM events → per-tick intent snapshot (controller iface)
      registry.js       — entity registry + spawn-ordinal counter
    sim/
      world.js          — sim root; runs continuous + discrete phases in total order
      movement.js       — 8-dir move, dodge state, swept circle-vs-wall collision
      combat.js         — damage/heal instance pipeline, crit, full_heal, downed
      skills.js         — slots, cooldowns, the 6 delivery shapes
      projectiles.js    — pooled projectile sim (swept)
      zones.js          — ground_aoe + aura ticking
      revive.js         — channel state machine, diminishing returns
      targeting.js      — smart heal, overrides, Tab mark, rally point
    data/
      classes.js skills.js nodes.js enemies.js waves.js rooms.js palette.js
    build/
      resolver.js       — stat pipeline (flat→pct→mult→tech→clamp) + grey/inert verdicts
      techniques.js     — bounce/siphon/echo/detonate primitives (depth-1 guard)
      sockets.js bench.js draft.js shop.js wallet.js
    run/
      run.js            — run frame roll, room index, persistence ledger, win/lose
      room.js           — room lifecycle, boundary sequence, win-condition predicates
      director.js       — wave scheduling + telegraph cadence governor
    ai/
      allyAI.js         — leash, engage, kit casting, revive AI, rally response
      enemyAI.js        — nearest-target chase/shoot, telegraph requests
      bossAI.js         — Hollow Stag attacks + add phases
      steering.js       — obstacle avoidance + separation
    render/
      stage.js          — renderer, scene, lights, EffectComposer stack, resize
      camera.js         — 3/4 follow cam (smoothing + aim lookahead, never loses player)
      toon.js           — gradient maps, toon material factory, outline (inverted hull)
      glow.js           — canvas-generated radial glow sprite factory (pooled)
      chars/            — healer.js tank.js swordsman.js archer.js enemies.js boss.js
                          (primitive/lathe chibi builders + procedural animation drivers)
      env/              — arena.js props.js foliage.js (instancing) campSet.js shopSet.js
      vfx/              — pools: flashes, trails, particles, decals, telegraphs, dashSmear
      numbers.js        — pooled DOM damage numerals, world→screen projection
    ui/
      hud.js            — overlay root, virtual-1080p scaler
      portraits.js slots.js banner.js nudges.js
      screens/          — draft.js socket.js shop.js path.js victory.js defeat.js
    scenes/
      camp.js           — camp hub scene + Begin Run interaction
      combatRoom.js     — glue: sim + render + HUD for a room
    audio/
      synth.js          — WebAudio SFX synth (hit/shoot/heal/dodge/ui/death) + ambient bed
```

Rules: sim modules never import render modules (events bridge them); all
tuning numbers live in `data/` + `core/constants.js` (no magic numbers inline);
render reads sim state read-only + interpolates.

---

## 21. Audio (minimal, procedural)

WebAudio synthesis only (no files): short filtered-noise+osc one-shots for
basic hit, enemy hit, kill pop, heal chime (soft major), dodge whoosh, telegraph
warning tick, denial blip, UI select/commit, revive complete; a low ambient bed
per scene (camp: warm drone + crackle noise loop; combat: sparse wind).
Every juice-contract event fires its sound slot. Master volume constant, no UI.

---

## 22. Responsiveness bar (from REFERENCE_BAR.md — binding, verified in gameplay)

- Measured 60 fps desktop during full waves; no >100 ms hitches.
- Movement responds the same frame; dodge fires on keydown; no input queuing.
- Every hit: flash + number + knockback + sound.
- Every enemy attack that can be avoided is telegraphed ≥0.7 s (Ember decal).
- Dodge i-frames provably work (dash through a resolving telegraph = 0 damage).
- Camera: smoothed follow, aim lookahead ≤0.8 u, player never leaves frame.
- Full loop start→victory/defeat→camp→restart with zero console errors.

---

## Appendix A — Scoping rulings (web build; do not relitigate)

| # | Ruling |
|---|---|
| A1 | 3D characters yaw smoothly toward aim (the 2D 8-bucket facing rule is a sprite-era rule); walk lean still follows the move vector independently. |
| A2 | Node pool cut from 16 to the 8 in §15 (MVP mandate: 4 stat + 4 technique). Chosen so grey, saturation-inert, chain-heal, siphon-drain, echo-on-passive, and detonate-both-ways all provably occur. Rarity spread keeps all three shop price points reachable. |
| A3 | Room 1 is always kill_all (defend positions rolled among rooms 2–6). |
| A4 | Echo magnitudes authored: damage recast 50%, heal recast 100%, delay 1.0 s, passive reapply every 3.0 s. Bounce authored: 1 hop/copy, 2.2 u, full power. Detonate authored: 50% power, 1.2 u. |
| A5 | Party members receive no knockback; enemies (non-boss) do. |
| A6 | Open arenas + steering instead of navmesh (props ring the edges; the falsified-straight-line finding applied to Godot-era cluttered layouts — web arenas are authored open). |
| A7 | HUD is a DOM overlay scaled from a 1920×1080 virtual canvas; world-space cues may be sprites or projected DOM. |
| A8 | Relics, Echoes/Seals currencies, talent trees, camp facilities, classes beyond the four, acts 2–3 environments: OUT of scope. Defeat/victory washes reference the act-3 violet language without building act-3 content. |
| A9 | Audio is procedural WebAudio synthesis (sound slots must exist per the juice contract). |
| A10 | Hitstop/knockback/screenshake numbers in §9 are authored web-build defaults (absent from the source corpus) — tunable in `constants.js`, not removable. |
| A11 | (Gauntlet, 2026-09-21) A8's "acts 2–3 environments: OUT of scope" is superseded by §23: three expeditions (Hollow Wood, Sunken Mill, Ashen Barrow), each a full 8-room run. Relics, Echoes/Seals, talent trees, camp facilities and extra classes stay out of scope; the Hollow Stag remains the only boss (tier-scaled per act). |
| A12 | (Gauntlet, 2026-09-21) Skill slots are 8 (§6 "4 slots" superseded, §23.9). Ally kits stay 4. Basic-attack fire resolves after the last skill slot. |
| A13 | (Gauntlet v0.5.1) **Esc opens the pause menu on every page** — combat, draft, path, shop, victory/defeat (docs/gauntlet/PLAN.md §1.5). This supersedes §16 "draft Esc = decline" and §16 settle rule (3) "Esc … stays the decline path": the draft declines with **X** or the Decline button, and X is settle-guarded like Enter (rule (2)). The socket screen is a sub-overlay: its Esc still banks the candidate and closes it, consuming that Esc. A reflexive pause press can never forfeit a reward. |
| A14 | *(SUPERSEDED 2026-09-25 by A15.)* (Gauntlet v0.5.1) **Portal rule**: the expedition picker (§23.1) opens only in a title-booted session with ≥ 2 acts unlocked; menu-skip / harness boots and single-unlock profiles start the act directly on E (v0.4.63 behaviour). In the picker E, Enter or Space confirms the preselected (last-played) card. |
| A15 | (CAMPAIGN, 2026-09-25 — the user's CRITICAL REFACTOR) **Linear campaign** (§24, docs/gauntlet/PLAN.md §12): the portal's Begin Run ALWAYS starts a campaign at Level 1 (no picker); clearing a level shows a ~3 s level-clear card while the next level loads, then the next level starts on its own (1 → 2 → 3); the camp returns only after the final level's CAMPAIGN COMPLETE card, a paused "Quit to Lobby", or a defeat card. Other unlocked levels start from the lobby's Level Select (map table beside the portal / L at the prompt); clearing Level N unlocks N+1 permanently. Skills, sockets, bench and Glint carry between levels; HP, downs, statuses and cooldowns are restored; everything level-bound resets. Menu-skip harness boots keep rule 1 of A14 (`?act=N` / `?level=N` start there). |
| A16 | (PARTY, 2026-09-27 — the user's request) **Per-character builds** (§25, docs/gauntlet/PLAN.md §16): the Tank, Swordsman and Archer get the Healer's build model — at most 4 equipped skills, 8 node sockets per skill, no rarity caps, the repetition limits and grey / inert verdicts — drawn from their OWN class skill pool (8 each; the §7 kit = the starting loadout; a new class skill always REPLACES one of the 4 — the old one returns to the class pool, its nodes to the bench; no character ever holds more than 4 skills) and a class-matched node pool (6 class nodes + the shared nodes its fantasy allows). Every combat room offers every character a card on one party page (the player's own card first; AI-held cards pre-picked by default, so one Enter still commits); each character has its own purse and shelf; in multiplayer each human builds their own character (the host builds AI-held seats) with 30 s auto-pick deadlines. §7's "allies' builds don't grow" and §12's kit-cast rule are superseded; the Healer is unchanged (§25.11). |
| A17 | (PARTY, 2026-09-27 — the user's rule, verbatim: "when the 4 slot of skill is full, player still pick skill wave, do not change it to node reward wave, instead the reward is still skill, but player can choose whether to replace one of the current 4 skill or not to replace") **Full-slot skill rewards are SWAP offers for EVERY character, the Healer included** (§16, §25.1, §25.6, docs/gauntlet/PLAN.md §16): a skill reward (a room reward / draft / a skill-promising door) stays a SKILL reward when the character already holds 4 skills — the card offers one skill of its class pool it does not own and the player picks which of the 4 owned skills it REPLACES, or Leaves and keeps the loadout. Still never more than 4 skills. The replaced skill returns to its class pool (the Healer's pool = all 17 Healer skills − owned, so a replaced Mending Bolt / Swift Mend can come back; with both starting skills owned it is exactly today's 15-skill draw); its nodes go to that character's bench (never lost) and the page offers the auto-fill; its Resonance counter, pending Echo recasts, passive pulse and Reapply clocks end with it. Supersedes §16's "with 4 owned a skill promise becomes a node" and §25.1 / §25.11's "the Healer never gets a swap offer". AI-held seats and the Healer autopilot resolve swaps by the §25.8 priority rule; in multiplayer the character's owner decides. |

---

## 23. Gauntlet content extension (2026-09-21) — binding design truth

Added by the Gauntlet Loop lead architect (docs/gauntlet/PLAN.md §4). Owners:
M4a = systems (skills, nodes, statuses, slots, expeditions, difficulty,
draft/shop pools); M4b = world (enemies, hazards, interactables, biomes);
M4c = the user's 2026-09-22 correction (below). Everything in §1–§22 still
holds unless a line below says otherwise.

**USER CORRECTION (2026-09-22, binding — M4c; supersedes every "8 skill
slots" / "keys 1–8" / "slot A / slot B cap" statement below and in PLAN):**
the user wrote "skill remain maximum 4, but the node for each skill increase
to 8" and "for the 8 sockets, no more split between rare and legendary
control, any rarity of the node can insert into any socket". So: **at most 4
equipped skills** (keys 1–4, 4 command-bar tiles, `free_skill_slots = 4 −
owned`), **8 node sockets on every skill** (the passive included), **no
rarity caps** (§15.2), legendaries reinterpreted on passives (§15.2), node
supply raised for 32 sockets (§14 note), the difficulty constants retuned
(§23.2 M4c note). The 9 new skills and 9 new nodes below stand unchanged. Colour
discipline is unchanged: **Ember `#FF5A36` = enemy/hazard threats and their
telegraphs only; Bright Heal `#5FE873` = heal output only (incl. the Dewfont's
water); God-stuff Violet `#B79CF0` = corruption (one act tell per biome), the
Stag, spawn shimmer, Defeat only.** Every enemy keeps exactly one INDIGO (hue
228) corruption tell (§11 tuning note). Every avoidable damage is telegraphed
≥ 0.7 s in Ember; player-targeted telegraphs obey the §11 governor (≤ 2
concurrent, starts ≥ 1.2 s apart).

### 23.1 Expeditions (level configurations)

**CAMPAIGN (2026-09-25, ruling A15): the portal picker described in the next
paragraph is superseded.** The three expeditions are now LEVELS 1–3 of one
linear campaign (§24); the portal always starts Level 1, and the lobby's
Level Select (same card grammar: name, blurb, Danger pips, Bone lock glyph
with "Clear <previous level> to unlock") starts a campaign at any unlocked
level. The level table below stands. Historical text:

When two or more acts are unlocked (ruling A14), the camp portal opens an
**expedition picker** (three cards: name, blurb,
"Danger I/II/III", lock state; Hearth Amber selection; locked cards Bone with a
lock glyph and "Win <previous act> to unlock"). Each expedition is a full run
on the unchanged §2 skeleton (rooms 1–6 combat, exactly 2 defend, room 1
kill_all, 7 shop, 8 boss) and §14 economy (+12 per combat clear, 72 at the
shop, 15/20/25 prices on a 4-card shelf and 2 clear spoils per combat room
since M4c). The run frame additionally rolls one layout per combat
room from the act's room table (never the same layout twice in a row).

| | Act I — The Hollow Wood | Act II — The Sunken Mill | Act III — The Ashen Barrow |
|---|---|---|---|
| Blurb | Night-dark woodland where the beasts first turned. | Flooded millrace and rotting weirs; the water runs wrong. | Burial mounds under a cold moon, where the corruption is oldest. |
| Tier T | 1.00 | 1.35 | 1.75 |
| Layouts (room table) | 1 Beaten Clearing · 2 Dry Crossroads · 3 Mossy Hollow (v0.4.63) | 4 Millpond · 5 Weir · 6 Drowned Granary | 7 Barrow Gate · 8 Ossuary Row · 9 Moonwell |
| Boss room dressing | layout 3 | layout 6 | layout 9 |
| Roster (weights; earliest room) | boar .45 · mantis .30 · quillback .25 (r ≥ 2) | boar .15 · mantis .20 · quillback .15 · toad .25 · moth .25 (r ≥ 2) | mantis .15 · quillback .15 · moth .20 · ram .20 (r ≥ 2) · mole .30 |
| Hazards | Bramble Snare, Puffcap | Millrace, Puffcap | Rockfall, Gravefire Vents |
| Interactables | Dewfont, Barricade, Powder Keg | Dewfont, Barricade, Powder Keg, Sluice Lever | Dewfont, Barricade, Powder Keg, Warding Bell |
| Stag add phases (×3) | 2 boar + 1 mantis (§11, unchanged) | 1 toad + 2 moth | 1 ram + 2 mole |
| Music theme | `wood` — D dorian, camp 72 / combat 104 bpm, plucked lute + hand drum | `mill` — A aeolian, 96 bpm, water-drip plucks, low reeds, frame drum | `barrow` — E phrygian, 88 bpm, bell tolls, low choir pad, taiko pulse |
| Unlock | always | win Act I | win Act II |

**Biome palettes** (display-space HSL, same analyzer bars as §19.3: LUMA >160 ≥
1.5%, >200 ≥ 0.4%, ≥ 13/16 buckets, FLAT < 20%; the night-first floor
polarity of the §19.3 fix-round-2 note applies to all three):

| | Hollow Wood | Sunken Mill | Ashen Barrow |
|---|---|---|---|
| Shade base | indigo-teal (existing `ground.nightBase`) | deep teal-slate H 196–204, S 0.30–0.40, L 0.10–0.16 | cold blue-grey H 212–224, S 0.16–0.24, L 0.09–0.15 |
| Lit ground | §19.3 green dapple | wet flagstone H 185–200, S 0.10–0.18, L 0.28–0.34 + moss H 80–100, S 0.35–0.45 | ash H 28–40, S 0.06–0.12, L 0.30–0.38 + dead ochre grass H 38–50, S 0.30–0.40 |
| Signature surface | beaten dirt track | black-teal water channels (H 190–200, S 0.45, L 0.06–0.10) with Parchment specular streaks ≤ 25% alpha | bone-stone cairns (Bone `#C9C2B3` ± 6% L) |
| Warm pools | torches, braziers, lanterns | lantern posts on the weirs, amber windows of the mill | braziers between the stones |
| Act corruption tell (violet) | the monolith | the mill wheel's veins | the standing stones' veins |
| Hue families per frame | green-woodland / warm-party / ember | teal-slate / amber / ember | ash-blue / amber / violet-arcane (tell only) + ember |
| Unique prop types (≥ 3 of ≥ 6) | (existing 12) | mill-wheel ruin, sluice-gate frame, reed beds, footbridge (+ flagstones, timber piles, rope crates, lantern posts) | standing stones, barrow entrance, bone cairns, broken urns (+ braziers, ash drifts, dead grass, grave slabs) |

### 23.2 Difficulty curve (src/data/difficulty.js is the implementation)

Binding numbers: the LATEST dated tuning note below — since 2026-09-25 the
CAMPAIGN note (level tiers, Stag, adds, elite, Waystone, starter grant and the
measured band). The formulas and tables before it are the curve's history.

`R = 1 + 0.08 × (room − 1)` (combat rooms 1–6); `hpMul = T·R`; `dmgMul = 1 +
0.5·(T·R − 1)`; **wave budget** `4.0·T·R` threat points (defend waves × 0.8);
elite chance Act I 0 (rooms 1–3) then 0.08, Act II `0.12 + 0.02(r − 1)`, Act III
`0.20 + 0.03(r − 1)`; kill_all wave interval `480 × (1 − 0.04(r − 1)) × [1.0,
0.95, 0.9]` ticks; Waystone HP `150·√T` (150 / 174 / 198); Stag HP `1800·T`
(1800 / 2430 / 3150) and Stag damage × `1 + 0.5(T − 1)`. Challenge setting
(Gameplay tab, captured at run start): relaxed HP ×0.75 / dmg ×0.7, standard
×1, harrowing ×1.25 / ×1.3.

Threat costs: boar 1.0 · mantis 1.2 · quillback 1.5 · toad 1.6 · moth 1.3 ·
ram 3.0 · mole 1.5; an elite costs ×1.8. **Wave fill** (rolled once at room
start, §11 discipline): repeat seeded weighted draws from the act roster
(only types whose `introduce` room ≤ current room) while `cost ≤ remaining +
0.5`; stop at 8 enemies per wave; elite roll per enemy; spawn point per enemy
from the §11 ring (placements keep ≥ 1.5 u from hazards/interactables).
kill_all rooms: `2 + int(2)` waves, +1 wave from room 4; defend rooms: 4 waves
at 0/12/24/36 s. Live hostiles ≤ 20 per room (§1 ceiling 40). The legacy
`?room=` harness (no run) keeps the §11 roll exactly.

Resulting table (hpMul / dmgMul / budget):

| room | Act I | Act II | Act III |
|---|---|---|---|
| 1 | 1.00 / 1.00 / 4.00 | 1.35 / 1.175 / 5.40 | 1.75 / 1.375 / 7.00 |
| 2 | 1.08 / 1.04 / 4.32 | 1.458 / 1.229 / 5.83 | 1.89 / 1.445 / 7.56 |
| 3 | 1.16 / 1.08 / 4.64 | 1.566 / 1.283 / 6.26 | 2.03 / 1.515 / 8.12 |
| 4 | 1.24 / 1.12 / 4.96 | 1.674 / 1.337 / 6.70 | 2.17 / 1.585 / 8.68 |
| 5 | 1.32 / 1.16 / 5.28 | 1.782 / 1.391 / 7.13 | 2.31 / 1.655 / 9.24 |
| 6 | 1.40 / 1.20 / 5.60 | 1.890 / 1.445 / 7.56 | 2.45 / 1.725 / 9.80 |

**Tuning note (M4a, 2026-09-22) — the constants above were retuned; this
table is now binding.** Measured on the deterministic default-build autopilot
(`tools/gnt-M4a-actrun.mjs`, seeds 1–5 per act, in page and headless alike),
the v0.5.1 constants failed the felt-escalation band below: an 8-slot build
outgrew a 1.4× room ramp, so Act I party damage did not rise across rooms
(Spearman ρ 0.14), and Act III (T 1.75, adds at room 6's ramp) won 0–1 of 5
runs, several ending in boss-room stalemates. Only constants moved — the
formula's shape is unchanged:

| constant | v0.5.1 | retuned |
|---|---|---|
| act tier T (I / II / III) | 1.00 / 1.35 / 1.75 | **1.00 / 1.15 / 1.60** |
| room slope (R = 1 + slope·(room − 1)) | 0.08 | **0.12** |
| defend budget scale | × 0.8 | **× 1.25** |
| Stag HP | 1800·T | **2400·T** (2400 / 2760 / 3840) |
| Stag adds | room 6's ramp | **the act tier alone** (hp × T, dmg × 1 + 0.5(T − 1)) — the Stag and its adds scale together |

Everything else holds (elite chances, wave interval, Waystone 150·√T = 150 /
161 / 190, challenge multipliers, threat costs, the wave fill). Retuned table
(hpMul / dmgMul / kill_all budget):

| room | Act I | Act II | Act III |
|---|---|---|---|
| 1 | 1 / 1 / 4 | 1.15 / 1.075 / 4.6 | 1.6 / 1.3 / 6.4 |
| 2 | 1.12 / 1.06 / 4.48 | 1.288 / 1.144 / 5.152 | 1.792 / 1.396 / 7.168 |
| 3 | 1.24 / 1.12 / 4.96 | 1.426 / 1.213 / 5.704 | 1.984 / 1.492 / 7.936 |
| 4 | 1.36 / 1.18 / 5.44 | 1.564 / 1.282 / 6.256 | 2.176 / 1.588 / 8.704 |
| 5 | 1.48 / 1.24 / 5.92 | 1.702 / 1.351 / 6.808 | 2.368 / 1.684 / 9.472 |
| 6 | 1.6 / 1.3 / 6.4 | 1.84 / 1.42 / 7.36 | 2.56 / 1.78 / 10.24 |

Measured band after the retune (in page, seeds 1–5): victories 5/5 · 5/5 ·
3/5; no room stuck past 180 s; ρ (time / damage) 0.89/0.89 · 0.81/0.83 ·
0.94/0.94; defend rooms above their kill_all neighbours on time and damage,
the Stag room above the late kill_all rooms on damage; per-room damage
medians I < II < III at every room; no combat-room median above 120 s
(evidence: docs/gauntlet/build-M4a.md).

**Tuning note (M4c, 2026-09-22) — retuned for the corrected build; this
table is now binding.** M4a tuned against an 8-skill, 2-socket build that met
the Stag with ~5 nodes socketed; the corrected build (4 skills × 8 sockets,
§14 supply note) meets it with ~19. Re-measured on the same default-build
autopilot, seeds 1–20: Act III victories 13/20 on the v0.5.39 8-skill build →
20/20 on the corrected build at the M4a constants, party downs in Act III rooms
4–6 106 → 16 — the late rooms had lost their teeth. Only constants moved, the
formula's shape did not:

| constant | M4a | M4c |
|---|---|---|
| room slope (R = 1 + slope·(room − 1)) | 0.12 | **0.16** (the ramp outpaces ~3 new nodes a room) |
| act tier T (I / II / III) | 1.00 / 1.15 / 1.60 | **1.00 / 1.15 / 1.75** (III back to the v0.5.1 value) |
| Stag + adds damage slope (1 + k·(T − 1)) | k = 0.5 | **k = 0.7** (`BOSS_DMG_SLOPE`; keeps the Stag room's damage spike above the steeper late rooms) |

Everything else holds (defend × 1.25, Stag HP 2400·T = 2400 / 2760 / 4200,
elite chances, wave interval, Waystone 150·√T, challenge multipliers, threat
costs, the wave fill). Retuned table (hpMul / dmgMul / kill_all budget):

| room | Act I | Act II | Act III |
|---|---|---|---|
| 1 | 1 / 1 / 4 | 1.15 / 1.075 / 4.6 | 1.75 / 1.375 / 7 |
| 2 | 1.16 / 1.08 / 4.64 | 1.334 / 1.167 / 5.336 | 2.03 / 1.515 / 8.12 |
| 3 | 1.32 / 1.16 / 5.28 | 1.518 / 1.259 / 6.072 | 2.31 / 1.655 / 9.24 |
| 4 | 1.48 / 1.24 / 5.92 | 1.702 / 1.351 / 6.808 | 2.59 / 1.795 / 10.36 |
| 5 | 1.64 / 1.32 / 6.56 | 1.886 / 1.443 / 7.544 | 2.87 / 1.935 / 11.48 |
| 6 | 1.8 / 1.4 / 7.2 | 2.07 / 1.535 / 8.28 | 3.15 / 2.075 / 12.6 |

Stag damage ×1 / 1.105 / 1.525; adds hp × T, dmg × 1 + 0.7(T − 1).
Measured band after the retune (seeds 1–5, headless and in page alike):
victories 5/5 · 4/5 · 3/5, no room stuck, ρ time/damage 0.943/0.943 · 1/1 ·
0.886/0.943, defend and Stag spikes above their neighbours, per-room damage
medians I < II < III, max combat-room median 53 s. Seeds 1–20: 20/20 · 19/20 ·
13/20 (Act III at the v0.5.39 rate), 0 stuck. Relaxed 10/10/10, harrowing
10/9/1 (seeds 1–10), 0 stuck (evidence: docs/gauntlet/build-M4c.md).

**Tuning note (CAMPAIGN, 2026-09-25) — retuned for the linear campaign's
carried build (PLAN §12.10, §24); this table is now binding.** M4c tuned
Levels 2 and 3 for a FRESH build (one act per run). In the linear campaign
every Begin Run meets Level 2 with the build it carried out of Level 1 — 4
skills, 19 / 32 sockets filled, 34 Glint at the Level 1 → 2 card — and Level
3 with 4 skills, 32 / 32 sockets (+ 2–3 on the bench) and ~118 Glint (default
autopilot, seeds 1–5: skills and sockets alike on every seed, Glint the
median). On M4c's tiers that carried build flattened the curve:
re-measured with M4c's constants
(`captures/gntfixM4a3-camprun-from1-M4cTiers-node.json`) the campaign won 15
of 15 levels, Level 2's party damage
no longer rose across its rooms (ρ 0.543 < 0.6, room medians
157 / 63 / 291 / 398 / 359 / 266), Level 3 room 3 sat below Level 2 room 3 (256
vs 291) and the Level 2 Stag fell in 24.6 s. Retuned on the same deterministic
default-build autopilot, both ways a level is entered — carried from Level 1
AND started at Level N with the starter grant (`tools/gntCAMPAIGN-camprun.mjs
--from 1|2|3 --seeds 1-5`). Only constants moved, the formula's shape did not
(`R = 1 + 0.16(room − 1)`, `hpMul = T·R`, `dmgMul = 1 + 0.5(T·R − 1)`,
`budget = 4·T·R`); the names are the `src/data/difficulty.js` /
`src/data/campaign.js` exports:

| constant | M4c | CAMPAIGN |
|---|---|---|
| level tier T (Level 1 / 2 / 3) — `ACT_TIER` | 1.00 / 1.15 / 1.75 | **1.00 / 1.60 / 2.80** |
| Stag HP — `STAG_BASE_HP · T · STAG_HP_LEVEL[level]` | 2400·T | **2400·T·S, S = 1 / 1.35 / 1** (the Level 2 Stag stays a spike over a carried build) |
| Stag + adds damage slope k in 1 + k(T − 1) — `BOSS_DMG_SLOPE` | 0.7 | **0.9** (Level 1 unaffected: T = 1) |
| starter grant for a start AT Level N > 1 — `STARTER_GRANT` | — (no Level-N start) | **the grant table below** |

Everything else holds: room slope 0.16, defend budget × 1.25, the elite
chances, the wave interval, Waystone 150·√T, the threat costs and the wave
fill; Level 1 is exactly M4c's Act I. The challenge setting multiplies every
HP and damage number below (relaxed × 0.75 HP / × 0.7 damage, harrowing ×
1.25 / × 1.3). Binding table, standard challenge (hpMul / dmgMul / kill_all
budget — a defend room's budget is × 1.25):

| room | Level 1 | Level 2 | Level 3 |
|---|---|---|---|
| 1 | 1 / 1 / 4 | 1.6 / 1.3 / 6.4 | 2.8 / 1.9 / 11.2 |
| 2 | 1.16 / 1.08 / 4.64 | 1.856 / 1.428 / 7.424 | 3.248 / 2.124 / 12.992 |
| 3 | 1.32 / 1.16 / 5.28 | 2.112 / 1.556 / 8.448 | 3.696 / 2.348 / 14.784 |
| 4 | 1.48 / 1.24 / 5.92 | 2.368 / 1.684 / 9.472 | 4.144 / 2.572 / 16.576 |
| 5 | 1.64 / 1.32 / 6.56 | 2.624 / 1.812 / 10.496 | 4.592 / 2.796 / 18.368 |
| 6 | 1.8 / 1.4 / 7.2 | 2.88 / 1.94 / 11.52 | 5.04 / 3.02 / 20.16 |

| per level | Level 1 | Level 2 | Level 3 |
|---|---|---|---|
| tier T | 1 | 1.6 | 2.8 |
| Stag HP | 2400 | 5184 | 6720 |
| Stag damage × | 1 | 1.54 | 2.62 |
| adds HP × | 1 | 1.6 | 2.8 |
| adds damage × | 1 | 1.54 | 2.62 |
| Waystone HP | 150 | 190 | 251 |
| elite chance | 0 / 0 / 0 / 0.08 / 0.08 / 0.08 | 0.12 / 0.14 / 0.16 / 0.18 / 0.2 / 0.22 | 0.2 / 0.23 / 0.26 / 0.29 / 0.32 / 0.35 |
| kill_all wave interval, ticks (room 1 → 6) | 480 → 384 | 456 → 365 | 432 → 346 |

**Starter grant** (PLAN §12.4; `STARTER_GRANT` in `src/data/campaign.js`).
Every start AT Level N > 1 — the Level Select's campaign start or a
single-level harness run — begins from the fresh default build (Mending
Bolt + Swift Mend, 0 nodes) and adds, before any combat and in this order
from the run RNG: `skills` draws from the draft system's live skill pool (≤ 4
owned), `nodes` draws in pairs by the clear-spoils rule (commons + rares of the
usable pool, provenance `grant`, the shared auto-fill after every pair), then
`legendaries` draws from the legendary band, then Glint. It is shown on the
~2 s setting-out card and matches the build a carried campaign holds at that
level's card:

| start at | skills | nodes | legendaries | Glint | arrives with |
|---|---|---|---|---|---|
| Level 2 | 2 | 18 | 1 | 34 | 4 skills, 19 / 32 sockets filled, 34 Glint (= the carried Level 1 → 2 card) |
| Level 3 | 2 | 30 | 2 | 60 | 4 skills, 32 / 32 sockets filled, 60 Glint (the carried card: 4 / 32 of 32 / ~118 Glint) |

Measured band (re-measured at v0.5.103, headless Node sim, seeds 1–5,
`captures/gntfixM4a3-camprun-from{1,2,3}-node.json`; the same numbers as the
CAMPAIGN build at v0.5.93, docs/gauntlet/build-CAMPAIGN.md): **carried from
Level 1** — clears 5/5 · 5/5 · 4/5; ρ time/damage 0.943/0.943 · 0.943/0.886 ·
0.886/1; max combat-room median 45 / 55.7 / 80.6 s; 0 stuck; defend rooms above
their neighbours; the Stag room above the late kill_all rooms on damage (its median vs the
pooled kill_all rooms 5–6: 321 > 206 · 1273 > 724 · 2336 > 1922); per-room damage medians rise from level to level at equal room; every
carry / restore / reset verdict true at every card. **Started at Level 2 with
the grant** — 5/5 · 4/5, every band check true. **Started at Level 3 with the
grant** — 3/5, every band check true. In page (the content critic, seeds 1–5,
docs/gauntlet/critic-content-r3.md S12) the carried campaign won 5/5 · 5/5 ·
5/5 with ρ ≥ 0.829; its per-room medians put the Level 2 Stag room's party
damage level with room 6 on the carried path (1071 vs 1072 in the room-6
kill_all rooms) while it passes the pooled rooms 5–6 check — the ceiling for a future retune of
`STAG_HP_LEVEL[2]` / `BOSS_DMG_SLOPE`. Gate G4a.5 compares the running game
with THIS table (`node tools/gntfixM4a3-g4a5.mjs`: difficultyTable, roomPlan per
room, measured spawn hp / base hp, Stag and add hp, starter-grant events, ± 1 %).

**Tuning note (PARTY, 2026-09-28) — retuned for four built characters
(PLAN §16.8, GP.13, §25.10); this table is now binding.** Per-character
builds give the Tank, the Swordsman and the Archer the Healer's growth model
(4 skills × 8 sockets, swap offers, the class techniques: taunts, Iron Stance
and Shield Wall shields, parries, dashes). On the CAMPAIGN constants the four
built characters flattened the game: re-measured on the same deterministic
default-build autopilot (the Healer) + the §25.8 ally AI in Suggested mode
(`tools/gntPARTY-band.mjs`, which runs `tools/gntCAMPAIGN-camprun.mjs --from
1|2|3 --seeds 1-5` and compares with the v0.5.150 baseline recorded before
PARTY's first sim edit, `captures/gntPARTY-baseline-from{1,2,3}.json`), the
median party damage per combat room fell to × 0.66 / 0.95 / 0.68 of the
baseline (carried Levels 1 / 2 / 3), × 0.73 / 0.56 (Level-2 start) and × 0.51
(Level-3 start), and the Level 3 Stag room's to × 0.41–0.45 — the Stag died in
a burst before it could bite, while time-to-clear stayed near the baseline
(× 0.75–1.05). Only constants moved, the formula's shape did not (`hpMul =
T·R`, `dmgMul = 1 + 0.5(T·R − 1)`, `budget = 4·T·R`, `R = 1 + slope·(room − 1)`,
Stag HP `2400·T·S`, Stag + adds damage `1 + k(T − 1)`); the names are the
`src/data/difficulty.js` / `src/data/campaign.js` exports:

| constant | CAMPAIGN | PARTY |
|---|---|---|
| room slope — `ROOM_SLOPE` | 0.16 | **0.21** |
| level tier T (Level 1 / 2 / 3) — `ACT_TIER` | 1.00 / 1.60 / 2.80 | **1.00 / 1.60 / 3.10** |
| Stag HP factor S (Level 1 / 2 / 3) — `STAG_HP_LEVEL` | 1 / 1.35 / 1 | **1 / 1.8 / 1.2** (a longer, survivable Stag fight keeps the room's damage spike instead of a burst that wipes the party) |
| Stag + adds damage slope k — `BOSS_DMG_SLOPE` | 0.9 | **1.8** (Level 1 unaffected: T = 1) |
| ally starter grant — `STARTER_GRANT[N].allies` | 2: 2 / 12 / 1 / 30 · 3: 4 / 24 / 2 / 50 | **the ally grant table below** |

Everything else holds: defend budget × 1.25, the elite chances, the wave
interval, Waystone 150·√T, the threat costs, the wave fill and the Healer's
own starter grant. Binding table, standard challenge (hpMul / dmgMul /
kill_all budget — a defend room's budget is × 1.25):

| room | Level 1 | Level 2 | Level 3 |
|---|---|---|---|
| 1 | 1 / 1 / 4 | 1.6 / 1.3 / 6.4 | 3.1 / 2.05 / 12.4 |
| 2 | 1.21 / 1.105 / 4.84 | 1.936 / 1.468 / 7.744 | 3.751 / 2.3755 / 15.004 |
| 3 | 1.42 / 1.21 / 5.68 | 2.272 / 1.636 / 9.088 | 4.402 / 2.701 / 17.608 |
| 4 | 1.63 / 1.315 / 6.52 | 2.608 / 1.804 / 10.432 | 5.053 / 3.0265 / 20.212 |
| 5 | 1.84 / 1.42 / 7.36 | 2.944 / 1.972 / 11.776 | 5.704 / 3.352 / 22.816 |
| 6 | 2.05 / 1.525 / 8.2 | 3.28 / 2.14 / 13.12 | 6.355 / 3.6775 / 25.42 |

| per level | Level 1 | Level 2 | Level 3 |
|---|---|---|---|
| tier T | 1 | 1.6 | 3.1 |
| Stag HP | 2400 | 6912 | 8928 |
| Stag damage × | 1 | 2.08 | 4.78 |
| adds HP × | 1 | 1.6 | 3.1 |
| adds damage × | 1 | 2.08 | 4.78 |
| Waystone HP | 150 | 190 | 264 |
| elite chance | 0 / 0 / 0 / 0.08 / 0.08 / 0.08 | 0.12 / 0.14 / 0.16 / 0.18 / 0.2 / 0.22 | 0.2 / 0.23 / 0.26 / 0.29 / 0.32 / 0.35 |
| kill_all wave interval, ticks (room 1 → 6) | 480 → 384 | 456 → 365 | 432 → 346 |

**Starter grant** — the Healer's is unchanged (the CAMPAIGN table, repeated
here because this note is the binding one):

| start at | skills | nodes | legendaries | Glint | arrives with |
|---|---|---|---|---|---|
| Level 2 | 2 | 18 | 1 | 34 | 4 skills, 19 / 32 sockets filled, 34 Glint (= the carried Level 1 → 2 card) |
| Level 3 | 2 | 30 | 2 | 60 | 4 skills, 32 / 32 sockets filled, 60 Glint (the carried card: 4 / 32 of 32 / ~118 Glint) |

Each ally additionally receives (party stream, after the Healer's grant, seat
order; `swaps` = swap OFFERS resolved by the §25.8 rule, `nodes` in pairs with
auto-fill, then `legendaries`, then purse Glint). Measured carried medians at
the cards (15 allies over seeds 1–5): Level 1 → 2 — 2 new skills, 12 sockets
filled, 34 Glint; Level 2 → 3 — 2 new skills, 21 filled, 43 Glint. Level 3 is
that median; Level 2 sits below it because a Level-2 start must stay in the
band against the v0.5.150 Level-2-start baseline, whose party (the Healer's
grant, allies on their kits) was weaker than a carried one:

| ally start at | swap offers | nodes | legendaries | Glint |
|---|---|---|---|---|
| Level 2 | 1 | 9 | 1 | 34 |
| Level 3 | 3 | 19 | 2 | 43 |

Measured band (v0.5.163, headless Node sim, seeds 1–5,
`captures/gntPARTY-band-v163*.json`): **carried from Level 1** — clears 5/5 ·
5/5 · 3/5, every §4.2 / GC.12 band check true (19); per-level combat-room
damage × 1.18 / 1.15 / 0.75 and time-to-clear × 1.09 / 1.13 / 0.99 of the
baseline; the Level 3 Stag room 2819 vs 2824 (× 1.00). **Started at Level 2** —
5/5 · 4/5, every band check true (13); × 0.91 / 0.80 damage, × 1.16 / 1.00
time; Stag 2950 vs 2885. **Started at Level 3** — 5/5, every band check true
(6); × 0.81 damage, × 1.02 time; Stag 2888 vs 2663. Party downs: every Level 3
on ≥ 3 of 5 seeds; Level 2 on 1 of 5 (carried and started); the carried
Level 1 on 0 of 5 — the v0.5.150 baseline has 0 of 5 on Levels 1 and 2;
GP.13 (d) ("≥ 1 down on ≥ 2 of 5 seeds per level") is therefore not met
there, and meeting it would push those levels past (b)'s × 1.35 damage ceiling
(a design conflict recorded in docs/gauntlet/build-PARTY.md for the design
owner). Seeds 1–20 spot check (the same constants run from a scratch copy,
`captures/gntPARTY-band-tune-N1-from{1,2,3}.json`): clears 20/20 · 20/20 ·
14/20 carried, 20/20 · 14/20 from Level 2, 13/20 from Level 3; every band
check true except Level 1's ρ time 0.543 (room 2 is a defend room on 10 of 20
seeds against 2 of 5 in the baseline's seeds, so room 2's median time sits
above rooms 3–4). The determinism proof (PLAN §16.9) runs
with these constants switched back by `cmd('difficultyLegacy')`. Gate G4a.5
compares the running game with THIS table.

**Tuning note (fix-M4a-r5, 2026-09-30) — retuned after the AI engagement fix
(content r5 F5 / GP.8, §25.8 engagement note); this table is now binding.**
The AI-held seats now engage in a campaign (docs/gauntlet/fix-M4a-r5.md,
`src/data/classes.js` `AI_ENGAGE`: an overdue equipped active is served first
and its seat closes on a hostile, a melee arc / nova lunging the last ≤ 1.2 u;
the Tank and the Swordsman may step 2 u past the §12 ring to meet a threat).
With the Tank's MENACE (fix-M4b-r5) the melee pair now takes Level 1's hits the
Archer's arrows used to prevent: Level 1's median party damage per combat room
rose to × 1.50–1.66 of the v0.5.150 baseline (GP.13 (b) caps it at × 1.35), and
a Level-2 start with the granted build fell to × 0.57–0.68. Two constants moved
and one was added (`src/data/difficulty.js`, `src/data/campaign.js`):

| constant | PARTY | fix-M4a-r5 |
|---|---|---|
| per-level enemy damage on the combat rooms — `LEVEL_DMG` (new; `dmgMul × LEVEL_DMG[level]`) | 1 / 1 / 1 | **0.75 / 1 / 1** |
| Level-2 ally starter grant — `STARTER_GRANT[2].allies` (swaps / nodes / legendaries / Glint) | 1 / 9 / 1 / 34 | **1 / 3 / 0 / 34** |

Everything else is the PARTY note (tiers, slope, Stag, adds, elites, interval,
Waystone, the Healer's grant, the Level-3 ally grant). Binding table, standard
challenge (hpMul / dmgMul / kill_all budget — a defend room's budget is × 1.25):

| room | Level 1 | Level 2 | Level 3 |
|---|---|---|---|
| 1 | 1 / 0.75 / 4 | 1.6 / 1.3 / 6.4 | 3.1 / 2.05 / 12.4 |
| 2 | 1.21 / 0.8288 / 4.84 | 1.936 / 1.468 / 7.744 | 3.751 / 2.3755 / 15.004 |
| 3 | 1.42 / 0.9075 / 5.68 | 2.272 / 1.636 / 9.088 | 4.402 / 2.701 / 17.608 |
| 4 | 1.63 / 0.9863 / 6.52 | 2.608 / 1.804 / 10.432 | 5.053 / 3.0265 / 20.212 |
| 5 | 1.84 / 1.065 / 7.36 | 2.944 / 1.972 / 11.776 | 5.704 / 3.352 / 22.816 |
| 6 | 2.05 / 1.1437 / 8.2 | 3.28 / 2.14 / 13.12 | 6.355 / 3.6775 / 25.42 |

| per level | Level 1 | Level 2 | Level 3 |
|---|---|---|---|
| tier T | 1 | 1.6 | 3.1 |
| Stag HP | 2400 | 6912 | 8928 |
| Stag damage × | 1 | 2.08 | 4.78 |
| adds HP × | 1 | 1.6 | 3.1 |
| adds damage × | 1 | 2.08 | 4.78 |
| Waystone HP | 150 | 190 | 264 |
| elite chance | 0 / 0 / 0 / 0.08 / 0.08 / 0.08 | 0.12 / 0.14 / 0.16 / 0.18 / 0.2 / 0.22 | 0.2 / 0.23 / 0.26 / 0.29 / 0.32 / 0.35 |
| kill_all wave interval, ticks (room 1 → 6) | 480 → 384 | 456 → 365 | 432 → 346 |

**Starter grant** — the Healer's is unchanged:

| start at | skills | nodes | legendaries | Glint | arrives with |
|---|---|---|---|---|---|
| Level 2 | 2 | 18 | 1 | 34 | 4 skills, 19 / 32 sockets filled, 34 Glint (= the carried Level 1 → 2 card) |
| Level 3 | 2 | 30 | 2 | 60 | 4 skills, 32 / 32 sockets filled, 60 Glint (the carried card: 4 / 32 of 32 / ~118 Glint) |

| ally start at | swap offers | nodes | legendaries | Glint |
|---|---|---|---|---|
| Level 2 | 1 | 3 | 0 | 34 |
| Level 3 | 3 | 19 | 2 | 43 |

Measured band (v0.5.183, headless Node sim, `tools/gntfixM4a5-band.mjs` =
`gntPARTY-band` with renamed outputs, seeds 1–5, captures/gntfixM4a5-band-tune1*.json):
**carried from Level 1** — clears 5/5 · 5/5 · 3/5, every §4.2 / GC.12 band check
true (19); combat-room damage × 1.14 / 1.31 / 1.01, time × 1.10 / 1.13 / 0.98;
Stag 2734 vs 2824 (× 0.97). **Started at Level 2** — 5/5 · 4/5, band true (13);
× 0.88 / 0.84 damage, × 1.11 / 1.04 time; Stag 2976 vs 2885. **Started at
Level 3** — 5/5, band true (6); × 0.82, × 0.96; Stag 2699 vs 2663. Seeds 1–10
(`tools/gntfixM4a5-sweep.mjs`): carried × 1.24 / 1.05 / 0.86, Level-2 start
× 0.91 / 0.84, Level-3 start × 0.82; clears carried 10 · 10 · 8 of 10, Level-2
start 10 · 7, Level-3 start 9. GP.8 (the equipped actives used): 0 idle of 4223
room-skill pairs over those 30 campaigns, idle fallback ≤ 9.5 % of casts.
**Party downs (GP.13 (d)) are still not met on Levels 1–2** (carried Level 1
0/5, Level 2 1/5, Level-2 start 0/5; every Level 3 5/5): the engaging AI and
MENACE make Level 1 safer still (lowest HP of any member in any Level-1 combat
room ≥ 35 % over seeds 1–10), and every Level-1 / Level-2 Stag setting that
downs a member on ≥ 2 of 5 seeds also wipes the party on 10–40 % of seeds — §12's
unconditional revive kneels the next ally in the Stag's quake ring. The
measured options for the design owner are in docs/gauntlet/fix-M4a-r5.md
(step 7). Gate G4a.5 compares the running game with THIS table.

**Felt escalation (v0.5.1).** The table is necessary, not sufficient: in play,
time-to-clear and party damage taken per room must rise across rooms 1–6 of
each act (defend rooms and the Stag above their neighbours) and from act to
act, while a default build (the deterministic autopilot) still clears every act
— the measured band and gate are docs/gauntlet/PLAN.md §4.2 / G4a.10. When the
band fails, the constants above are retuned here; the formula's shape stays.

### 23.3 New Healer skills (9) — draftable pool grows 6 → 15

Numbers follow the §7 table grammar (power per instance; cd floors per §6).

| Skill (id) | Archetype / shape | power | cd s | range | area | count | extra |
|---|---|---|---|---|---|---|---|
| **Lantern Flurry** (`lantern_flurry`) | damage / projectile | 9 per bolt | 5.0 | 4.6 | 0 | 3 (12° fan) | speed 5.6 u/s |
| **Pale Lance** (`pale_lance`) | damage / projectile | 30 | 6.0 | 6.0 | 0 | 1 | speed 6.5 u/s; **pierce 3** (passes through up to 3 enemies, full power each) |
| **Bell Toll** (`bell_toll`) | damage / nova | 20 per target | 8.0 | — | 1.6 | 5 | **stun** 30 ticks (non-boss) |
| **Rootsnare** (`rootsnare`) | damage / ground_aoe | 6 per zone tick | 10.0 | 4.2 | 1.3 | — | duration 5 s (5 zone ticks); enemies inside **slowed 45%** (refreshed 72 ticks each zone tick) |
| **Dewfall** (`dewfall`) | heal / ground_aoe | 7 per zone tick | 11.0 | 4.0 | 1.5 | — | duration 5 s |
| **Kindred Shield** (`kindred_shield`) | heal / direct | 16 | 8.0 | 3.6 | — | 1 | + **shield 20** for 240 ticks |
| **Mending Tide** (`mending_tide`) | heal / melee_arc | 12 | 4.0 | 1.8 | 70° | 4 | wide sweep |
| **Hearthsong** (`hearthsong`) | heal / nova | 10 per target | 9.0 | — | 2.0 | 4 | + **haste 25%** for 120 ticks |
| **Quiet Hearth** (`quiet_hearth`) | **passive** / aura | 2 per pulse | — | — | 1.2 | — | 1.0 s cadence; allies inside get **ward 15%** (72 ticks, pulse-refreshed) |

VFX: damage skills use the §19.4 player-damage grammar (parchment-white core +
amber glow + trail; stun = Bone ring glyph, slow = Signal Blue ink ring — glyph,
never a fill); heal skills Bright Heal core + green glow + rising motes; shields
a Parchment hex rim on the portrait and a pale shell on the body; haste = amber
speed streaks; ward = a soft Bone dome. Never Ember, never violet.

### 23.4 New nodes (9) — node pool grows 8 → 17

| Node | Kind | Rarity | Limit | Effect |
|---|---|---|---|---|
| **Widen** | stat | common | 2 | +25% area (additive_pct; on melee_arc = half-angle, clamp 90°) |
| **Reach** | stat | common | 2 | +25% range (additive_pct; melee_arc reach, ground_aoe placement, direct eligibility) |
| **Linger** | stat | rare | 1 | +50% duration (zone duration rounded to whole zone ticks; status ticks) |
| **Keen** | stat | rare | 1 | +0.15 crit chance on this skill's instances (additive_flat; still one strict `roll < chance`) |
| **Snare** | technique | common | 1 | damage → hit enemies slowed 40% for 90 ticks · heal → healed allies haste 20% for 90 ticks · passive → enemies inside the aura slowed 25% (pulse-refreshed) |
| **Galvanize** | technique | common | 1 | damage → hit enemies **exposed** +20% damage taken for 180 ticks · heal → healed allies **inspired** +15% damage dealt for 180 ticks · passive → allies inside inspired +10% (pulse-refreshed) |
| **Bulwark** | technique | rare | 1 | damage → caster gains a shield of 20% of each instance's final damage (shield cap 30) · heal → overheal (pre-clamp − applied) becomes a shield up to 50% of the instance power for 240 ticks · passive → each pulse +2 shield to allies inside (cap 10) |
| **Split** | technique | rare | 1 | damage (projectile/direct) → on impact 2 shards at ±35°, 40% resolved power, 2.0 u range · heal (projectile/direct) → the 2 nearest OTHER allies within 2.5 u of the recipient receive 40% · passive GREY · other shapes GREY |
| **Resonance** | technique | legendary | 1 | every 3rd cast of this skill resolves at ×2 power (counter per skill, persists across rooms, resets at run end; Echo recasts don't advance it) · passive → every 3rd pulse ×2 (M4c: no cap keeps a legendary off a passive any more; the Echo Reapply pulse never advances it) |

Technique rules of §15.3 hold: fire ascending socket (1 → 8), depth-1 (shards,
shields, statuses and their pulses never trigger techniques; an echo never
re-arms its echo), Siphon keeps its flat-stage rule. Statuses refresh (max
magnitude, max expiry), never stack (§23.8).

**Grey / live matrix** — every skill × every non-universal node. Sharpen,
Ascend and Keen are live on every skill. `live` = contributes; `GREY` = legal,
contributes nothing (§15.5 strike treatment); `inert` = saturation-inert (+0
because the party has only 4 members). (M4c: the former `cap` cells — Resonance
on the passives — are `live`; no socket caps anything. Every cell holds on all
8 sockets.)

| Skill | Bounce | Siphon | Echo | Detonate | Quicken | Multiply | Widen | Reach | Linger | Snare | Galvanize | Bulwark | Split | Resonance |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Mending Bolt (heal proj) | live | live | live | live | live | live | GREY | live | GREY | live | live | live | live | live |
| Swift Mend (heal direct) | live | live | live | live | live | live | GREY | live | GREY | live | live | live | live | live |
| Nova Bloom (heal nova) | GREY | live | live | live | live | live (3→4) | live | GREY | GREY | live | live | live | GREY | live |
| Sanctuary (heal zone) | GREY | live | live | live | live | GREY | live | live | live | live | live | live | GREY | live |
| Spirit Bolt (dmg proj) | live | live | live | live | live | live | GREY | live | GREY | live | live | live | live | live |
| Warding Aura (passive) | GREY | GREY | live (reapply) | GREY | GREY | GREY | live | GREY | GREY | live | live | live | GREY | live (pulse ×2) |
| Guardian Bond (heal direct) | live | live | live | live | live | live (2→3) | GREY | live | GREY | live | live | live | live | live |
| Restorative Wave (heal arc) | GREY | live | live | live | live | inert | live | live | GREY | live | live | live | GREY | live |
| Lantern Flurry (dmg proj ×3) | live | live | live | live | live | live (3→4) | GREY | live | GREY | live | live | live | live | live |
| Pale Lance (dmg pierce) | live | live | live | live | live | live (1→2) | GREY | live | GREY | live | live | live | live | live |
| Bell Toll (dmg nova) | GREY | live | live | live | live | live (5→6) | live | GREY | live (stun) | live | live | live | GREY | live |
| Rootsnare (dmg zone) | GREY | live | live | live | live | GREY | live | live | live | live | live | live | GREY | live |
| Dewfall (heal zone) | GREY | live | live | live | live | GREY | live | live | live | live | live | live | GREY | live |
| Kindred Shield (heal direct) | live | live | live | live | live | live (1→2) | GREY | live | live (shield) | live | live | live | live | live |
| Mending Tide (heal arc) | GREY | live | live | live | live | inert | live | live | GREY | live | live | live | GREY | live |
| Hearthsong (heal nova) | GREY | live | live | live | live | inert | live | GREY | live (haste) | live | live | live | GREY | live |
| Quiet Hearth (passive) | GREY | GREY | live (reapply) | GREY | GREY | GREY | live | GREY | GREY | live | live | live | GREY | live (pulse ×2) |

Draft/shop pools keep the §15.5 `usable_by_party` filter (M4c: without the cap
clause); shop prices and invariants per the §14 M4c note (4 cards at
15/15/20/25: all four 75 > 72, any three ≤ 60 ≤ 72).

### 23.5 New enemies (5) + the elite modifier

All numbers at hpMul = dmgMul = 1 (Act I room 1); §23.2 scales them. Every
enemy: full §9 juice (flash, numeral, knockback unless stated, sound, kill
pop + decal), nearest-target rule of §11, one indigo tell, cool desaturated
body vs the warm party.

| Enemy (kind) | HP | Move u/s | Radius | Attack | Telegraph (Ember) | Silhouette + tell | Threat |
|---|---|---|---|---|---|---|---|
| **Quillback** (`quillback`) | 26 | 1.5 | 0.38 | engages ≤ 5.0 u: rolling charge along a lane locked at telegraph start, 6.0 u/s for ≤ 60 ticks, 12 contact dmg once per target per charge, ends at a wall (30-tick stagger after a wall hit); cd 240 ticks | lane 0.7 u wide × min(6 u, to wall), 48 ticks | round dome wrapped in radial quill cones (a spiky ball) with a small snout; indigo quill tips | 1.5 |
| **Mire Toad** (`toad`) | 34 | 1.0 (keeps 3.0–5.5 u) | 0.42 | lobs a glob at the target's position (locked at telegraph start): 12 dmg in r 0.9, leaves a slick r 0.9 for 180 ticks (party inside slowed 30%); cd 204 ticks | ground ring r 0.9 at the landing point, 60 ticks | wide squat low mass with a big throat sac; indigo eye-glint | 1.6 |
| **Gloam Moth** (`moth`) | 16 | 2.4 hover (orbits at 3.5 u) | 0.30 | swoop: dives 8.0 u/s along a 5.5 u lane through the target, 9 dmg to each party member crossed (once each); **flier**: ignores Bramble, Millrace, slicks; cd 180 ticks | lane 0.8 u × 5.5 u, 45 ticks | tall V wings over a thin body — the only vertical/flying silhouette; indigo wing eyespots | 1.3 |
| **Barrow Ram** (`ram`) | 90 | 1.1, turns 90°/s | 0.55 | **horn guard**: party PROJECTILES arriving within ±55° of its facing are blocked (0 dmg, `hit_blocked` event, Bone "blocked" numeral, a tink) — arcs/novas/zones/direct are not; horn slam: cone 1.8 u / half-angle 50°, 18 dmg; cd 270 ticks; knockback ×0.3 | cone, 60 ticks | blocky bighorn whose huge curled horns form a shield disc in front; indigo horn rims | 3.0 |
| **Grave Mole** (`mole`) | 24 | 2.2 burrowed | 0.35 | burrows (untargetable, `hittable: false`, visible dirt-ripple trail) under the target; emerges when within 0.3 u or after 180 ticks: bite 11 dmg in r 0.8; stays surfaced and hittable 120 ticks, then re-burrows | ground ring r 0.8 at the emerge point, 60 ticks | low wedge snout with oversized digging claws; indigo claw tips | 1.5 |
| **Elite** (any non-boss) | ×1.8 | ×1 | ×1.2 scale | damage ×1.25 | same | indigo crown glyph above the head + a second (outer) indigo ring — never violet | cost ×1.8 |

### 23.6 Hazards (5) — world objects, faction `neutral`

Hazards hurt EVERY faction unless stated (a tool as much as a threat).
Telegraphs are Ember, ≥ 42 ticks, NOT player-targeted (no governor slot),
phase-offset per layout so no two hazard resolutions land within 0.6 s.
Idle states are drawn in the biome palette, never in the Ember band.

| Hazard | Where | Idle look | Cycle / effect | Telegraph |
|---|---|---|---|---|
| **Bramble Snare** | Act I | dark thorn tangle patches r 0.9–1.3 (indigo-green) | static: ground bodies inside move ×0.65 (fliers and the Stag immune); no damage | none (no damage) |
| **Puffcap** | Acts I, II | pale fungus cluster, body r 0.35 | idle 300 ticks → swell → burst 10 dmg r 1.3 → cooldown 120 → idle; any damage while idle starts the swell at once (pop it next to enemies) | Ember ring r 1.3 + chevrons, 60 ticks |
| **Millrace** | Act II | black-teal water lane, width 1.4 u, flow streaks | bodies inside (not fliers) pushed along the lane at 1.3 u/s (swept vs walls — environmental push, not §9 knockback, so the party is affected); surge every 540 ticks: 12 dmg + push 3.0 u/s for 30 ticks; the Sluice Lever stops both | lane glow + chevrons along the flow, 60 ticks |
| **Rockfall** | Act III | dust sifting from the barrow roof | schedule rolled at room start (every 240–360 ticks) at a party member's position at telegraph start; 15 dmg r 0.9; leaves rubble (collider r 0.6, blocks movement and projectiles) for 480 ticks, ≤ 2 rubble at once; **player-targeted → uses the §11 governor** | Ember ring r 0.9, 72 ticks |
| **Gravefire Vents** | Act III | cracked grave slabs with a faint warm glow (amber, not Ember) | lines of 3 vents erupt in sequence 18 ticks apart, 12 dmg column r 0.7 for 12 ticks each; cycle 420 ticks | Ember glyph ring r 0.7, 54 ticks per vent |

### 23.7 Interactive environmental assets (5)

`interact` = KeyE press within 1.1 u (resolved after revive arbitration; a
press next to a Downed ally is a revive). Prompt: `ix-` plate "E · <verb>" over
the object, charcoal plate + Parchment ink; used/cooldown states have their own
glyph (never colour alone).

| Asset | Where | Behaviour | Feedback |
|---|---|---|---|
| **Dewfont** | all acts | E → every living party member heals 25% max HP (heal pipeline, crits allowed, full_heal events); once per room | Bright Heal water glow + rising motes; basin visibly dries; "E · Drink" → "Dry" |
| **Barricade** | all acts (timber / crates / bone cairn skins) | box collider 1.4 × 0.45 u, 60 HP, `lifecycle: 'break'`; blocks movement and every straight projectile (party bolts, skill bolts, enemy shots; lobbed globs pass over); damaged by projectiles and area damage (nova, zones, keg, hazards) | hit flash + splinters; breaks into debris (`broken`) |
| **Powder Keg** | all acts | 1 HP, `lifecycle: 'break'`; any damage → 60-tick fuse → blast 30 dmg r 1.6 to ALL factions (knockback on enemies), chains other kegs in range | Ember fuse ring + sparks during the fuse; blast ring, shake (§9 #7 ceilings) |
| **Sluice Lever + Gate** | Act II | E → the gate drops and the millrace (current + surges) stops for 720 ticks, then a 1200-tick cooldown | gate animates; water stills; lever glyph shows the cooldown clock |
| **Warding Bell** | Act III | E → stun all non-boss hostiles within 3.0 u for 60 ticks; once per room | bronze ring shockwave (amber/Parchment), stun glyphs |

Placements per layout live in src/data/layouts.js (M4b): Act I layouts get
Bramble ×2, Puffcap ×2 (from room 2), Barricade ×2, Keg ×1–2, Dewfont in one of
the three layouts; Act II: one or two Millrace lanes + one Sluice per millrace
layout, Puffcap ×2–3, Barricade ×2–3, Keg ×1–2, Dewfont ×1; Act III: Rockfall
always on, Gravefire lines ×1–2, Bell ×1 (layouts 7, 9), Barricade ×2–3, Keg
×1–2, Dewfont ×1. Every placement stays ≥ 1.5 u from the §11 spawn ring, ≥ 2.5
u from the Waystone (0, 1.6) and outside the party's room-entry arc; boss rooms
carry no hazards.

### 23.8 Statuses (src/sim/status.js)

Plain data on the entity (`e.status[kind] = { mag, untilTick, src }`). Refresh
= max(mag), max(expiry); never stack. slow: move ×(1 − mag), cap 0.6, boss
immune · stun: no movement and no attack starts, non-boss only, ≤ 60 ticks,
then 120 ticks of stun immunity · haste: party move ×(1 + mag) · shield:
absorbs damage before HP, cap 50% max HP, the absorbed part shows as a small
Bone "(n)" numeral next to the HP-delta numeral (§17 numerals still equal HP
deltas) · ward: damage taken ×(1 − mag) · exposed: damage taken ×(1 + mag) ·
inspired: damage dealt ×(1 + mag). Order in the §9 pipeline: base → attacker
inspired → crit roll → target exposed × ward → shield absorb → HP.

### 23.9 Four skill slots, eight sockets per skill (M4c user correction)

*Superseded at M4c: the W2 build had 8 skill slots (keys 1–8, 8 tiles, 2
sockets per active and 1 per passive). The user's correction:* at most **4**
skills — keys 1–4 (Digit1–Digit4; Digit5–8 unbound; the intents skill_5..8
stay reserved in the closed vocabulary so the net press-bit tables keep their
layout), §4 resolution order skills ascending slot 0–3 then basic fire, the
HUD command bar 4 portraits · 4 skill tiles · dodge (one cooldown grammar,
1024×576 → 2560×1440 without overlap, §17 floors), draft `free_skill_slots =
4 − owned` (a full run owns 4: 2 starting + up to 2 skill rewards), the run
UI carry keys 1–4. **Every skill has 8 sockets** (§15.2) — the socket screen
shows 4 rows × 8 sockets on one page, and each command-bar tile carries an
8-segment socket-fill strip under it (filled = live node, hollow = grey /
inert node, dark = vacant). Saves: schema 2 (a schema-1 save keeps its first 4
skills in slot order; a dropped skill's nodes return to the bench; every row
pads to 8 sockets — PLAN §3.4).

## 24. Linear campaign (CAMPAIGN, 2026-09-25 — the user's CRITICAL REFACTOR) — binding design truth

Ruling A15; full contract, rules table and gates in docs/gauntlet/PLAN.md §12.
The user: "Adjust the game progression flow from an open level-selection
model to a linear campaign progression model."

**Flow.** Camp → Begin Run (E at the portal) → **Level 1** → its Hollow Stag
and the last add fall → on that very tick the level is won (enemy shots still in
flight dissolve with the clear — §13 step 2; the clear never waits for them) →
the **level-clear card** (~3 s: "<LEVEL> — CLEARED", the next level's
name, the carried build, "Enter — set out now") while the next level loads →
**Level 2** starts on its own → … → the final Stag → **CAMPAIGN COMPLETE**
(10 s, Enter sooner) → camp. A defeat ends the campaign on its defeat card;
"Quit to Lobby" in the pause menu abandons it (confirmed) and returns to camp
with no end card. The level order is data (`src/data/campaign.js`).

**Between levels** (one data table, PLAN §12.3 `CARRY_RULES`): skills (≤ 4),
every socketed node (8 sockets per skill, no rarity caps), the bench, Glint,
heal-target overrides, the run seed stream and the campaign records counters
CARRY; party HP, downed allies, statuses and cooldowns are RESTORED (the card
is a respite); every enemy, add, projectile, zone, hazard, interactable,
decal, particle, numeral, telegraph, threat marker, the wave director, the
shop stock, the boss state and the level's VFX, audio voices and dressing
RESET. Each level's rooms roll a fresh run frame from the carried seed stream;
room 1 still promises a Skill draft (a node when 4 skills are owned, §16).

**Lobby.** A map table beside the portal (and L / the "Levels" chip on the
portal prompt) opens the **Level Select**: one card per level in the §23.1
grammar; unlocked cards start a campaign AT that level; locked cards show the
Bone lock glyph and "Clear <previous level> to unlock" and start nothing.
Clearing Level N unlocks N+1 permanently (profile). A start at Level N > 1
adds the **starter grant** (§23.2 CAMPAIGN note) so the run is fair: extra
skill draws, node draws auto-socketed, Glint — shown on a ~2 s "Setting out"
card.

**Colour discipline** unchanged: cards are Void Charcoal plates with Parchment
ink and Hearth Amber focus over the warm Victory-wash family veil — never a
black full-screen; no Ember, violet or Heal green in any card chrome.

**Records and saves** (PLAN §12.8). Records count campaigns started and
completed, abandoned runs (Quit to Lobby), the furthest level reached, the
fastest full campaign (a campaign from Level 1 only — a Level-N start is not a
campaign speedrun) and, per level, its clears with the fastest clear (or the
deepest room while never cleared). A campaign's score sums its levels
(PLAN §12.8 formula — identical to the old score for one level). Every level
transition autosaves; a save made on the level-clear card loads back onto the
card with its remaining time; a save whose run sits in a level this profile
has not unlocked is refused with the lock line.

## 25. Per-character builds (PARTY, 2026-09-27 — the user's request) — binding design truth

Ruling A16; the state, contracts, flows and gates are docs/gauntlet/PLAN.md
§16. The user: "Other character add in also their own skill slot skill node
select option like the healer mouse but the skill and node match the
character class." Until now only the Healer grew a build; the Tank, the
Swordsman and the Archer fought with the fixed §7 kits. This section
supersedes §7's "fixed 4-skill kits, no build growth — the player's build
grows, allies' don't", §7's ally-kit AI line and §12's kit-cast rule; the
design oracle (every number, pool and grid cell below in machine-readable
form) is `docs/gauntlet/party-oracle.json`, written by
`node tools/gntPARTYD-grid.mjs` (which also re-derives today's Healer grid
from the same rules and checks it against the real src/sim/nodes.js — 289
cells, 0 mismatches).

### 25.1 One build model for all four characters

Every party member — Healer (mouse, seat 0), Tank (badger, seat 1),
Swordsman (fox, seat 2), Archer (hare, seat 3) — has the Healer's build
model exactly: **at most 4 equipped skills** (keys 1–4 on a human seat),
**8 node sockets on every skill** (passives included), **no rarity caps**
(any node of any rarity in any socket), the per-node **repetition limits**
(copies on one skill, the candidate included, ≤ the node's limit), the §15.5
**grey / saturation-inert / verdict** display contract, the §15.4 stat
pipeline, the §15.3 technique rules (ascending socket order 1 → 8, depth-1,
Siphon's flat-stage rule, an Echo never re-arms its own echo, Resonance's
per-skill counter), the uncapped per-character **bench** (provenance
`drafted` / `purchased` / `spoils` / `grant` / `catchup`), socket / unsocket
only while `combat_active == false`, the hard blocks (`limit`, `full`,
`no_such_slot`, `combat_active`, `not_on_bench`, `skill_not_owned`) and the
one **auto-fill** policy (live placements, fewest-filled skill first,
fix-M4a-r4 upgrade swap). What differs per class is what is IN the pools:

- **Skill pool** — the class's own 8 skills (§25.2). The Healer's pool is
  unchanged (2 starting + 15 draftable, §7 / §23.3).
- **Node pool** — the class's 6 class nodes plus the shared nodes its
  fantasy allows (§25.3). The Healer's pool is unchanged (the 17 shared
  nodes).
- **Starting build** — each ally's §7 fixed kit becomes its starting
  LOADOUT: all 4 skills equipped, every socket empty, bench empty. The
  Healer starts as before (Mending Bolt + Swift Mend, 2 free slots).
- **New skills when full — the SWAP offer (EVERY character, ruling A17).**
  The user's cap is literal: **no character ever holds more than 4 skills**
  (never a 5th slot, never a hidden reserve), and the user's rule (verbatim:
  "when the 4 slot of skill is full, player still pick skill wave, do not
  change it to node reward wave, instead the reward is still skill, but
  player can choose whether to replace one of the current 4 skill or not to
  replace") keeps a skill reward a SKILL reward. An ally starts with 4
  skills; the Healer fills its 4 slots from draft rewards and, once full,
  gets the same offer. A skill reward for a character holding 4 skills is
  therefore a SWAP offer: one class skill it does not own, and the player
  chooses which of its 4 skills it REPLACES — or Leaves the offer and keeps
  the loadout. The replaced skill leaves the build and
  returns to the class pool (it can be offered again later); the nodes it
  held go to that character's bench (never lost; the page offers the
  auto-fill for them; its Resonance counter, pending Echo recasts and
  passive pulse / Reapply clocks end with it). Between rooms the 4 owned
  skills can be REORDERED (slot order = keys 1–4 = the AI's cast order;
  sockets travel with their skill). With fewer than 4 skills (the Healer
  early in a run) a skill card simply fills the first empty slot, exactly
  as before. The Healer's class pool for a swap is all 17 Healer skills −
  owned (with both starting skills owned it is exactly today's 15-skill
  draftable draw, so its draws are unchanged until a starting skill is
  swapped out).

**Class identity (binding; the party critic judges it blind):** the Tank
protects and controls (taunts, shields, stuns, pulls, thorns, ward); the
Swordsman strikes and chains close-quarter combos (dashes, a combo
finisher, parries, cooldown chaining, crits, executes); the Archer kites at
range (vaults, pins, slows, piercing, the longest reaches, stand-still
power); the Healer sustains (unchanged). No ally skill heals — Bright Heal
stays the Healer's.

### 25.2 Class skill pools

Table grammar = §7 (power per instance; cooldown floor §6; `·s` = starting
kit, numbers VERBATIM from §7 / src/sim/allies.js `ALLY_KITS`). Shapes stay
the closed §6 set of six; the new behaviours ride plain-data modifiers
(`dash`, `vault`, `combo`, `parry`, `status`) defined under the tables.
**AI rule** = when an AI-held seat casts it (§25.8); every rule falls back
to the §7 range rule once the skill has been ready and unused for 480 ticks
(`AI_IDLE_FALLBACK_TICKS`, 8 s), so no equipped skill idles. **VFX** follow
§19.4 (player damage: parchment-white core + amber glow + trail, ≥ 3 layers)
and §23.3 (stun = Bone ring glyph, slow = Signal Blue ink ring, shield =
Parchment hex rim + pale shell, ward = soft Bone dome); the class accent
appears only as a thin trim or ring, never a fill; never Ember, never
violet, never Bright Heal. **Audio**: one procedural cue per new skill in
its class's family (the existing `ally_cast_tank` low thud, `ally_cast_sword`
swish, `ally_cast_archer` string), SFX bus, cast slot, ≤ 2 voices;
passive pulses ≤ −24 dB, 1 voice, and only when the pulse does something.

**Tank (badger) — protects and controls**

| Skill (id) | Archetype / shape | power | cd s | range | area | count | extra | AI rule | VFX · audio |
|---|---|---|---|---|---|---|---|---|---|
| Heavy Slam ·s (`heavy_slam`) | damage / melee_arc | 34 | 5 | 1.0 | 40° | 3 | — | §7: target in reach | existing wedge + a Bone dust ring · `ally_cast_tank` |
| Brutal Cleave ·s (`brutal_cleave`) | damage / melee_arc | 16 | 4 | 0.95 | 80° | 6 | — | §7 | existing wide wedge · `ally_cast_tank` |
| Ground Crack ·s (`ground_crack`) | damage / ground_aoe | 10 /tick | 8 | 2.6 | 0.9 | — | 4 s | §7 (placed on the target) | existing ally zone · `azone_spawn` |
| Whirling Guard ·s (`whirling_guard`) | damage / nova | 20 | 9 | — | 1.3 | 5 | — | §7: target inside 1.3 u | existing ring · `ally_cast_tank` |
| **Taunting Roar** (`taunting_roar`) | damage / nova | 6 | 10 | — | 2.0 | 6 | **taunt** 150 ticks (the Stag 60) | a hostile within 2.0 u targets a party member other than the Tank (or the Waystone), or ≥ 3 hostiles within 2.0 u | Parchment shockwave ring with a thin Tank-accent inner band; a Parchment "!" plate over each taunted enemy + a 0.3 s Parchment tether to the Tank · `tank_roar` (low growl + frame drum) |
| **Shield Wall** (`shield_wall`) | **guard** / direct | 24 shield | 10 | 3.0 | — | 2 | recipients = the bottom-2 HP fractions in range, Tank eligible (§8 smart-target rules, self exempt from the range test); shield lasts 240 ticks | a party member in range below 75% HP, or standing inside a live Ember telegraph | a Warm Grey plate glyph flies Tank → recipient (0.25 s), then the §23.3 shell + portrait hex rim · `tank_shield` (wood knock + soft bell) |
| **Shoulder Charge** (`shoulder_charge`) | damage / melee_arc + **dash** | 22 | 7 | 0.9 | 60° | 3 | dash ≤ 2.4 u at 9 u/s toward the target; **stun** 36 ticks (non-boss) | target beyond 1.1 u and within 3.3 u; or a hostile within 1.0 u of the Healer while the Tank is > 1.5 u from the Healer (peel — it charges that hostile) | Bone dust trail along the dash, arrival wedge, Bone stun rings · `tank_charge` (whoosh + thud) |
| **Iron Stance** (`iron_stance`) | **passive** (ally field) / aura | 3 shield per pulse | — | — | 1.3 | — | 1.0 s cadence; every party member inside (the Tank included) +3 shield, this source capped at 12, 240 ticks | always on | a faint Warm Grey hex ring at 1.3 u; a pulse flickers the hex rim on the shielded · `tank_stance` (soft low hum, only when a shield grows) |

**Swordsman (fox) — strikes and chains close-quarter combos**

| Skill (id) | Archetype / shape | power | cd s | range | area | count | extra | AI rule | VFX · audio |
|---|---|---|---|---|---|---|---|---|---|
| Flurry ·s (`flurry`) | damage / melee_arc | 11 | 3 | 0.8 | 60° | 6 | — | §7 | existing wedge · `ally_cast_sword` |
| Lunge Strike ·s (`lunge_strike`) | damage / melee_arc | 26 | 4 | 1.3 | 30° | 2 | — | §7 | existing narrow wedge · `ally_cast_sword` |
| Blade Storm ·s (`blade_storm`) | damage / nova | 14 | 7 | — | 1.0 | 5 | — | §7 | existing ring · `ally_cast_sword` |
| Caltrops ·s (`caltrops`) | damage / ground_aoe | 8 /tick | 6.5 | 2.0 | 0.7 | — | 5 s | §7 | existing ally zone · `azone_spawn` |
| **Fox Step** (`fox_step`) | damage / melee_arc + **dash** | 18 | 5 | 0.8 | 50° | 3 | dash ≤ 2.0 u at 10 u/s, i-frames while dashing | target beyond 0.75 u (the basic reach) and within 2.8 u | a Parchment speed-line ribbon with a thin Swordsman-accent edge, arrival wedge · `sword_step` (swish + blade ring) |
| **Crescent Finisher** (`crescent_finisher`) | damage / melee_arc + **combo** | 20 | 6 | 1.0 | 70° | 5 | +50% power per OTHER Swordsman skill that connected in the last 120 ticks (max 2 stacks, +100%) | combo ≥ 1 and the target in reach | a wide crescent drawn with 1–3 Parchment bands by stack; 1–2 small diamond pips above the fox while a combo is open (glyph channel) · `sword_finisher` (ring sweep, +3 semitones per stack) |
| **Riposte** (`riposte`) | damage / melee_arc + **parry** | 30 (the counter) | 8 | 0.9 | 90° | 3 | a 36-tick guard: the next hostile damage instance on the fox (any shape, any direction, the Stag included) is blocked — 0 damage, `hit_blocked`, the Bone "blocked" numeral — and answered at once by the counter arc toward the attacker; no hit in the window → no counter (the cooldown is spent) | a hostile within 1.0 u targets the fox, or a telegraph covers the fox | a crossed-blades Parchment glyph over the fox during the guard; on a block a Parchment spark + the arc · `sword_parry` (bell tink + slash) |
| **Razor Wake** (`razor_wake`) | **passive** (hostile field) / aura | 4 per pulse | — | — | 0.9 | 3 | 1.0 s cadence; the 3 nearest hostiles inside; **no knockback** (it must never push foes out of the fox's reach) | always on | 3 Parchment blade glints orbiting at 0.9 u; a spark per pulse hit · `sword_wake` (soft whirr, only on a hit) |

**Archer (hare) — kites at range**

| Skill (id) | Archetype / shape | power | cd s | range | area | count | extra | AI rule | VFX · audio |
|---|---|---|---|---|---|---|---|---|---|
| Piercing Shot ·s (`piercing_shot`) | damage / projectile | 30 | 3 | 5.5 | 0 | 1 | speed 6.2 (a single-target shot as authored; Skewer makes it pierce) | §7 | existing bolt · `ally_cast_archer` |
| Volley ·s (`volley`) | damage / projectile | 14 /bolt | 4.5 | 4.8 | 0 | 3 (fan) | speed 5.4 | §7 | existing fan · `ally_cast_archer` |
| Detonating Charge ·s (`detonating_charge`) | damage / ground_aoe | 12 /tick | 7 | 4.2 | 0.85 | — | 3 s | §7 | existing ally zone · `azone_spawn` |
| Sundering Nova ·s (`sundering_nova`) | damage / nova | 16 | 8 | — | 1.1 | 4 | — | §7 | existing ring · `ally_cast_archer` |
| **Vault Shot** (`vault_shot`) | damage / projectile + **vault** | 18 | 6 | 4.5 | 0 | 1 | speed 6.0; the hare first vaults 1.6 u directly away from the nearest hostile over 10 ticks (i-frames), then fires; a hit **slows** 30% for 90 ticks | a hostile within 1.4 u of the Archer | Bone leaf-swirl motes at take-off, the §19.4 bolt, the Signal Blue slow ring · `archer_vault` (cloth flap + twang) |
| **Pinning Arrow** (`pinning_arrow`) | damage / projectile | 20 | 7 | 5.0 | 0 | 1 | speed 6.0; **stun** 45 ticks (non-boss) | prefers a hostile within 2.0 u of the Healer (or the Waystone), else the current target; never the Stag while another target qualifies | a heavy bolt with a Parchment fletch trail; a Bone stake glyph + stun ring on the target · `archer_pin` (heavy twang + thunk) |
| **Rain of Arrows** (`rain_of_arrows`) | damage / ground_aoe | 7 /tick | 11 | 5.0 | 1.4 | — | 4 s; hostiles inside **slowed** 25% (72 ticks, refreshed by every zone tick) | the hostile position in range with the most hostiles within 1.4 u when ≥ 3, else the target | falling parchment-white streaks inside a translucent Warm Grey blob (never an Ember look), ticking numerals, slow rings · `archer_rain` (rising whistles; a soft patter per tick) |
| **Kestrel Watch** (`kestrel_watch`) | **passive** (hostile field) / aura | 6 per pulse | — | — | 4.0 | 1 | 1.0 s cadence; strikes the nearest hostile within 4.0 u (a spectral kestrel dart; basic-hit knockback) | always on | a small Parchment-and-Bone kestrel glyph circling the hare; a dart streak per pulse · `archer_kestrel` (tiny chirp + hiss) |

**The new mechanics** (plain data on entities / seat state; sim-owned; the
§23.8 grammar; none is a new delivery shape):

- **taunt** — a new status kind, hostile-only, `src` = the taunter. While
  it is live and its source is standing (not Downed), the enemy's target
  IS the source: it overrides the §11 nearest-target rule and the defend
  room's objective-inclusive set (interposition by force). Refresh = max
  expiry, never stacks; cap 240 ticks. **The Stag**: a taunt lasts ≤ 60
  ticks, then 300 ticks of taunt immunity (the §23.8 stun rule's shape).
  The §11 telegraph governor is untouched (a taunt changes WHO is targeted,
  never how many telegraph at once). Glyph: a Parchment "!" plate above the
  enemy — a shape channel, never Ember.
- **dash / vault** — a caster displacement before the delivery, swept
  against walls and colliders like the §5 dodge; i-frames for its ticks
  when `iframes` (Fox Step, Vault Shot — Shoulder Charge has none); the
  ally's §12 steering is suspended while it runs; a dash stops at the
  delivery's reach from its target and never carries an AI-held ally past
  its leash; a vault moves directly away from the nearest hostile. Never
  scaled by haste / slow (§3.6 (b): dodges never are).
  **On a HUMAN seat** (network guest or a host-played ally; the press has an
  aim, not a target) every displacement is a pure function of the seat's
  own input — its position, its aim point at the press, the resolved skill
  and the walls — so the guest predicts it exactly like its dodge: a
  **dash** (Shoulder Charge, Fox Step, the Pursuit node) runs along the aim
  direction for `min(dist, max(0, |aim − caster| − 0.8 × reach))` (it
  closes on the cursor and stops with the cursor inside the delivery's
  reach; a cursor already inside reach → no displacement), a **vault**
  (Vault Shot) and the **Disengage** hop run directly BACKWARD from the aim
  direction for their full distance (then the shot fires along the aim).
  Speeds, i-frames and the wall sweep are the AI rules above. Hostile
  positions never enter a human seat's displacement, so there is nothing to
  mispredict.
- **combo** — per Swordsman seat, the tick at which each of its skills last
  CONNECTED (≥ 1 hit) on a real cast. Crescent Finisher counts the OTHER
  skills inside its 120-tick window at cast time.
- **echoes of modified skills** — an Echo recast (§15.3) replays the
  DELIVERY only: never the dash or vault, never a parry window (on Riposte
  the echo arms when the counter fires and replays the counter arc). An
  echo is not a cast: it never advances Resonance, the combo, Momentum or
  Flow (the same rule Resonance already follows).
- **parry** — the §3.6 (c) `guard` data put on the fox for the window
  (`shapes: ['*']`, 360°); the first blocked instance ends it and fires the
  counter; `hit_blocked` carries `parry: true`. The block precedes the crit
  roll (no RNG drawn), exactly as the Ram's guard.
- **guard archetype** — an active whose output is a protective status on
  party members (Shield Wall). Its node column is §25.3's "guard".
- **passive fields** — `field: 'ally'` (Warding Aura, Quiet Hearth, Iron
  Stance) keeps the §15.3 / §23.4 passive column; `field: 'hostile'` (Razor
  Wake, Kestrel Watch) pulses damage and has its own column (§25.3).
- **cast-time power stage** (§15.4 extended): combo, Momentum and Steady
  Aim add to the additive-pct stage of THAT cast (with Sharpen); Resonance
  and Ascend stay multiplicative; Execute (×2 on a low-HP target) is
  applied per instance after the cast's power is resolved; Lethality
  changes that instance's crit multiplier; Heartseeker forces its crit
  result (the roll is still drawn, so the seeded stream's order never
  changes). Per instance: base → +flat → ×(1 + Σpct) → ×Πmult → Execute →
  inspired → crit → exposed × ward → shield → HP.

### 25.3 Nodes — class nodes and shared access

Six class nodes per class, all techniques, each exclusive to its class. The
§15.3 technique rules hold: they fire in ascending socket order; their
output (taunts, stuns, pulls, shields, cooldown cuts, counters, hops, thorns)
never triggers a technique (depth-1); a node reinterprets per skill — the
column is the skill's archetype, the cell may be grey or saturation-inert.

**Tank nodes**

| Node (glyph) | Rarity | Limit | on a damage skill | on a guard skill (Shield Wall) | on an ally-field passive (Iron Stance) |
|---|---|---|---|---|---|
| Provoke (‼) | common | 1 | hit non-boss enemies are taunted onto the Tank for 90 ticks (the Stag 45); every zone tick refreshes | hostiles within 1.5 u of each recipient are taunted onto the Tank for 60 ticks | each pulse taunts the 2 nearest hostiles inside for 72 ticks |
| Brace (▣) | common | 2 | every cast shields the Tank +8 per copy (240 ticks; §23.8 cap) | same | each pulse +2 per copy to the Tank (cap 12) |
| Tremor (∿) | rare | 1 | area deliveries (arc, nova, zone): hit non-boss enemies stunned 18 ticks (a zone: its first tick on each enemy; the §23.8 immunity applies) | GREY | GREY |
| Anchor (⤓) | rare | 1 | area deliveries: non-boss enemies hit are PULLED 0.5 u toward the Tank (a zone: toward its centre) instead of knocked back | GREY | GREY |
| Retaliate (↺) | rare | 1 | for 120 ticks after the cast, every hostile damage instance on the Tank answers its attacker with 25% of this skill's flat-stage power (no crit roll — Siphon's rule) | same | GREY |
| Aegis (⬡) | legendary | 1 | while this skill is on cooldown the Tank has ward 20% (applied at the cast for the resolved cooldown, ≤ 600 ticks) | same, and the recipients ward 20% for their shield's life | allies inside ward 10% (pulse-refreshed) |

**Swordsman nodes**

| Node (glyph) | Rarity | Limit | on a damage skill | on a hostile-field passive (Razor Wake) |
|---|---|---|---|---|
| Flow (⟳) | common | 2 | a cast that connects cuts every OTHER Swordsman skill's remaining cooldown by 0.3 s per copy (once per cast; a zone: its first connecting tick) | each pulse that hits cuts the others by 0.1 s per copy |
| Momentum (⇶) | common | 1 | +12% power per distinct OTHER Swordsman skill cast in the last 120 ticks (max +36%, additive with the combo) | pulses +12% per skill cast in the last 120 ticks (max +36%) |
| Parry (⟂) | common | 1 | after the cast a 24-tick parry (Riposte's rules; the counter = one melee_arc instance of 50% resolved power on the attacker); on Riposte: its window +24 ticks | GREY |
| Pursuit (↗) | rare | 1 | self-anchored deliveries (arc, nova): dash ≤ 1.2 u toward the target first (Fox Step's dash rules); on Fox Step: +1.0 u of dash; Riposte and Caltrops GREY | GREY |
| Lethality (✕) | rare | 1 | crits from this skill deal ×2.2 instead of ×1.5 (the roll is unchanged) | same on pulses |
| Execute (⌖) | legendary | 1 | ×2 power on a hostile at or below 35% HP (read before the instance; the Stag included) | same on pulses |

**Archer nodes**

| Node (glyph) | Rarity | Limit | on a damage skill | on a hostile-field passive (Kestrel Watch) |
|---|---|---|---|---|
| Skewer (→) | common | 2 | projectile: pierces +1 enemy per copy (full power each, Pale Lance's pierce rule); other shapes GREY | GREY |
| Concussive (⊙) | common | 1 | non-boss hits knocked back ×2 (skill 0.72 → 1.44 u; the Stag immune as always) | same on pulses |
| Steady Aim (⊡) | rare | 1 | +40% power when the Archer has not moved in the 30 ticks before the cast (a zone: at placement) | pulses +40% while it has stood still 30 ticks |
| Disengage (↶) | rare | 1 | after the cast the Archer hops 1.0 u directly away from the nearest hostile within 2.5 u (swept, 8 i-frame ticks); on Vault Shot: the vault +0.8 u | GREY |
| Scatter (⁂) | rare | 1 | ground_aoe: 3 zones of 60% radius and 60% power in a triangle 0.8 u around the aim point; projectile: a bolt spent at max range without a hit bursts into 3 shards (±30°, 40% power, 1.5 u); nova GREY | GREY |
| Heartseeker (♡) | legendary | 1 | the first instance of each cast on each target is a guaranteed crit (the roll is still drawn) | every pulse instance is a guaranteed crit |

Glyphs are single BMP symbols with no emoji presentation, distinct from
every §15/§23 glyph (ui/run/cards.js `NODE_GLYPH`); rarity rides the card
rim AND text (§15.5 colour-blind fence).

**Shared-node access per class** (a class's node pool = its 6 class nodes +
these):

| Class | Shared nodes it may take | Pool | Rarity bands (c / r / l) |
|---|---|---|---|
| Healer | all 17 (unchanged) | 17 | 8 / 7 / 2 |
| Tank | Sharpen, Quicken, Multiply, Ascend, Widen, Reach, Linger, Echo, Snare, Galvanize, Bulwark, Resonance | 18 | 8 / 7 / 3 |
| Swordsman | Sharpen, Quicken, Multiply, Ascend, Widen, Reach, Keen, Siphon, Echo, Detonate, Galvanize, Resonance | 18 | 9 / 6 / 3 |
| Archer | Sharpen, Quicken, Multiply, Ascend, Reach, Linger, Keen, Bounce, Split, Snare, Detonate, Echo, Resonance | 19 | 7 / 9 / 3 |

Left out on purpose (class fantasy): the Tank takes no Bounce / Split (no
bolts), Siphon (the Healer sustains), Keen (crit belongs to the Swordsman) or
Detonate (explosions belong to the Archer); the Swordsman no Bounce / Split,
Snare / Linger / Bulwark (control and shields belong to the Tank); the
Archer no Widen (its areas grow by Scatter), Siphon, Galvanize or Bulwark.

**Shared nodes on the two new columns** (the damage column is §15.3 /
§23.4's, unchanged; stat nodes follow the §15.5 stat-key rule):

| Node | on a guard skill (Shield Wall) | on a hostile-field passive (Razor Wake, Kestrel Watch) |
|---|---|---|
| Sharpen / Ascend | shield amount +25% / ×2 | pulse damage +25% / ×2 |
| Quicken | cooldown −15% | GREY (no cooldown) |
| Multiply | +1 recipient (2 → 3; saturation-inert once the count covers the 4-member party) | +1 target (3 → 4, 1 → 2) |
| Widen | GREY (direct — no area) | field radius +25% |
| Reach | eligibility range +25% | GREY (no range) |
| Linger | shield lifetime +50% (240 → 360 ticks) | GREY (nothing lasts) |
| Keen | GREY — shields never crit (Iron Stance likewise) | crit chance +0.15 |
| Bounce | the shield hops to the next-lowest-HP other ally within 2.2 u, full power, 1 hop per copy | GREY |
| Siphon | GREY — a shield drains nothing | each pulse that hits heals the caster 25% of flat-stage pulse power (once per pulse) |
| Echo | recast 1.0 s later at 50% | Reapply: one bonus pulse every 3.0 s |
| Detonate | a shield from this skill that breaks bursts for 50% resolved power, r 1.2, around its bearer (damage) | kills by a pulse explode: 50% power, r 1.2 |
| Snare | shielded allies haste 20% for 90 ticks | hostiles hit slowed 25% (pulse-refreshed) |
| Galvanize | shielded allies inspired +15% for 180 ticks | hostiles hit exposed +10% (pulse-refreshed) |
| Bulwark | the Tank also gains 50% of each shield it grants | caster shield 20% of pulse damage (cap 10) |
| Split | the 2 nearest other allies within 2.5 u of each recipient get 40% | GREY |
| Resonance | every 3rd cast ×2 | every 3rd pulse ×2 |

**Saturation-inert** (§15.5 "+0", never the grey strike) extends to:
Multiply on a guard direct whose count already covers the party; Widen on
an arc already at the 90° clamp (Riposte; a SECOND Widen on Brutal Cleave:
80° → 90° → 90° realizes +0 on the second copy, judged per copy as
socketed); a class node whose effect the skill already exceeds (Provoke on
Taunting Roar — it taunts 150 ticks; Tremor on Shoulder Charge — it stuns
36). Linger never lifts a stun past the §23.8 60-tick cap (Pinning Arrow
45 → 60, not 68) nor a taunt past 240.

### 25.4 Node × skill grids (generated — `node tools/gntPARTYD-grid.mjs --md`)

`live` = contributes; `GREY` = legal, contributes nothing (§15.5 strike);
`inert` = saturation-inert (+0). "live cap" = Σ repetition limits of the
live nodes — every class skill can fill all 8 sockets with live nodes
(minimum 14 / 17 / 12). Every cell holds on all 8 sockets. The per-cell
effect text is in `docs/gauntlet/party-oracle.json`.

#### Tank — node × skill grid (8 skills × 18 nodes = 144 cells)

| Skill | Sharpen | Quicken | Multiply | Ascend | Widen | Reach | Linger | Echo | Snare | Galvanize | Bulwark | Resonance | Provoke | Brace | Tremor | Anchor | Retaliate | Aegis | live cap |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Heavy Slam ·s | live | live | live | live | live | live | GREY | live | live | live | live | live | live | live | live | live | live | live | 22 |
| Brutal Cleave ·s | live | live | live | live | live | live | GREY | live | live | live | live | live | live | live | live | live | live | live | 22 |
| Ground Crack ·s | live | live | GREY | live | live | live | live | live | live | live | live | live | live | live | live | live | live | live | 22 |
| Whirling Guard ·s | live | live | live | live | live | GREY | GREY | live | live | live | live | live | live | live | live | live | live | live | 20 |
| Taunting Roar | live | live | live | live | live | GREY | live | live | live | live | live | live | inert | live | live | live | live | live | 20 |
| Shield Wall | live | live | live | live | GREY | live | live | live | live | live | live | live | live | live | GREY | GREY | live | live | 19 |
| Shoulder Charge | live | live | live | live | live | live | live | live | live | live | live | live | live | live | inert | live | live | live | 22 |
| Iron Stance | live | GREY | GREY | live | live | GREY | GREY | live | live | live | live | live | live | live | GREY | GREY | GREY | live | 14 |

Grey / inert reasons: Heavy Slam × Linger GREY: nothing on this skill lasts — no duration to extend · Brutal Cleave × Linger GREY: nothing on this skill lasts — no duration to extend · Ground Crack × Multiply GREY: no count stat on this skill · Whirling Guard × Reach GREY: no range stat on this skill · Whirling Guard × Linger GREY: nothing on this skill lasts — no duration to extend · Taunting Roar × Reach GREY: no range stat on this skill · Taunting Roar × Provoke inert: +0 — this skill already taunts longer (150 ticks) · Shield Wall × Widen GREY: single-target shape — no area to widen · Shield Wall × Tremor GREY: no hostile delivery to stagger with · Shield Wall × Anchor GREY: no hostile area delivery to pull with · Shoulder Charge × Tremor inert: +0 — this skill already stuns longer (36 ticks) · Iron Stance × Quicken GREY: no cooldown stat on this skill · Iron Stance × Multiply GREY: no count stat on this skill · Iron Stance × Reach GREY: no range stat on this skill · Iron Stance × Linger GREY: nothing on this skill lasts — no duration to extend · Iron Stance × Tremor GREY: a passive field — nothing here for this technique to act on · Iron Stance × Anchor GREY: a passive field — nothing here for this technique to act on · Iron Stance × Retaliate GREY: a passive field — nothing here for this technique to act on.

#### Swordsman — node × skill grid (8 skills × 18 nodes = 144 cells)

| Skill | Sharpen | Quicken | Multiply | Ascend | Widen | Reach | Keen | Siphon | Echo | Detonate | Galvanize | Resonance | Flow | Momentum | Parry | Pursuit | Lethality | Execute | live cap |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Flurry ·s | live | live | live | live | live | live | live | live | live | live | live | live | live | live | live | live | live | live | 23 |
| Lunge Strike ·s | live | live | live | live | live | live | live | live | live | live | live | live | live | live | live | live | live | live | 23 |
| Blade Storm ·s | live | live | live | live | live | GREY | live | live | live | live | live | live | live | live | live | live | live | live | 21 |
| Caltrops ·s | live | live | GREY | live | live | live | live | live | live | live | live | live | live | live | live | GREY | live | live | 21 |
| Fox Step | live | live | live | live | live | live | live | live | live | live | live | live | live | live | live | live | live | live | 23 |
| Crescent Finisher | live | live | live | live | live | live | live | live | live | live | live | live | live | live | live | live | live | live | 23 |
| Riposte | live | live | live | live | inert | live | live | live | live | live | live | live | live | live | live | GREY | live | live | 20 |
| Razor Wake | live | GREY | live | live | live | GREY | live | live | live | live | live | live | live | live | GREY | GREY | live | live | 17 |

Grey / inert reasons: Blade Storm × Reach GREY: no range stat on this skill · Caltrops × Multiply GREY: no count stat on this skill · Caltrops × Pursuit GREY: the delivery is placed at range — nothing to close · Riposte × Widen inert: +0 — already a full 90° half-angle (the §23.4 clamp) · Riposte × Pursuit GREY: the counter answers an attacker already in reach · Razor Wake × Quicken GREY: no cooldown stat on this skill · Razor Wake × Reach GREY: no range stat on this skill · Razor Wake × Parry GREY: a passive field — nothing here for this technique to act on · Razor Wake × Pursuit GREY: a passive field — nothing here for this technique to act on.

#### Archer — node × skill grid (8 skills × 19 nodes = 152 cells)

| Skill | Sharpen | Quicken | Multiply | Ascend | Reach | Linger | Keen | Bounce | Split | Snare | Detonate | Echo | Resonance | Skewer | Concussive | Steady Aim | Disengage | Scatter | Heartseeker | live cap |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Piercing Shot ·s | live | live | live | live | live | GREY | live | live | live | live | live | live | live | live | live | live | live | live | live | 23 |
| Volley ·s | live | live | live | live | live | GREY | live | live | live | live | live | live | live | live | live | live | live | live | live | 23 |
| Detonating Charge ·s | live | live | GREY | live | live | live | live | GREY | GREY | live | live | live | live | GREY | live | live | live | live | live | 18 |
| Sundering Nova ·s | live | live | live | live | GREY | GREY | live | GREY | GREY | live | live | live | live | GREY | live | live | live | GREY | live | 15 |
| Vault Shot | live | live | live | live | live | live | live | live | live | live | live | live | live | live | live | live | live | live | live | 24 |
| Pinning Arrow | live | live | live | live | live | live | live | live | live | live | live | live | live | live | live | live | live | live | live | 24 |
| Rain of Arrows | live | live | GREY | live | live | live | live | GREY | GREY | live | live | live | live | GREY | live | live | live | live | live | 18 |
| Kestrel Watch | live | GREY | live | live | GREY | GREY | live | GREY | GREY | live | live | live | live | GREY | live | live | GREY | GREY | live | 12 |

Grey / inert reasons: Piercing Shot × Linger GREY: nothing on this skill lasts — no duration to extend · Volley × Linger GREY: nothing on this skill lasts — no duration to extend · Detonating Charge × Multiply GREY: no count stat on this skill · Detonating Charge × Bounce GREY: needs a retargetable impact (projectile or direct) · Detonating Charge × Split GREY: needs a retargetable impact (projectile or direct) · Detonating Charge × Skewer GREY: only a bolt can pierce · Sundering Nova × Reach GREY: no range stat on this skill · Sundering Nova × Linger GREY: nothing on this skill lasts — no duration to extend · Sundering Nova × Bounce GREY: needs a retargetable impact (projectile or direct) · Sundering Nova × Split GREY: needs a retargetable impact (projectile or direct) · Sundering Nova × Skewer GREY: only a bolt can pierce · Sundering Nova × Scatter GREY: a self burst has nothing to scatter · Rain of Arrows × Multiply GREY: no count stat on this skill · Rain of Arrows × Bounce GREY: needs a retargetable impact (projectile or direct) · Rain of Arrows × Split GREY: needs a retargetable impact (projectile or direct) · Rain of Arrows × Skewer GREY: only a bolt can pierce · Kestrel Watch × Quicken GREY: no cooldown stat on this skill · Kestrel Watch × Reach GREY: no range stat on this skill · Kestrel Watch × Linger GREY: nothing on this skill lasts — no duration to extend · Kestrel Watch × Bounce GREY: a passive field — nothing here for this technique to act on · Kestrel Watch × Split GREY: a passive field — nothing here for this technique to act on · Kestrel Watch × Skewer GREY: only a bolt can pierce · Kestrel Watch × Disengage GREY: a passive field — nothing here for this technique to act on · Kestrel Watch × Scatter GREY: a passive field — nothing here for this technique to act on.

### 25.5 Supply — what each character receives, per level

Every combat room clear (rooms 1–6 of every level, the defend soft-fail
rule of §11 unchanged — a forfeit forfeits every character's reward and
spoils) pays EVERY character; the shop pays each from its own shelf:

| Source | Healer (unchanged) | Each ally (Tank, Swordsman, Archer) |
|---|---|---|
| Clear stipend | +12 Glint to the Healer's purse (= the §14 wallet) | +12 Glint to its own purse |
| Clear spoils → its own bench | 2 nodes (commons + rares; the fill layer, then the fix-M4a-r4 upgrade layer) | **1** node (same rule, its class pool) |
| Room reward (the party page) | 1 card: the door's promise (skill or node, §16) — with 4 skills owned a skill promise is a SWAP offer (ruling A17) | 1 card: the same promise — a skill promise is a SWAP offer — one class skill it does not own, replacing one of its 4 (§25.1), a node promise a node from its class pool |
| Shop (room 7, one visit) | its 4-card shelf: 2 common + 1 rare + 1 legendary at 15 / 15 / 20 / 25 | its own 4-card class shelf, same strata and prices |
| Purse at the shop | 72 (= 12 × 6, §14 unchanged) | 72 — the §14 invariants hold per purse (the whole shelf 75 > 72, any three ≤ 60) |

- **Growth arc** (expected, default autopilot + the §25.8 AI, doors 50/50):
  each ally ≈ 6 spoils + ≈ 3.5 node rewards + ≤ 3 buys ≈ 12–13 nodes a
  level → ≈ 12 / 32 sockets at the Level 1 Stag, ≈ 25 / 32 at the Level 2
  Stag, 32 / 32 during Level 3, then the upgrade layer keeps improving it
  (a full build keeps progressing, §14 fix-M4a-r4 note, per character). The
  Healer keeps its faster arc (32 / 32 by the Level 2 Stag). Skills: ≈ 2–3
  SWAP offers per ally per level (room 1 always promises a skill), each one
  of the 4 class skills it does not own (uniform draw, party stream); the
  §25.8 AI takes an offer that outranks its lowest-priority skill, so an AI
  loadout reaches its priority top four in about two levels and then keeps
  it (Leave); a human may re-shape the loadout at every skill room. The
  swap never adds a skill, so the ally's skill offers never run dry and
  never need the §16 substitution line. PARTY measures and
  records the real arc (PLAN GP.7) and tunes only the ally spoils count (1)
  if an ally sits outside 8–16 / 32 at the Level 1 Stag or 20–30 / 32 at the
  Level 2 Stag.
- **No flood of decisions**: spoils and the AI-held seats' cards need no
  input (§25.6 Suggested); the player's per-room input count stays the
  Healer-only flow's ONE Enter by default.
- **Purses, not one wallet.** Each character carries its own Glint purse;
  a purse buys only from its own character's shelf. The Healer's purse IS
  the §14 wallet (every Healer number unchanged); four builds never compete
  for one wallet, and a network party never contends for coins. The HUD's
  Glint readout shows the viewed character's purse (the Healer in
  single-player).
- **Starter grant** (a Level-N start, §24): the Healer's §23.2 grant is
  unchanged; each ally additionally receives `STARTER_GRANT[N].allies`
  (swap offers resolved by the §25.8 AI, node draws in pairs + auto-fill,
  legendary draws, purse Glint) = the median carried ally build at that
  level's card (§25.10).

### 25.6 Selection UX — rewards, shop, socket screen

Benchmarks: **Across the Obelisk** (every hero gets its own reward after a
fight, shown with the hero's portrait; in co-op each player picks for their
own heroes at the same time), **Darkest Dungeon** (a roster strip to pick
the hero; a per-hero 4-skill loadout changed out of combat), **Children of
Morta** (per-character growth, one family roster to switch between).
Echoes takes AtO's owner-tagged per-hero reward and DD's roster strip and
4-skill loadout — but keeps the user's cap literally (DD lets a hero know 7
skills and equip 4; an Echoes character never holds more than 4, so a new
skill always swaps one out) — and keeps the Healer-only flow's speed.

**The party strip** — ONE component on the reward page, the shop shelf, the
socket screen, the level-clear card and the Setting-out card: 4 tabs in
party order (Healer · Tank · Swordsman · Archer = the command bar's
portrait order = F1–F4). Each tab = the rendered portrait (§17 head), the
class glyph drawn in Parchment ink (Healer bell, Tank shield block,
Swordsman diagonal blade, Archer bow arc — the §19.2 silhouette props), the
class name, a thin class-accent underline, and a state chip (reward: "✓
Take" / "✕ Leave" / "AI ✓ Take" / "… 18 s" / "—"; shop: "◉ 72"; socket:
"19/32 · ▲3" = sockets filled + bench nodes waiting). The viewed tab is
raised, outlined in Hearth Amber (§19.1 selection) and carries a ▼ caret —
never colour alone. In a network session each tab names its owner: "you",
"AI" or the player's name.

**Ownership on every item**: every card, shelf card and socket row carries
an owner band ("FOR THE TANK" + the portrait + glyph + accent stripe) and
`data-seat` for probes.

**Switching character** — ≤ 2 inputs from any tab to any other (1 with a
direct key), on the app's existing tab convention (PLAN §3.3: Q / E,
PageUp / PageDown and pad LB / RB are tabPrev / tabNext): **Q / E** or
**PgUp / PgDn** (previous / next, wrapping), **F1–F4** (direct — the
portrait keys), a **click** on a tab (or on a command-bar portrait while a
build page is open), pad **LB / RB**. Switching is navigation, never a
commit, and obeys the §16 settle window: dropped for the page's first
300 ms, and E / F1–F4 keep restarting that window as carry-over keys, so a
combat revive or override press never lands as a switch.

**Reward page → the party page** (after every combat room; replaces the
one-card draft page):

- The §16 title strip (A GIFT ON THE ROAD · SKILL SLOTS FREE — of the viewed
  character · ROOM), the party strip, the viewed character's card (the §16
  card grammar + its owner band), that character's spoils line ("Spoils →
  Tank's bench: Brace"), and **Take** / **Leave**.
- A **swap** offer (any character's skill card while it holds 4 skills —
  the Healer's included, ruling A17) adds the **Replaces** selector
  under the card: the character's 4 skill icons, the chosen one marked ✕, with a
  sentence ("Taunting Roar replaces Ground Crack — Ground Crack's 3 nodes
  go to the Tank's bench"). W / S, ↑ / ↓, pad D-pad up / down, the mouse
  wheel or a click on an icon cycles the target; **Leave** (X, the Leave
  button) keeps the loadout. The card is titled "NEW SKILL — SWAP" and its
  strip reads "SKILL SLOTS FULL · choose one to replace, or Leave".
  Its default is the AI suggestion (§25.8; when the AI would Leave, the
  selector opens on the lowest-priority skill and the card on Leave). A
  taken swap whose replaced skill held nodes chains into the socket screen
  on that character's tab with the released nodes on the bench and the
  auto-fill offered ("3 nodes back on the bench — F auto-fill · B sockets")
  — the same chain a taken node card makes.
- Focus opens on the viewer's OWN card (the Healer in single-player) on
  Take (the §16 primary rule). **Enter takes the focused card and moves to
  the next card THIS player still has to decide; with none left, the page
  commits.** X (pad X) leaves likewise; a click on Take / Leave does the
  same for the viewed card.
- **Settings ▸ Gameplay ▸ Ally builds** (`gameplay.allyBuilds`; a
  single-player / host setting; it governs AI-held seats only):
  - **Suggested** (default) — AI-held cards open pre-decided with the AI's
    pick (chip "AI ✓"); the player may view and change any of them before
    committing. Enter on the own card commits: ONE input per room, exactly
    the Healer-only flow.
  - **Manual** — AI-held cards open undecided; Enter walks Healer → Tank →
    Swordsman → Archer and commits after the last (4 inputs per room); their
    nodes stay on the benches until the player sockets them.
  - **Automatic** — AI-held cards are decided by the AI, shown as one
    summary line under the strip, with no focus stops (tabs stay viewable).
  Every mode measurably changes the page (focus stops, pre-decided cards,
  auto-fill) — PLAN GP.12. The row's help line says it only applies to
  AI-held characters.
- **Settings ▸ Gameplay ▸ Socket my new nodes** (`gameplay.autoSocketOwn`,
  Off by default — the §16 rule for the Healer is unchanged): On =
  the player's OWN character's bench is auto-filled (the shared policy) at
  every page commit. Per player (each network player has their own).
- Unchanged from §16: no reroll, no reopen, a decline has no memory, a taken
  node goes to that character's bench, taking a node on the viewer's own
  card chains into the socket screen on that character's tab with the node
  in hand (M4c), the empty page ("BUILD COMPLETE · Nothing outranks your
  build") is per card, the settle window.
- **AI-held seats socket automatically** at commit in Suggested and
  Automatic (the shared auto-fill on their benches; socketed nodes are
  never moved except by the fix-M4a-r4 upgrade swap); in Manual, never.

**Shop** (room 7, one visit): the compact ornate panel keeps its §16
tunings; the party strip sits on its top rail (chips = purses); the shelf
shows the viewed character's 4 class cards (owner band on each, the price
plaque below), the Glint strip shows that character's purse. A whole-card
click buys for THAT character from ITS purse — the same meaning on every
tab; the denial shake is unchanged. Suggested: every AI-held tab shows the
AI's picks PRE-MARKED on its shelf (a "Suggested" ribbon on each marked
card, toggled by Enter / a click on the ribbon / pad Y — viewing a tab is
navigation and never cancels anything); on Advance each AI-held tab buys
its still-marked cards (in shelf order, while its purse lasts) unless the
player bought something on that tab during this visit, in which case the
player's own purchases stand and the marks are dropped (the lamp reads
"Advance · Tank, Archer buy suggested"); Manual: nothing is pre-marked and
nothing is bought for an untouched tab; Automatic: AI-held tabs are
summaries and buy at shop open.

**Socket screen** (between rooms; B / pad View, or chained): the party
strip across the top, then the viewed character's 4 rows × 8 sockets and
its own bench (the M4c one-page layout, no scroll 1024×576 → 2560×1440)
**Reorder**: ← from socket 1 reaches the row's skill header; Enter picks
the skill up; ↑ / ↓ (or 1–4) to another header; Enter swaps the two rows
(sockets travel with their skills; slot order = keys 1–4 = the AI's cast
order). Mouse: click a header, click another. F auto-fills the viewed
character; **Shift+F** or the "Auto-fill all" button (pad: D-pad to it, A)
fills all four. Keys otherwise as §16 / M4c, except that the pad's row
jump moves from LB / RB (now the character switch) to **LT / RT**; 1–4
still jump rows.

**HUD**: unchanged for the Healer (4 tiles + socket strips). A network
guest's command bar shows ITS seat's loadout (tiles, cooldowns, strips).

**Cards and records**: the level-clear card, the Setting-out card, the end
card and the save-slot list show all four builds compactly ("Tank · 4 ·
12/32 · ◉ 30").

**Layouts**: the party page, shop and socket screen at 1024×576, 1600×900,
1920×1080 and 2560×1440 — one page, no scrolling, no overlap, no clipping,
text at the §17 floors in design px, every tab ≥ 44 design px tall.

### 25.7 Multiplayer — ownership, parallel picks, timeouts, replication

- **Ownership.** Seat s's build — loadout, slot order, sockets, bench, purse,
  its reward card, its shelf — belongs to the human playing seat s; an
  AI-held seat (never joined, dropped, away) belongs to the HOST, who builds
  it under the host's Ally builds mode. A client changes only what it owns;
  the host rejects anything else (`command_rejected { reason: 'not_owner' }`,
  no state change). Ownership follows seat control live: a drop hands the
  seat to the AI and the host, a return hands it back; decisions already
  made stand. This replaces PLAN §3.7's "build decisions belong to the host"
  for everything except the doors and the level flow.
- **Parallel decisions.** Every human decides their own card at the same
  time on their own screen; the page commits when every human card is
  decided — or at the **deadline**: 30 s after the page opened (1800 sim
  ticks), with a countdown on every client for its last 10 s ("Waiting for
  Fox — auto-pick in 8 s"). At the deadline the host applies the AI
  suggestion to every undecided human card and tells everyone once ("Time's
  up — the Swordsman's reward was picked: Flow"); the owner's own line adds
  that nothing is lost ("you can re-socket it between rooms").
- **Doors**: the host picks (unchanged); new deadline 30 s after the page
  commits → the left door, with the same one-line notice.
- **Shop**: each human buys on their own tab and presses Done (Enter on the
  Advance lamp, which reads "Done" for a guest); the host's Advance leaves
  at once when every human is Done, else starts a 15 s countdown shown to
  all; the shop also leaves by itself 90 s after it opened (a countdown for
  its last 10 s). Untouched AI-held tabs buy per the host's mode.
- **Socket screens**: every human may open their own between rooms (socket
  operations go to the host as CMDs, validated for ownership and
  `combat_active == false`). When the party is about to leave (a committed
  door, the shop leaving, the level-clear card advancing) every open socket
  screen shows the same countdown; the door waits ≤ 8 s while any human's
  socket screen is open, then the screens close and bank a node in hand.
- **Deadlines exist only with ≥ 2 humans in the session**; single-player
  never times the player out. They are armed LIVE, never only when a page
  opens: whenever the session's human count becomes ≥ 2 while a page, door
  or shop decision is open, the host arms that decision's deadline from
  that tick (page / door 30 s, shop 90 s); a card that becomes
  human-owned while still undecided (a drop-in onto an AI-held card left
  undecided in Manual mode, a return from away) gets a fresh 30 s from the
  take-over tick (the page deadline becomes max(current, take-over +
  1800)); when the human count falls back to 1 every open deadline is
  cleared. At a deadline the host applies the §25.8 suggestion to EVERY
  undecided card — human-owned, or AI-held and left undecided in Manual —
  then commits, with the one notice. A saved deadline is dropped when the
  save loads as single-player (no session), so a network save never times
  a solo player out.
- **Replication.** Builds are host-authoritative sim state in the snapshot's
  COLD tree; every client renders every build read-only except its own
  editable tab; build events carry `seat`; the 30-tick state hash covers
  the builds (0 desyncs is a gate). A guest's own-seat prediction reads its
  replicated loadout and resolved cooldowns (Quicken counts) and PREDICTS
  its own dash / vault / hop displacements with the §25.2 human-seat rule
  (own position, own aim at the press, the resolved skill, the walls —
  never a hostile position), exactly as it predicts its dodge, so a Shoulder
  Charge or Vault Shot on a guest seat moves at once with no snap (PLAN
  GP.4 / GP.9 measure the prediction error during these casts).
- **Drop-in, rejoin, migration.** A drop-in guest takes an AI-held seat
  WITH the build the host gave it; a rejoin keeps the seat's build; a
  migration keyframe carries all four builds, the party page, the shelves
  and the deadlines.

### 25.8 AI policy for AI-held seats

**Equip** (deterministic, state-only, no RNG, the same code for Suggested
pre-picks, Automatic, host-built seats and timeouts):

| Class | Priority (the AI's loadout converges to its top four) |
|---|---|
| Tank | shield_wall · taunting_roar · heavy_slam · shoulder_charge · whirling_guard · iron_stance · brutal_cleave · ground_crack |
| Swordsman | flurry · crescent_finisher · fox_step · lunge_strike · riposte · blade_storm · razor_wake · caltrops |
| Archer | piercing_shot · volley · pinning_arrow · vault_shot · rain_of_arrows · kestrel_watch · detonating_charge · sundering_nova |

- A swap offer: Take, replacing the lowest-priority owned skill, when the
  offered skill outranks it; else Leave. A node offer: Take. The nodes a
  replaced skill releases go to the bench and the shared auto-fill
  re-places them (for AI-held seats; a human's bench is theirs). After a
  swap the AI orders its 4 slots by priority (its cast order).
- Shop: the autopilot rule — the cheapest affordable card first while the
  purse lasts (ties: shelf order).
- **The Healer** (ruling A17): its swap offers follow the same rule with
  the Healer priority `mending_tide · guardian_bond · nova_bloom ·
  mending_bolt · swift_mend · kindred_shield · hearthsong ·
  restorative_wave · dewfall · sanctuary · quiet_hearth · warding_aura ·
  bell_toll · pale_lance · lantern_flurry · rootsnare · spirit_bolt`
  (sustain first — the autopilot casts heals on the neediest member and
  damage at the nearest enemy), the new skill taking the REPLACED skill's
  slot (keys never move under a player). This is the suggestion the
  Healer's own card opens on, what the default-build autopilot and the
  seat-0 leader bot do, and what a timeout applies. A non-swap card: take
  every card, the same shop rule, auto-fill — its §16 flow is otherwise
  untouched.
- A starter grant or catch-up for a HUMAN-owned seat is resolved by these
  same rules; the player re-shapes it between rooms.

**Cast** (every tick, AI-held seats only; human-held seats never
AI-cast): walk the equipped slots ascending; fire the first ACTIVE that is
off cooldown and whose §25.2 AI rule holds; else the §7 basic. Range tests
use the RESOLVED definition (Reach, Widen, dash distance). The idle
fallback casts an active that has been ready ≥ 480 ticks under the §7
range rule. Passives are always on.

**Sensible targets**: a guard skill never targets a Downed member; Taunting
Roar and Provoke skip the Stag while the Tank is below 30% HP; Pinning Arrow
never picks the Stag (immune to stun) while another target qualifies;
Riposte is not cast with no hostile within 1.5 u; a dash / vault never ends
beyond the §12 leash. **Steering** (§12) adds one rule: an Archer holding a
ready Steady Aim skill stands still for 30 ticks before casting it when no
hostile is within 2.0 u.

**Engagement (fix-M4a-r5, 2026-09-30 — content r5 F5, GP.8; `src/data/classes.js`
`AI_ENGAGE`).** The rules above left equipped actives idle for whole rooms
(v0.5.165: 14 of 598 room-skill pairs over carried campaigns seeds 1–3 — the
Swordsman's Flurry / Blade Storm, the Tank's Heavy Slam / Brutal Cleave in
Level 1–2 defend rooms): the Archer and the Healer killed every wave 4–7 u
out while the melee pair waited on the 3.4 u ring, only acting on the shared
target, and a lower slot starved behind higher ones. In a campaign run (never
the `?room=` harness, never the Node-only legacy switch — the §16.9 goldens
and the v0.5.150 proof keep their traces) an AI-held seat now:
- serves an **overdue** active FIRST — ready ≥ 480 ticks (`AI_IDLE_FALLBACK_TICKS`),
  or ≥ 240 ticks (`firstUseTicks`) for one not yet cast this room: its own
  §25.2 rule, else the nearest hostile in its reach; a melee arc / nova
  delivery cast that way closes the last ≤ 1.2 u with a short **lunge** (the
  Pursuit dash machinery, `ally_dash` cause `lunge`, no i-frames, 9 u/s) — a
  parry opens with a hostile within its reach + 1.2 u, never lunging;
- **commits**: while one of its actives is overdue it takes the nearest
  hostile it can reach inside its ring and closes to 0.8 × that skill's reach;
- the **melee pair** (Tank, Swordsman) has a **vanguard ring**: the §12 leash
  + 2.0 u (5.4 u) — they may step out to meet a threat before it reaches the
  ranged line; the Archer and the Healer keep 3.4 u. "A dash / vault never ends
  beyond the §12 leash" reads the seat's own ring (`allyState` shows
  `leash` per melee seat while the rules are on).
Measured: 0 idle equipped actives over 40 Node campaigns (from Level 1 seeds
1–20, Level-2 / Level-3 starts seeds 1–10), the idle fallback 3–10 % of casts.

### 25.9 Campaign carry, saves, records

- **Carry** (§24, PLAN §12.3 `CARRY_RULES`) applies to all four builds:
  the 4 skills in their slot order, every socketed node, every bench and
  every purse carry; HP, downs, statuses and cooldowns of
  every seat are restored; everything level-bound resets, now including
  taunts, parry windows, dashes / vaults in progress, combo windows, every
  seat's pending Echo recasts and Reapply clocks, the party page, the four
  shelves and every multiplayer deadline.
- **Saves**: schema 4 (PLAN §16.6) — the four builds, the party page with
  its decisions and deadline, the shelves, the purses and the party draw
  stream; `MIGRATIONS[3]` turns a schema-3 save's fixed kits into the
  starting loadouts and queues an **ally catch-up grant** that the sim
  applies on the first tick after the load (from the party stream, so it is
  deterministic): the level's `STARTER_GRANT[N].allies` plus, for every
  combat room already cleared in the current level, 2 nodes and 12 Glint
  per ally — so an old campaign's allies meet the retuned levels fairly.
  Schema 1 / 2 saves chain through it. A toast names it once ("Your allies
  caught up: 14 nodes each").
- **Records**: the end card, the level-clear card and the slot list show
  the four builds; high-score entries gain `party: [{ classId, skills,
  filled }]`.

### 25.10 Difficulty retune for four built characters

- **Method** (constants only — the §4.2 / §23.2 formula's shape unchanged):
  the deterministic default-build autopilot for the Healer + the §25.8 AI
  for the allies (Suggested mode), the carried campaign from Level 1 AND
  Level-N starts with the grant (`tools/gntCAMPAIGN-camprun.mjs`, extended
  by PARTY), seeds 1–5 (1–20 for the final spot check), standard challenge.
  Movable: the level tiers T, the room slope, the defend budget scale,
  `STAG_HP_LEVEL`, `BOSS_DMG_SLOPE`, the ally starter grant and — only if
  GP.7's arc misses — the ally spoils count.
- **Target band** (PLAN GP.13): (a) the §4.2 / GC.12 band unchanged
  (clears ≥ 3 / 3 / 2 of 5 per level, ρ ≥ 0.6, no combat-room median above
  120 s, defend rooms and the Stag above their neighbours, per-room damage
  medians rising level to level); (b) so four builds do not flatten the
  game: per level, the median party damage taken per combat room and the
  median time-to-clear stay within ×0.75–×1.35 of the **v0.5.150
  baseline** (PARTY measures it with the same runner and seeds before its
  first sim edit); (c) the Level 3 Stag room's median party damage ≥ 0.8 ×
  its baseline; (d) the carried campaign does not win every level on every
  seed with zero party downs (≥ 1 down per level on at least 2 of 5 seeds —
  the game still bites).
- **Starter grant** — `STARTER_GRANT[N].allies` = the median carried ally
  build at the Level N card (swapped-in skills, socketed nodes, 1 legendary
  per level, purse). First proposal, re-measured by PARTY: Level 2 `{ swaps:
  2, nodes: 12, legendaries: 1, glint: 30 }`, Level 3 `{ swaps: 4, nodes: 24,
  legendaries: 2, glint: 50 }`. The dated retune note goes into §23.2
  (the table §4.2, §12.10 and G4a.5 cite).
- **Max-stress build** (performance and bandwidth probes only — PLAN GP.10 /
  GP.15; `?partygrant=max` or `cmd('partyStress')`; marks the run
  `harness: true`): deterministic, no RNG, every seat 32 / 32. Loadouts
  (slot order): Healer `lantern_flurry · pale_lance · bell_toll ·
  nova_bloom`; Tank `taunting_roar · whirling_guard · ground_crack ·
  iron_stance`; Swordsman `flurry · blade_storm · caltrops · razor_wake`;
  Archer `volley · rain_of_arrows · piercing_shot · kestrel_watch`. Every
  skill's 8 sockets are filled in the STRESS order — the instance
  multipliers first: Echo, Multiply, Split, Bounce, Bounce, Skewer, Skewer,
  Scatter, Detonate, Resonance, then the rest of that class's pool in
  ascending id — taking a node only where its verdict is LIVE and its
  repetition limit allows, until the row holds 8. Numeric
  `?partygrant=N` applies `STARTER_GRANT[N].allies` instead. Neither
  stacks with a Level-N start's own ally grant: an explicit `?partygrant`
  REPLACES it (the Healer's §23.2 grant still applies for a Level-N start;
  `max` also replaces the Healer's build).

### 25.11 What stays unchanged for the Healer

The Healer's skill pool (Mending Bolt + Swift Mend starting, the 15
draftable) and numbers; its 17-node pool, limits, rarities and every §15 /
§23.4 grid cell; 4 slots, keys 1–4, the command bar; 8 sockets, no caps;
the §16 rules (a 5th skill is never offered — *superseded in part by
ruling A17: with 4 owned a skill promise is a SWAP offer, the Healer's own
card gains the Replaces selector, and the replaced skill's nodes go to the
bench; before that A17 read:* a skill promise becomes a
node; take-or-decline; the substitution and BUILD COMPLETE lines; a taken
node goes to the bench and chains into the socket screen with the node in
hand; the settle window); 2 clear spoils per combat room; its 4-card shelf
at 15 / 15 / 20 / 25; its purse = the §14 wallet (+12 per combat clear, 72 at
the shop); the auto-fill policy; the Healer's starter grant; the
deterministic autopilot and the seat-0 leader bot; its save subtrees
(`systems.skills`, `systems.build`, `run.reward`, `run.shop`, `run.wallet`
keep their shapes); every Healer event payload (seat keys are added to
ally events only). The Healer's own draws stay on the gameplay stream in
the same order — every ally draw uses the separate party stream. What the
Healer player sees change: the party strip on the build pages (its own card
still focused first, still one Enter), per-character purses on the shop
rail, and the retuned levels.
