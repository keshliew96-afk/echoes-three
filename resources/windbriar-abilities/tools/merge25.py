# merge25.py <style> <file> <ids...>: drop the old FORMS blocks for those ids and put the new file's code before the combos
import re, sys
p = '/home/user/wb/page/defs.js'; s = open(p).read(); sty, f, ids = sys.argv[1], sys.argv[2], sys.argv[3:]
def block(name):
    m = re.search(r'^' + re.escape(name) + r' = ', s, re.M)
    if not m: return None
    i = m.start(); j = i
    while True:
        j = s.index('\n', j) + 1
        if j >= len(s) or re.match(r'(GA|DE|VO|DEFS)\.\w+(\.\w+)? = |// -|const |export |FORMS|function ', s[j:j + 40]): break
    return i, j
for k in ids:
    for nm in (f'{sty}.{k}', f'{sty}.{k}.fx', f'{sty}.{k}.seq', f'{sty}.{k}.root'):
        while True:
            b = block(nm)
            if not b: break
            s = s[:b[0]] + s[b[1]:]
new = open(f).read()
mk = '// ---------------------------------------------------------------- the twelve combos'
assert s.count(mk) == 1
s = s.replace(mk, new.rstrip('\n') + '\n\n' + mk)
open(p, 'w').write(s)
print('ok', sty, len(ids))
