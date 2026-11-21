# Packs a rigged GLB and its timing table into the page's model file. usage: python3 modeljs.py <glb> <meta.json> <out.js>
import base64, sys
b = base64.b64encode(open(sys.argv[1], 'rb').read()).decode(); meta = open(sys.argv[2]).read()
open(sys.argv[3], 'w').write('window.MODEL_GLB_B64="' + b + '";\nwindow.MODEL_META=' + meta + ';\n')
