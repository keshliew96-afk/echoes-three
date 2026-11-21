# Reads a rigged GLB written by build.mjs (one skinned mesh, clips sampled at 60 frames a second) and skins any frame of any clip.
import json, struct
import numpy as np

CT = {5120: 'i1', 5121: 'u1', 5122: '<i2', 5123: '<u2', 5125: '<u4', 5126: '<f4'}; NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}

def qmat(q):
    x, y, z, w = q[..., 0], q[..., 1], q[..., 2], q[..., 3]; R = np.empty(q.shape[:-1] + (3, 3))
    R[..., 0, 0] = 1 - 2 * (y * y + z * z); R[..., 0, 1] = 2 * (x * y - z * w); R[..., 0, 2] = 2 * (x * z + y * w)
    R[..., 1, 0] = 2 * (x * y + z * w); R[..., 1, 1] = 1 - 2 * (x * x + z * z); R[..., 1, 2] = 2 * (y * z - x * w)
    R[..., 2, 0] = 2 * (x * z - y * w); R[..., 2, 1] = 2 * (y * z + x * w); R[..., 2, 2] = 1 - 2 * (x * x + y * y)
    return R

class Rigged:
    def __init__(self, path):
        b = open(path, 'rb').read(); jl = struct.unpack('<I', b[12:16])[0]; self.g = g = json.loads(b[20:20 + jl]); self.bin = b[20 + jl + 8:]
        skin = g['skins'][0]; self.joints = skin['joints']; nodes = g['nodes']; self.names = [nodes[j]['name'] for j in self.joints]; self.ix = {n: i for i, n in enumerate(self.names)}
        par = {}
        for i, nd in enumerate(nodes):
            for c in nd.get('children', []): par[c] = i
        self.parent = [self.joints.index(par[j]) if par.get(j) in self.joints else -1 for j in self.joints]
        self.t0 = np.array([nodes[j].get('translation', [0, 0, 0]) for j in self.joints], float)
        ibm = self.acc(skin['inverseBindMatrices']).reshape(-1, 4, 4).transpose(0, 2, 1); self.ibm = ibm; self.bind = -ibm[:, :3, 3]
        pr = [p for m in g['meshes'] for p in m['primitives'] if 'JOINTS_0' in p['attributes']][0]; a = pr['attributes']
        self.V = self.acc(a['POSITION']).astype(float); self.N = self.acc(a['NORMAL']).astype(float); self.F = self.acc(pr['indices']).reshape(-1, 3).astype(int)
        self.J = self.acc(a['JOINTS_0']).astype(int); self.W = self.acc(a['WEIGHTS_0']).astype(float); self.W /= self.W.sum(1, keepdims=True)
        self.dom = self.J[np.arange(len(self.V)), self.W.argmax(1)]
        self.clips = {}
        for an in g['animations']:
            c = {'rot': {}, 'pos': {}, 'scl': {}}
            for ch in an['channels']:
                s = an['samplers'][ch['sampler']]; nd = ch['target']['node']
                if nd not in self.joints: continue
                k = self.joints.index(nd); c['t'] = self.acc(s['input']).astype(float)
                c[{'rotation': 'rot', 'translation': 'pos', 'scale': 'scl'}[ch['target']['path']]][k] = self.acc(s['output']).astype(float)
            self.clips[an['name']] = c
    def acc(self, i):
        a = self.g['accessors'][i]; bv = self.g['bufferViews'][a['bufferView']]; n = NC[a['type']]; o = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
        dt = np.dtype(CT[a['componentType']]); st = bv.get('byteStride', 0)
        if st and st != dt.itemsize * n:  # interleaved vertex data
            raw = np.frombuffer(self.bin, dtype='u1', count=(a['count'] - 1) * st + dt.itemsize * n, offset=o)
            idx = (np.arange(a['count'])[:, None] * st + np.arange(dt.itemsize * n)[None, :]).ravel()
            arr = np.frombuffer(raw[idx].tobytes(), dtype=dt)
        else: arr = np.frombuffer(self.bin, dtype=dt, count=a['count'] * n, offset=o)
        return arr.reshape(-1, n) if n > 1 else arr
    def nframes(self, clip): return len(self.clips[clip]['t'])
    def local(self, clip, f):
        """each joint's local rotation matrix, translation and scale at frame f"""
        c = self.clips[clip]; nb = len(self.names); q = np.tile([0, 0, 0, 1.0], (nb, 1)); t = self.t0.copy(); s = np.ones((nb, 3))
        for k, a in c['rot'].items(): q[k] = a[f]
        for k, a in c['pos'].items(): t[k] = a[f]
        for k, a in c['scl'].items(): s[k] = a[f]
        return q, t, s
    def world(self, clip, f, root_motion=False, root_scale=False):
        q, t, s = self.local(clip, f); nb = len(self.names); R = qmat(q); M = np.zeros((nb, 4, 4)); M[:, 3, 3] = 1
        for k in range(nb):
            L = np.eye(4); sc = s[k]; tt = t[k]
            if self.parent[k] < 0:
                if not root_motion: tt = self.t0[k]
                if not root_scale: sc = np.ones(3)
            L[:3, :3] = R[k] * sc; L[:3, 3] = tt
            M[k] = L if self.parent[k] < 0 else M[self.parent[k]] @ L
        return M
    def skin(self, M, normals=False):
        S = M @ self.ibm; out = np.zeros((len(self.V), 3)); nn = np.zeros((len(self.V), 3)) if normals else None
        for k in range(4):
            w = self.W[:, k:k + 1]; A = S[self.J[:, k]]
            out += w * (np.einsum('nij,nj->ni', A[:, :3, :3], self.V) + A[:, :3, 3])
            if normals: nn += w * np.einsum('nij,nj->ni', A[:, :3, :3], self.N)
        if normals: nn /= np.linalg.norm(nn, axis=1, keepdims=True) + 1e-12; return out, nn
        return out
