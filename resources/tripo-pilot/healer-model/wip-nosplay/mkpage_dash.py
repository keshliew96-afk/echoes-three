# the Healer's page with the dash rule and her own dash: reads the base page (never write to it), writes healerdash/index.html
import sys
S='/tmp/claude-0/-home-user/c6e5249c-651a-5d08-9e09-1bd0fe313c84/scratchpad'
sys.path.insert(0,S); from dashrule import apply as dashrule; from dashkit import apply as dashkit
p=open(S+'/review/index.html').read()
p=dashrule(p)
p=dashkit(p,{'go':[0.06,0.33],'dist':1.8,'inv':[0,0.35],'prof':'surge','ev':[['start',0.0],['go',0.06],['heal',0.37]],
  'note':'Her dash is the leaf turn: she dips, springs up and turns once in the air with the staff kept upright, lands soft and bows her head with her free paw on her chest. As she lands she heals herself a little (the green ring closing on her feet, the rising motes and the small plus); as a first number we would try 2% of her health. She turns to face where she dashes.'},open(S+'/tripo/dashfx.js').read())
NOTE_TOE='<p class="note"><strong>No turned-out feet (13 November).</strong> In every walk and run the toes now point straight ahead. Before, they turned out by 10 to 21 degrees (外八). Each leg turns in at the hip by as much as the foot was modelled turned out, in every frame and in all eight directions; the steps themselves are unchanged, and standing still keeps the modelled stance. Checked as numbers and as stills from above and from the front, not at full speed.</p>\n'
assert p.count('<p class="note">')>0
p=p.replace('<p class="note">',NOTE_TOE+'<p class="note">',1)
open(S+'/healerdash/index.html','w').write(p)
