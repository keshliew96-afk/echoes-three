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
    s = re.sub(r'\bS(\d{1,2})\b', lambda m: f'<a href="#line-S{m.group(1)}">S{m.group(1)}</a>' if 1 <= int(m.group(1)) <= 52 else m.group(0), s)
    s = re.sub(r'\bR(\d{1,2})\b(?! ?[a-n]\b)', lambda m: f'<a href="#line-R{m.group(1)}">R{m.group(1)}</a>' if 1 <= int(m.group(1)) <= 52 else m.group(0), s)
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
    51: 'Oakling (candidate): a knee-high tree-folk wakes from the floor, walks to the most hurt ally and slams the foe nearest them every 1.5 s: 9 damage, pushed 1.5 u away and slowed 30%. It lives 10 s. The dummies are put back in place between slams so you can see each one.',
    50: 'Elder Oak (candidate): a great oak grows where she aims and stands for 8 s. Allies under its 3.5 u crown heal 6 a second, foes there are slowed 25%, seeds sprout and no plant withers. At its end its leaves fly to each ally under it as wisps and heal 10.',
    10: 'Swiftleaf on the hurt Tank: a real leaf spins to him with a trail of small leaves and heals 14; a sprig of leaves opens on his shoulder. Mossgrowth puts Moss on him, and the next Swiftleaf heals 21.',
    11: 'Seed Bolt aimed past everyone: the bolt is a seed pod with two leaf wings. It reaches no ally and drops a seed; a dummy within 4 u wakes it into a Spitter (4 a second for 5 s). On an ally the pod bursts into petals.',
    12: 'Dew Wave rolls a lane of dew along her aim: the three hurt allies in it, up to 4 u ahead, are healed 12 each, and grass and small flowers spring up behind the wave and fade after 2 s (gold outline: the 4 u by 1.6 u lane). It waters what it touches (S49).',
    13: 'Heartbloom: a green bud lands over the most hurt ally, the Tank, and heals him 4 a second for 4 s. Then it blooms: wisps fly to the Tank and to everyone within 3 u of him, Mosslight and the Swordsman too, and heal 12 each (the green rings).',
    14: 'Pollen Gust: a wall of wind 3 u wide rolls 7 u along her aim, carrying leaves, petals and yellow pollen. The Tank and the Swordsman it passes are healed 10, run 30% faster for 3 s and trail petals; the dummies are pushed 2 u and slowed 30%.',
    15: 'Mossgrowth on the hurt Tank: moss and small leaves creep up him from the feet, a small white flower opens on each tick, 5 a second for 6 s. When the Moss runs its full 6 s it drops a seed at his feet (R18); he is still hurt, so he picks it up at once: +11.',
    16: 'Firefly Swarm: the swarm settles on the most hurt ally, the Swordsman, for 3 s (Moss, +5 a second), flies to the dummy and stings it for 5 a second (one sting crits for 7.5, as any hit can), then goes on to the next hurt ally: 4 stops in all.',
    17: 'Dewfall among three hurt allies: the 2.2 u circle becomes a flower bed, grass and small flowers with a ring of tiny mushrooms at its edge, and heals 7 a second for 5 s. It waters plants and Moss inside it (S49).',
    18: 'Mending Sapling beside two hurt allies grows through three sizes in its 8 s, from sprout to a young tree as tall as the Tank, and every 2 s sends a blossom to the most hurt ally within 4.5 u. At its end it sheds its leaves: every ally within 4.5 u is healed 8.',
    19: 'Wisps gather round her, one every 2.5 s, up to 3, while everyone is full. When the Tank and the Swordsman are hurt, all three fly to the Tank (the most hurt) and heal 10 each; the next wisp goes to the Swordsman. The Archer, 5 u away, is outside the 4 u search (dashed ring) and gets none.',
    20: 'Scatter Seeds: three seeds land round her aim among three dummies. A second later the dummies wake them into three Spitters, each shooting 4 a second for 5 s.',
    21: 'Rootspear: the row shows in dark green for 0.4 s, then wooden root spears with bark and a few leaves burst along it: 28 to every dummy in the row, 7 u long and 1.4 u wide. The dummy off the row is missed.',
    22: 'Wispfall: for 5 s a white-gold wisp dives every 0.5 s on the nearest dummy within 4.5 u (gold ring) that the last dive did not hit, 7 to everything within 0.9 u of where it lands.',
    23: 'Rootsnare: roots break out in a 2.4 u circle; for 3 s the three dummies inside take 5 a second, are slowed 45% and dragged toward the middle. Then the roots clench: 12, and held 0.8 s.',
    24: 'Puffcap: she plants a mushroom; it waits until a dummy walks within 1.5 u (gold ring), then bursts into a 2.2 u spore cloud for 4 s: 5 a second, and the dummy takes 20% more damage from everything, so each tick shows 6.',
    25: 'Sapping Vine: a thorned vine grows out of the floor and coils up the dummy, 8 a second for 4 s; a root line runs along the floor to the hurt ally and each heal of 4 travels along it. This dummy has little health: when it falls, the vine drops a seed where it stood.',
}
KIND = {}

def clip(n):
    return f'kit_S{n}' if os.path.exists(f'{VID}/kit_S{n}.mp4') else None
CARD = set(range(10, 26)) | {50, 51}

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
    if num not in CARD:
        return f'<div class="tl" id="line-S{num}"><div class="tlh"><span class="no mono">S{num}</span><h3>{inline(title)}{"" if title.endswith("?") else "."}</h3></div>{bh}</div>'
    cand = 'candidate' in title
    rnum = (re.search(r'R\d+', title) or re.search('.*', '')).group(0)
    if cand: title = re.sub(r' \(candidate[^)]*\)', '', title)
    l14 = re.search(r'1\.4(?: look)? \((R[\d, R]+)\)', text)
    if cand: kind, mark, vt = 'new', 'change', 'Candidate, new in 1.4 · built in the review-only build'
    elif 'Redesigned in 1.3' in text: kind, mark, vt = 'reworked', 'change', 'Redesigned in 1.3' + (', new look in 1.4' if l14 else '') + ' · built in the review-only build'
    elif l14: kind, mark, vt = ('kept' if 'Kept' in text else 'reworked'), 'change', 'Kit 1.4: druid look' + (' and rule' if re.search(r'(drops a seed|sheds|waters)', text) else '') + ' · built in the review-only build'
    elif 'Kept' in text: kind, mark, vt = 'kept', 'keep', 'Kept · as it plays now, on the new model'
    elif re.search(r'\bNew\b', text) and 'Replaces' not in text and 'Keeps its name' not in text: kind, mark, vt = 'new', 'change', 'New skill · built in the review-only build'
    else: kind, mark, vt = 'reworked', 'change', 'Reworked · the new version, built'
    KIND[num] = kind
    cast = re.search(r'Cast: (\w+)', text)
    rep = None if num == 19 else re.search(r'(Replaces [^.]+|Takes [^.]+ place|Keeps its name[^.]*|Kept[^.]*)\.', text)
    nr = nodeRows.get(title.replace(' (passive)', '') if title not in nodeRows else title) or nodeRows.get(title) or nodeRows.get(title + ' (candidate)')
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
    w = re.search(r'Redesigned in 1\.3 \((was [^)]+|same name)\)', text)
    if w: rep = re.search(r'(.+)', 'Redesigned 1.3 · ' + w.group(1))
    if cand: rep = re.search(r'(.+)', 'Candidate · new in 1.4 (' + rnum + ')')
    t14 = f'<span class="tag">Kit 1.4 · {inline(l14.group(1))}</span>' if l14 else ''
    tags = f'<div class="tags"><span class="tag {"dmg" if GROUP == "dmg" else "heal"}">{GROUPN[GROUP]}</span>' + (f'<span class="tag">{inline(rep.group(1))}</span>' if rep else '') + t14 + '</div>'
    c = clip(num)
    media = (f'<div class="media"><div class="vtag {"keep" if kind == "kept" else "new"}">{vt}</div><video src="vid/{c}.mp4" autoplay muted loop playsinline preload="metadata" aria-label="Review build recording of {html.escape(title)}"></video><div class="vcap">{inline(CAP.get(num, ""))}</div></div>'
             if c else '<div class="media"><div class="pics one"><div class="nopic">Recording in progress.</div></div></div>')
    return (f'<article class="card" id="line-S{num}" data-k="{kind}">{media}<div class="body"><div class="head"><span class="no">S{num}</span><h3>{inline(title)}</h3>'
            f'<span class="mark {mark}">{"Candidate" if cand else "Redesigned" if "Redesigned in 1.3" in text else "New look" if l14 and kind != "new" else kind.capitalize()}</span></div>{tags}{bh}{nodes}</div></article>')

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
        m = re.match(r'^- \*\*R(\d+)\. (.+?)\*\*(.*)$', ln)
        if m:
            flush(); num, title, rest = int(m.group(1)), m.group(2).strip(), m.group(3).strip()
            body = [rest] if rest else []; i += 1
            while i < n and (lines[i].startswith('  ') or (lines[i] == '' and i + 1 < n and lines[i + 1].startswith('  '))):
                body.append(lines[i]); i += 1
            mk = ''
            if '[1.4]' in title: mk = '<span class="chip">In kit 1.4 · built</span>'
            elif '[waits' in title: mk = '<span class="chip">Waits for your number</span>'
            title = re.sub(r'\s*\[[^\]]*\]\s*', ' ', title).strip().rstrip('.')
            out.append(f'<div class="tl" id="line-R{num}"><div class="tlh"><span class="no mono">R{num}</span><h3>{inline(title)}.</h3>{mk}</div>{body_html(body)}</div>'); continue
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

REVIEW_DOC = open('/mnt/project-files/mosslight-talents/MOSSLIGHT_DRUID_REVIEW.md', encoding='utf-8').read()
REVIEW = REVIEW_DOC.split('\n---\n', 1)[1].replace('## ', '### ').split('\n')
intro = doc.split('---')[0]
kesh = intro[intro.index("**Kesh's rules, kept as written.**"):].split('\n')[1:]
skills_html = render(secs[3])
recorded = sum(1 for n in range(10, 26) if clip(n))
recorded14 = sum(1 for n in (50, 51) if clip(n))
COMBOS = [
    ('C1', 'kit_C1', 'Gather, hold, then strike', 'Rootsnare then Rootspear',
     'Rootsnare drags four dummies together and slows them; Rootspear through the pack hits each for 36 (28 plus 30% on a slowed foe). Then the roots clench: 12 and held 0.8 s.',
     'The kit\'s main damage combo (How the skills play together): Rootsnare or Puffcap gathers and weakens, Rootspear pays it off.'),
    ('C2', 'kit_C2', 'Sow, then wake', 'Scatter Seeds then Rootspear',
     'Scatter Seeds lands three seeds; Rootspear through them sprouts every seed in its row into a Spitter at once, without waiting its 1 s, and the Spitters shoot the dummies.',
     'Seeds (S43) are a heal or a trap; Rootspear wakes them on the spot.'),
    ('C3', 'kit_S30', 'Moss feeds the wisp', 'Mossgrowth and the relic wisp',
     'Mossgrowth on a nearly full Tank: the Moss overheals and fills his Mercy Bell wisp (top right). He is hit twice and the wisp heals each hit.',
     'Moss ticking on a full-health ally fills the class relic\'s wisp, which pays out on the next hit. Recorded with version 1; the relic is unchanged in 1.3.'),
    ('C4', 'kit_C4', 'Heartbloom blooms early', 'Heartbloom and the 40% rule',
     'Heartbloom\'s bud on the Tank; at 1.8 s he drops under 40% health, so the bud blooms at once instead of waiting 4 s, and its wisps heal him and everyone within 3 u.',
     'The emergency side of Heartbloom (S13, S45): it heals slowly when nothing is wrong and bursts when its ally is in danger.'),
    ('C5', 'kit_CA', 'Water the garden', 'Scatter Seeds then Dew Wave (R40 a)',
     'Scatter Seeds lands three seeds; Dew Wave rolls over them: watered, all three sprout into Spitters at once, with no 1 s wait, and the wave still heals the ally in its lane.',
     'Water grows (S49): Dew Wave and Dewfall water what they touch, once each.'),
    ('C6', 'kit_CB', 'A sapling in the flower bed', 'Mending Sapling in Dewfall (R40 d)',
     'Dewfall first, then Mending Sapling planted inside it: watered, the sapling sends a blossom every 1.3 s instead of every 2 s for 3 s and lives 3 s longer.',
     'Water grows (S49) on a helper: the sapling, Spitters and the Oakling work 50% faster for 3 s and last 3 s longer.'),
    ('C7', 'kit_CC', 'Wake the trap from afar', 'Puffcap then Rootspear (R40 e)',
     'A Puffcap waits ahead of the pack; Rootspear\'s row runs through it and bursts it from 3 u away, and the spore cloud exposes the dummies.',
     'Roots wake (S49): Rootspear bursts every Puffcap in its row.'),
    ('C8', 'kit_CD', 'Wind carries the spores', 'Puffcap then Pollen Gust (R40 f)',
     'The dummies set the Puffcap off first; then Pollen Gust crosses its spore cloud and the wind carries the spores (green puffs on the wind), so each dummy it pushes out of the cloud takes 20% more damage for 4 s. A gust through a waiting Puffcap bursts it the same way.',
     'Wind carries (S49).'),
    ('C9', 'kit_CE', 'Snare, spores, spear', 'Rootsnare, Puffcap, Rootspear (R40 h)',
     'Rootsnare drags the pack in and slows it, a Puffcap bursts among them and exposes them, then Rootspear hits each for 44 (28 plus 30% plus 20%).',
     'The full trapper line (R43).'),
    ('C10', 'kit_CF', 'Under the oak', 'Elder Oak over a garden (R40 j)',
     'Scatter Seeds and a Mending Sapling, then the Elder Oak over them: the seeds under its crown sprout at once, nothing withers while it stands, and the dummies under it are slowed.',
     'The Elder Oak is a home for her garden (S50).'),
    ('C11', 'kit_CG', 'The watered Oakling', 'Oakling, then Dew Wave through it (R40 k)',
     'The Oakling stands by the hurt Tank; Dew Wave heals him and waters the Oakling, which then slams once a second for 3 s instead of every 1.5 s.',
     'Water grows on the Oakling (S49, S51).'),
]
combo_card = ''
for cid, v, title, sub, cap, why in COMBOS:
    if not os.path.exists(f'{VID}/{v}.mp4'): continue
    combo_card += (f'<article class="card" id="combo-{cid}"><div class="media"><div class="vtag new">Combo · built in the review-only build</div><video src="vid/{v}.mp4" autoplay muted loop playsinline preload="metadata" aria-label="Review build recording of {html.escape(sub)}"></video>'
                   f'<div class="vcap">{inline(cap)}</div></div>'
                   f'<div class="body"><div class="head"><span class="no">{cid}</span><h3>{html.escape(title)}</h3><span class="mark change">Combo</span></div><div class="tags"><span class="tag">{html.escape(sub)}</span></div><p>{inline(why)}</p></div></article>')

skills_sec = f'''<section id="skills">
  <div class="eyebrow">New · S1 to S26, S43 to S52 · the druid skill kit, version 1.4, 16 Nov · replaces lines 3 to 21</div>
  <h2>Her 16 skills, and two candidates</h2>
  <p class="sub">You asked for her skills to be redesigned, not only her talents. This is the new pool she drafts from for Q, E, C and X: 16 skills in three groups (quick heals, lasting heals, damage) instead of today's 19, with no shields and a new heal over time called Moss. Answer with S numbers, for example "S22 cut, S45 b". The full design is in the project folder: mosslight-talents/MOSSLIGHT_SKILL_KIT.md.</p>
  <div class="note"><b>New in 1.4 (your druid review, R1 to R52 below):</b> nine skills got plant, wood and root looks (Swiftleaf, Seed Bolt, Dew Wave, Pollen Gust, Mossgrowth, Dewfall, Mending Sapling, Rootspear, Sapping Vine), three small rules (Mossgrowth's full run drops a seed, the sapling sheds its leaves for 8 at its end, the vine drops a seed when its foe falls) and the garden rules (S49): water grows, roots wake, wind carries. Two candidate skills, Elder Oak (S50) and Oakling (S51), are built with stand-in shapes; R34 asks whether they join the pool. Seven new combo clips (C5 to C11) show the garden rules. Every number is still a first guess.</div>
  <div class="note"><b>New in 1.3:</b> the eight skills you asked to rework are redesigned (with ideas from Zyra's seeds and plants, the WoW druid and your wisps) and recorded: Heartbloom (S13), Pollen Gust (S14), Firefly Swarm (S16), Scatter Seeds (S20), Rootspear (S21), Wispfall (S22), Rootsnare (S23) and Puffcap (S24), each with its own new look. Seeds and Spitters are new kit rules (S43), and Seed Bolt's missed seed can now sprout (S11). Wispfall no longer stuns. <b>What is recorded:</b> {recorded} of the 16 skills, plus four combos, are built in the review-only build and recorded on her Tripo model, with your staff turret, dash and wisp relic kept. A skill rides an old skill's slot in the build, so the HUD shows the old icon with the new two letters. All new numbers are first guesses. The old lines 3 to 23 are retired; choices 24 to 31 below still stand.</div>
  <h3 class="subh">Your rules, kept as written</h3>
  {render(kesh)}
  <h3 class="subh">Kit rules (S1 to S7, S43, S44, S49)</h3><div class="list tlist">{render(secs[1])}</div>
  <h3 class="subh">Basic attack and dash (S8, S9)</h3><div class="list tlist">{render(secs[2])}</div>
  <h3 class="subh">The sixteen skills (S10 to S25) and the candidates (S50, S51)</h3><div class="list">{skills_html}{combo_card}</div>
  <h3 class="subh" id="line-S26">S26 · What happens to today's 19 skills</h3>
  {render(secs[4])}
</section>
<section id="review">
  <div class="eyebrow">New · R1 to R52 · the druid review, 16 Nov</div>
  <h2>Druid review: plants, wood, roots, wisps</h2>
  <p class="sub">You asked where her plants, wood, roots and wisps are, what is lacking, and how the skills work together. Lines marked "In kit 1.4 · built" are in the skill cards and clips above; say the number with "no" and it comes out. Lines marked "Waits for your number" are ideas not built, mostly ones that touch your own designs (turret, dash, Glade Wisps, relic). Answer with R numbers, for example "R32 no, R44 yes". The file is mosslight-talents/MOSSLIGHT_DRUID_REVIEW.md.</p>
  <div class="list tlist">{render(REVIEW)}</div>
</section>
'''
nodes_sec = f'''<section id="nodes">
  <div class="eyebrow">New · S27 to S33, open choices to S52 · replaces lines 22 and 23</div>
  <h2>Nodes, the relic, talents and the AI</h2>
  <div class="list tlist">{render(secs[5])}</div>
  <h3 class="subh" id="line-S30">S30 · The class relic: the nature wisp</h3>
  <p class="sub">Built and recorded in the <a href="#relics">Relics</a> section.</p>
  {render(secs[6])}
  <h3 class="subh" id="line-S31">S31 · The kit under the talents</h3>
  {render(secs[7])}
  <h3 class="subh" id="line-S33">S33 · AI rules</h3>
  {render(secs[8])}
  <h3 class="subh" id="kitchoices">Open choices for the kit (S34 to S52)</h3>
  <div class="list tlist">{render(secs[9])}</div>
  <h3 class="subh">Notes for the game stage</h3>
  {render(secs[10][next(i for i, l in enumerate(secs[10]) if l.startswith('**Game stage'))-0:])}
</section>
'''

s = open(PAGE, encoding='utf-8').read()
for sid, new in (('skills', skills_sec), ('nodes', nodes_sec)):
    a = s.index(f'<section id="{sid}">'); b = s.index('</section>', a) + len('</section>')
    s = s[:a] + new.rstrip() + s[b:]
s = s.replace('<a href="#skills">3 to 21 Skills</a><a href="#nodes">22 to 23 Nodes</a>', '<a href="#skills">S1 to S26 Skills</a><a href="#nodes">S27 to S52 Nodes, AI, choices</a><a href="#review">R1 to R52 Druid review</a>')
for el in ('skillList', 'grid', 'nodeList', 'nodeLines'):
    s = s.replace(f"document.getElementById('{el}').innerHTML", f"(document.getElementById('{el}')||document.createElement('div')).innerHTML")
HOW = '<div><b>New, 16 Nov: her skills are redesigned (kit 1.4).</b> Lines 3 to 23 are replaced by the druid kit, S1 to S52, each skill with a clip of its latest version. Kit 1.4 adds your druid review (R1 to R52, its own section): new plant and wood looks, the garden rules, two candidate skills (S50, S51) and seven garden combo clips. Mark with S or R numbers.</div>'
s = re.sub(r'\s*<div><b>New, 16 Nov: her skills are redesigned[^\n]*</div>', '', s)
if True:
    s = s.replace('<div class="howto">\n', '<div class="howto">\n      ' + HOW + '\n', 1)
s = s.replace('<span class="v">19</span><span class="k">skills in her pool (every other hero has 11)</span>', '<span class="v">16</span><span class="k">skills in her new pool (today 19; every other hero has 11)</span>')
open(PAGE, 'w', encoding='utf-8').write(s)
print('ok', recorded, 'recorded; kinds', KIND, 'ids', len(re.findall(r'id="line-S\d+"', s)))
