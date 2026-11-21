p='tools/tc.js'; s=open(p).read()
a='    pa.needsUpdate = true; g.computeVertexNormals(); m.material.uniforms.op.value = 0.95 * (a > du ? 1 - EASE.in(clamp((a - du) / out)) : 1);'
b="    g.setDrawRange(0, a > 0.03 ? 24 * 50 * 6 : Infinity); // the side profiles only while it stands: bent, their fill would span the arc's chord\n    pa.needsUpdate = true; g.computeVertexNormals(); m.material.uniforms.op.value = 0.95 * (a > du ? 1 - EASE.in(clamp((a - du) / out)) : 1);"
assert s.count(a)==1; s=s.replace(a,b); open(p,'w').write(s)
