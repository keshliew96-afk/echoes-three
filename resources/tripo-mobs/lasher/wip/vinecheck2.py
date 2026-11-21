import sys
src = open(sys.argv[1]).read(); src = src[:src.index("# ---- bones")]
sys.argv = [sys.argv[1], sys.argv[2], 'rig', sys.argv[3], sys.argv[4]]
exec(compile(src, 'rig', 'exec'))
# vertices sharing a triangle with a vine vertex but not in the vine
F = M.F; inv = vine[F]; mixed = inv.any(1) & ~inv.all(1); out = np.unique(F[mixed][~inv[mixed]])
P = V[out]; print('border verts', len(out))
from collections import Counter
for i in out[np.argsort(-dv[out])][:30]: print(V[i].round(3), 'dv %.3f th %.3f rad %.2f' % (dv[i], th[i], rad[i]), tuple(tc[i]))
