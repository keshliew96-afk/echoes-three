# REVIEW-ONLY hook for the Ashfang VFX dream loop (on top of ashfang-abilities/tools/hooks.py)
# the game's own blade hit template (fireball + gold wave ring) is off for the review fox's hits (af_*): no element looks
R='/tmp/claude-0/-home-user/6008576e-146e-5150-a355-ac6627ae0194/scratchpad/wt/'
p=R+'src/render/vfx/templates.js'; s=open(p).read()
old="    if (victimParty) return; // enemy hits keep their own Ember grammar\n"
assert s.count(old)==1
s=s.replace(old, old+"    if (globalThis.__reviewAfQuietHits && /^af_/.test(ev.source || '')) return; // REVIEW-ONLY\n")
open(p,'w').write(s); print('ok')
