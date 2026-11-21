import json,sys
J={"01-stream":["B",3.1],"02-tsunami":["B",6.35],"03-ringwave":["F9",0.88],"04-jet":["F2",1.0],"05-bolt":["F1",0.8],"06-splash":["F2",1.2],"07-bubble":["F18",1.4],"08-rain":["F19",1.8],"09-whirlpool":["F12",1.9],"10-wetpath":["D",1.5],"11-geyser":["F20",1.62],"12-wall":["F13",1.5],"13-dome":["F24",2.0],"14-rope":["F3",1.05],"15-soaked":["F1",1.95]}
sel=sys.argv[1].split(',') if len(sys.argv)>1 else list(J)
json.dump([{"name":k,"id":J[k][0],"t":[J[k][1]]} for k in J if any(k.startswith(x) for x in sel)],open('/tmp/claude-0/jl.json','w'))
