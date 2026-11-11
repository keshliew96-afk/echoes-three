---
paths:
  - "src/render/**"
  - "src/ui/**"
  - "src/env/**"
  - "src/scenes/**"
  - "src/data/palette.js"
  - "src/data/vfx.js"
---

# Colour and VFX (CLAUDE.md "Before READY" item 6)

The reserved colours (BUILD_BRIEF §19, §23, as Kesh settled them since; `src/data/palette.js`):

- **Ember `#FF5A36`** marks the enemy's threats the player must read and step out of: telegraph
  shapes, floor warnings, hazards, and the HUD's threat and boss-rage cues. A foe's own fire and spell
  light are Foe Crimson `#B8141F`, Violet or magenta, never Ember. Land heat colours are not Ember.
- **Violet `#B79CF0`** (God-stuff Violet) is corruption and the gods' stuff: bosses, their casts and
  frames, corrupted foes, defeat. A foe may cast in Violet.
- **Bright Heal `#5FE873`** is every heal and nothing else.
- **Heroes** never wear Ember or Violet; the Swordsman's red is Fox Crimson `#E8577A`.

The VFX bar is Diablo IV or Hades (`?vfxlab=1`).
Every VFX build follows Kesh's three templates (magic, knife and sword, sci-fi) and his enhancer
words in `docs/VFX_TEMPLATES.md`; pick the template per effect from `SKILL_TEMPLATE`.
