# mkpage.py: the Bellwright's ability review page (simple and clean: live clip, name, a line or two, chips).
# python3 mkpage.py [local]  -> ../site/index.html (local uses ../node_modules/three for the import map, else jsDelivr three@0.170.0)
# Card words come from the clips' own captions (A.cap / capA / two in base.js, ar.js, re.js, ha.js, co.js), so words and clips cannot drift.
import html, os, sys, shutil, base64, re, json
HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.join(HERE, '..', 'site')
LOCAL = len(sys.argv) > 1 and sys.argv[1] == 'local'
E = html.escape
def L(zh, en): return (zh, en)
CD = lambda s: L(f'冷却 {s}', f'Cooldown {s}')
BIG = L('大招', 'Big skill'); PAS = L('被动', 'Passive'); NEW = L('新', 'New')
TAG = {'挂': L('挂', 'Hang'), '撞': L('撞', 'Strike'), '鸣': L('鸣', 'Ring'), '音': L('音', 'Note'), '震': L('震', 'Ringing')}

S = r"'((?:[^'\\]|\\.)*)'"
CAP = re.compile(r"(?:A\.cap|capA|two)\((?:A, )?[^,]+, [^,]+, " + S + r", " + S + r"\)")
def unq(s): return json.loads('"' + s.replace('"', '\\"').replace("\\'", "'") + '"')
def caps(fn):
    out = {}; cur = None
    for line in open(os.path.join(HERE, fn)):
        m = re.search(r"(?:DEFS|F)\.(\w+) = ", line)
        if m: cur = m.group(1); out.setdefault(cur, [])
        if cur:
            for a, b in CAP.findall(line):
                a, b = unq(a), unq(b)
                if a: out[cur].append((a, b))
    return out
BASE = caps('base.js'); FT = {'ar': caps('ar.js'), 're': caps('re.js'), 'ha': caps('ha.js')}; CO = caps('co.js')
def joined(lst): return L('；'.join(x[0] for x in lst), ' '.join(x[1] if x[1].endswith('.') else x[1] + '.' for x in lst))

# core cards and their style lines (hand-written: their clips build captions per style)
CORE = [
 ('P', 'R5', L('共鸣', 'Sympathy'), [L('职业被动', 'Class passive')], [
   L('她的钟每秒在拍子上一起鸣。被鸣到或被钟身撞到的敌人鸣震 3 秒。', 'Her bells toll together on the beat, once a second. A foe a bell tolls on, or a bell’s body strikes, is Ringing 3 s.'),
   L('音对鸣震的敌人 +50%；穿过钟圈时钟应声。', 'A Note deals 50% more to a Ringing foe; through a bell’s ring, the bell answers.')]),
 ('P2', 'R6', L('三响与和弦', 'Third stroke and Chord'), [L('职业被动', 'Class passive')], [
   L('每放一个技能点亮一颗；第三个听两次（0.6 秒后再来一半），下一击直接是大钟一击：钟技能强音、音技能颤音、律技能弱音。', 'Each cast lights a pip; the third is heard twice (again 0.6 s later, for half), and her next attack is the great stroke at once: Forte, Vibrato or Diminuendo by its group.')]),
 ('B', 'R8', L('普攻', 'Basic attack'), [L('常驻', 'Always on')], [
   L('第 1、2 击：小钟飞出、落下，撞 8。第 3 击：敲侧放的大钟，三波 3 + 8；大钟立起挂 5 秒（模型页已通过）。', 'Hits 1, 2: a bell shot falls: Strike 8. Hit 3: a drummed great bell, three waves of 3 and 8; it stands and hangs 5 s (as passed).')]),
 ('D', 'R9', L('冲刺', 'Dash'), [L('常驻', 'Always on')], [
   L('大钟罩下：第一帧起无敌，在钟下走，快 1.5 倍，最多 2.5 秒；攻击、施法或再按冲刺升起（模型页已通过）。', 'A great bell drops over her: untouchable from the first frame; she walks under it 1.5 times as fast, up to 2.5 s; an attack, a cast or a second dash lifts it (as passed).')]),
]
CORE_FT = {
 'ar': {'P': L('洪钟：最老的钟长成洪钟（2 u，14，减速 35%）；弦连着 4 u 内每口钟，每拍 4，鸣震。', 'Bourdon: her oldest bell grows into the Bourdon (2 u, 14, slows 35%); a chord joins it to every bell within 4 u: 4 a beat, Ringing.'),
        'P2': L('挂着的每口钟也奏和弦，一半。', 'Every hung bell plays the Chord too, round itself, for half.'),
        'B': L('落下的小钟留 3 秒当铃，跟着拍子响。', 'Each fallen shot bell stays 3 s as a chime and tolls on the beat.'),
        'D': L('钟留在升起的地方，挂 5 秒。', 'The bell stays hung where it lifts, 5 s.')},
 're': {'P': L('二响：两颗就满，每第二个技能听两次；音的第二次沿原路回来。', 'Twice Heard: two pips, so every second skill is heard twice; a Note’s second hearing comes back the way it went.'),
        'P2': L('两颗就满，不是三颗。', 'Two pips, not three.'),
        'B': L('小钟不落下：作为音穿过所有敌人，6 u：6。', 'The shots do not fall: they fly on through every foe as Notes, 6 u: 6.'),
        'D': L('钟升起时一圈音，2.5 u：10。', 'It lifts with a ring: 10 within 2.5 u, a Note.')},
 'ha': {'P': L('合调：钟声和音碰到的队友快 15%，4 秒；敌人走调 4 秒：伤害 −15%，受伤 +10%（精英、首领一半）。', 'In Tune: friends her tolls and Notes touch are 15% faster 4 s; foes are Off-key 4 s: deal 15% less, take 10% more (elites and bosses half).'),
        'P2': L('5 u 内每个队友一起：和弦每人 +20%，每人得一份礼物。', 'Each friend within 5 u joins in: the Chord deals 20% more for each, and each gets a gift.'),
        'B': L('鼓声向四周散开，3 u。', 'The drummed waves go out all round her, 3 u.'),
        'D': L('起拍：钟升起时 3 u 内的队友冲刺马上回来。', 'It lifts on a cue: friends within 3 u have their dash back at once.')},
}
# (id, zh, en, cooldown, big, new, tags)
SK = [
 ('F1', '悬钟', 'Hang Bell', '5 s', 0, 0, '挂'), ('F2', '巨钟', 'Great Bell', '14 s', 0, 0, '挂撞'), ('F3', '挥钟', 'Bell Swing', '8 s', 0, 0, '撞'),
 ('F4', '扣钟', 'Bell Jar', '9 s', 0, 1, '撞'), ('F5', '滚钟', 'Rolling Bell', '9 s', 0, 1, '撞挂'), ('F6', '召钟', 'Muster', '8 s', 0, 1, '撞'),
 ('F7', '齐鸣', 'Peal', '9 s', 0, 0, '鸣'), ('F8', '钟乐', 'Carillon', '18 s', 1, 0, '挂鸣'),
 ('F9', '钟锤', 'Clapper', '2.5 s', 0, 0, '音'), ('F10', '丧钟', 'Knell', '7 s', 0, 0, '音'), ('F11', '散铃', 'Jingles', '6 s', 0, 1, '音震'),
 ('F12', '报丧', 'Deathwatch', '10 s', 0, 1, '音'), ('F13', '绕耳音', 'Earworm', '9 s', 0, 1, '音震'), ('F14', '聚音', 'Call Chime', '9 s', 0, 1, '音挂'),
 ('F15', '轰鸣', 'Boom', '8 s', 0, 1, '音'), ('F16', '子夜钟', 'Midnight', '16 s', 1, 1, '音'),
 ('F17', '振翅跃', 'Wing Hop', '8 s', 0, 0, '挂'), ('F18', '晚祷钟', 'Vesper Chime', '11 s', 0, 0, ''), ('F19', '音叉', 'Tuning Fork', '12 s', 0, 0, ''),
 ('F20', '独奏', 'Solo', '12 s', 0, 1, ''), ('F21', '快板', 'Allegro', '14 s', 0, 1, ''), ('F22', '宵禁', 'Curfew', '10 s', 0, 1, '震'),
 ('F23', '叩甲', 'Click', '7 s', 0, 1, '撞'), ('F24', '圣咏', 'Anthem', '16 s', 1, 1, '挂'),
 ('F25', '嗡鸣', 'Hum', None, 0, 0, ''), ('F26', '警铃', 'Alarm Bell', None, 0, 1, '震'),
]
def skcard(r):
    cid, zh, en, cd, big, new, tags = r
    ch = [CD(cd)] if cd else [PAS]
    if big: ch.append(BIG)
    if new: ch.append(NEW)
    ch += [TAG[t] for t in tags]
    return (cid, cid, L(zh, en), ch, [joined(BASE.get(cid, []))])
CN = [('C1', '当头一棒', 'Strike the bell', '悬钟 + 挥钟', 'Hang Bell + Bell Swing'), ('C2', '连滚', 'Bowling', '滚钟 + 挂着的钟', 'Rolling Bell + a hung bell'),
 ('C3', '钟下施放', 'Dash cast', '冲刺 + 齐鸣', 'Dash + Peal'), ('C4', '瓮中丧钟', 'Jar and knell', '报丧 + 扣钟', 'Deathwatch + Bell Jar'),
 ('C5', '催命', 'Hurry the watch', '报丧 + 齐鸣', 'Deathwatch + Peal'), ('C6', '铃传绕耳', 'Catchy', '绕耳音 + 散铃', 'Earworm + Jingles'),
 ('C7', '钟下宵禁', 'Curfew under a bell', '悬钟 + 宵禁', 'Hang Bell + Curfew'), ('C8', '定调', 'Fork on the Anthem', '圣咏 + 音叉', 'Anthem + Tuning Fork'),
 ('C9', '击滚钟', 'Bat the roller', '滚钟 + 挥钟', 'Rolling Bell + Bell Swing'), ('C10', '一呼百应', 'Every bell is a bell', '齐鸣 + 扣钟、圣咏', 'Peal + Bell Jar, Anthem'),
 ('C11', '水传声', 'Sound on water', '音 + 潮汐使的水', 'A Note + the Tide Caller’s water'), ('C12', '请君入瓮', 'Come in', '宵禁 + 聚音', 'Curfew + Call Chime')]
def cocard(r):
    cid, zh, en, pz, pe = r; lst = CO.get(cid, [])
    line = lst[0] if lst else ('', '')
    # drop the name before the first colon: the card head already shows it
    z = line[0].split('：', 1)[-1]; e = line[1].split(': ', 1)[-1]
    e = (e[:1].upper() + e[1:]) if e else e
    if e and not e.endswith('.'): e += '.'
    if z and not z.endswith('。'): z += '。'
    return (cid, cid, L(zh, en), [L(pz, pe)], [L(z, e)])

SECTIONS = [
 ('core', L('被动、普攻、冲刺', 'Passives, attack and dash'), L('', ''), CORE),
 ('bell', L('钟', 'Bell'), L('挂钟、撞钟、让钟一起响。', 'Hang bells, strike with them, ring them.'), [skcard(r) for r in SK[0:8]]),
 ('note', L('音', 'Note'), L('飞出去的声音：音对鸣震的敌人 +50%。', 'Sound that flies: a Note deals 50% more to a Ringing foe.'), [skcard(r) for r in SK[8:16]]),
 ('tune', L('律', 'Tune'), L('位移、增益、减益和节拍。没有治疗也没有护盾。', 'Moves, buffs, debuffs and the beat. No heals and no shields.'), [skcard(r) for r in SK[16:24]]),
 ('passives', L('被动技能', 'Passive skills'), L('占一个技能格，不用按键，没有风格形态。', 'Each takes a skill slot; no button, no style forms.'), [skcard(r) for r in SK[24:26]]),
 ('combos', L('组合技', 'Combos'), L('两个技能碰到一起时多出来的效果。十二个都选了。风格下的不同写在说明里。', 'What more happens when two of her moves meet. All twelve are taken. How each style changes them is in the notes.'), [cocard(r) for r in CN]),
]
FN = {'base': L('基础', 'Base'), 'ar': L('钟阵', 'Bell Array'), 're': L('回音', 'Reverb'), 'ha': L('和鸣', 'Harmony')}
FORMS_ON = ['ar', 're', 'ha']
def ftline(f, cid):
    if cid in CORE_FT[f]: return CORE_FT[f][cid]
    lst = FT[f].get(cid)
    return joined(lst) if lst else None

def bi(p):
    zh, en = p
    return f'<span class="zh">{E(zh)}</span><span class="en">{E(en)}</span>'
def card(c):
    cid, num, name, chips, lines = c
    ch = ''.join(f'<span class="chip">{bi(x)}</span>' for x in chips)
    ps = ''.join(f'<p>{bi(x)}</p>' for x in lines)
    fs = [f for f in FORMS_ON if ftline(f, cid)]
    sw = ''
    if fs:
        sw = '<div class="seg forms" role="group" aria-label="Style">' + ''.join(f'<button type="button" data-f="{f}" aria-pressed="{str(f == "base").lower()}">{bi(FN[f])}</button>' for f in ['base'] + fs) + '</div>'
        ps = f'<div class="fx" data-f="base">{ps}</div>' + ''.join(f'<div class="fx" data-f="{f}"><p class="fline">{bi(ftline(f, cid))}</p></div>' for f in fs)
    return (f'<article class="skill" id="{cid}" data-form="base"><div class="stage"><canvas data-id="{cid}" width="800" height="500" aria-label="{E(name[1])}"></canvas>'
            f'<button type="button" class="pp" aria-label="Pause">❚❚</button></div>'
            f'<div class="txt"><div class="head"><span class="num">{num}</span><h3>{bi(name)}</h3></div>'
            f'<div class="meta">{ch}</div>{sw}{ps}</div></article>')

nav = ''.join(f'<a href="#{s[0]}">{bi(s[1])}</a>' for s in SECTIONS)
body = ''
for sid, title, intro, cards in SECTIONS:
    it = f'<p class="intro">{bi(intro)}</p>' if intro[0] else ''
    body += f'<section id="{sid}"><h2>{bi(title)}</h2>{it}' + ''.join(card(c) for c in cards) + '</section>'

three = '../node_modules/three/build/three.module.js' if LOCAL else 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js'
addons = '../node_modules/three/examples/jsm/' if LOCAL else 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/'
CSS = open(os.path.join(HERE, 'style.css')).read()
ALLF = ('<div class="seg allforms" role="group" aria-label="Style for every card"><button type="button" data-f="base" aria-pressed="true"><span class="zh">全部基础</span><span class="en">All base</span></button>'
      + ''.join(f'<button type="button" data-f="{f}" aria-pressed="false"><span class="zh">全部{FN[f][0]}</span><span class="en">All {FN[f][1]}</span></button>' for f in FORMS_ON) + '</div>')
SUB = L('实时 3D，真实速度。基础形态（被动、普攻、冲刺和 26 个技能）、三种风格（钟阵、回音、和鸣）和十二个组合技。点画面暂停。',
        'Live 3D at real speed. Base forms (the passives, basic attack, dash and the 26 skills), all three styles (Bell Array, Reverb, Harmony) and the twelve combos. Click a clip to pause.')
RULES = L('头边两道铜色弧：鸣震。音：对鸣震的 +50%。应：钟应声。回：回声。头上暗铜绿裂圈：走调。困：不能行动，最多 2 秒（精英 1 秒）。首领不会被移动、扣住或翻倒，那一下 +20%。数字都是草稿。',
          'Two brass arcs by the head: Ringing. 音 Note: 50% more on a Ringing foe. 应: a bell answers. 回: an echo. A dull verdigris cracked ring over the head: Off-key. Held 困: cannot act, 2 s at most (an elite 1 s). A boss is never moved, trapped or flipped: that hit deals 20% more. All numbers are drafts.')
page = ('<meta charset="utf-8">\n' if LOCAL else '') + f'''<title>Bellwright skills</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;600&display=swap">
<style>{CSS}</style>
<script type="importmap">{{"imports":{{"three":"{three}","three/addons/":"{addons}"}}}}</script>
<div class="wrap" data-lang="zh">
<header>
  <div class="tools">
    <div class="seg speed" role="group" aria-label="Speed"><button type="button" data-s="1" aria-pressed="true">1×</button><button type="button" data-s="0.5" aria-pressed="false">0.5×</button><button type="button" data-s="0.25" aria-pressed="false">0.25×</button></div>
    {ALLF}
    <div class="seg lang" role="group" aria-label="Language"><button type="button" data-l="zh" aria-pressed="true">中文</button><button type="button" data-l="en" aria-pressed="false">English</button></div>
  </div>
  <h1>{bi(L('鸣钟者 Bellwright 技能', 'Bellwright skills'))}</h1>
  <p class="sub">{bi(SUB)}</p>
  <p class="rules">{bi(RULES)}</p>
  <nav>{nav}</nav>
</header>
{body}
</div>
<script type="module">
import * as W from './bw.js';
import {{ DEFS, FORMS }} from './defs.js';
import './core.js';
import './base.js';
import './ar.js';
import './re.js';
import './ha.js';
import './co.js';
const wrap = document.querySelector('.wrap');
const store = {{ get(k) {{ try {{ return localStorage.getItem(k); }} catch (e) {{ return null; }} }}, set(k, v) {{ try {{ localStorage.setItem(k, v); }} catch (e) {{}} }} }};
function lang(l) {{ wrap.dataset.lang = l; document.documentElement.lang = l === 'zh' ? 'zh-Hans' : 'en'; W.setLang(l); store.set('bw-lang', l);
  document.querySelectorAll('.lang button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.l === l))); }}
function speed(s) {{ W.setSpeed(+s); store.set('bw-speed', s); document.querySelectorAll('.speed button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.s === s))); }}
document.querySelectorAll('.lang button').forEach((b) => b.addEventListener('click', () => lang(b.dataset.l)));
document.querySelectorAll('.speed button').forEach((b) => b.addEventListener('click', () => speed(b.dataset.s)));
lang(store.get('bw-lang') === 'en' ? 'en' : 'zh'); speed(['1', '0.5', '0.25'].includes(store.get('bw-speed')) ? store.get('bw-speed') : '1');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
document.querySelectorAll('canvas[data-id]').forEach((cv) => {{
  const c = W.addCard(DEFS[cv.dataset.id], cv); const st = cv.parentElement; const pp = st.querySelector('.pp');
  const set = (p) => {{ c.paused = p; st.classList.toggle('paused', p); pp.textContent = p ? '▶' : '❚❚'; pp.setAttribute('aria-label', p ? 'Play' : 'Pause'); }};
  if (reduce) set(true);
  st.addEventListener('click', () => set(!c.paused));
  const art = cv.closest('article'); art._card = c;
}});
function setForm(art, f) {{ const id = art.id; const btn = art.querySelector(`.forms button[data-f="${{f}}"]`); if (!btn) return;
  art.dataset.form = f; art.querySelectorAll('.forms button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.f === f)));
  art._card.setDef(f === 'base' ? DEFS[id] : FORMS[f][id]); }}
document.querySelectorAll('.forms button').forEach((b) => b.addEventListener('click', () => setForm(b.closest('article'), b.dataset.f)));
document.querySelectorAll('.allforms button').forEach((b) => b.addEventListener('click', () => {{
  document.querySelectorAll('.allforms button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  document.querySelectorAll('article.skill').forEach((a) => setForm(a, a.querySelector(`.forms button[data-f="${{b.dataset.f}}"]`) ? b.dataset.f : 'base')); }}));
wrap.classList.add('loading');
W.start();
const buf = (m) => {{ const s = atob(m.default), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u.buffer; }};
Promise.all([import('./beetle-model.js'), import('./bell-model.js')]).then(([a, b]) => W.loadBig(buf(b)).then(() => W.loadHim(buf(a)))).then(() => wrap.classList.remove('loading')).catch((e) => {{ wrap.classList.remove('loading'); wrap.classList.add('failed'); console.error(e); }});
</script>
'''
os.makedirs(SITE, exist_ok=True)
open(os.path.join(SITE, 'index.html'), 'w').write(page)
for f in ['bw.js', 'poses.js', 'defs.js', 'core.js', 'base.js', 'ar.js', 're.js', 'ha.js', 'co.js', 'knees.js']: shutil.copy(os.path.join(HERE, f), os.path.join(SITE, f))
for js, glb, note in [('beetle-model.js', 'beetle.glb', 'The Bellwright, rigged with her passed clips'), ('bell-model.js', 'bigbell.glb', 'The passed Tripo dash bell')]:
    mp = os.path.join(SITE, js)
    if not os.path.exists(mp) or os.path.getmtime(mp) < os.path.getmtime(os.path.join(HERE, glb)):
        open(mp, 'w').write(f'// {note} (GLB, base64)\nexport default "' + base64.b64encode(open(os.path.join(HERE, glb), 'rb').read()).decode() + '";\n')
# report cards with no words
for sid, _, _, cards in SECTIONS:
    for c in cards:
        if not c[4][0][0]: print('NO WORDS', c[0])
for f in FORMS_ON:
    for r in SK[:24]:
        if not ftline(f, r[0]): print('NO FORM', f, r[0])
print('ok', len(page))
