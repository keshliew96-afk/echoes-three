#!/usr/bin/env python3
"""Replace the ability page's old skills (lines 3 to 21) and nodes (22, 23) with Mosslight's druid kit
(MOSSLIGHT_SKILL_KIT.md, S1 to S39). Clips: vid/kit_S<n>.mp4. Replaces, never duplicates."""
import re, os, html

S = '/tmp/claude-0/-home-user/32a8741f-483c-523d-bcd7-a3da532d6a06/scratchpad'
DOC = '/mnt/project-files/mosslight-talents/MOSSLIGHT_SKILL_KIT.md'
PAGE = f'{S}/page/index.html'
VID = f'{S}/page/vid'
doc = open(DOC, encoding='utf-8').read()

def inline(s):
    s = html.escape(s, quote=False)
    s = re.sub(r'`([^`]+)`', r'<code>\1</code>', s)
    s = re.sub(r'\*\*([^*]+)\*\*', r'<b>\1</b>', s)
    s = re.sub(r'(?<![\w*])\*([^*]+)\*(?![\w*])', r'<i>\1</i>', s)
    s = re.sub(r'\bS(\d{1,2})\b', lambda m: f'<a href="#line-S{m.group(1)}">S{m.group(1)}</a>' if 1 <= int(m.group(1)) <= 39 else m.group(0), s)
    s = re.sub(r'\bT(\d{1,2})\b', lambda m: f'<a href="#line-T{m.group(1)}">T{m.group(1)}</a>' if 1 <= int(m.group(1)) <= 53 else m.group(0), s)
    return s

def table(rows):
    cells = [[c.strip() for c in r.strip().strip('|').split('|')] for r in rows]
    h = '<div class="tablewrap"><table><thead><tr>' + ''.join(f'<th>{inline(c)}</th>' for c in cells[0]) + '</tr></thead><tbody>'
    for r in cells[2:]:
        h += '<tr>' + ''.join(f'<td class="tw">{inline(c)}</td>' for c in r) + '</tr>'
    return h + '</tbody></table></div>'

secs, cur = {}, None
for ln in doc.split('\n'):
    m = re.match(r'^## (\d+)\. (.*)$', ln)
    if m:
        cur = int(m.group(1)); secs[cur] = []; continue
    if cur is not None: secs[cur].append(ln)

# node table rows (S29) by skill name
nodeRows = {}
s29 = '\n'.join(secs[5])
trows = [r for r in s29.split('\n') if r.startswith('|')]
NODE_COLS = [c.strip() for c in trows[0].strip('|').split('|')][1:]
for r in trows[2:]:
    c = [x.strip() for x in r.strip('|').split('|')]
    nodeRows[c[0]] = c[1:]
ALWAYS = ['Sharpen', 'Ascend', 'Keen', 'Echo', 'Snare', 'Galvanize', 'Resonance']

CAP = {
    10: 'Swiftleaf on the hurt Tank heals 14. Mossgrowth puts Moss on him, and the next Swiftleaf heals 21. Health is shown top right.',
    11: 'Seed Bolt aimed past everyone reaches no ally and drops a glowing seed. The Tank steps onto it and is healed 11.',
    12: 'Dew Fan sweeps the three hurt allies in front of her (wedge: reach 1.8 u, 70° each side).',
    13: 'Combo: Mossgrowth on the Tank, then Nova Bloom heals him 16 and blooms the Moss still unpaid, all at once. His vine ring bursts open.',
    14: 'Pollen Gust heals the three allies within 2 u and hastes them. The look is still Hearthsong\'s (green rings, amber star); not redone yet.',
    15: 'Mossgrowth on the hurt Tank at 2.6 u: a vine ring at his feet and 5 a second for 6 s.',
    16: 'Wild Growth puts Moss on all three allies within 2 u: a vine ring on each, 3 a second for 5 s.',
    17: 'Dewfall placed on three hurt allies: 7 a second for 5 s (gold ring: its 1.5 u circle).',
    18: 'Mending Sapling planted beside two hurt allies: the sapling grows, and every 2 s a mote flies to whoever is most hurt within 3 u of it.',
    19: 'Wisps gather round her, one every 2.5 s, up to 3, while everyone is full. When the Tank and the Swordsman are hurt, all three fly to the Tank (the most hurt) and heal 10 each; the next wisp goes to the Swordsman. The Archer, 5 u away, is outside the 4 u search (dashed ring) and gets none.',
    20: 'Thorn Volley on three dummies, in her dark green.',
    21: 'Combo: Rootsnare slows the two dummies in line, then Briar Lance pierces them for 39 each (30 plus 30%). The blue circle is Rootsnare\'s look today.',
    22: 'Gem Flash: the gem bursts white-gold, hitting and stunning the dummies around her for 20.',
    23: 'Rootsnare on three dummies: 6 a second for 5 s and slowed 45%.',
    24: 'Spore Cloud on three dummies: 6 a second for 4 s and 20% more damage taken. It still shows Dawn Brand\'s blue sigil; the spores are not drawn yet.',
    25: 'Sapping Vine latches onto the dummy: 8 a second for 4 s, and each tick sends a heal of 4 to the hurt Tank beside her.',
}
KIND = {}

def clip(n):
    return f'kit_S{n}' if os.path.exists(f'{VID}/kit_S{n}.mp4') else None

def body_html(body):
    lead, items, rows, after = [], [], [], []
    for ln in body:
        s = ln.strip()
        if not s: continue
        if s.startswith('|'): rows.append(s); continue
        if s.startswith('- '): items.append([s[2:]]); continue
        if items and not rows: items[-1].append(s)
        elif rows: after.append(s)
        else: lead.append(s)
    h = ''
    if lead: h += '<p>' + inline(' '.join(lead)) + '</p>'
    if items: h += '<ul>' + ''.join('<li>' + inline(' '.join(x)) + '</li>' for x in items) + '</ul>'
    if rows: h += table(rows)
    if after: h += '<p>' + inline(' '.join(after)) + '</p>'
    return h

GROUP = None
def scard(num, title, body):
    title = title.rstrip('.')
    text = ' '.join(x.strip() for x in body)
    bh = body_html(body)
    if not (10 <= num <= 25):
        return f'<div class="tl" id="line-S{num}"><div class="tlh"><span class="no mono">S{num}</span><h3>{inline(title)}{"" if title.endswith("?") else "."}</h3></div>{bh}</div>'
    if 'Kept' in text: kind, mark, vt = 'kept', 'keep', 'Kept · as it plays now, on the new model'
    elif re.search(r'\bNew\b', text) and 'Replaces' not in text and 'Keeps its name' not in text: kind, mark, vt = 'new', 'change', 'New skill · built in the review-only build'
    else: kind, mark, vt = 'reworked', 'change', 'Reworked · the new version, built'
    KIND[num] = kind
    cast = re.search(r'Cast: (\w+)', text)
    rep = None if num == 19 else re.search(r'(Replaces [^.]+|Takes [^.]+ place|Keeps its name[^.]*|Kept[^.]*)\.', text)
    nr = nodeRows.get(title.replace(' (passive)', '') if title not in nodeRows else title) or nodeRows.get(title)
    nodes = ''
    if nr:
        offered = [f'{c}' + (f' ({v[1:].strip()})' if len(v) > 1 and v.startswith('✓') and v[1:].strip() else '') for c, v in zip(NODE_COLS, nr) if v.startswith('✓')]
        always = ALWAYS if 'passive' not in title else []
        nodes = '<dl><dt>Nodes</dt><dd><span class="chips">' + ''.join(f'<span class="chip">{html.escape(x)}</span>' for x in always + offered) + '</span></dd>'
        if cast: nodes += f'<dt>Cast move</dt><dd>{cast.group(1)} clip</dd>'
        if num == 19:
            nodes = nodes.replace('</span></dd>', '<span class="chip">Breeze (new: wisps fly 40% faster)</span></span></dd>', 1)
        nodes += '</dl>'
        if num == 19 and os.path.exists(f'{VID}/kit_S19n.mp4'):
            nodes += ('<div class="media" style="margin-top:12px"><div class="vtag new">With Multiply, Bounce and Breeze</div><video src="vid/kit_S19n.mp4" autoplay muted loop playsinline preload="metadata" aria-label="Review build recording of Glade Wisps with nodes"></video>'
                      '<div class="vcap">Two wisps form each time, up to 4. A wisp heals the Tank, then hops on to the Swordsman beside him; the others reach the Archer. They fly 40% faster.</div></div>')
    if num == 19: rep = re.search(r"(Kesh's design)", text)
    tags = f'<div class="tags"><span class="tag {"dmg" if GROUP == "dmg" else "heal"}">{GROUPN[GROUP]}</span>' + (f'<span class="tag">{inline(rep.group(1))}</span>' if rep else '') + '</div>'
    c = clip(num)
    media = (f'<div class="media"><div class="vtag {"keep" if kind == "kept" else "new"}">{vt}</div><video src="vid/{c}.mp4" autoplay muted loop playsinline preload="metadata" aria-label="Review build recording of {html.escape(title)}"></video><div class="vcap">{inline(CAP.get(num, ""))}</div></div>'
             if c else '<div class="media"><div class="pics one"><div class="nopic">Recording in progress.</div></div></div>')
    return (f'<article class="card" id="line-S{num}" data-k="{kind}">{media}<div class="body"><div class="head"><span class="no">S{num}</span><h3>{inline(title)}</h3>'
            f'<span class="mark {mark}">{kind.capitalize()}</span></div>{tags}{bh}{nodes}</div></article>')

GROUPN = {'quick': 'quick heal · leans Spring', 'lasting': 'lasting heal · leans Evergreen', 'dmg': 'damage · leans Harvest'}

def render(lines):
    global GROUP
    out, i, n = [], 0, len(lines)
    para, lst, ol = [], [], []
    def flush():
        nonlocal para, lst, ol
        if para: out.append('<p class="sub">' + inline(' '.join(para)) + '</p>'); para = []
        if lst: out.append('<ul class="plain">' + ''.join(f'<li>{x}</li>' for x in lst) + '</ul>'); lst = []
        if ol: out.append('<ol class="plain">' + ''.join(f'<li>{x}</li>' for x in ol) + '</ol>'); ol = []
    while i < n:
        ln = lines[i]
        if ln.strip() == '---': i += 1; continue
        if ln.startswith('### '):
            flush()
            t = ln[4:]
            GROUP = 'quick' if t.startswith('Quick') else 'lasting' if t.startswith('Lasting') else 'dmg' if t.startswith('Damage') else GROUP
            out.append(f'<h4 class="subh2 tier">{inline(t)}</h4>'); i += 1; continue
        if ln.startswith('|'):
            flush(); rows = []
            while i < n and lines[i].startswith('|'): rows.append(lines[i]); i += 1
            out.append(table(rows)); continue
        m = re.match(r'^- \*\*S(\d+)\. (.+?)\*\*(.*)$', ln)
        if m:
            flush(); num, title, rest = int(m.group(1)), m.group(2), m.group(3).strip()
            body = [rest] if rest else []; i += 1
            while i < n and (lines[i].startswith('  ') or (lines[i] == '' and i + 1 < n and lines[i + 1].startswith('  '))):
                body.append(lines[i]); i += 1
            out.append(scard(num, title, body)); continue
        m = re.match(r'^\*\*S(\d+)\. (.+?)\*\*(.*)$', ln)
        if m:
            flush(); body = [m.group(3).strip()]; i += 1
            while i < n and lines[i].strip() and not lines[i].startswith('|'): body.append(lines[i].strip()); i += 1
            out.append(scard(int(m.group(1)), m.group(2), body)); continue
        m = re.match(r'^(\d+)\. (.*)$', ln)
        if m:
            if para: flush()
            item = [m.group(2)]; i += 1
            while i < n and lines[i].startswith('   ') and lines[i].strip(): item.append(lines[i].strip()); i += 1
            ol.append(inline(' '.join(item))); continue
        if ln.startswith('- '):
            if para: flush()
            item = [ln[2:]]; i += 1
            while i < n and lines[i].startswith('  ') and lines[i].strip() and not lines[i].lstrip().startswith('- '): item.append(lines[i].strip()); i += 1
            lst.append(inline(' '.join(item))); continue
        if not ln.strip(): flush(); i += 1; continue
        if lst or ol: flush()
        para.append(ln.strip()); i += 1
    flush()
    return '\n'.join(out)

def rules_of(lines):  # the bullets under "Kesh's rules" in the intro
    return render(lines)

intro = doc.split('---')[0]
kesh = intro[intro.index("**Kesh's rules, kept as written.**"):].split('\n')[1:]
skills_html = render(secs[3])
recorded = sum(1 for n in range(10, 26) if clip(n))
combo = clip(30)
combo_card = (f'<article class="card" id="combo-wisp"><div class="media"><div class="vtag new">Combo · built in the review-only build</div><video src="vid/{combo}.mp4" autoplay muted loop playsinline preload="metadata" aria-label="Review build recording of Mossgrowth feeding the Mercy Bell wisp"></video>'
              '<div class="vcap">Mossgrowth on a nearly full Tank: the Moss overheals and fills his Mercy Bell wisp (top right). He is hit twice and the wisp heals each hit.</div></div>'
              '<div class="body"><div class="head"><span class="no">C3</span><h3>Moss feeds the wisp</h3><span class="mark change">Combo</span></div><p>The third combo the kit asks for: Moss ticking on a full-health ally fills the class relic\'s wisp, which pays out on the next hit. The other two combos are the clips on S13 (Mossgrowth then Nova Bloom) and S21 (Rootsnare then Briar Lance).</p></div></article>') if combo else ''

skills_sec = f'''<section id="skills">
  <div class="eyebrow">New · S1 to S26 · the druid skill kit, version 1, 16 Nov · replaces lines 3 to 21</div>
  <h2>Her 16 skills</h2>
  <p class="sub">You asked for her skills to be redesigned, not only her talents. This is the new pool she drafts from for Q, E, C and X: 16 skills in three groups (quick heals, lasting heals, damage) instead of today's 19, with no shields and a new heal over time called Moss. Answer with S numbers, for example "S19 cut, S36 b". The full design is in the project folder: mosslight-talents/MOSSLIGHT_SKILL_KIT.md.</p>
  <div class="note"><b>What is recorded:</b> {recorded} of the 16 skills are built in the review-only build and recorded on her Tripo model, with your staff turret, dash and wisp relic kept. A new skill rides the old skill's slot in the build (Mossgrowth uses Kindred Shield's, Wild Growth Lantern Ward's, Mending Sapling Sanctuary's, Sapping Vine Spirit Bolt's), so the HUD shows the old icon with the new two letters. Two looks are not redone yet: Pollen Gust still wears Hearthsong's amber, and Spore Cloud shows Dawn Brand's blue sigil, with no spores drawn (Rootsnare also keeps its blue circle from today). All new numbers are first guesses. The old lines 3 to 23 are retired; choices 24 to 31 below still stand.</div>
  <h3 class="subh">Your rules, kept as written</h3>
  {render(kesh)}
  <h3 class="subh">Kit rules (S1 to S7)</h3><div class="list tlist">{render(secs[1])}</div>
  <h3 class="subh">Basic attack and dash (S8, S9)</h3><div class="list tlist">{render(secs[2])}</div>
  <h3 class="subh">The sixteen skills (S10 to S25)</h3><div class="list">{skills_html}{combo_card}</div>
  <h3 class="subh" id="line-S26">S26 · What happens to today's 19 skills</h3>
  {render(secs[4])}
</section>
'''
nodes_sec = f'''<section id="nodes">
  <div class="eyebrow">New · S27 to S33 · replaces lines 22 and 23</div>
  <h2>Nodes, the relic, talents and the AI</h2>
  <div class="list tlist">{render(secs[5])}</div>
  <h3 class="subh" id="line-S30">S30 · The class relic: the nature wisp</h3>
  <p class="sub">Built and recorded in the <a href="#relics">Relics</a> section.</p>
  {render(secs[6])}
  <h3 class="subh" id="line-S31">S31 · The kit under the talents</h3>
  {render(secs[7])}
  <h3 class="subh" id="line-S33">S33 · AI rules</h3>
  {render(secs[8])}
  <h3 class="subh" id="kitchoices">Open choices for the kit (S34 to S39)</h3>
  <div class="list tlist">{render(secs[9])}</div>
  <h3 class="subh">Notes for the game stage</h3>
  {render(secs[10][next(i for i, l in enumerate(secs[10]) if l.startswith('**Game stage'))-0:])}
</section>
'''

s = open(PAGE, encoding='utf-8').read()
for sid, new in (('skills', skills_sec), ('nodes', nodes_sec)):
    a = s.index(f'<section id="{sid}">'); b = s.index('</section>', a) + len('</section>')
    s = s[:a] + new.rstrip() + s[b:]
s = s.replace('<a href="#skills">3 to 21 Skills</a><a href="#nodes">22 to 23 Nodes</a>', '<a href="#skills">S1 to S26 Skills</a><a href="#nodes">S27 to S39 Nodes, AI, choices</a>')
for el in ('skillList', 'grid', 'nodeList', 'nodeLines'):
    s = s.replace(f"document.getElementById('{el}').innerHTML", f"(document.getElementById('{el}')||document.createElement('div')).innerHTML")
HOW = '<div><b>New, 16 Nov: her skills are redesigned.</b> Lines 3 to 23 are replaced by the druid kit, S1 to S39, each skill with a clip of its new version. Your no-shields pick and the wisp relic are in it.</div>'
if 'her skills are redesigned' not in s:
    s = s.replace('<div class="howto">\n', '<div class="howto">\n      ' + HOW + '\n', 1)
s = s.replace('<span class="v">19</span><span class="k">skills in her pool (every other hero has 11)</span>', '<span class="v">16</span><span class="k">skills in her new pool (today 19; every other hero has 11)</span>')
open(PAGE, 'w', encoding='utf-8').write(s)
print('ok', recorded, 'recorded; kinds', KIND, 'ids', len(re.findall(r'id="line-S\d+"', s)))
