# swaps the v28 grey grid for Stonehide's tile floor + training dummies (as on page v30-v40)
import sys; W=sys.argv[1]
p=W+'/src/scenes/arena.js'; s=open(p).read()
a=s.index('  const flatRig = reviewFlat ? (() => {'); b=s.index('  })() : null;\n',a)+len('  })() : null;\n')
s=s[:a]+"  const flatTile = reviewFlat ? createReviewFlatStage({ stage, getActive: () => active }) : null; // REVIEW-ONLY: tile floor\n  if (flatTile) window.__reviewDummy = flatTile.dress; // REVIEW-ONLY\n  window.__reviewCam = stage.camera; // REVIEW-ONLY\n  const flatRig = null;\n"+s[b:]
s=s.replace("import { renderHold } from '../render/hold.js';\n","import { renderHold } from '../render/hold.js';\nimport { createReviewFlatStage } from '../render/critters/reviewFlatStage.js'; // REVIEW-ONLY\n",1)
s=s.replace("    if (flatRig) { // REVIEW-ONLY","    if (flatTile) flatTile.update(); // REVIEW-ONLY\n    if (flatRig) { // REVIEW-ONLY",1)
open(p,'w').write(s)
p=W+'/src/render/enemies/index.js'; s=open(p).read()
s=s.replace("        rigs.set(e.id, r);","        if (window.__reviewDummy) window.__reviewDummy(r, e); // REVIEW-ONLY\n        rigs.set(e.id, r);",1); open(p,'w').write(s)
