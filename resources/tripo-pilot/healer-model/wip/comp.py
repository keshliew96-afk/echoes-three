import trimesh, numpy as np
m=trimesh.load('model.glb',force='mesh',process=False)
print(m.vertices.shape,m.faces.shape,m.bounds)
# weld by position for connectivity
mm=trimesh.Trimesh(m.vertices,m.faces,process=False)
mm.merge_vertices(merge_tex=True,merge_norm=True)
comps=trimesh.graph.connected_components(mm.face_adjacency,nodes=np.arange(len(mm.faces)))
print('components',len(comps))
for c in sorted(comps,key=len,reverse=True)[:15]:
    v=mm.vertices[np.unique(mm.faces[c])]
    print(len(c),v.min(0).round(3),v.max(0).round(3))
