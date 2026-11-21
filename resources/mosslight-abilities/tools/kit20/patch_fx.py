import sys, os
p = sys.argv[1]; s = open(p, encoding='utf-8').read()
if 'kit 2.0 looks' in s: sys.exit('already patched')
blk = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'k20_fx.js'), encoding='utf-8').read()
a = '  function update(dt) {\n    sapThrottle'
assert s.count(a) == 1; s = s.replace(a, blk + a)
b = '    k8Update(dt); // kit 1.8\n'
assert s.count(b) == 1; s = s.replace(b, b + '    k20Update(dt); // kit 2.0\n')
open(p, 'w', encoding='utf-8').write(s); print('fx patched')
