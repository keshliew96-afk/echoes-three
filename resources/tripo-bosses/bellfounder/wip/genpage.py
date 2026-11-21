# Builds the Bellfounder review page: the style block from the Ash Raven's page, this page's body and the script.
S = '/tmp/claude-0/-home-user/3399cd1e-6e54-5b9a-920b-98ad4a8057aa/scratchpad'
W = S + '/bell/wip'
raven = open(S + '/ravenreview/index.html').read().split('\n')
head = '\n'.join(raven[:59]).replace('<title>Tripo Ash Raven Review</title>', '<title>Tripo Bellfounder Review</title>')
assert "Bellfounder" in head and head.rstrip().endswith('</style>')
body = open(W + '/body.html').read()
libs = '\n'.join(raven[178:181])
assert 'three.min.js' in libs and 'OrbitControls' in libs
page = head + '\n\n' + body + '\n' + libs + '\n<script src="bellfounder-model.js"></script>\n<script>\n' + open(W + '/script.js').read() + '\n</script>\n'
open(S + '/bellreview/index.html', 'w').write(page)
print(len(page))
