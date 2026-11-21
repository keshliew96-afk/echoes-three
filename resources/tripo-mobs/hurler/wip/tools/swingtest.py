# swingtest.py <cut.glb> <sack.npy> <out.glb> <angle> <roll>: rotate the sack about the shoulder pivot to look at the seam and caps
import sys, numpy as np, trimesh
m = trimesh.load(sys.argv[1], force='mesh', process=False); V = np.array(m.vertices); k = np.load(sys.argv[2]); a = float(sys.argv[4]); r = float(sys.argv[5])
P = np.array([-0.19, 0.8, -0.02])
Rx = np.array([[1, 0, 0], [0, np.cos(a), -np.sin(a)], [0, np.sin(a), np.cos(a)]]); Rz = np.array([[np.cos(r), -np.sin(r), 0], [np.sin(r), np.cos(r), 0], [0, 0, 1]])
V[k] = (V[k] - P) @ (Rz @ Rx).T + P
m.vertices = V; m.export(sys.argv[3])
