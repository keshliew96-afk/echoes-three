# REVIEW-ONLY hook 3 (round 2): no game contact bloom (white flash haze) on the review fox's hits, except the four
# passed skills' sources, which were judged with it
R='/tmp/claude-0/-home-user/6008576e-146e-5150-a355-ac6627ae0194/scratchpad/wt/'
p=R+'src/render/vfx/sig/party.js'; s=open(p).read()
old="    SF.classImpact(vfxClassStyle(cls), ev.x, ev.z, ev.dirX || 0, ev.dirZ || 0, { crit: !!ev.crit && !afQ,"
assert s.count(old)==1
s=s.replace(old,"    if (!afQ || /^af_(finisher|spike|spike_splash|triple|lunge|lunge_drill|lunge_star|thousand)$/.test(ev.source)) SF.classImpact(vfxClassStyle(cls), ev.x, ev.z, ev.dirX || 0, ev.dirZ || 0, { crit: !!ev.crit && !afQ,")
open(p,'w').write(s); print('ok')
