p='/home/user/echoes-three/src/render/critters/tripoTank.js'; s=open(p).read()
def rep(a,b):
    global s
    assert s.count(a)==1, a[:60]
    s=s.replace(a,b)
rep("    C.c_hop = overlay(C.hop, 'c_hop', {});","""    C.c_hop = overlay(C.hop, 'c_hop', {});
    // THROW (Slab Throw, 1.3): the slab swings back across his chest on the left
    // paw and flies out flat, like a thrown disc
    C.throw = author('throw', 0.8, [
      { t: 0, p: {} },
      { t: 0.18, p: { spine: [6, 30, 0], chest: [4, 30, 0], head: [0, -26, 0], _hips: [0, -0.05, 0], upperarmL: [-50, -60, 10], forearmL: [-30, 0, 0], legL: [-10, 0, 0], legR: [8, 0, 0] } },
      { t: 0.3, ease: 'in', p: { spine: [4, -30, 0], chest: [2, -34, 0], head: [0, 26, 0], _hips: [0, -0.03, 0.04], upperarmL: [-80, 60, 30], forearmL: [-4, 0, 0], legL: [14, 0, 0], legR: [-16, 0, 0] } },
      { t: 0.45, p: { spine: [6, -24, 0], chest: [2, -26, 0], head: [0, 20, 0], _hips: [0, -0.04, 0.04], upperarmL: [-70, 50, 30], forearmL: [-6, 0, 0], legL: [12, 0, 0], legR: [-14, 0, 0] } },
      { t: 0.8, p: {} },
    ], null, rest);
    C.c_throw = overlay(C.throw, 'c_throw', {});
    // GRAB AND THROW (Badger Toss, 1.4): both paws down on the foe, it comes up
    // over his head, and he heaves it forward
    C.grab = author('grab', 0.9, [
      { t: 0, p: {} },
      { t: 0.14, p: { hips: [16, 0, 0], spine: [26, 0, 0], chest: [10, 0, 0], head: [-14, 0, 0], _hips: [0, -0.12, 0.05], upperarmL: [-80, 0, 16], upperarmR: [-80, 0, -16], forearmL: [-20, 0, 0], forearmR: [-20, 0, 0], legL: [-24, 0, 8], legR: [-24, 0, -8], footL: [18, 0, 0], footR: [18, 0, 0] } },
      { t: 0.3, ease: 'out', p: { spine: [-14, 0, 0], chest: [-10, 0, 0], head: [-16, 0, 0], _hips: [0, 0.0, -0.03], upperarmL: [-165, 0, 20], upperarmR: [-165, 0, -20], forearmL: [-10, 0, 0], forearmR: [-10, 0, 0], legL: [-6, 0, 6], legR: [-6, 0, -6] } },
      { t: 0.42, ease: 'in', p: { spine: [24, 0, 0], chest: [14, 0, 0], head: [6, 0, 0], _hips: [0, -0.08, 0.06], upperarmL: [-70, 0, 14], upperarmR: [-70, 0, -14], forearmL: [-6, 0, 0], forearmR: [-6, 0, 0], legL: [-24, 0, 6], legR: [16, 0, -6] } },
      { t: 0.56, p: { spine: [18, 0, 0], chest: [10, 0, 0], _hips: [0, -0.07, 0.06], upperarmL: [-50, 0, 14], upperarmR: [-50, 0, -14], legL: [-20, 0, 6], legR: [14, 0, -6] } },
      { t: 0.9, p: {} },
    ], null, rest);
    C.c_grab = overlay(C.grab, 'c_grab', {});
    // SPIN (Counter Spin, 1.4): one full turn on the spot, both arms out
    C.spin = author('spin', 0.6, [
      { t: 0, p: {} },
      { t: 0.08, p: { _hips: [0, -0.05, 0], upperarmL: [0, 0, 50], upperarmR: [0, 0, -60], spine: [6, 0, 0] } },
      { t: 0.45, p: { _hips: [0, -0.05, 0], upperarmL: [0, 0, 50], upperarmR: [0, 0, -60], spine: [6, 0, 0] } },
      { t: 0.6, p: {} },
    ], (t) => ({ hips: [0, -360 * sm(0.06, 0.46, t), 0] }), rest);
    C.c_spin = overlay(C.spin, 'c_spin', {});""")
rep("const ONE_SHOT_WEAPONLESS = new Set(['digDown', 'digUp', 'maul', 'toss', 'bite', 'hop']);","const ONE_SHOT_WEAPONLESS = new Set(['digDown', 'digUp', 'maul', 'toss', 'bite', 'hop', 'throw', 'grab', 'spin']);")
rep("""    } else if (kind === 'shield') {""","""    } else if (kind === 'slabaway') {
      // Slab Throw: the slab is out of his paw until it comes back
      st.away = !!ev.on;
      if (st.weapon) st.weapon.visible = st.shield && !st.away;
    } else if (kind === 'shield') {""")
rep("      if (st.weapon) st.weapon.visible = st.shield;\n    }\n  }","      if (st.weapon) st.weapon.visible = st.shield && !st.away;\n    }\n  }")
open(p,'w').write(s)
print('ok')
