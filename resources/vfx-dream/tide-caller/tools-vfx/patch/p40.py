p='tools/tc.js'; s=open(p).read()
a='const e = EASE.out(clamp(k / 0.85)), R = rr * (0.35 + 1.45 * e),'
b='const e = sm(clamp(k / 0.85)), R = rr * (0.22 + 1.2 * e),'
assert a in s; s=s.replace(a,b); open(p,'w').write(s)
