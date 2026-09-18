STATUS: PARTIAL
(verdict pending)

# Cert scorecard — ART-BIBLE ENFORCER — round 5 (certA5 frames, build v0.4.63 HEAD 2d05688)

Critic lens: colour discipline (<= 3 hue families; danger red-orange only on enemy threats, heal green only on heals, violet only on corruption/god-stuff), value range (LUMA buckets, murk, blown-out regions), glow halo on EVERY emitter, contact shadow under EVERY entity incl. projectiles, post stack (bloom/vignette/grade).

## Probe log (appended as measurements are taken)

### P0 — whole-frame verification (my own `node tools/analyze.mjs --ref` run)
Technician numbers reproduce EXACTLY on all four main frames:
- camp:   >160 2.243% | >200 0.841% | 16/16 | hist 18|37|17|8|5|4|3|3|2|1|1|0|0|0|0|0 | FLAT 1.81% | warm 18.9 / fol 1.3 / cool 79.8 | SAT 0.618 | danger 23 heal 1641 violet 6812 amber 32445
- combat: >160 4.952% | >200 0.832% | 16/16 | hist 11|29|21|12|7|4|3|2|2|3|2|1|1|0|0|0 | FLAT 1.85% | warm 45.1 / fol 14.0 / cool 40.9 | SAT 0.396 | danger 7515 heal 4892 violet 2456 amber 187031
- shop:   >160 3.473% | >200 0.691% | 16/16 | hist 5|33|23|13|7|4|4|3|3|3|2|1|0|0|0|0 | FLAT 1.97% | warm 43.9 / fol 6.9 / cool 49.2 | SAT 0.376 | danger 6 heal 506 violet 1933 amber 131555
- boss:   >160 3.002% | >200 1.192% | 16/16 | hist 29|31|18|7|4|2|2|2|2|1|1|1|1|0|1|0 | FLAT 1.70% | warm 37.2 / fol 8.3 / cool 54.5 | SAT 0.433 | danger 20776 heal 2552 violet 14426 amber 91191
- REF:    >160 3.418% | >200 1.427% | 16/16 | hist 27|21|13|13|9|7|2|2|1|1|1|1|1|1|0|0 | FLAT 16.68% | warm 22.5 / fol 1.1 / cool 76.4 | SAT 0.582 | danger 89724 heal 446 violet 13339 amber 56031
Helpers written (prefix-safe, nothing shared touched): tools/certA5-bible-crop.mjs, tools/certA5-bible-diff.mjs, tools/certA5-bible-hue.mjs.

### P1 — CAMP boxes (captures/certA5-camp.png)
hearth-core 630,300,130,110: >160 75.664% >200 45.916% 13/16 hist 0|0|0|0|1|2|4|6|3|8|8|9|26|13|10|11 warm 99.9%
portal 600,20,220,120: >160 0.500% >200 0.170% 13/16, cool 99.3% (violet confined here: hue-locator violet cells all within x550-850,y0-150)
deadground-R 1040,600,320,200: >160 0.016% 7/16 hist 28|38|29|4|0..  FLAT 0.00%
deadground-L 200,650,300,120: 5/16 hist 1|68|20|10|1  FLAT 0.00%
farBR 1300,600,250,180: 5/16 hist 74|23|3  ;  quietfloor-BR 850,700,400,200: 11/16 hist 10|57|25|4|1|1 FLAT 2.48%
VIGNETTE: rightedge 1560,300,40,300 hist 75|25 (2/16) vs rightinner 1480,300,40,300 hist 55|38|6 (11/16); leftedge 0,300,40,300 12|34|16|17|5|13|1|1 vs leftinner 80,300,40,300 4|39|13|10|11|9|8|2|2|1; topedge 1000,0,200,25 46|43|7|2 vs topinner 1000,60,200,25 8|86|5; botedge 1150,860,300,40 14|52|32|2 vs botinner 1150,780,300,40 24|70|4|2 (bottom edge NOT darker than inner — vignette weak at the bottom)
DISCS: healerdisc 750,430,120,60 foliage 46.4% (heal 1641 whole-frame: hue cells (750,400)=637 (800,400)=310 (750,450)=304 + HUD F1/F4 bars (500-550,800-850)=354); swordsdisc 830,370,110,50 warm 69.6% cool 30.3% (rose disc); tankdisc warm 83.1; archerdisc foliage 25.4
EMITTERS: lantern1 500,30,80,120 >200 0.896% 13/16; lantern2 860,30,80,120 >200 0.917% 14/16; torch-cart 1370,330,80,100 >160 0.588% >200 0.188% 15/16; lamp-forge 120,650,80,80 >160 13.8% >200 3.9%; tentglowR 1010,200,90,70 >160 2.1% ; tentglowL 300,150,90,80 >160 0.000% (left tent glow is dead — warm 7.3%)
DANGER: 23 px whole frame, cells (850,350)=8 (850,50)=3 (900,50)=3 ... noise. Gate <500 passes.
CONTACT STRIPS (under vs clear, same y): healer 770,482 hist 0|0|7|3|36|35|11|8 vs 640,482 0|0|0|0|0|0|24|76 (~40 luma darker); tank 470,458 buckets 2-7 vs 370,458 buckets 1-2 (tank strip is BRIGHTER — it sits on the hearth pool, not a shadow read); sword 855,418 2-8 vs 960,418 0-1 (brighter, pool); archer 485,252 has 31% bucket 11 (disc rim) ; bench 820,596 93% b1 vs 950,596 46/40% b2-3 (~20 darker); woodpile 382,546 81% b1 vs 472,546 67% b3 (~30 darker); rocks 1180,668 56% b0 vs 1080,668 93% b2 (~25 darker); cart 1270,606 85% b0 vs 1120,606 36/23/35 b0-2 (~15 darker); cartTR 1330,150 35/65 b0-1 vs 1230,150 8/83/9 (~5 darker — near nil)
CAMPSEQ DIFFS: 00v01 whole 10.207% changed / 0.505% strong / mean 2.81; 00v03 5.967/0.585/2.44; 00v05 7.170/0.556/2.38; party box 420,300,540,220 00v03 12.636%/2.993%/7.08, 00v05 53.169%/2.708%/10.12; cart box 1230,410,210,190 00v03 15.747%/0.173%/2.70 (fireflies + flicker, no camera motion); portal 600,20,220,120 5.208/0.432/3.66
Crops written: certA5-bible-camp-{hearthparty,portal-lanterns,shadows,hud,deadground,forge,fireflies,healerfeet,cart,torch}.png

### P2 — COMBAT boxes (captures/certA5-combat.png, ?seed=4242 room 1, shot t572, telegraph live 8 ticks before resolve)
telegraph-lane 430,560,270,300: danger 5686 amber 13699 >160 8.6% 14/16 warm 69.2
ground-R-of-party 900,600,400,200: >160 0.000% 6/16 hist 62|14|15|8|1 FLAT 0.00% (dark but not flat)
darkBR 1100,620,450,200: 7/16 hist 17|16|27|25|12|2 FLAT 0.93%; darkTL 0,80,250,120: 6/16 hist 20|64|12|3|1; botL-fence 0,750,300,100 6/16
clearing-TR 850,120,300,120: 16/16 >160 3.514% >200 2.086%
TORCHES: torch1 1030,190,90,120 >160 42.9% >200 11.4% 15/16 warm 96.8; torch2 260,490,90,110 >160 71.7% >200 26.4% 14/16; torch3 140,580,90,110 >160 40.7% >200 0.000% 11/16 (this one has NO white-hot core); torch4 1380,380,90,110 >160 41.1% >200 10.1%; torch5 1380,780,90,100 >160 0.000% (pool only, emitter off-frame/under HUD); lantern-TL 30,190,70,80 >160 0.000% warm 94.9 (lantern lit but no core); lamp-top 980,20,60,60 >160 1.0%; lamp-TR 1500,100,80,80 >160 0.000%
HEAL: mendbolt 1030,390,80,50 heal 945 foliage 83.3 >160 24.9%; plus14 760,310,90,40 heal 527; healerdisc 740,420,110,60 heal 2285 (permanent identity disc, not a heal)
HUE LOCATOR: danger 7515 = cells (500,650)=1199 (600,550)=882 (450,750)=858 (400,850)=780 (550,550)=720 ... ALL inside x400-700,y500-900 = the telegraph lane + party pile; none elsewhere. heal 4892: (1050,400)=1095 mend bolt, (750-800,300-450) healer disc + numeral, (500-550,800-850)=354 HUD F1/F4 bars, (600,50)=53 banner dot?, (1300,150)=49. violet 2456: (1300-1400,0-100) = the rune monolith TR only.
BOAR 1400,570,190,80: warm 51.2 cool 45.4 amber 4953 violet 3 (blue body + amber pool) 10/16 buckets; mantis-L 60,240,160,120 warm 53.4 foliage 29 cool 17.5
SHADOW STRIPS: boar-under 1430,652 hist 0|16|84 (b2) vs boar-clear 1280,652 45|55 b2-3 (~8 darker, marginal); mantisL-under 110,338 91% b3 vs clear 200,338 73% b4 (~16 darker); healer-under 770,482 0|32|49|14|4 vs clear 880,482 0|30|49|20 (IDENTICAL — no contact shadow under the healer); volley1-under 500,655 buckets 4-8 vs clear 600,655 mostly b4 (BRIGHTER — projectile glow, no shadow); mend-under 1040,438 b3-6 vs clear 1120,438 82% b2 (brighter, glow); torch1-base 1030,320 75% b9-10 vs clear 1130,320 spread b4-9 (torch pool, no dark base shadow)
VIGNETTE: rightedge 1560,300,40,300 hist 3|22|23|19|11|14|7 vs rightinner 1480,300 0|16|14|8|8|9|16|20|8 (edge darker); leftedge 0,300 6|54|20|12|1|7 vs leftinner 80,300 0|22|38|25|10|3|1 (edge darker); topedge 1000,0,200,25 2|91|6|1 vs topinner 2|49|16|10|7|9|5|2; botedge 1150,860 9|54|18|19 vs botinner 18|15|16|10|29|11 (edge darker) — vignette 0.82 measurable on all four sides
COMBATSEQ (8x150ms from t>=396, resolve t412): whole-frame diffs 00v01 15.475%/5.499%/8.42, 01v02 17.021/5.274/8.62, 02v03 12.576/4.814/7.21, 03v04 12.884/5.207/7.76, 04v05 17.548/5.349/8.40, 05v06 13.568/4.152/7.21, 06v07 9.816/3.113/5.45; party box 430,500,320,380 00v01 44.530%/31.200%/36.36 (telegraph resolve + hit flash), 01v02 13.241/5.465/8.20, 02v03 0.127/0.032/1.83 (party has LEFT the box), 03v04 14.921/8.742/9.97; static torch box 1030,190,90,120 00v01 14.0%/0.44%, 01v02 65.8%/4.7%/12.21, 02v03 48.6%/4.1%/11.05, 03v04 33.3%/2.2%/9.22, 04v05 18.7%/0.24% — a static prop shifting 48-66% of its pixels = camera shake (screenshake event) plus flame flicker. per-frame danger 9104/47/1177/15/11842/10470/12409/7243; heal 5137/2104/1654/1010/1508/2119/644/2591
Crops written: certA5-bible-cbt-{projectiles,boar,mantisL,party,healer,banner,mendbolt,torch,darkBR,pointer}.png
