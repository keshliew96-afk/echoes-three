#!/usr/bin/env python3
"""Rebuild the talents section of the Mosslight ability page from the talent doc (v2).
Replaces the old <section id="talents"> (never duplicates it). Clips: vid/tal_T<n>.mp4 when present."""
import re, os, sys, html

S = '/tmp/claude-0/-home-user/32a8741f-483c-523d-bcd7-a3da532d6a06/scratchpad'
DOC = '/mnt/project-files/mosslight-talents/MOSSLIGHT_TALENT_PATHS.md'
PAGE = f'{S}/page/index.html'
VID = f'{S}/page/vid'

doc = open(DOC, encoding='utf-8').read()

def inline(s):
    s = html.escape(s, quote=False)
    s = re.sub(r'`([^`]+)`', r'<code>\1</code>', s)
    s = re.sub(r'\*\*([^*]+)\*\*', r'<b>\1</b>', s)
    s = re.sub(r'(?<![\w*])\*([^*]+)\*(?![\w*])', r'<i>\1</i>', s)
    s = re.sub(r'~~([^~]+)~~', r'<s>\1</s>', s)
    # link T-numbers in running text to their cards
    s = re.sub(r'\bT(\d{1,2})\b', lambda m: f'<a href="#line-T{m.group(1)}">T{m.group(1)}</a>' if 1 <= int(m.group(1)) <= 53 else m.group(0), s)
    return s

def table(rows):
    cells = [[c.strip() for c in r.strip().strip('|').split('|')] for r in rows]
    head, body = cells[0], [r for r in cells[2:]]
    h = '<div class="tablewrap"><table><thead><tr>' + ''.join(f'<th>{inline(c)}</th>' for c in head) + '</tr></thead><tbody>'
    for r in body:
        h += '<tr>' + ''.join(f'<td class="tw">{inline(c)}</td>' for c in r) + '</tr>'
    return h + '</tbody></table></div>'

# ---------- clips ----------
FALLBACK = {19: 'path_spring', 20: 'path_evergreen', 21: 'path_harvest'}
CAP = {
    19: 'Swift Mend pressed nonstop on three hurt allies: its cooldown reads 2.0 s instead of 2.5 s (top right).',
    20: 'Mending Bolt on the hurt Tank lands as a HoT: a vine ring at his feet shrinks over 5 s while six green ticks pay the heal.',
    21: 'Her basic attack and Lantern Flurry on dummies: dark green motes fly to the gem, which grows as Sap fills (top right), then pours a Bright Heal stream into the hurt Tank beside her.',
}
CAPFILE = f'{S}/tools/talent_caps.txt'   # extra captions, "19|text" per line, written as clips are recorded
if os.path.exists(CAPFILE):
    for ln in open(CAPFILE, encoding='utf-8'):
        if '|' in ln:
            n, t = ln.rstrip('\n').split('|', 1); CAP[int(n)] = t

def clip_of(n):
    if os.path.exists(f'{VID}/tal_T{n}.mp4'): return f'tal_T{n}'
    if n in FALLBACK and os.path.exists(f'{VID}/{FALLBACK[n]}.mp4'): return FALLBACK[n]
    return None

# ---------- parse doc into ## sections ----------
secs = {}
cur = None
for ln in doc.split('\n'):
    m = re.match(r'^## (\d+)\. (.*)$', ln)
    if m: cur = int(m.group(1)); secs[cur] = {'title': m.group(2), 'lines': []}; continue
    if cur is not None: secs[cur]['lines'].append(ln)

def render(lines, cardify=True):
    """Mini markdown: T bullets become cards, other bullets lists, tables, ### subheads, paragraphs."""
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
            flush(); out.append(f'<h4 class="subh2">{inline(ln[4:])}</h4>'); i += 1; continue
        if ln.startswith('|'):
            flush(); rows = []
            while i < n and lines[i].startswith('|'): rows.append(lines[i]); i += 1
            out.append(table(rows)); continue
        m = re.match(r'^- \*\*T(\d+)\. (.+?)\*\*(.*)$', ln)
        if m and cardify:
            flush()
            num, title, rest = int(m.group(1)), m.group(2), m.group(3).strip()
            body = [rest] if rest else []
            i += 1
            while i < n and (lines[i].startswith('  ') or lines[i] == '' and i + 1 < n and lines[i+1].startswith('  ')):
                body.append(lines[i]); i += 1
            out.append(tcard(num, title, body)); continue
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
        m = re.match(r'^\*\*T(\d+)\. (.+?)\*\*(.*)$', ln)
        if m and cardify:
            flush(); body = [m.group(3).strip()]; i += 1
            while i < n and lines[i].strip() and not lines[i].startswith('|'): body.append(lines[i].strip()); i += 1
            out.append(tcard(int(m.group(1)), m.group(2), body)); continue
        if lst or ol: flush()
        para.append(ln.strip()); i += 1
    flush()
    return '\n'.join(out)

def body_html(body):
    """Body of a T bullet: lead text, then sub-bullets and an indented table."""
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

TIER_COST = {19: 'free', 20: 'free', 21: 'free', 22: '20 Embers', 23: '20 Embers', 24: '20 Embers',
             25: '40 Embers', 26: '40 Embers', 27: '40 Embers', 28: '60 Embers', 29: '60 Embers', 30: '60 Embers',
             31: '80 Embers', 32: '80 Embers', 33: '80 Embers'}
PATHCLS = {'Spring': 'sp', 'Evergreen': 'ev', 'Harvest': 'hv'}

def tcard(num, title, body):
    title = title.rstrip('.')
    bh = body_html(body)
    if 19 <= num <= 33:
        path = re.search(r'\((Spring|Evergreen|Harvest)\)', title).group(1)
        name = title.replace(f' ({path})', '')
        tier = ['I Style', 'II Power', 'III Trick', 'IV Reach', 'V Capstone'][(num - 19) // 3]
        tags = (f'<div class="tags"><span class="tag path {PATHCLS[path]}">{path}</span>'
                f'<span class="tag">Tier {tier}</span><span class="tag">{TIER_COST[num]}</span></div>')
        c = clip_of(num)
        if c:
            return (f'<article class="card" id="line-T{num}"><div class="media"><div class="vtag new">Built in the review-only build · recorded</div>'
                    f'<video src="vid/{c}.mp4" autoplay muted loop playsinline preload="metadata" aria-label="Review build recording of {html.escape(name)}"></video>'
                    f'<div class="vcap">{inline(CAP.get(num, ""))}</div></div>'
                    f'<div class="body"><div class="head"><span class="no">T{num}</span><h3>{inline(name)}</h3><span class="mark change">Recorded</span></div>{tags}{bh}</div></article>')
        return (f'<div class="tl" id="line-T{num}"><div class="tlh"><span class="no mono">T{num}</span><h3>{inline(name)}</h3>'
                f'<span class="mark text">Text only</span></div>{tags}{bh}</div>')
    return (f'<div class="tl" id="line-T{num}"><div class="tlh"><span class="no mono">T{num}</span><h3>{inline(title)}.</h3></div>{bh}</div>')

# ---------- the grid ----------
GRID = [(19, 20, 21), (22, 23, 24), (25, 26, 27), (28, 29, 30), (31, 32, 33)]
g2 = '\n'.join(secs[2]['lines'])
gridrows = [r for r in g2.split('\n') if r.startswith('| I') or r.startswith('| II') or r.startswith('| III') or r.startswith('| IV') or r.startswith('| V')]
def gcell(n, txt):
    m = re.match(r'\*\*(.+?)\*\*: (.*)', txt.strip())
    nm, line = m.group(1), m.group(2)
    rec = '<span class="rec">● recorded</span>' if clip_of(n) else '<span class="rec off">text only</span>'
    return f'<td><a class="gc" href="#line-T{n}"><span class="gno">T{n}</span><b>{inline(nm)}</b><span class="gl">{inline(line)}</span>{rec}</a></td>'
grid = ('<div class="tablewrap gridwrap"><table class="tgrid"><thead><tr><th>Tier</th><th class="sp">Spring (春芽): tempo</th>'
        '<th class="ev">Evergreen (常青): weight</th><th class="hv">Harvest (丰收): conversion</th></tr></thead><tbody>')
for (a, b, c), row in zip(GRID, gridrows):
    cols = [x.strip() for x in row.strip().strip('|').split('|')]
    grid += f'<tr><th>{inline(cols[0])}</th>' + gcell(a, cols[1]) + gcell(b, cols[2]) + gcell(c, cols[3]) + '</tr>'
grid += '</tbody></table></div>'

# Kesh's example paragraph (after the grid in section 2)
ex = re.search(r"(Kesh's example reads.*?)\n\n", g2, re.S).group(1)

# ---------- section 2 shared rules (T16 to T18) ----------
s2 = secs[2]['lines']
k = next(i for i, l in enumerate(s2) if l.startswith('### Shared rules'))
shared = render(s2[k + 1:])

# ---------- section 3, the fifteen talents, by tier ----------
s3 = render(secs[3]['lines']).replace('<h4 class="subh2">', '<h4 class="subh2 tier">')

recorded = [n for n in range(19, 34) if clip_of(n)]
reclist = ', '.join(f'T{n}' for n in recorded)

intro = f'''<section id="talents">
  <div class="eyebrow">New · T1 to T53 · talent design version 2.1, 16 Nov · mix and match · no shields</div>
  <h2>Talents: Spring, Evergreen, Harvest</h2>
  <p class="sub">Your two asks: Mosslight is a druid with three play styles, picked and upgraded at camp, each upgrade a change of numbers (数值) or mechanics (机制), and later every hero gets three; and a path is not a lock, so each talent is a free pick from any path (more 可能性 and 可玩性). This version is a grid: five tiers, three talents in each, one pick per tier from any path, 243 builds. Answer with numbers as before, for example "T21 change to 40%, T43 b". The full design is in the project folder: mosslight-talents/MOSSLIGHT_TALENT_PATHS.md.</p>
  <div class="note"><b>What is recorded:</b> all 15 talents are built in the review-only build, can be mixed one per tier, and each card has its own clip. Not built yet: zone and aura healing that clings (part of T20 and T23), the "×2" slot mark for Second Flush and the charge pips on the slot (T38), and the rule that a talent status never lengthens a stronger one (T9). Nova Bloom counts Mosslight as one of its three targets, as it does today, so in the Bark, Wide Canopy and Perennial clips she is healed too. <b>Version 2.1 (your no-shields pick):</b> Overgrowth (T32) is replaced by Perennial, Kindred Shield is cut, and the Bulwark node is greyed on her skills. All numbers are first guesses checked by arithmetic, not by play. <b>A ruling you need to make:</b> BUILD_BRIEF rulings A8 and A19 (and CLAUDE.md) keep "talent trees" out of scope. Your ask overrides that; when the freeze lifts it would be written as ruling A24. Nothing here is pushed or live.</div>
  <h3 class="subh" id="tgrid">The grid: pick one per row, from any column</h3>
  {grid}
  <p class="sub">{inline(ex)}</p>
'''

def sec(title, n, ident=None):
    return f'<h3 class="subh"{f" id={chr(34)}{ident}{chr(34)}" if ident else ""}>{inline(title)}</h3>\n' + render(secs[n]['lines'])

parts = [intro,
         '<h3 class="subh">The template, for every hero (T1 to T15)</h3><div class="list tlist">' + render(secs[1]['lines']) + '</div>',
         '<h3 class="subh">Shared rules the talents use (T16 to T18)</h3><div class="list tlist">' + shared + '</div>',
         '<h3 class="subh">The fifteen talents (T19 to T33)</h3><div class="list tlist">' + s3 + '</div>',
         '<h3 class="subh">What a build feels like</h3>' + render(secs[4]['lines']),
         '<h3 class="subh" id="line-T34">T34 · Combos checked</h3>' + render(secs[5]['lines']),
         '<h3 class="subh" id="line-T35">T35 · AI rules</h3>' + render(secs[6]['lines']),
         '<h3 class="subh" id="line-T36">T36 · Every part of her kit under the talents</h3>' + render(secs[7]['lines']),
         '<h3 class="subh">Look and sound, and the other heroes (T37 to T41)</h3><div class="list tlist">' + render(secs[8]['lines']) + '</div>',
         '<h3 class="subh">Open choices (T42 to T53)</h3><div class="list tlist">' + render(secs[9]['lines']) + '</div>',
         '</section>\n']
section = '\n'.join(parts)

CSS = '''/* talents v2 */
.tgrid td{white-space:normal;vertical-align:top;text-align:left;padding:0;min-width:180px}
.tgrid tbody th{white-space:nowrap;vertical-align:top;padding:10px 8px}
.tgrid thead th.sp{color:#2F6B3A}.tgrid thead th.ev{color:#2C5A47}.tgrid thead th.hv{color:#6B5A1F}
.tgrid .gc{display:flex;flex-direction:column;gap:3px;padding:10px 10px 12px;color:inherit;text-decoration:none;height:100%}
.tgrid .gc:hover{background:var(--moss-soft)}.tgrid .gc:focus-visible{outline:2px solid var(--moss);outline-offset:-2px}
.tgrid .gno{font:600 11.5px var(--mono);color:var(--muted)}.tgrid .gc b{font-size:14px}.tgrid .gl{font-size:12.5px;color:var(--muted);line-height:1.4}
.tgrid .rec{font:600 11.5px var(--body);color:var(--keep)}.tgrid .rec.off{color:var(--muted);font-weight:500}
.subh2{margin:18px 0 4px;font-size:15px}.subh2.tier{color:var(--moss)}
ul.plain,ol.plain{margin:6px 0;padding-left:22px;font-size:14px;line-height:1.5;display:flex;flex-direction:column;gap:4px}
.tag.path.sp{color:#2F6B3A;border-color:currentColor}.tag.path.ev{color:#2C5A47;border-color:currentColor}.tag.path.hv{color:#6B5A1F;border-color:currentColor}
.tl .tags,.card .body .tags{margin-top:6px}
.tablewrap td.tw{white-space:normal;text-align:left}
'''

s = open(PAGE, encoding='utf-8').read()
a = s.index('<section id="talents">'); b = s.index('<footer>')
assert s[a:b].rstrip().endswith('</section>'), 'unexpected end of the old talents section'
s = s[:a] + section + s[b:]
s = re.sub(r'<a href="#talents">[^<]*</a>', '<a href="#talents">T1 to T53 Talents</a>', s)
if '/* talents v2 */' in s:
    s = re.sub(r'/\* talents v2 \*/.*?(?=</style>)', CSS, s, count=1, flags=re.S)
else:
    s = s.replace('</style>', CSS + '</style>', 1)
open(PAGE, 'w', encoding='utf-8').write(s)
print('ok', len(s), 'recorded', reclist, 'cards', len(re.findall(r'id="line-T\d+"', section)))
