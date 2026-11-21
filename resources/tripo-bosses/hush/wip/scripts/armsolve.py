# solve the left arm channels (Lap, Lar, Lay, Le, Ley, Lwp, fL) for a wanted upper-arm, forearm and finger direction
import numpy as np, json, sys
from scipy.optimize import minimize
from scipy.spatial.transform import Rotation as R
sk = json.load(open(sys.argv[1])); pos = {n: np.array(p) for n, p in zip(sk['names'], sk['pos'])}; ends = {k: np.array(v) for k, v in sk['ends'].items()}
up = pos['elL'] - pos['shL']; fo = pos['wrL'] - pos['elL']; fi = ends['fiL'] - pos['fiL']
def q(p, y, r): return R.from_rotvec([0, y, 0]) * R.from_rotvec([-p, 0, 0]) * R.from_rotvec([0, 0, r])
def fk(c):
    ap, ar, ay, e, ey, wp, fl = c
    Qs = q(ap, ay, ar); Qe = Qs * q(e, ey, 0); Qw = Qe * q(wp, 0, 0); Qf = Qw * q(fl, 0, 0)
    return Qs.apply(up), Qe.apply(fo), Qf.apply(fi)
n = lambda v: np.array(v) / np.linalg.norm(v)
def solve(wu, wf, wfi, x0):
    wu, wf, wfi = n(wu), n(wf), n(wfi)
    def cost(c):
        u, f, g = fk(c); return (1 - n(u) @ wu) * 2 + (1 - n(f) @ wf) * 3 + (1 - n(g) @ wfi) + 0.002 * np.sum(np.array(c) ** 2)
    r = minimize(cost, x0, method='Nelder-Mead', options={'maxiter': 20000, 'xatol': 1e-4, 'fatol': 1e-8}); c = r.x
    u, f, g = fk(c); print(' '.join('%s: %.2f' % (k, v) for k, v in zip(['Lap', 'Lar', 'Lay', 'Le', 'Ley', 'Lwp', 'fL'], c)), '| up', n(u).round(2), 'fore', n(f).round(2), 'finger', n(g).round(2))
print('rest up', n(up).round(2), 'fore', n(fo).round(2), 'finger', n(fi).round(2))
print('point:'); solve([0.25, -0.35, 0.9], [-0.05, -0.2, 1], [-0.05, -0.25, 1], [0.6, 0, 0, -1.2, 0.3, 0, 0])
print('spread:'); solve([1, 0.15, 0.05], [1, 0.3, 0.2], [0.6, 0.8, 0.1], [0.1, 0.8, 0, -1, 0, 0, 0])
print('finger high:'); solve([0.45, 0.85, 0.25], [0.1, 1, 0.15], [0, 1, 0], [0.2, 0.3, 0, -1.5, 0, 0, 0])
print('lane thrust:'); solve([0.35, -0.2, 0.92], [-0.1, -0.05, 1], [-0.1, -0.05, 1], [0.8, 0, 0, -1.1, 0.3, 0, 0])
print('hang limp:'); solve([0.35, -0.9, 0.25], [0.05, -0.85, 0.5], [0.05, -0.9, 0.4], [0.3, 0, 0, -0.3, 0, 0, 0])
