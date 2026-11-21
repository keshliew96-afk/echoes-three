# hooks reviewMossFx.js (the dream-loop VFX) into the review build; turns off the draft looks it replaces
import sys; W=sys.argv[1]
def sub(p,a,b):
    s=open(W+'/'+p).read()
    if b in s: return
    assert s.count(a)==1,(p,a[:60]); open(W+'/'+p,'w').write(s.replace(a,b))
sub('src/scenes/arena.js',"import { createReviewPathsFx } from '../render/critters/reviewPathsFx.js'; // REVIEW-ONLY\n","import { createReviewPathsFx } from '../render/critters/reviewPathsFx.js'; // REVIEW-ONLY\nimport { createReviewMossFx } from '../render/critters/reviewMossFx.js'; // REVIEW-ONLY: dream-loop VFX\n")
sub('src/scenes/arena.js',"    if (reviewPaths) reviewPaths.update(dt); // REVIEW-ONLY\n","    if (reviewPaths) reviewPaths.update(dt); // REVIEW-ONLY\n    if (reviewMoss) reviewMoss.update(dt); // REVIEW-ONLY\n")
s=open(W+'/src/scenes/arena.js').read()
a="createReviewPathsFx({ bus, root, world, tip: (out) => healerRig.pointWorld('tip', out) }) : null; // REVIEW-ONLY\n"
if 'const reviewMoss =' not in s:
    assert s.count(a)==1; s=s.replace(a,a+"  const reviewMoss = /[?&]tripo=1\\b/.test(location.search) ? createReviewMossFx({ bus, root, world }) : null; // REVIEW-ONLY\n"); open(W+'/src/scenes/arena.js','w').write(s)
# Dew Wave: the white rolling band is replaced by the gold wave front
sub('src/render/critters/reviewPathsFx.js',"      o.band.material.opacity = 0.7 * (o.t < 0.32 ? 1 : out);","      o.band.material.opacity = 0; // dream loop: gold front in reviewMossFx.js")
print('hooked')
# ---- pass 2 (judge round 1): the dream layer owns these looks; the draft parts that doubled them are off
sub('src/scenes/arena.js',"createReviewMossFx({ bus, root, world }) : null;","createReviewMossFx({ bus, root, world, tip: (out) => healerRig.pointWorld('tip', out) }) : null;")
P='src/render/critters/reviewPathsFx.js'
sub(P,"      o.bed.material.opacity = 0.22 * Math.min(1, o.t * 8) * out;\n      o.edgeL.material.opacity = o.edgeR.material.opacity = 0.75 * Math.min(1, o.t * 8) * out;",
      "      o.bed.material.opacity = 0; o.edgeL.material.opacity = o.edgeR.material.opacity = 0; // dream loop: reviewMossFx.js draws the lane")
sub(P,"    const bed = flat(new PlaneGeometry(ev.width, ev.len), WATER, 0);\n    bed.position.y = 0.03;","    const bed = flat(new PlaneGeometry(ev.width, ev.len), PALETTE.brightHeal, 0); // dream loop: green, not blue\n    bed.position.y = 0.03;")
sub(P,"      o.bed.material.opacity = 0.2 * Math.min(1, o.t * 4) * out * (0.85 + 0.15 * Math.sin(o.t * 5));","      o.bed.material.opacity = 0.1 * Math.min(1, o.t * 4) * out * (0.85 + 0.15 * Math.sin(o.t * 5));")
sub(P,"          o.bed.material.opacity = Math.max(0, 0.28 - o.burst * 0.5);","          o.bed.material.opacity = 0; // dream loop: the moss row replaces it")
sub(P,"      const sp = new Mesh(new ConeGeometry(0.11 + (i % 3) * 0.03, 0.6 + (i % 4) * 0.12, 5), mat(i % 2 ? WOOD : WOOD_D)); // kit v1.4 R20: wooden roots with bark",
      "      const sp = new Mesh(new ConeGeometry(0.11 + (i % 3) * 0.03, 0.6 + (i % 4) * 0.12, 5), mat(i % 2 ? '#6A4528' : '#5A3A22')); // kit v1.4 R20: wooden roots with bark (dream loop: warmer)\n      { const tf = new Mesh(new ConeGeometry(0.15, 0.08, 6), mat('#4F6B2A')); tf.position.y = -0.24; sp.add(tf); } // a moss tuft at its foot")
# Wispfall: the draft dive heads and landing puff are replaced by the comets and starbursts
sub(P,"  bus.on('review_fall_dive', (ev) => {\n    const head","  bus.on('review_fall_dive', (ev) => {\n    if (!ev.nectar) return; // dream loop: reviewMossFx.js draws Wispfall's comets\n    const head")
sub(P,"    burst(ev.x, 0.2, ev.z, WHITE_GOLD, 7, 0.1);\n    ringPart(ev.x, ev.z, ev.r, WHITE_GOLD, 0.35, 0.2, 0.75);","    // dream loop: reviewMossFx.js draws the landing")
# Swiftleaf: no floor rings or floor leaf at the meeting; the old sphere leaves hide under the new ones
sub(P,"    ringPart(ev.x, ev.z, 0.7, PALETTE.brightHeal, 0.4, 0.6, 0.8);\n    burst(ev.x, 0.7, ev.z, PALETTE.brightHeal, 8, 0.1);","    // dream loop: no floor rings; reviewMossFx.js draws the meeting")
sub(P,"    ringPart(ev.x, ev.z, 1.5, DMG, 0.35, 0.1, 0.5); // the pinwheel cuts within 1.5 u","    // dream loop: the 1.5 u cut ring is off (Kesh's repaint has no floor rings)")
sub(P,"o.floor.fill.material.opacity = 0.14 * k; o.floor.rib.material.opacity = 0.4 * k;","o.floor.fill.material.opacity = 0; o.floor.rib.material.opacity = 0;")
sub(P,"        l.g.position.set(f.x, f.y, f.z);\n        const flying","        l.g.position.set(f.x, f.y, f.z);\n        l.m.visible = false; l.glow.visible = false; // dream loop: reviewMossFx.js draws the leaves\n        const flying")
sub(P,"          if (l.trail > 0.03) {","          if (l.trail > 0.03 && false) { // dream loop: ribbons in reviewMossFx.js")
# the shared magic impact stays off for hits the dream layer draws itself
sub('src/render/vfx/templates.js',"    if (tp.heal) return;\n","    if (tp.heal) return;\n    if (/[?&]tripo=1\\b/.test(location.search) && /^(pale_lance|bell_toll)$|rootspear/.test(ev.source || '')) return; // REVIEW-ONLY dream loop\n")
print('pass2 hooks')
