import re, json
from changes import C
COL = {'B':2,'J':3,'S':4,'U':5}
def rd(f): return open(f,encoding='utf-8').read()
def wr(f,s): open(f,'w',encoding='utf-8').write(s)

def patch_table(text, start_marker, key):   # key: 'short' or 'full'
    i = text.index(start_marker); j = text.index('\n\n', i) if '\n\n' in text[i:] else len(text)
    lines = text[i:j].split('\n'); out=[]
    for ln in lines:
        m = re.match(r'\| F(\d+) \|', ln)
        if m:
            f = int(m.group(1)); cells = ln.strip().strip('|').split(' | ')
            cells = [c.strip() for c in ln.strip()[1:-1].split('|')]
            for col,ci in COL.items():
                d = C.get((f,col))
                if not d: continue
                cell = cells[ci]
                if col=='B':
                    if key in d: cells[ci] = d[key]
                else:
                    mm = re.match(r'\*\*(.+?)\*\*: (.*)', cell)
                    name, body = mm.group(1), mm.group(2)
                    if 'name' in d: name = d['name']
                    if key in d: body = d[key]
                    cells[ci] = f'**{name}**: {body}'
            ln = '| ' + ' | '.join(cells) + ' |'
        out.append(ln)
    return text[:i] + '\n'.join(out) + text[j:]

kit = rd('TIDECALLER_KIT.md')
kit = patch_table(kit, '| # | Skill (cooldown) | Base |', 'short')
wr('TIDECALLER_KIT.md', kit)

notes = rd('TIDECALLER_NOTES.md')
s10 = notes.index('## 10. Every skill and form in full')
head, tail = notes[:s10], notes[s10:]
tail = patch_table(tail, '| # | Skill (cooldown) | Base |', 'full')
# section 11 rows
i = tail.index('| # | Form | On a boss |'); j = tail.index('\n\n', i)
rows = tail[i:j].split('\n'); out=[]; f=None; k=0
order = ['B','J','S','U']
for ln in rows:
    cells = [c.strip() for c in ln.strip()[1:-1].split('|')]
    m = re.match(r'F(\d+)$', cells[0])
    if m: f=int(m.group(1)); k=0
    elif f is not None and cells[0]=='' : k+=1
    else:
        out.append(ln); continue
    d = C.get((f, order[k]))
    if d:
        if 'name' in d and k>0: cells[1] = d['name'].split(' ',1)[1]
        for key,ci in (('boss',2),('beat',3),('sound',4),('ai',5)):
            if key in d: cells[ci] = d[key]
    out.append('| ' + ' | '.join(cells) + ' |')
tail = tail[:i] + '\n'.join(out) + tail[j:]
# motions: bullets N54..N77
def patch_motion(text):
    for f in range(1,25):
        n = 53+f
        m = re.search(r'- \*\*N%d\. (.+?)\*\* ' % n, text)
        a = m.start(); b = text.index('\n- **N', a+5) if '\n- **N' in text[a+5:] else len(text)
        b2 = text.find('\n\n', a); b = min(b, b2) if b2!=-1 else b
        bullet = ' '.join(x.strip() for x in text[a:b].split('\n'))
        mm = re.match(r'(- \*\*N\d+\. .+?\*\* )(.*?) Flood: (.*?) Tsunami: (.*?) Bubble: (.*)$', bullet)
        assert mm, bullet[:80]
        hd, base, jet, surge, bub = mm.groups()
        d = C.get((f,'B'))
        if d and d.get('motion_base'): base = d['motion_base']
        seg = {'J':jet,'S':surge,'U':bub}
        for col in 'JSU':
            d = C.get((f,col))
            if d and 'motion' in d: seg[col] = d['motion']
        bullet = f"{hd}{base} Flood: {seg['J']} Tsunami: {seg['S']} Bubble: {seg['U']}"
        text = text[:a] + bullet + text[b:]
    return text
head = patch_motion(head)
wr('TIDECALLER_NOTES.md', head + tail)

# ideas for the sameness audit
aud = rd('TIDECALLER_SAMENESS_AUDIT.md')
ideas = {}
for col, title in (('J','## 2. Flood'),('S','## 3. Tsunami'),('U','## 4. Bubble')):
    i = aud.index(title); j = aud.index('\n\n', aud.index('| # | Skill', i))
    for ln in aud[i:j].split('\n'):
        m = re.match(r'\| F(\d+) \| (.+?) \| (.+?) \|$', ln)
        if m: ideas[(int(m.group(1)),col)] = m.group(3)
for (f,col),d in C.items():
    if 'idea' in d: ideas[(f,col)] = d['idea']
    elif 'name' in d and col!='B' and (f,col) in ideas:
        old = ideas[(f,col)]; ideas[(f,col)] = d['name'].split(' ',1)[1] + ': ' + old.split(': ',1)[-1]
json.dump({f"{f}{c}":v for (f,c),v in ideas.items()}, open('ideas.json','w'), ensure_ascii=False, indent=0)
print(len(ideas))
