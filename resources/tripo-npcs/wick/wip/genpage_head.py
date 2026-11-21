# Builds the Wick's review page from the Gloam Wolf's (same bench, CSS and loop), swapping the text, the
# moves and the effects. usage: python3 genpage.py <out dir>
import sys, json, struct, os
S = '/tmp/claude-0/-home-user/c6e5249c-651a-5d08-9e09-1bd0fe313c84/scratchpad/npcs/wick'
s = open('/mnt/project-files/tripo-bosses/gloamwolf/review/index.html').read()
out = sys.argv[1]
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (s.count(a), a[:70])
    s = s.replace(a, b)
def cut(a, b, new):
    global s
    i = s.index(a); j = s.index(b, i); s = s[:i] + new + s[j:]

au = json.load(open(S + '/wick.audit.json'))
glb = open(S + '/wick.glb', 'rb').read(); jl = struct.unpack('<I', glb[12:16])[0]; gj = json.loads(glb[20:20 + jl])
pr = gj['meshes'][0]['primitives'][0]; ntri = gj['accessors'][pr['indices']]['count'] // 3
mb = os.path.getsize(S + '/wick.glb') / 1e6
U = 1.25
dd = au["death"]["lowest"] * U; lw = min(au["walk"]["lowest"], au["turnL"]["lowest"], au["turnR"]["lowest"]) * U; sw = au["talk"]["lowest"] * U
slide = max(au[k]["slide_mm"] for k in au); pop = max(au[k]["loopPopDeg"] for k in ("idle", "walk", "turnL", "turnR"))
print("pop", pop, "dd", dd, "lw", lw, "sw", sw)
