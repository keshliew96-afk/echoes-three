# Builds the Hollow Cantor's review page: the style block from the Ash Raven's page, this page's body, the audit text and the script.
import json
S = '/tmp/claude-0/-home-user/3399cd1e-6e54-5b9a-920b-98ad4a8057aa/scratchpad'
W = S + '/cantor/wip'
raven = open(S + '/ravenreview/index.html').read().split('\n')
head = '\n'.join(raven[:59]).replace('<title>Tripo Ash Raven Review</title>', '<title>Tripo Hollow Cantor Review</title>')
assert 'Hollow Cantor' in head and head.rstrip().endswith('</style>')
body = open(W + '/body.html').read()
for k, v in json.load(open(W + '/audit-text.json')).items():
    assert body.count(k) == 1, k
    body = body.replace(k, v)
assert 'AUD_' not in body
libs = '\n'.join(raven[178:181])
assert 'three.min.js' in libs and 'OrbitControls' in libs
page = head + '\n\n' + body + '\n' + libs + '\n<script src="cantor-model.js"></script>\n<script>\n' + open(W + '/script.js').read() + '\n</script>\n'
open(S + '/cantorreview/index.html', 'w').write(page)
print(len(page))
