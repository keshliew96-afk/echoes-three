p='tools/tc.js'; s=open(p).read()
old="const umbGeo = new THREE.LatheGeometry([[0.0, 1.1], [0.25, 1.1], [0.55, 1.08], [0.85, 1.04], [1.2, 0.92], [1.5, 0.74], [1.72, 0.52], [1.86, 0.3]]"
# a higher, longer arc: rises past the jet top, then falls all the way to the floor ring
new="const umbGeo = new THREE.LatheGeometry([[0.0, 1.05], [0.2, 1.17], [0.45, 1.25], [0.75, 1.27], [1.05, 1.22], [1.35, 1.1], [1.65, 0.9], [1.92, 0.64], [2.15, 0.36], [2.32, 0.1], [2.38, 0.0]]"
assert old in s; s=s.replace(old,new)
old2="float brk=1.0-smoothstep(0.55,0.95,v+0.25*(fine-0.5));"
new2="float brk=1.0-smoothstep(0.8,1.05,v+0.2*(fine-0.5));"
assert old2 in s; s=s.replace(old2,new2)
old3="float head=1.0-smoothstep(0.08,0.28,v+0.15*(fine-0.5));"
new3="float head=1.0-smoothstep(0.06,0.22,v+0.12*(fine-0.5));"
assert old3 in s; s=s.replace(old3,new3)
open(p,'w').write(s)
