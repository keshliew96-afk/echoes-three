import numpy as np, trimesh
def export(M, F, path, V=None, UV=None):
    V = M.V if V is None else V; UV = M.UV if UV is None else UV
    mat = trimesh.visual.material.PBRMaterial(baseColorTexture=M.m.visual.material.baseColorTexture, metallicFactor=0, roughnessFactor=0.9, doubleSided=False)
    m = trimesh.Trimesh(V, F, process=False); m.visual = trimesh.visual.TextureVisuals(uv=UV, material=mat)
    m.export(path)
