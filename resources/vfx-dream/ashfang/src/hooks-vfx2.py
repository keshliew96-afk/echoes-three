# REVIEW-ONLY hook 2 (round 2): the game's pale-gold crit flipbook (lightning) and crit bloom are off for the
# review fox's hits (af_*); the review fx draws its crit in the passed burst look (pink needle star)
R='/tmp/claude-0/-home-user/6008576e-146e-5150-a355-ac6627ae0194/scratchpad/wt/'
p=R+'src/render/vfx/sig/party.js'; s=open(p).read()
old="""    SF.classImpact(vfxClassStyle(cls), ev.x, ev.z, ev.dirX || 0, ev.dirZ || 0, { crit: !!ev.crit, big: ev.delivery !== 'basic', party: isPartySeat(eventSeat(ev)) });
    if (ev.crit) flipbook.play("""
assert s.count(old)==1
new="""    const afQ = globalThis.__reviewAfQuietHits && /^af_/.test(ev.source || ''); // REVIEW-ONLY
    if (afQ && ev.crit) globalThis.__reviewAfCrit?.(ev.x, ev.z); // REVIEW-ONLY
    SF.classImpact(vfxClassStyle(cls), ev.x, ev.z, ev.dirX || 0, ev.dirZ || 0, { crit: !!ev.crit && !afQ, big: ev.delivery !== 'basic', party: isPartySeat(eventSeat(ev)) });
    if (ev.crit && !afQ) flipbook.play("""
s=s.replace(old,new); open(p,'w').write(s); print('ok')
