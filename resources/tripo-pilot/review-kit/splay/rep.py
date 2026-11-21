import json,sys
print('toes turned out, degrees (0 = straight ahead): mean over the clip, [min..max], and while the foot is planted')
for f in sys.argv[1:]:
    m=json.load(open(f)); print('==',f.split('.')[0],' bind L %s R %s'%(m['bind']['L']['toeOut'],m['bind']['R']['toeOut']))
    for c,v in m['clips'].items(): print('   %-10s L %5.1f [%5.1f..%5.1f] planted %5.1f | R %5.1f [%5.1f..%5.1f] planted %5.1f | legs out %4.1f %4.1f'%(c,v['L']['toeOutMean'],v['L']['toeOutMin'],v['L']['toeOutMax'],v['L']['onFloor'],v['R']['toeOutMean'],v['R']['toeOutMin'],v['R']['toeOutMax'],v['R']['onFloor'],v['L']['legOut'],v['R']['legOut']))
