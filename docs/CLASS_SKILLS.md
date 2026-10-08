# More class skills

Content plan 2, slice 6 (v0.5.240). The Tank, Swordsman and Archer draft pools
grow from 8 to 11 skills each, the Healer gains two skills (17 to 19), and each
class gets two new class nodes (six in all).

## Where the new content appears

Everything here is **campaign only** (the four-act campaign and Endless
Descent, which runs on campaign mode). The legacy single-level run and the
tutorial draft from the old pools, so the nine goldens stay byte-identical.

- `CAMPAIGN_ONLY_SKILLS` / `CAMPAIGN_ONLY_NODES` in `src/data/classes.js` list the
  new ids; `gatedPool(ids, campaign)` filters them out of a pool when the run is
  not a campaign.
- `src/sim/run.js` decides (`poolsGrown`) and hands the gate to the Healer's
  draft (`skillIds` as a function) and to each ally seat (`party.setPoolGate`).
- Draft pools are drawn from id-sorted lists, so adding an id shifts every later
  draw: that is why the gate is a mode switch rather than "from room 4 on".

## Skills

| Class | Skill | Shape | Numbers | What it adds |
|---|---|---|---|---|
| Healer | Lantern Ward (LW) | direct heal | 10 to up to 4 allies in 3.8 u, cd 10 s | Ward 20% for 3 s on each |
| Healer | Dawn Brand (DB) | ground zone | 6/s for 4 s, r 1.2, cd 9 s | Exposed 20% on enemies inside |
| Tank | Earthshatter (ES) | narrow arc | 46 to up to 4, reach 1.8 u, cd 11 s | 0.5 s stun (not bosses) |
| Tank | Rallying Cry (RC) | guard | 10 shield to up to 4 in 3.5 u, cd 12 s | Inspired +20% damage for 3 s |
| Tank | Earthen Grasp (EG) | nova | 12 to up to 6 in 2.3 u, cd 9 s | Pull 0.9 u toward the Tank, 30% slow |
| Swordsman | Moonfang (MF) | dash + arc | 3.2 u untouchable dash, 24 to up to 4, cd 7 s | Exposed 20% for 2 s |
| Swordsman | Blade Dance (BD) | nova | 10 to up to 6 in 1.3 u, cd 6 s | Haste 30% for 2 s on the fox |
| Swordsman | Crimson Edge (CE) | passive field | 9/s to the nearest in 1.5 u | +25% crit chance, no knockback |
| Archer | Hunter's Mark (HM) | projectile | 12, range 6.5 u, cd 6 s | Exposed 30% for 3 s |
| Archer | Barbed Trap (BA) | ground zone | 16/s for 3 s, r 0.75, cd 9 s | 0.7 s stun (not bosses) |
| Archer | Feather Fan (FF) | projectile ×5 | 9 each, range 3.2 u, cd 5 s | Haste 30% for 1.5 s on the hare |

New skill keys in `src/sim/skills.js`: `selfStatus` (a status on the caster
after the cast), `pull` (negative knockback toward the caster) and `grant` (a
second status on each guard recipient). The ally AI rules for each live in
`src/sim/partyai.js`.

## Class nodes

| Class | Node | Rarity | Effect |
|---|---|---|---|
| Tank | Rampart | common | After a cast the Tank is warded 15% for 2 s; on a passive, 10% while it pulses |
| Tank | Crush | rare | ×1.5 power on a stunned or taunted enemy |
| Swordsman | Gale Step | common | After a cast the Swordsman runs 30% faster for 1.5 s; on a passive, 15% while it hits |
| Swordsman | Duel | rare | +30% power while exactly one enemy stands within 2.5 u |
| Archer | Prey | common | The first enemy each cast hits is exposed 25% for 3 s |
| Archer | Longshot | rare | Arrows hit +10% harder per unit flown, up to +50% |

Numbers live in `CLASS_TECH` (`src/data/classes.js`); the hooks are in
`src/sim/partytech.js` and `src/sim/allycast.js`. Verdicts (which skills a node
works on) are in `classVerdict` in `src/sim/nodes.js`. Prey is not called
"Quarry" because the Hunt objective already uses that word.

## Look and sound

- Each skill has its own signature beat in `src/render/vfx/signature.js`
  (the "MORE CLASS SKILLS" block), layered over the class's shape recipe:
  Earthshatter runs a fault of cracks out along the line; Rallying Cry rolls an
  amber ring and lifts embers over each member; Earthen Grasp collapses a ring
  and drags streaks inward; Moonfang draws a silver crescent; Blade Dance spins
  six cuts; Crimson Edge flicks a crimson cut on each pulse; Hunter's Mark
  locks a jade reticle on the target; Barbed Trap opens teeth that snap shut on
  each tick; Feather Fan throws a fan of wind and feathers; Lantern Ward hangs a
  lantern ring over each ward; Dawn Brand burns a sun sigil that flares each
  tick.
- `?vfxlab=1`: Tank C, Swordsman C, Archer C and Healer D reels play the new skills.
- Icons in `src/ui/hud/icons.js`; sounds reuse each class's cues
  (`CLASS_SKILL_CUE` in `src/audio/cues.js`).
- All names and card text in the ten languages.

## Checks

`node tools/class-skills-probe.mjs` (headless, 63 checks): the data, the gate
(legacy vs campaign pools), every skill and node in a live campaign room, and a
mid-fight save round trip. `node tools/gntM2-goldens.mjs` stays 9/9.

Numbers are first guesses, not tuned by play.
