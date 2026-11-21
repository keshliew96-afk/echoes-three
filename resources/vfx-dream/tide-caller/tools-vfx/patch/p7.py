f='/home/user/tc/tools/tc.js'; s=open(f).read()
def rep(old,new,cnt=1):
    global s
    assert s.count(old)==cnt, (old[:90], s.count(old))
    s=s.replace(old,new)
rep("  const sh = blob(0.36 * s / 0.78);\n  return { g, face, tilt, cm, sh, s, h: 1.3 * s,",
    "  const sh = blob(0.36 * s / 0.78);\n  // soaked look: a puddle at its foot and drips running off it (shown while soaked)\n  const pud = new THREE.Mesh(ringGeo, fxMat(C.cobalt, F_POOL2)); pud.visible = false; pud.renderOrder = -1;\n  const drips = []; for (let k = 0; k < 6; k++) { const d = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex, color: k % 2 ? C.sky : C.foam, transparent: true, depthWrite: false, opacity: 0 })); d.visible = false; drips.push(d); }\n  return { g, face, tilt, cm, sh, s, pud, drips, h: 1.3 * s,")
rep("const m = makeDummy(o); this.grp.add(m.g); this.grp.add(m.sh);", "const m = makeDummy(o); this.grp.add(m.g); this.grp.add(m.sh); this.grp.add(m.pud); m.drips.forEach((d) => this.grp.add(d));")
rep("dm.m.cm.color.copy(dm.m.base).lerp(SOAKTINT, 0.55 * wet);",
    "dm.m.cm.color.copy(dm.m.base).lerp(SOAKTINT, 0.7 * wet); dm.m.cm.roughness = 0.95 - 0.6 * wet;\n      { const on = wet > 0 && dm.m.g.visible !== false && p.y < 0.05; const pu = dm.m.pud; pu.visible = on; if (on) { pu.position.set(p.x, 0.007, p.z); pu.scale.setScalar(0.36 * dm.m.s / 0.82 * (0.6 + 0.4 * Math.min(1, (t - sk.t0) / 0.4))); pu.material.uniforms.op.value = 0.5 * wet; pu.material.uniforms.u0.value = 0.5; pu.material.uniforms.tm.value = t; }\n        dm.m.drips.forEach((d, k) => { const ph = ((t * 0.9 + k * 0.37) % 1); const an = k * 1.05 + 0.4, rr = 0.16 * dm.m.s / 0.82; d.visible = wet > 0; if (!d.visible) return; const hy = (k % 2 ? 0.55 : 0.95) * dm.m.s / 0.82; const y = ph < 0.6 ? hy - ph * 0.25 : hy - 0.15 - (ph - 0.6) * (ph - 0.6) * 18; d.position.set(p.x + Math.cos(an) * rr * (ph < 0.6 ? 1 : 1.15), p.y + Math.max(0.02, y), p.z + Math.sin(an) * rr * (ph < 0.6 ? 1 : 1.15)); d.scale.set(0.035, ph < 0.6 ? 0.06 : 0.045, 1); d.material.opacity = 0.85 * wet * (ph > 0.95 ? 0 : 1); }); }")
rep("const SOAKTINT = new THREE.Color('#5E87C2');", "const SOAKTINT = new THREE.Color('#3F6FD0');")
open(f,'w').write(s); print('ok')
