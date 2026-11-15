# NPC review pages (Tripo models)

Started 2026-11-15 in the thread "Rig and animate Tripo heroes, mobs and NPCs", after every mob with a model was done.
Same bench, kit and pipeline as the mobs (/mnt/project-files/tripo-mobs/MOB_REVIEW_STANDARD.md, mob-kit/), with these changes:

- NPCs never walk, fight, get hurt, spawn or die. The page shows only Idle under Move and the NPC's own actions under
  Action; the Going row is hidden. (The bench still carries silent walk/turn/hurt/spawn/death slots it needs.)
- Moves come from the game's NPC rig: camp NPCs from src/render/npcs/<name>.js (idle schedules, talk envelope eased at
  8/s from src/render/npcs/index.js); event NPCs from src/render/interactables/encounters.js (idle, then the "taken" beat).
- The game rolls idle beats at random; the page fixes them in one loop and says so.
- Painted eyes: a blink squashes the eye on a bone that points up. Say it on the page.
- The hero stand-in waits where a player stands to talk (about 1.6 u).
- Budget: 15,000 triangles, the hero budget (NPC tier set 2026-11-15; the six passed NPCs are 3,745 to 14,923).

## Pages
- Wick V1 (2026-11-15): https://claude.ai/artifact/H6QL2PaoSdg9XYnF8rrk5m. Idle and Talk; stands on the floor (game perches it on the woodpile).
- Bramble V1 (2026-11-15): https://claude.ai/artifact/XiTE9A3XkKPrWe7uHZhZSj. 10 bones (hips carry the shell and shop; neck slides out; jaw; eyes squash for blinks; lantern and two herb bunches sway). Idle 31.4 s loop from peddler.js (breath, neck out and in, four peeks, eight blinks), Talk 6.3 s (jaw 11 rad/s, nod 6). Hero stand-in at 1.9 u.
- Quill V1 (2026-11-15): https://claude.ai/artifact/9VYZTuiwbtvt18RoZNt9EV. 19 bones; a body bone under the hips carries the squash so the limb legs are not squashed; legs plant for the hop. Idle 20 s from chronicler.js (snapping tilts, tail flicks, three hops), Talk 6.3 s (beak 16 rad/s, nod 10). Unit 0.55 (the game's size). NOTE for later pages: the page tail hardcodes the unit as `META=window.MODEL_META, U=...`; set it to the NPC's unit, and size the floor blob to match.
- Sedge V1 (2026-11-15): https://claude.ai/artifact/RNYJ2mprDHvUX8ZamjQ6QE. 7 bones (trunk; the staff turns about its foot with the right hand riding it; the lantern hangs true). Idle 5.7 s sway from propPilgrim, The gift 2.5 s (bow 0.35 rad over 1.1 s from the waist, 14 Hearth Amber embers from the floor on the lantern side). An event NPC: its action button is the event beat, not Talk. A contact cue at t=0 never fires on the page; put it at 0.05.
- First Bell V1 (2026-11-15): https://claude.ai/artifact/CwpBCuZEWeGy6z82FofYEg. Rigid like the game (hips carries all; head plus two spare ear bones because the kit packs four weights a point and breaks under five bones). Idle 27 s float and bob from propSpirit, see-through skin via a depth prepass in _fx.js; The trade 2.5 s (rise 0.6 u, spin 9 rad, fade to 25% over 0.9 s, 20 pale embers).
- Corrupted Altar V1 (2026-11-15): https://claude.ai/artifact/4Qn5Aq2eSRj7CnvBq6JhKm. cut.py frees the crystal (kit Editor.split); stone static on hips, crystal bone at its middle floats at 1.35 u, turns 0.9 rad/s, bob 0.1 u, from propAltar. The curse 2.5 s: shrink to 40% and glow -70% over 0.5 s, 22 violet embers plus 12 sparks. Open choice offered: keep the crystal seated (Kesh's veins run into its foot).

## Passed (2026-11-15 07:23 UTC)
Kesh marked all six NPCs passed (msg cmsg_01T9kVc7qNub7xZ7DH6oTE5y4uRNVcXaR2R6pXc56kMdHo): Wick, Bramble, Quill, Sedge, the First Bell, the Corrupted Altar. Open choices stay as built (the altar crystal floats). No more model rounds.
