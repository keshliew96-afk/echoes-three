# VFX extras (v0.5.348), draft PR #129

Built as written, render only (goldens 9/9 identical):
- T1: a blade swing of a model-standard rig is traced from its weapon tip (hand and tip registered per class; outer edge the tip's path, pushed out to the sim's reach for short weapons; Catmull-Rom over the frames; two ghosts; held through hitstop). The template's fire arc plays at 55 % under it.
- T6: the glint and the shards fire at the tip on the first strike frame (tip faster than 3.5 u/s).
- D2: the stuck arrow 0.8 u long, thicker shaft and vanes. D3: the frost twinkles 0.09 to 0.16 u.
- The vault's stars: already read since the glare budget (v0.5.341); unchanged.

Shots (Level I room 3, play zoom, 30 fps virtual clock, software GL):
- fight-traced-*.png: the party fight with the traced slashes (Tank, Swordsman, Duskwing); reel/ has consecutive frames 090 to 109 and 2x zooms (u-*.png) of one Swordsman swing.
- fight-classic-*.png: the same fight on ?facet=0 (the procedural arcs as before).
- arrows-097.png: stuck arrows. frost-*.png: the frost twinkles after a Frost Bomb. vault-*.png: the vault open.

Checks: tools/vfx-extras-probe.mjs (in npm test, 42/42), goldens, i18n --check (no new text), vite build clean, CI green.

Caveats: a 30 fps still shows one instant of a 0.36 s trail, so the traced slash reads as a short bright crescent at the weapon; the Tank's and the Duskwing's real tip paths stay close to the body, so they are pushed out to the reach (the Swordsman's sword is real). Four heroes hitting one spot still whites out from the existing contact blooms (not this slice).

Open choices (not built): the rework's untaken alternatives, as before: safe magenta magic (#D84CF0), Archer sci-fi, hero-hue tinted templates, more sci-fi foes, bosses' own magic colours; and a trace-only look (drop the fire arc under the trace).
