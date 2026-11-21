# Kesh 18 Nov 08:47 UTC: the motion pass. Every skill plays its own cast move (built offline into public/review/casts.json
# by motion/build_casts.mjs from motion/casts.mjs), staff twirls, the Wispfall hold, and small reactions. REVIEW-ONLY.
import sys
root = sys.argv[1]
def patch(path, pairs):
    p = f'{root}/{path}'; s = open(p).read()
    for a, b in pairs:
        if s.count(a) != 1: sys.exit(f'{path}: expected one match for {a[:80]!r}, found {s.count(a)}')
        s = s.replace(a, b)
    open(p, 'w').write(s)

T = 'src/render/critters/tripoHealer.js'
patch(T, [
    ("import { AdditiveBlending, AnimationMixer, Color,", "import { AdditiveBlending, AnimationMixer, Color, Euler,"),
    ("import { PALETTE } from '../../data/palette.js';\n", "import { PALETTE } from '../../data/palette.js';\nimport { loadCasts, twirlMatrix } from './reviewCasts.js'; // REVIEW-ONLY: the motion pass\n"),
    ("const LEAD = 0.1;", "const TW = {}; // staff twirls, by clip (the motion pass)\nconst LEAD = 0.1;"),
    ("    st.gemPart = splitGem(st.staff);\n",
     "    st.gemPart = splitGem(st.staff);\n"
     "    for (const n of ['head', 'earL', 'earR', 'spine']) st['b_' + n] = m.getObjectByName(n);\n"
     "    loadCasts().then((cs) => { // the motion pass: her own move for every skill\n"
     "      for (const [n, c] of Object.entries(cs)) {\n"
     "        st.A[n] = st.mixer.clipAction(c.clip);\n"
     "        if (c.ct != null) CT[n] = c.ct;\n"
     "        if (c.twirl) TW[n] = c.twirl;\n"
     "      }\n"
     "    });\n"),
    ("  function start(name, from = null) {\n    const a = st.A[name];\n    if (!a) return;\n",
     "  function start(name, from = null) {\n    const a = st.A[name];\n    if (!a) return;\n    st.actName = name;\n    if (!name.startsWith('c_bell')) st.chan = null;\n"),
    ("  function cue(kind, ev) {\n    if (!st.model) return;\n",
     "  // The motion pass: Wispfall is held for as long as it is channelled; small reactions to her own skills.\n"
     "  function hold() {\n"
     "    const a = st.A.c_bell_loop;\n"
     "    if (!a) return;\n"
     "    if (st.act && st.act !== a) st.act.stop();\n"
     "    a.reset();\n"
     "    a.setLoop(LoopRepeat, Infinity);\n"
     "    a.play();\n"
     "    st.act = a;\n"
     "    st.actName = 'c_bell_loop';\n"
     "    st.actT = 1;\n"
     "    st.actEnd = Infinity;\n"
     "    st.chan = 'loop';\n"
     "  }\n"
     "  st.react = (name, ev) => {\n"
     "    if (!st.model) return;\n"
     "    if (name === 'review_fall_break' || name === 'review_fall_end') {\n"
     "      if (st.chan && st.actName && st.actName.startsWith('c_bell') && st.actName !== 'c_bell_end') {\n"
     "        start('c_bell_end', name === 'review_fall_break' ? 0.22 : 0);\n"
     "        st.actT = 1;\n"
     "      }\n"
     "      st.chan = null;\n"
     "    } else if (name === 'review_fall_stack') st.bob = 0;\n"
     "    else if (name === 'review_sl_home') { if (!st.act && st.walkW < 0.3) start('c_catch'); else st.perk = 0; }\n"
     "    else if (name === 'review_snare_clench') { if (!st.act && st.walkW < 0.3) start('c_yank'); }\n"
     "    else if (name === 'review_wisp') { if (st.perk == null && !(st.perkWait > 0)) { st.perk = 0; st.perkSide = st.perkSide === 1 ? -1 : 1; st.perkWait = 2.5; } }\n"
     "  };\n"
     "  const E1 = new Euler();\n"
     "  const Q1 = new Quaternion();\n"
     "  const twM = new Matrix4();\n"
     "  const nudge = (b, x, y, z) => { if (b) b.quaternion.multiply(Q1.setFromEuler(E1.set(x, y, z))); };\n"
     "  function extras(dt) { // laid over whatever clip is playing\n"
     "    if (st.perkWait > 0) st.perkWait -= dt;\n"
     "    if (st.perk != null) { // S19 Glade Wisps: a glance and an ear flick at a new wisp\n"
     "      st.perk += dt;\n"
     "      const u = st.perk / 0.5;\n"
     "      if (u >= 1) st.perk = null;\n"
     "      else {\n"
     "        const e = Math.sin(Math.PI * Math.min(1, u * 1.6)) * (1 - u * 0.4), f = Math.exp(-(((u - 0.25) / 0.14) ** 2)), s = st.perkSide || 1;\n"
     "        nudge(st.b_head, -0.12 * e, 0.3 * s * e, 0.08 * s * e);\n"
     "        nudge(s > 0 ? st.b_earL : st.b_earR, -0.5 * f, 0, 0);\n"
     "        nudge(s > 0 ? st.b_earR : st.b_earL, -0.2 * f, 0, 0);\n"
     "      }\n"
     "    }\n"
     "    if (st.bob != null) { // S22 Wispfall: a small dip of the staff for every wisp sent down\n"
     "      st.bob += dt;\n"
     "      const u = st.bob / 0.3;\n"
     "      if (u >= 1) st.bob = null;\n"
     "      else { const e = Math.sin(Math.PI * u) * (1 - u); nudge(st.b_spine, 0.14 * e, 0, 0); nudge(st.b_head, -0.1 * e, 0, 0); nudge(st.b_earL, 0.3 * e, 0, 0); nudge(st.b_earR, 0.3 * e, 0, 0); }\n"
     "    }\n"
     "  }\n\n"
     "  function cue(kind, ev) {\n    if (!st.model) return;\n"),
    ("      start(BY_SKILL[ev.skill] || BY_SHAPE[ev.shape] || 'castPoint');\n",
     "      const own = 'c_' + ev.skill;\n"
     "      start(st.A[own] ? own : BY_SKILL[ev.skill] || BY_SHAPE[ev.shape] || 'castPoint');\n"
     "      if (st.A[own] && ev.skill === 'bell_toll') { st.chan = 'intro'; st.actEnd = Infinity; }\n"),
    ("      const left = st.actEnd - st.act.time;\n",
     "      if (st.chan === 'intro' && st.act.time >= st.act.getClip().duration - 0.02) hold(); // Wispfall: into the held pose\n"
     "      const left = st.actEnd - st.act.time;\n"),
    ("    st.mixer.update(dt);\n", "    st.mixer.update(dt);\n    extras(dt);\n"),
    ("    att.multiplyMatrices(inv, st.hand.matrixWorld).multiply(st.G);\n",
     "    att.multiplyMatrices(inv, st.hand.matrixWorld).multiply(st.G);\n"
     "    if (st.act && TW[st.actName]) att.multiply(twirlMatrix(TW[st.actName], st.act.time, twM)); // a staff twirl in her paw\n"),
])
F = 'src/render/critters/reviewPathsFx.js'
patch(F, [
    ("  // ---- REVIEW-ONLY: Kesh 18 Nov 08:12: the Snapjaw's bite mark and drag ----\n",
     "  // ---- REVIEW-ONLY: the motion pass (Kesh 18 Nov 08:47): her body answers her own skills ----\n"
     "  for (const n of ['review_fall_break', 'review_fall_end', 'review_fall_stack', 'review_sl_home', 'review_snare_clench', 'review_wisp']) bus.on(n, (ev) => { if (typeof window !== 'undefined' && window.__tripo && window.__tripo.react) window.__tripo.react(n, ev); });\n"
     "  // ---- REVIEW-ONLY: Kesh 18 Nov 08:12: the Snapjaw's bite mark and drag ----\n"),
])
print('patched')
