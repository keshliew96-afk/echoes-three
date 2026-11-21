import json,sys
d=json.load(open(sys.argv[1]))
cols=['dur','footL','footR','hipsYaw','hipsDrop','hipsSway','twist','pawL','headYaw','ear','tail','tipMinY','frozen','snap','lift','spin']
print('%-16s'%'clip',' '.join('%8s'%c for c in cols))
for k in sorted(d):
    print('%-16s'%k,' '.join('%8s'%d[k][c] for c in cols))
