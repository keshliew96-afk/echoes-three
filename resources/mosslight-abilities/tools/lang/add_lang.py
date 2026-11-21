"""Add the 中文 / English switch to an ability review page (Kesh, 17 Nov: default Chinese, English on a tap).

usage: python3 add_lang.py <page.html> <dict.py>
The dict file defines ZH = {english text: chinese text}. Every visible English line of the page must
be in it (skill ids like S54 / C41 stay as they are); the script stops and lists any line it lacks.
Run it after the page generator, on the generated page.
"""
import html, json, re, runpy, sys

page, dpath = sys.argv[1], sys.argv[2]
ZH = runpy.run_path(dpath)['ZH']
h = open(page, encoding='utf-8').read()
if 'id="lang-switch"' in h:
    sys.exit('already has the switch: regenerate the page first')

body = h[h.index('<div class="wrap">'):]
need = []
for t in re.findall(r'>([^<>]+)<', body):
    t = html.unescape(t.strip())
    if re.search('[A-Za-z]', t) and not re.fullmatch(r'[SCT][0-9A-Z]+', t) and t not in ZH and t not in need:
        need.append(t)
if need:
    print('missing Chinese for:'); [print('  ', t) for t in need]; sys.exit(1)

title = re.search(r'<title>(.*?)</title>', h).group(1)
used = {k: v for k, v in ZH.items() if k in html.unescape(body) or k == title}

CSS = """
/* Language switch: Chinese by default, English on a tap. */
.langbar { display: flex; gap: 4px; margin-top: 12px; }
.langbar button { font: 500 13px/1 var(--f-body); color: var(--muted); background: var(--card); border: 1px solid var(--line);
  border-radius: 999px; padding: 6px 12px; cursor: pointer; }
.langbar button[aria-pressed="true"] { color: var(--moss); border-color: var(--moss); background: var(--moss-soft); }
.langbar button:focus-visible { outline: 2px solid var(--moss); outline-offset: 2px; }
:root[lang="zh-CN"] body { font-family: var(--f-body), "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif; }
:root[lang="zh-CN"] .cd::before { content: "冷却 "; }
:root[lang="zh-CN"] .nodes::before { content: "节点："; }
"""
BAR = ('<div class="langbar" id="lang-switch" role="group" aria-label="Language / 语言">'
       '<button type="button" data-lang="zh" aria-pressed="true">中文</button>'
       '<button type="button" data-lang="en" aria-pressed="false">English</button></div>')
JS = """<script>
(() => {
  const ZH = %s;
  const TITLE = %s;
  const root = document.querySelector('.wrap');
  const nodes = [];
  const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walk.nextNode(); n; n = walk.nextNode()) {
    const t = n.nodeValue.trim();
    if (ZH[t]) nodes.push([n, n.nodeValue, n.nodeValue.replace(t, ZH[t])]);
  }
  const labels = [...root.querySelectorAll('[aria-label]')].filter((e) => ZH[e.getAttribute('aria-label')])
    .map((e) => [e, e.getAttribute('aria-label')]);
  const btns = [...document.querySelectorAll('#lang-switch button')];
  function apply(lang) {
    const zh = lang !== 'en';
    document.documentElement.lang = zh ? 'zh-CN' : 'en';
    for (const [n, en, cn] of nodes) n.nodeValue = zh ? cn : en;
    for (const [e, en] of labels) e.setAttribute('aria-label', zh ? ZH[en] : en);
    document.title = zh ? (ZH[TITLE] || TITLE) : TITLE;
    for (const b of btns) b.setAttribute('aria-pressed', String((b.dataset.lang === 'zh') === zh));
  }
  let saved = 'zh';
  try { saved = localStorage.getItem('review-lang') || 'zh'; } catch (e) {}
  apply(saved);
  for (const b of btns) b.addEventListener('click', () => {
    apply(b.dataset.lang);
    try { localStorage.setItem('review-lang', b.dataset.lang); } catch (e) {}
  });
})();
</script>
""" % (json.dumps(used, ensure_ascii=False), json.dumps(title))

h = h.replace('</style>', CSS + '</style>', 1)
h = re.sub(r'(<header>\s*<h1>.*?</h1>)', lambda m: m.group(1) + '\n  ' + BAR, h, count=1, flags=re.S)
assert 'id="lang-switch"' in h, 'no header h1 found'
h = h.rstrip() + '\n' + JS
open(page, 'w', encoding='utf-8').write(h)
print('added the switch:', len(used), 'lines in Chinese')
