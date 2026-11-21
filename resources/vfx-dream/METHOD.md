# VFX dream loop: how to use repaints and image references

Kesh passed the Tide Caller trial on 20 Nov 2026, 06:19 UTC. Every other hero's VFX now follows this method.
The trial's own files are in `tide-caller/` (NOTES.md, PROMPTS.md, targets/, refs/, pass8/).
The trial was done on the review page only, because of the feature freeze.

## 1. Before any repaint: one function per element

- Name the hero's elements first, such as stream, tsunami, bubble, crack or slash. List the cards that use each one.
  Tide Caller has 15 elements, and they cover all 119 cards.
- Each element is drawn by one effect function, such as `FX.stream` in the page engine. If two cards draw the same
  element in different ways, merge them into one function first. Then a new look is one change, and it reaches every card.
- Send Kesh the list of elements before shooting. He may rename an element or drop one. For example, he removed the
  wall and made every wall a waterfall from the sky.

## 2. The repaint (look)

- Use **one shot per element, not one per skill.** Take it at the play camera (FOV 45, 2x crop, 1920x1080) with captions
  hidden. Pick the frame where the element is large and clear, and not a frame frozen by hit-stop.
- Send **each shot in its own message, with its own full prompt** ready to paste. Kesh repaints it in ChatGPT image, in a
  fresh chat. Save his repaint under `targets/` with the same number as the shot.
- **Fixed prompt text:** keep EXACTLY the same camera, framing, floor, characters, poses, numbers and UI. Do not add or
  remove any effect. Only make the named effect look better. Add the palette hex codes, the colours to avoid, "dim enough
  to stay readable", and "a real in-game screenshot, not concept art". Template: `tide-caller/PROMPTS.md`.
- **The effect sentence decides the shape, so name the shape exactly.**
  - The geyser came back as a solid pillar of water (水柱). He wanted a fountain (喷泉). The redo said "a FOUNTAIN, not a
    solid pillar" and listed its parts (jet, foam head, umbrella of falling strands, ring of foam).
  - Never describe anything else in the frame with words that could turn into an effect. On Stonehide, calling a foe's
    telegraph an "orange band" gave the repaint a gold arc.
- **When building, copy only the LOOK:** the material, foam, colour layers, droplets and edges. Restyle the effect we
  already have. Never add an effect that appears only in the painting. The look lasts as long as the skill does.

## 3. Image references from Pinterest and other sites (shape and motion)

- The cloud session cannot open Pinterest or Vimeo, so Kesh saves the images and attaches them. Save each one as
  `refs/<element>-ref<N>.png`. In the reply, say what you take from it.
- **A ref gives the shape and the stages, never the colour.** Keep our palette.
- **A stage strip is a motion spec.** When he sends a sequence of stages, such as how a wave grows or how a fountain head
  opens, build those stages in that order and in that number. Show them back as a strip at matching times. On 20 Nov
  I built my own curl wave instead of his strip, and he said I had ignored his ideas. Build his strip as drawn first, and
  offer any change of your own separately.
- **Several refs of one thing:** list what they have in common, then build those parts. The three waterspout refs
  shared a twisting funnel, a band of foam spiralling up it, and a spray skirt at the base.
- Use a ref when a repaint gets the shape wrong, or when the element does not exist yet (waterfall, waterspout). Use a
  repaint for how the element should look at our camera.

## 4. Showing it back and judging

- Make one sheet per element, with the repaint or ref on the left and the page on the right at the same moment. For a
  moving effect, use a strip of three or four frames.
- **An element pass is not a card pass.** When an element passes, its look is done. Each card's motion can still get notes
  afterwards. In the trial, most of the work after the passes was card notes (Floodgate, Three Crests, Sky Fall, Breaker).
- **Kesh's eye decides.** A fresh Fable judge scored the Tide Caller stills at about 6 to 7, and Kesh passed the same
  elements a few minutes later. A judge working from stills underrates moving water. Use one judge round to catch clear
  misses, then send the sheets to Kesh. Do not loop the judge past a plateau.
- When a note changes a shared function, say which cards it reaches. When he asks for a rule, build it into the function
  so every card gets it. For example, a stream or jet that hits nothing loses force and falls to the floor.

## 5. Rolling it out to the other heroes

The steps for each hero:
1. List the elements and their functions, and merge any duplicates.
2. Send Kesh the list.
3. Send one shot and its prompt per element.
4. Build the looks from his repaints.
5. Send the sheets.
6. When he sends refs, build them as drawn.
7. Build his card notes.

These threads are paused and can resume with this method:
- Stonehide: crack, rock, dust, iron.
- Ashfang: slash arcs.
- Mosslight: thorns. His thicket thorn is the look for every thorn.
- Windbriar: 10 elements listed, none sent.
