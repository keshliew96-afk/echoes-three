# The Tidecaller (Rill)

v0.5.263. Slices 2 and 3 of the new-character plan
(`/mnt/project-files/plan/NEW_CHARACTER_TIDECALLER.md`). Rill is an otter and
a ranged control caster. She soaks enemies, drags them together, then
crashes a wave into the soaked. Slice 2 made her playable with her base kit;
slice 3 adds her other seven skills, her eight class nodes, her VFX beats and
her sounds. Slice 4 adds the Level II unlock, story, deeds, relics and the
Journal.

## Who gets her

- `TIDECALLER_FREE` (`src/data/lineup.js`) is true for now, so she is open
  from the start. Slice 4 swaps it for the Level II boss unlock.
- Campaigns only (Endless and Daily included). The tutorial, the legacy
  single-level run and `?room=` stay the default four.
- Four seats, five classes: the player chooses who joins the team
  (docs/LINEUP.md). The Healer always does, the class you play always does,
  and the rest is your pick, today's party by default. Picking her on the
  class picker opens "Who joins the team?" with her in the Archer's place.
- Co-op: each player picks a character in the lobby, then the host picks who
  joins as AI for the empty seats.

## Kit

| | what | numbers |
|---|---|---|
| Spit (basic) | a water bolt | 6 damage, 0.35 s, range 4.5 |
| Dive (dodge) | the usual dodge, plus a puddle where she lands | soaks enemies in 0.7 u for 1 s |
| Riverbolt | projectile | 14, cd 2.5, range 5, soaks |
| Undertow | ground zone, 4 s | 6 per second, cd 8, area 1.0, soaks, drags 0.25 u per pulse toward its centre (not bosses) |
| Breaker | nova around her, **Crash** | 22 to up to 5, cd 8, area 1.4, knockback 1.0 |
| Tidepool | passive aura | every second, 5 to the 2 nearest within 2.5, soaks |
| Torrent | projectile, **Crash** | 18 to every enemy on a 5.5 u line (pierce 12), cd 6, speed 9 |
| Whirlpool | ground zone, 5 s | 4 per second, cd 12, range 4, area 1.4, soaks, slows 30%, drags 0.5 u per pulse |
| Ripple Step | vault + zone at her feet, 3 s | vaults 2.6 u away (untouchable, 14 ticks), leaves a puddle: 6 per second, area 0.8, soaks, cd 7 |
| Bubble Ward | guard | a 14 shield for 4 s on the member enemies are after (the Tank last), cd 11, range 4; when it breaks or ends it pops and soaks enemies within 1 u |
| Crashing Wave | 100° arc, **Crash** | 20 to up to 6 in 2.2 u, pushed back 1.2 u, cd 9 |
| Rain Squall | ground zone, 6 s | 3 per second, cd 14, range 5, area 1.8, soaks, slows 25% |
| Maelstrom | draw, then a burst, **Crash** | drags everything within 3 u in by 1 u (not bosses), then 1 s later 40 to the 8 nearest within 1.6 u, cd 16 |

All eleven are campaign-only (`CAMPAIGN_ONLY_SKILLS`), so the goldens and the
legacy run never see them.

## Her nodes

Class nodes (`CLASS_NODES.tidecaller`, campaign-only; `src/sim/nodes.js`,
`src/sim/partytech.js`, `src/sim/allycast.js`). The card grey-outs come from
`classVerdict`.

| node | rarity | effect | live on |
|---|---|---|---|
| Wellspring | common, x2 | soaks from this skill last 2 s longer per copy | a skill that soaks |
| Deluge | common | a bolt leaves a 2 s puddle (0.6 u) where it lands or falls; the puddle soaks | a projectile |
| Current | common | +15% power per soaked enemy within 3 u of the landing, up to +45% | anything that hits |
| Ebb | common | when its Crash lands, her other skills' cooldowns drop 0.5 s (once per cast) | a Crash skill |
| Spring Tide | common | re-soaking a soaked enemy drenches it: 30% slow for the rest of the soak | a skill that soaks |
| Undercurrent | common | drags 40% farther; a pushing skill pulls instead | a skill that drags, pushes or draws in |
| Riptide | rare | its Crash also stuns 0.4 s (not bosses) | a Crash skill |
| Confluence | rare | when a teammate hits a soaked enemy, this skill's cooldown runs 0.1 s faster (at most every 0.5 s) | any active |

Body: 85 HP, move speed 2.5. Numbers are first guesses
(`src/sim/skills.js`, `src/sim/allies.js`, `CLASS_TECH.tidecaller` in
`src/data/classes.js`).

## Soaked and Crash

- **Soaked** is a hostile-only status (`src/sim/status.js`): 15% slower for
  4 s (`soakMag`, `soakTicks`). Bosses are capped at 5%. Frozen elites
  refuse it. Re-soaking refreshes it.
- **Crash**: a hit from a skill marked `crash` (Breaker for now) on a soaked
  enemy does +60% (`crashMul 1.6`) and spends the soak. It emits a `crash`
  event, which the render answers with a cobalt flash and the audio with a
  crash cue.

## Her AI (`src/sim/partyai.js`)

- Riverbolt prefers a dry target, so soaks spread.
- Undertow goes on the densest pack, with a bonus near the Tank or the
  Waystone.
- Breaker waits for two or more soaked enemies in reach, or one soaked elite,
  champion or boss, or an enemy rushing her.
- Tidepool is passive.
- Torrent wants a line of two or more (a soaked enemy counts twice).
- Whirlpool and Rain Squall go on a pack of three or more, with the same
  Tank and Waystone bonus as Undertow.
- Ripple Step is her panic button: an enemy inside 1.2 u that is after her,
  or anything inside 0.8 u. She vaults away from the nearest.
- Bubble Ward goes up when a member in reach is under 70% or has an enemy
  closing in.
- Crashing Wave wants two soaked enemies in reach, a big soaked one, or
  three close.
- Maelstrom wants four enemies in its draw, or two soaked.

## VFX and sound (slice 3)

- `src/render/vfx/tidefx.js`, hooked into `src/render/vfx/signature.js`:
  twisting Riverbolt and Torrent trails with foam motes and splash crowns
  on the hit, the Torrent's muzzle shock ring, caustic spirals in Undertow
  and Whirlpool, Breaker's and Crashing Wave's curling wave walls, wet
  splash decals, the held refracting bubble and its pop, Rain Squall's
  clouds, streaking rain and ripples, Ripple Step's spray arc, Deluge and
  Dive puddles, a foam ring on every Crash (a spinning star on a Riptide
  stun), and the Maelstrom's funnel, then its column on the burst.
- `?vfxlab=1` has Tidecaller A, B and C reels: they start a Level 1
  campaign with her on seat 3 when she is not in the party.
- `src/audio/tidecues.js` (td_*): her own water voices, replacing the slice 2
  placeholders in `src/audio/cues.js`. Calibrated with
  `node tools/smallfixes2-cuecal.mjs --only tidecues --write`.

## Where it lives

- Data: `src/data/classes.js` (class rows, campaign-only skills, shared
  nodes), `src/data/lineup.js`, `src/sim/skills.js`.
- Sim: `src/sim/allycast.js` (crash, drag), `src/sim/allies.js` (body,
  Dive puddle, drag zones), `src/sim/party.js` (aura status), `src/sim/world.js`
  (`campLineup`).
- Render: `src/render/critters/tidecaller.js` (otter rig), soaked and crash
  in `src/render/skillfx/content.js`, palette and `CLASS_VFX.tidecaller`.
- UI: `src/ui/run/classpick.js` (five cards and the bench view),
  `src/scenes/camp.js` (Lineup chip, camp spot), icons, cards, portraits.

## Checks

- `node tools/tidecaller-kit-probe.mjs` (headless, 65 checks): the kit data
  and gate, every node verdict, each of the seven new skills in a room, each
  node changing what it should, the AI casting all ten actives, and a save
  round trip with her nodes socketed.

- `node tools/tidecaller-probe.mjs` (headless, 41 checks): data, the soaked
  rules, Rill fighting in seat 3, Undertow pulling, Crash +60% and spending
  the soak, the Dive puddle, the shop shelf and a save round trip.
- `node tools/lineup-probe.mjs` 33/33, `node tools/gntM2-goldens.mjs` 9/9.
