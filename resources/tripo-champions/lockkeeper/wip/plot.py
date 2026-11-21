# scatter plots of a model with a 0.1 grid: front (x,y), from its left (z,y), top (x,z). usage: plot.py <glb> <out.png> <kit> [xmin xmax ymin ymax zmin zmax]
import sys; sys.path.insert(0, sys.argv[3])
import numpy as np
from PIL import Image, ImageDraw
from rigkit import Mesh
M = Mesh(sys.argv[1]); V = M.V; tc = M.tc.astype(float); tc = (tc if tc.max() > 1.5 else tc * 255)[:, :3].astype(np.uint8)
b = [float(a) for a in sys.argv[4:10]] if len(sys.argv) > 9 else [V[:, 0].min(), V[:, 0].max(), V[:, 1].min(), V[:, 1].max(), V[:, 2].min(), V[:, 2].max()]
sel = (V[:, 0] >= b[0]) & (V[:, 0] <= b[1]) & (V[:, 1] >= b[2]) & (V[:, 1] <= b[3]) & (V[:, 2] >= b[4]) & (V[:, 2] <= b[5])
S = 1500 / max(b[1] - b[0], b[3] - b[2], b[5] - b[4]) ; pad = 40
def panel(u, v, ulo, uhi, vlo, vhi, order, flip=False):
    w, h = int((uhi - ulo) * S) + 2 * pad, int((vhi - vlo) * S) + 2 * pad; im = Image.new('RGB', (w, h), (235, 235, 235)); d = ImageDraw.Draw(im)
    px = lambda a: pad + ((uhi - a) if flip else (a - ulo)) * S; py = lambda a: h - pad - (a - vlo) * S
    step = 0.1 if (uhi - ulo) > 0.45 else 0.02
    for g in np.arange(np.floor(ulo / step) * step, uhi + 1e-6, step): d.line([(px(g), 0), (px(g), h)], fill=(200, 200, 200)); d.text((px(g) + 2, 2), '%.2f' % g, fill=(90, 90, 90))
    for g in np.arange(np.floor(vlo / step) * step, vhi + 1e-6, step): d.line([(0, py(g)), (w, py(g))], fill=(200, 200, 200)); d.text((2, py(g) - 11), '%.2f' % g, fill=(90, 90, 90))
    o = np.argsort(order)
    for i in o: d.rectangle([px(u[i]) - 1, py(v[i]) - 1, px(u[i]) + 1, py(v[i]) + 1], fill=tuple(int(c) for c in tc[sel][i]))
    return im
x, y, z = V[sel].T
A = panel(x, y, b[0], b[1], b[2], b[3], z); B = panel(z, y, b[4], b[5], b[2], b[3], x); C = panel(x, z, b[0], b[1], b[4], b[5], y)
W = A.width + B.width + C.width; H = max(A.height, B.height, C.height); out = Image.new('RGB', (W, H), (255, 255, 255)); out.paste(A, (0, 0)); out.paste(B, (A.width, 0)); out.paste(C, (A.width + B.width, 0)); out.save(sys.argv[2]); print(out.size, int(sel.sum()))
