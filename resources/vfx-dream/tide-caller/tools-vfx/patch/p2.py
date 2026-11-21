f='/home/user/tc/tools/tc.js'; s=open(f).read()
def rep(old,new,cnt=1):
    global s
    assert s.count(old)==cnt, (old[:90], s.count(old))
    s=s.replace(old,new)
# stream: new shader for outer; core = two thin foam strands twisting round the axis (helix); drops peel off along it
rep("const m = A.add(new THREE.Mesh(g, fxMat(col, F_FLOW, { col2: o.col2 || C.foam }))); m.frustumCulled = false; m.visible = false; return { m, g, P, op }; };\n  const outer = mk(o.col || C.cobalt, 0.85), core = o.core === false ? null : mk(o.coreCol || C.foam, 0.5);",
    "const m = A.add(new THREE.Mesh(g, fxMat(col, F_FLOW2, { col2: o.col2 || C.foam }))); m.frustumCulled = false; m.visible = false; return { m, g, P, op }; };\n  const outer = mk(o.col || C.cobalt, 0.85), core = o.core === false ? null : mk(o.coreCol || C.sky, 0.5), core2 = o.core === false && !o.helix ? null : mk(o.coreCol || C.sky, 0.5);")
rep("const draw = (L, w, t) => {", "const draw = (L, w, t, hx) => {")
rep("p.addScaledVector(side, wob); const ww",
    "p.addScaledVector(side, wob); if (hx) { const ph = v * len * 7 - t * 9 + hx[0]; p.addScaledVector(side, Math.cos(ph) * hx[1] * (0.4 + 0.6 * v)).addScaledVector(nrm, Math.sin(ph) * hx[1] * (0.4 + 0.6 * v)); } const ww")
rep("draw(outer, o.w || 0.16, t); outer.m.material.uniforms.op.value = 0.85 * k; if (core) { draw(core, (o.w || 0.16) * 0.38, t); core.m.material.uniforms.op.value = 0.6 * k; } });",
    "const W0 = o.w || 0.16; draw(outer, W0, t); outer.m.material.uniforms.op.value = 0.9 * k; if (core) core.m.visible = on; if (core2) core2.m.visible = on; if (core) { draw(core, W0 * 0.3, t, [0, W0 * 0.28]); core.m.material.uniforms.op.value = 0.75 * k; } if (core2) { draw(core2, W0 * 0.26, t, [3.14, W0 * 0.28]); core2.m.material.uniforms.op.value = 0.7 * k; } });\n  // drops peel off along it\n  if (o.peel !== false && (o.t1 - o.t0) > 0.2) { const R2 = rng(Math.floor(o.t0 * 977 + 5)); for (let ts = o.t0 + head; ts < o.t1; ts += 0.07) { const vv = 0.15 + 0.8 * R2(); FX.drops(A, { t: ts, at: ((v0) => (tt) => from(tt).lerp(to(tt), v0))(vv), n: 1, sp: 0.35, up: 0.5, size: 0.03, dur: 0.35, seed: Math.floor(ts * 1000) }); } }")
rep("A.fx((t) => { const on = t >= o.t0 && t <= o.t1 + tail; outer.m.visible = on; if (core) core.m.visible = on; if (!on) return;",
    "A.fx((t) => { const on = t >= o.t0 && t <= o.t1 + tail; outer.m.visible = on; if (core) core.m.visible = on; if (core2) core2.m.visible = on; if (!on) return;")
# landing spray: more and a soft white flash at the contact
rep("FX.drops(A, { t: ts, at: (tt) => to(tt), n: 3, sp: 0.8, up: 0.8, size: 0.035, dur: 0.4, seed: i * 13 + 7 }); } }",
    "FX.drops(A, { t: ts, at: (tt) => to(tt), n: 5, sp: 0.9, up: 0.9, size: 0.035, dur: 0.4, seed: i * 13 + 7, dir: o.sprayDir }); if (i % 2 === 0) FX.spark(A, { t: ts, at: (tt) => to(tt), r: (o.w || 0.16) * 2.2, col: C.foam, op: 0.35, dur: 0.16 }); } }")
# jet: helix strands too, a touch wider, keep no peel (short)
rep("sag: 0, wob: 0.01, w: o.w || 0.12, spray: false }, o));", "sag: 0, wob: 0.01, w: o.w || 0.14, spray: false, peel: false }, o));")
# rope: a twisted rope of water
rep("FX.rope = (A, o) => FX.stream(A, Object.assign({ w: 0.06, core: false, wob: 0.04, spray: false, head: 0.15, tail: 0.15 }, o));",
    "FX.rope = (A, o) => FX.stream(A, Object.assign({ w: 0.08, core: false, helix: true, wob: 0.04, spray: false, head: 0.15, tail: 0.15 }, o));")
# trail: comet tail
rep("const m = A.add(new THREE.Mesh(g, fxMat(o.col || C.sky, F_RIB))); m.frustumCulled = false; m.visible = false;\n  const src = typeof o.of === 'function' ? o.of : (t) => A.at(o.of, t), wid = o.w || 0.12, len = o.len || 0.14;",
    "const m = A.add(new THREE.Mesh(g, fxMat(o.col || C.sky, F_TAIL, { col2: C.foam }))); m.frustumCulled = false; m.visible = false;\n  const src = typeof o.of === 'function' ? o.of : (t) => A.at(o.of, t), wid = o.w || 0.12, len = o.len || 0.14;")
# strip + wake: floor water look, ln = length in u
rep("const m = A.add(new THREE.Mesh(g, fxMat(o.col || C.cobalt, F_FLOW, { col2: o.foam ? C.foam : '#7FA6EA' }))); m.visible = false; m.renderOrder = -1;\n  A.fx((t) => { const k = live(t, o.t0, o.t1, o.fin || 0.15, o.fout || 0.4);",
    "const m = A.add(new THREE.Mesh(g, fxMat(o.col || C.cobalt, F_WET, { col2: C.foam }))); m.visible = false; m.renderOrder = -1;\n  A.fx((t) => { const k = live(t, o.t0, o.t1, o.fin || 0.15, o.fout || 0.4);")
rep("m.scale.set(o.w || 1, 1, Math.max(0.01, len));\n    m.material.uniforms.op.value = (o.op || 0.5) * k;",
    "m.scale.set(o.w || 1, 1, Math.max(0.01, len)); m.material.uniforms.ln.value = Math.max(0.2, len / (o.w || 1));\n    m.material.uniforms.op.value = Math.min(0.95, (o.op || 0.5) * 1.6) * k;")
rep("const m = A.add(new THREE.Mesh(g, fxMat(o.col || C.cobalt, F_FLOW, { col2: o.foam ? C.foam : '#7FA6EA' }))); m.frustumCulled = false; m.visible = false; m.renderOrder = -1;\n  const src = typeof o.of === 'function' ? o.of : (t) => A.at(o.of, t), life = o.life || 2;",
    "const m = A.add(new THREE.Mesh(g, fxMat(o.col || C.cobalt, F_WET, { col2: C.foam }))); m.frustumCulled = false; m.visible = false; m.renderOrder = -1;\n  const src = typeof o.of === 'function' ? o.of : (t) => A.at(o.of, t), life = o.life || 2;")
rep("g.attributes.position.needsUpdate = true; m.material.uniforms.op.value = (o.op || 0.4) * (t > o.t1 ? 1 - (t - o.t1) / life : 1); m.material.uniforms.u0.value = 0; m.material.uniforms.u1.value = 1; m.material.uniforms.tm.value = t * (o.flow || 0); });",
    "g.attributes.position.needsUpdate = true; let L = 0; for (let i = 1; i < N; i++) L += Math.hypot(P[i * 6] - P[i * 6 - 6], P[i * 6 + 2] - P[i * 6 - 4]); m.material.uniforms.ln.value = Math.max(0.2, L / (o.w || 0.6)); m.material.uniforms.op.value = Math.min(0.95, (o.op || 0.4) * 1.6) * (t > o.t1 ? 1 - (t - o.t1) / life : 1); m.material.uniforms.u0.value = 0; m.material.uniforms.u1.value = 1; m.material.uniforms.tm.value = t; });")
# pool
rep("const m = A.add(new THREE.Mesh(ringGeo, fxMat(o.col || C.cobalt, F_POOL))); m.visible = false; m.renderOrder = -1;",
    "const m = A.add(new THREE.Mesh(ringGeo, fxMat(o.col || C.cobalt, F_POOL2))); m.visible = false; m.renderOrder = -1;")
rep("m.material.uniforms.op.value = (o.op || 0.55) * k; m.material.uniforms.u1.value = o.whirl || 0; m.material.uniforms.tm.value = t; });",
    "m.material.uniforms.op.value = Math.min(0.95, (o.op || 0.55) * (o.whirl ? 1.45 : 1.5)) * k; m.material.uniforms.u1.value = o.whirl || 0; m.material.uniforms.tm.value = t; });")
# splash: spiked crown, glossy puddle that spreads and dries, foam ring at its foot, more drops
rep("const m = A.add(new THREE.Mesh(crownGeo, fxMat(o.crash ? C.foam : C.cobalt, F_COL, { col2: C.foam }))); m.visible = false;",
    "const m = A.add(new THREE.Mesh(crownGeo, fxMat(C.cobalt, F_CROWN, { col2: C.foam }))); m.visible = false; const sd = (o.t * 7.13) % 9;")
rep("m.scale.set(r, hh, r); m.material.uniforms.op.value = (o.op || (o.crash ? 0.7 : 0.55)) * (1 - EASE.in(u)); m.material.uniforms.u0.value = -2; m.material.uniforms.tm.value = t; });",
    "m.scale.set(r, hh * (o.crash ? 1.25 : 1), r); m.material.uniforms.op.value = (o.op || (o.crash ? 0.9 : 0.75)) * (1 - EASE.in(u)); m.material.uniforms.u0.value = sd; m.material.uniforms.tm.value = t; });\n  FX.pool(A, { t0: o.t, t1: o.t + (o.crash ? 0.75 : 0.5), at: (tt) => { const p = P3(A, o.at, o.t); return [p.x, 0, p.z]; }, r: (o.r || 0.5) * (o.crash ? 1.45 : 1.15), op: o.crash ? 0.55 : 0.4, fin: 0.08, fout: 0.35 });")
rep("FX.drops(A, { t: o.t, at: (tt) => { const p = P3(A, o.at, o.t); return [p.x, 0.1, p.z]; }, n: o.n || 8, sp: (o.r || 0.5) * 2.2, up: (o.h || 0.6) * 3, size: 0.045, dur: 0.6, dir: o.dir });",
    "FX.drops(A, { t: o.t, at: (tt) => { const p = P3(A, o.at, o.t); return [p.x, 0.1, p.z]; }, n: (o.n || 8) * (o.crash ? 2 : 1.5), sp: (o.r || 0.5) * 2.4, up: (o.h || 0.6) * 3.4, size: 0.04, dur: 0.6, dir: o.dir });")
open(f,'w').write(s); print('ok')
