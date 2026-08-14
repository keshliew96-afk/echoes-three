# Reference Quality Bar — "Echoes Web" (Three.js)

This is the binding rubric for all art critics. It is distilled from four commercial
reference screenshots (Pass the Fear / Lost Castle 2 camp scene, Hades boss arena,
Magicraft swamp arena). Critics judge CAPTURED FRAMES of the running game against
this bar — never the code.

## What the references actually do (observed, per screenshot)

### Reference A — Night camp scene (Lost Castle 2 / Pass the Fear style)
- 3/4 top-down night forest camp. Deep indigo/teal ambient; warm amber firelight pools.
- Chibi characters (~40-50% head-to-body), thick dark outlines, saturated colors that
  pop against the muted environment.
- PROP DENSITY: cabin with tiled roof + weathervane, market stall with cloth canopy,
  forge with chimney + lit windows, glowing rune monolith as centerpiece, anvils,
  weapon racks with GLOWING item displays, crates, barrels, fences, hanging lanterns,
  torches with glow halos, campfire with seated characters, arcane portal gazebo,
  caravan cart, grass tufts everywhere, dirt path with hue variation.
- Every light emitter has a soft glow sprite/halo. Interactables have colored rim glow.
- Fireflies / floating motes. Vignette at frame edges. Contact shadow under every entity.
- Color story: 3 families — indigo night, amber fire, violet arcane — never more.

### Reference B — Hades boss arena
- Painted isometric arena; enormous value range (deep shadow to blown-out fire).
- Boss HP bars top-center; boon icon stack left edge; HP/resource bottom-left;
  floating damage numbers on hit.
- VFX are MULTI-LAYER: white-hot core + orange glow + black smoke chunks + debris
  + lingering trail. A single hit reads as an event.
- Floor: large patterned tiles, gold inlay lines, blood/scorch decals accumulate.
- Props ring the arena edge (vases, pillars, statues); center stays readable.
- Directional key light (warm) vs cool fill; characters cast soft shadows.

### Reference C — Magicraft swamp arena
- Top-down island arena in dark water. Arena edge is DECORATED: stone slabs, rocks,
  flowers, lily pads breaking the silhouette.
- Saturated green island vs desaturated dark surround = attention funnel.
- Projectiles: white core + colored glow + trail. AoE clouds: layered translucent
  blobs + particles + damage number ticking inside.
- Enemy deaths leave red splat decals that persist. Coins glitter. Chests/barrels/
  torches/gravestones dot the space without blocking movement lanes.
- Minimal HUD (version string bottom corner) — world carries the information.

### Reference D — Pass the Fear boss fight (ON DISK: docs/reference/pass-the-fear.png — critics MUST view it)
- Boss bullet-hell on a painted stone bridge. Dozens of simultaneous fireball
  projectiles, EACH rendered as white-hot core + orange glow + flame trail.
- Lingering ground fire patches where shots land; large AoE telegraph = dark
  scorched core + bright glowing red rim ring.
- Floor: hand-painted brick with cracks, moss, scorch decals — zero flat regions.
- Cool violet void/water surround (left edge, swirl strokes) vs warm fire action —
  the same warm-vs-cool funnel as the other references.
- Ornate boss HP bar top-center with name plate + boss icon; location label
  top-left; status text ("Freeze") in blue over the boss; damage numbers cluster.
- HUD: hexagonal HP gem + shield number bottom-left, currency counters top-right,
  weapon/skill cards bottom-right with ammo counts.
- Player is a tiny chibi knight with a subtle light halo + drop shadow; torch
  towers with glowing lanterns, banners, chains, spike barricades dress the bridge.

## The 10 binding checks (critic scores each 0-2; pass needs ≥16/20 AND no zero)

1. **No dead ground**: <20% of the frame is a flat, single-color surface. Floors have
   tile variation, decals, tufts, hue noise.
2. **Layered light**: cool ambient + ≥2 warm/colored light pools visible; every
   emitter (fire, portal, rune, projectile) has a glow halo.
3. **Silhouette read**: every character/enemy identifiable by silhouette alone at
   50% zoom; dark outline or strong rim separation present.
4. **Prop density**: camp ≥12 distinct prop types; combat arena ≥8, concentrated at
   edges, ≥60% of floor kept navigable (per the Echoes art bible).
5. **VFX layering**: any attack effect = core + glow + particles (≥3 layers);
   kills leave persistent decals; damage numbers pop on every hit.
6. **Color discipline**: ≤3 hue families + reserved accents per the Echoes art bible
   (danger = red-orange ONLY, heal = green ONLY, god-stuff = violet-white ONLY,
   party warm vs world cool).
7. **Post stack**: bloom on emissives, vignette, subtle color grading visible in frame.
8. **Grounding**: contact/blob shadow under every entity, including projectiles.
9. **UI polish**: HUD present and styled (portraits, HP, cooldown radials, boon/skill
   icons) — clean geometric frames, not browser-default text.
10. **Motion juice** (video/sequential frames): hit flash, knockback, hitstop,
    screenshake, squash-stretch on spawn/death. Static-frame proxy: mid-action
    capture shows anticipation/impact poses, not statues.

## Responsiveness bar (gameplay critic)

- 60 fps target on desktop (measured, not guessed); no >100ms hitches during waves.
- Input→action latency: movement immediate, dash fires on keydown, no queuing lag.
- Hits register with: flash on victim + damage number + knockback + sound-slot.
- Enemy attacks are telegraphed (ground decal, red-orange) before landing.
- Dodge has i-frames; camera follows with smoothing but never loses the player.
- Full loop playable start→death/victory→restart without console errors.

## Failure protocol

A critic that scores <16/20, any single 0, or finds the responsiveness bar broken
MUST reject with concrete, pixel-anchored notes ("the arena floor right of the
player is one flat #3a5f3a green — needs tile variation and decals"), which go back
to the builder. Vague praise or vague rejection are both failures of the critic.
