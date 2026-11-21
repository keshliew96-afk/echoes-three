# Briar Knight V3: the left shield removed (Kesh, 14 Nov)
From briarknight-noshield.glb (V2's mesh, sword-arm shield already gone), run from this folder's parent with the kit dir:
1. planeL.py <kit> <glb>          fits the left shield's back and front planes -> wip/planeL.npy
2. cutL.py <kit> <glb> -0.03 0.15 0.06 0.16 0.145   groove-cuts the shield away from the arm -> wip/AL.npy
3. forearms.py <kit> <glb> 0.70 0.67 0.5   picks the right arm below its pauldron (to mirror) and the left arm (to drop) -> wip/R.npy, wip/L.npy
4. shieldless.py <kit> <glb> briarknight-shieldless.glb   drops the left arm and the shield, adds the mirrored right arm
   (the sword-grip stub through the fist removed and both holes capped). The new arm is its own piece tucked inside the left pauldron.
5. kit/thick.py shieldless.glb wip/thick3.npy; rig.py shieldless.glb <rigdir> wip/thick3.npy <kit>   (no plane arg any more; mask channel 3 is all zero)
6. buildc.mjs <rigdir> wip/clips.mjs out.glb; modeljs.py; genpage.py (thornmother index, out, 11,301, 1.9, audit, under text)
