import json,sys
m=json.load(open(sys.argv[1]))
TH={'bladeFloor':0.03,'bladeTail':0.11,'bladeHead':0.12,'bladeLegs':0.10,'bladeFreeArm':0.07,'bladeTorso':0.11,'freePawTorso':0.12,'freeElbowTorso':0.12,'swordPawTorso':0.11,'freePawHead':0.12,'freePawFloor':0.03,'tailFloor':0.05,'tailLegs':0.07,'feetFloor':-0.004,'feetApartMin':0.09}
n=0
for c,v in m.items():
    f=[f"{k} {v[k][0]}@{v[k][1]}" for k in TH if v[k][0]<TH[k]]
    if f: print(c.ljust(10),'; '.join(f)); n+=len(f)
print('flags',n)
