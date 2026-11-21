import sys, numpy as np; sys.path.insert(0, sys.argv[0].rsplit('/', 3)[0] + '/kit')
from glbanim import Rigged
R = Rigged(sys.argv[1]); F = R.F; nb = len(R.names)
M0 = np.tile(np.eye(4), (nb, 1, 1)); M0[:, :3, 3] = R.bind; V0 = R.skin(M0)
W = np.nan_to_num(R.W); dom = R.J[np.arange(len(R.V)), W.argmax(1)]
for clip, t in [('idle', 4.2), ('dive', 1.28), ('death', 1.93), ('heavyHit', 0.25)]:
    T = R.clips[clip]['t']; f = int(np.argmin(abs(T - t))); V = R.skin(R.world(clip, f))
    for a, b in ((0, 1), (0, 2), (1, 2)):
        pass
    E = np.concatenate([F[:, [0, 1]], F[:, [0, 2]], F[:, [1, 2]]])
    l0 = np.linalg.norm(V0[E[:, 0]] - V0[E[:, 1]], axis=1); l1 = np.linalg.norm(V[E[:, 0]] - V[E[:, 1]], axis=1)
    r = l1 / (l0 + 1e-9); o = np.argsort(-r)[:6]
    print(clip, t)
    for i in o: print('   ratio %.1f bind %.4f now %.4f  at %s  bones %s/%s' % (r[i], l0[i], l1[i], np.round(V0[E[i, 0]], 3), R.names[dom[E[i, 0]]], R.names[dom[E[i, 1]]]))
    big = (l1 - l0) > 0.01; print('   edges grown by more than 0.01:', big.sum(), ' max growth %.4f' % (l1 - l0).max())
    i = int(np.argmax(l1 - l0)); print('   most grown at', np.round(V0[E[i, 0]], 3), np.round(V0[E[i, 1]], 3), R.names[dom[E[i, 0]]], R.names[dom[E[i, 1]]], '%.4f -> %.4f' % (l0[i], l1[i]))
