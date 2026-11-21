p='tools/tc.js'; s=open(p).read()
R=[
# tide in the body: bands of water rolling up the wall, bending with the noise
("    c=mix(c,mix(c,col,0.5),u1*0.6); c=mix(c,col2,foam); gl_FragColor=vec4(c, clamp(op*0.7*(1.0+0.3*foam+0.3*foot),0.0,1.0)); }`;",
 "    float bn=fbm(vec2((vP.x+vP.z)*5.0,y*3.0-tm*0.4)); float band=top? 0.0 : smoothstep(0.82,0.97,sin(y*16.0-tm*3.0+bn*5.0+(vP.x+vP.z)*2.0))*(0.35+0.65*smoothstep(0.4,0.65,bn))*smoothstep(0.1,0.3,y);\n    c=mix(c,vec3(0.55,0.8,1.0),band*0.55); foam=max(foam,band*smoothstep(0.55,0.7,n)*0.7);\n    c=mix(c,mix(c,col,0.5),u1*0.6); c=mix(c,col2,foam); gl_FragColor=vec4(c, clamp(op*0.7*(1.0+0.3*foam+0.3*foot+0.25*band),0.0,1.0)); }`;"),
# tsunami on top: the wave's curling crest rides the wall's top edge
("  const lip = A.add(new THREE.Mesh(new THREE.BoxGeometry(1, 0.06, 1), new THREE.MeshBasicMaterial({ color: C.foam, transparent: true, opacity: 0.7, depthWrite: false }))); lip.visible = false;",
 "  const lip = A.add(new THREE.Mesh(new THREE.BoxGeometry(1, 0.06, 1), new THREE.MeshBasicMaterial({ color: C.foam, transparent: true, opacity: 0.7, depthWrite: false }))); lip.visible = false;\n  const cr = o.crest === false ? null : A.add(new THREE.Mesh(waveGeo, new THREE.ShaderMaterial({ uniforms: { op: { value: 0 }, tm: { value: 0 } }, vertexShader: VS_WAVE, fragmentShader: F_WAVE, transparent: true, depthWrite: false, side: THREE.DoubleSide }))); if (cr) cr.visible = false;"),
("lip.scale.set(o.w || 2, 1, (o.th || 0.18) * 1.4); lip.material.opacity = 0.0; });",
 "lip.scale.set(o.w || 2, 1, (o.th || 0.18) * 1.4); lip.material.opacity = 0.0;\n    if (cr) { const dp = 1.0 * (o.cd || 1), ch = 0.55 * up * sink; cr.visible = on; cr.position.copy(m.position); cr.quaternion.copy(m.quaternion); cr.translateY(H * sink - 0.04); cr.translateZ(dp * 0.68 * (o.cdir || 1)); if ((o.cdir || 1) < 0) cr.rotateY(Math.PI); cr.scale.set((o.w || 2) * 0.98, Math.max(0.01, ch), dp); cr.material.uniforms.op.value = m.material.uniforms.op.value; cr.material.uniforms.tm.value = t; } });"),
]
for a,b in R:
    assert a in s, a[:60]; s=s.replace(a,b)
open(p,'w').write(s)
