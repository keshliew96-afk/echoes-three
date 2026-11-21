# Mosslight VFX: paused 20 Nov 01:48 UTC (Kesh: pause all VFX except Tide Caller, which is the example)

Kesh's round 3 asks (20 Nov):
- Rootsnare: keep the repaint's root look, but the edge roots intertwine (互相纠缠), never poke out of the ground.
- Wild Thicket burst thorn = THE thorn: replace every thorn-like effect with it.
- Dewfall grass too tall (7/10). Elder Oak roots 7.5/10. Repaints in targets/.

Built, NOT yet shot or judged:
- tools-vfx/round3/reviewPathsFx.js has all of it: woven Rootsnare edge roots (3 braided strands + 13 arching roots, bark
  texture with moss and gold line, roots through the moss bed, coils round held foes); shared makeThorn() (curved bark
  bramble, spines, moss, leaf, gold line, cracked ground) used by Wild Thicket burst, Rootspear row, Rootspear seed burst,
  Elder Oak hold; Wild Thicket warn = tangled thorny root web creeping out + leaves on the rim; Elder Oak = 9 thick 3D roots
  with side roots creeping from the trunk + dappled light; Dewfall blades shorter (scale 0.85, 0.06-0.09, 0.35).
- Note: Rootspear (passed 19 Nov) now uses the new thorn too, per "replace all thorn like vfx"; flag it to Kesh.
- Scratch worktree $S/mr now has the full round 3 file (copied in 20 Nov after the last take). If the container is lost,
  rebuild with tools-vfx/rebuild.sh and copy round3/reviewPathsFx.js + reviewMossFx.js in.

On resume: run k4.sh (thicket 21-33, Rootspear 10-16, Rootsnare 12-33, Elder Oak 16/32), judge each vs its
repaint with a fresh Fable judge, fix, send Kesh. Then the five round 2 repaints when he sends them.
