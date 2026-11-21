p='tools/tc.js'; s=open(p).read()
a='if (um) { um.visible = false; um.renderOrder = 3; } // the head draws over the jet it caps'
b='if (um) { um.visible = false; um.renderOrder = 3; um.material.depthWrite = true; } // the head is solid water: it draws over the jet it caps, its top hides its own underside'
assert s.count(a)==1; s=s.replace(a,b); open(p,'w').write(s)
