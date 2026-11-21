# Bellwright: design notes

**2026-11-20, on kit 1.2.** Design only (the freeze holds). The kit, `BELLWRIGHT_KIT.md`, is
the short read; this file holds the whole rules, the motions and the lines for the page and the
build. Numbers are guesses.

## 1. The ask and how I read it

- **N1.** Kesh, 19 Nov: "oh, we missed the Beetle Bellwright hero". The seventh hero gets her
  kit and talents the way the other six did: a pool of 26 skills (she holds 4), three play-style
  paths with one pick per tier, a form of every skill for each style, no two forms alike.
- **N2.** His picks, 19 Nov: "1b, chimes and bourdon mix together, the empty slot pick harmony,
  and harmony not only buff, it also give debuff to enemy" and "2a, refer to 琴女, 赛乐芬妮
  passive in LoL game". My reading:
  - The three styles are **Bell Array 钟阵** (my Chimes and Bourdon drafts in one: many small
    bells round one giant bell), **Reverb 回音** and **Harmony 和鸣**. I called the first one
    "Belfry" in the chat; the game already has a class node named Belfry 钟楼, so the style is
    Bell Array in English. Its Chinese name is the same as I showed him.
  - Harmony touches both sides: friends are In Tune, foes are Off-key, and half its forms are
    things done to foes.
  - The passive is Sympathy (my option a) with two more parts: every third skill is heard
    twice (Seraphine's Stage Presence), and the third skill readies a Chord on her next attack
    whose effect follows that skill (Sona's Power Chord).
- **N2b.** His second message, 19 Nov: "all a". The six picks of kit section 5 are closed:
  the pool as listed, the combo's great bell hangs, the dash cannot be hit from its first
  frame, Discord turns foes on foes, Downbeat is a timing window, all twelve combos.
- **N2c.** His rule, 20 Nov (from the page thread): "bellwright, make it no heal or shield, only
  buff or debuff". I read "shield" as anything that soaks, blocks or cancels damage for a
  friend: wards, the Golden Bell, "cannot fall below 1", damage passed to a foe, "take 25%
  less", shots stopped for friends. All are gone in kit 1.2 (kit section 5 lists them). Kept, my
  call: the bell dash and the moment she cannot be hit inside Wing Hop and Click (they guard
  her alone, as every hero's dash does), and Bat back (a swing that returns shots).
- **N3.** What I did not do: no fresh judge read this kit (no helper was asked for). His marks
  on the ability page are the review, as he asked for the Tide Caller.

## 2. Her in the game today, and what changes

- **N4.** Tolly 托莉, the Bellwright 鸣钟者: a beetle bell-ringer, a zone caster. 95 health,
  speed 2.35 (only the tank is slower). Colours: Bell Brass `#F5D06B`, Verdigris `#86D3B4`,
  Old Bronze `#8A6A3E`; effects dim. `docs/BELLWRIGHT.md` is her system doc.
- **N5. Kept as they are** (eight skills): Hang Bell, Peal, Clapper, Hum, Great Bell, Knell,
  Bell Swing, Wing Hop. Their numbers are today's.
- **N6. Changed** (three). Carillon: today a bigger Peal that rehangs her bells; here a tune
  of eight strokes in turn over 3 s, with chimes hung so there are always three bells to play.
  Vesper Chime: today a shield on two hunted friends; here it lulls the foes that hunt them
  (his rule of 20 Nov). Tuning Fork: today haste and a small shield; here haste alone. All
  three wait for the build.
- **N7. New** (fifteen): Bell Jar, Rolling Bell, Muster, Jingles, Deathwatch, Earworm, Call
  Chime, Boom, Midnight, Solo, Allegro, Curfew, Click, Anthem, Alarm Bell.
- **N8. Her eight class nodes of today** and where their ideas live now:

  | Node today | In this kit |
  |---|---|
  | Bronze 青铜 (bells last longer) | Long Ropes (T10) |
  | Clangour 铿锵 (tolls hit harder) | Full House (T4), Largo (F21 Array) |
  | Resound 回响 (Peal twice) | Third stroke (R6), Twice Heard (T2) |
  | Aftertone 余音 (rings linger) | Standing wave (F10 Reverb), Carrying Voice (T12) |
  | Tuned 调音 (bells pulse a buff) | Loud bell, Morning bell, In Tune (T3) |
  | Cloister 回廊 (wards in rings) | no wards now: the "in a ring" line of Vesper Chime |
  | Belfry 钟楼 (one more bell) | Bourdon (T1): five bells |
  | Sympathy 共鸣 (a struck bell rings the others) | the passive, R5 |

  The nodes stay in the game until the build replaces them (replace, never duplicate).
- **N9.** Her relics (Bell-Rope, Verdigris Clapper) and deeds (Tolly's Toll, Full Peal) are
  not touched by this design.

## 3. Kit rules in full

- **N10. The beat 拍.** One clock, once a second, in sim time. On it: every hung bell and
  chime tolls, the Hum pulses, Deathwatch knocks, the Anthem's bells toll. Allegro doubles it
  for 5 s; Largo halves it for 6 s. A soft pulse on her back bell and on every hung bell shows
  it, so a player can see the beat without a HUD line.
- **N11. A toll** is a bell's own hit on the beat: every foe in its ring takes the toll and
  the bell's slow, and is Ringing.
- **N12. Ringing 鸣震.** 3 s, renewed by any toll or Strike. It does nothing by itself. A Note
  deals 50% more to a Ringing foe and Ringing stays. On a boss it is the same.
- **N13. A Strike 【撞】** is a bell's body hitting a foe: the bell shots of the basic attack,
  Great Bell's landing, Bell Swing, Bell Jar, Rolling Bell, Muster, Click. It leaves foes
  Ringing. A Strike is not a Note.
- **N14. A Note 【音】** is sound sent at foes: the drummed fan of the basic attack, Clapper,
  Knell, Jingles, Deathwatch's knell, Earworm, Call Chime, Boom, Midnight. A Note that passes
  through a hung bell's ring makes that bell answer.
- **N15. An answer 应声.** The bell tolls at once on the foes in its ring. Bonus damage 附加;
  each bell once a second; an answer never sets off another answer.
- **N16. Pips.** Each skill cast lights one of three pips over her head (two under Reverb).
  The basic attack, the dash and passives light none. Pips stay until used.
- **N17. The Third stroke 三响.** The cast that fills the pips is heard twice: 0.6 s later its
  hits land again in the same place for half, and its buffs and debuffs start their time
  again. Nothing else
  repeats: no second bell, no second move. Big skills too.
- **N18. The Chord 和弦.** That same cast readies it. Her next basic attack skips hits 1 and 2:
  the great bell appears on its side at once and she plays the great stroke (three waves of 3,
  a last stroke of 8, the fan of R8).
  - **Forte 强音** (a Bell skill filled the pips): the whole stroke deals double.
  - **Vibrato 颤音** (a Note skill): foes it hits are dazed 0.5 s.
  - **Diminuendo 弱音** (a Tune skill): foes it hits deal 25% less for 4 s (an elite, champion
    or boss half).
  - The pips show the colour of the coming Chord: brass for Forte, a quivering brass for
    Vibrato, verdigris for Diminuendo.
- **N19. Bells.**

  | | Ring | Toll | Slow | Lasts | Counts to the cap |
  |---|---|---|---|---|---|
  | Bell 钟 | 1.3 u | 7 | 20% | 8 s | yes |
  | Great bell 巨钟 | 1.9 u | 12 | 35% | 6 s | yes |
  | Chime 铃 | 1.0 u | 5 | none | 4 s unless said | no |
  | Bourdon 洪钟 (T1) | 2 u | 14 | 35% | its bell's time | yes |

  Three bells hang (five with T1). A fourth takes the oldest one's place. At most twelve
  chimes; the oldest goes. Foes cannot hit a bell; a bell blocks nobody.
- **N20. The Bourdon** (Bell Array only). Her oldest hung bell grows into it in 0.3 s. There
  is only one. A form that names the Bourdon calls it to that place: it leaves where it hung,
  does what the form says and hangs there after with its time started over. With no bell hung,
  the form's own bell is the Bourdon.
- **N21. Chords 弦** (Bell Array only). A line of sound from the Bourdon to every bell and
  chime within 4 u. On the beat each chord tolls on the foes it crosses: 4, Ringing. A chord
  is a hair line that flashes on the beat; it blocks nobody.
- **N22. In Tune 合调 and Off-key 走调** (Harmony only). Her tolls, her rings (Peal, Carillon,
  Midnight) and her Notes touch both sides. A friend touched is
  In Tune 4 s: 15% faster (move and attack). A foe touched is Off-key 4 s: it deals 15% less
  and takes 10% more. An elite, champion or boss: half of both. Neither adds up.
- **N23. Held 困.** Trapped under a bell, on its back, knocked down, fleeing or stood still:
  the foe cannot act and everyone can hit it. No hold over 2 s, an elite 1 s, then 2 s free.
- **N24. Big foes.** A boss is never moved, trapped, flipped or held: that hit deals 20% more.
  A champion is moved half as far and never held: 10% more. Section 9 has every form's line.
- **N25. Alone.** She is her own friend. A form that needs another friend plays as the base
  when none is in reach (audit G17).
- **N25b. Buffs and debuffs** (kit R12, his rule of 20 Nov). She never heals, shields or
  blocks a hit for a friend. Her buffs: haste (Tuning Fork, In Tune, the Anthem), more damage
  (Solo, Common foe, Conductor, War song, Crescendo), larger skills (Loud bell), shorter
  cooldowns (Morning bell), freedom from stuns and slows (Rouse), a dash given back (the
  Harmony dash). Her debuffs: Ringing, bell slows, Lulled, Off-key, Diminuendo, Upstaged,
  stripped defence, Called out, slow wind-ups, silence (Dead air), fences, holds. The same one
  again starts its time over and never adds; an elite, champion or boss takes a debuff at half
  value unless its line says more.
- **N25c. Lulled 入静** (Vesper Chime). 30% slower to move and to attack, 4 s; 45% if the
  hunted friend stands in one of her rings. "The friends foes are after": the two friends with
  the most foes aiming at them (today's rule for the skill's targets).

## 4. Talents in full

One pick per tier, from any path. Every talent works without the others (audit G24).

- **T1 Bourdon 洪钟** (Array I). The Array forms. Five bells. The oldest hung bell is the
  Bourdon (N20); chords join it to every bell and chime within 4 u (N21).
- **T4 Full House 满堂响** (Array II). 8% more damage from her for each hung bell or chime,
  up to 24%. The combo's bell and the dash bell count.
- **T7 Parting Chime 遗铃** (Array III). A foe felled while Ringing leaves a chime where it
  fell, 4 s.
- **T10 Long Ropes 长绳** (Array IV). Rings 30% wider; chords reach 30% farther; bells and
  chimes last 30% longer.
- **T13 Strike the Hour 报时** (Array V). A count of beats on which any of her bells tolled on
  a foe. At twelve the whole room hears one toll: 20 to every foe, Ringing. A clock face over
  her shows the count.
- **T2 Twice Heard 二响** (Reverb I). The Reverb forms. Two pips: every second skill is heard
  twice. A Note's second hearing starts where the first ended and comes back along the same
  path to where it began.
- **T5 Encore 再响** (Reverb II). When one skill's sound hits a foe it has already hit in the
  last 3 s (a second hearing, a bounce, a return, a tick of a zone after the first), that hit
  deals 40% more.
- **T8 Downbeat 踩点** (Reverb III). A skill pressed within 0.15 s of the beat rings true: 25%
  more, and its cooldown starts 1 s shorter. A bright ring on her bell shows a true press.
  (His pick 5: the timing window.)
- **T11 Far Voice 远扬** (Reverb IV). Notes fly 30% farther and 40% faster; her cones and
  rings of sound are 30% wider.
- **T14 Glass Note 碎音** (Reverb V). A count of Note hits on each foe, kept 6 s. The twelfth
  shatters: 30 to it and 12 within 1.5 u. A boss: the same, with no limit on how often.
- **T3 In Tune 合调** (Harmony I). The Harmony forms. N22.
- **T6 Conductor 指挥** (Harmony II). A friend within 5 u of her or of one of her bells deals
  15% more. She deals 5% more for each such friend.
- **T9 Requests 点歌** (Harmony III). When a friend casts a skill inside one of her rings,
  that bell answers (N15; with T3 the answer tunes both sides).
- **T12 Carrying Voice 远播** (Harmony IV). In Tune, Off-key and every buff or debuff
  of hers last 30% longer; anything that says "friends within X u" reaches 30%
  farther.
- **T15 Grand Pause 休止符** (Harmony V). Every sixth skill ends on a rest: one silent beat.
  Every Off-key foe stands still 1 s (an elite 0.5 s) and takes 30% more for that second. A
  boss is Off-key at full value for 4 s. With no In Tune talent, Ringing foes are stopped.

## 5. The basic attack and the dash

- **N26. Basic attack, as passed** (her model page, Version 3, his own design). 1.7 s. Hits 1
  and 2 (0.22 s, 0.56 s): she taps a small faded bell and it shoots, 4.2 u. At a hit or its
  end it floats up, grows 2.5 times, turns solid and falls: a Strike, 8 within 1 u. Hit 3: a
  great bell appears on its side before her and she drums it (0.90, 1.00, 1.10 s, three waves
  of 3) and gives it the great stroke (1.22 s: 8). The waves are Notes in an 80° fan, 3 u.
- **N27. New (his pick 2):** after the great stroke the great bell stands up and hangs 5 s where it
  was drummed, as a bell (ring 1.3 u, toll 7). It never pushes a skill's bell out.
- **N28. Its style shapes.** Bell Array: each fallen shot bell stays where it fell for 3 s as a
  chime. Reverb: the shots do not rise and fall: they fly on as Notes through every foe, 6 u,
  6 each (and under T2 the second hearing flies back). Harmony: the drummed waves go out all
  round her, 3 u, not in a fan, so friends beside and behind her are tuned.
- **N29. Dash, as passed** (page Version 6). A great bell (his Tripo bell model) drops over
  her in 0.36 s. Under it nothing hits her; she walks where steered at 1.5 times her walk
  speed for up to 2.5 s. An attack, a cast or a second dash press lifts it. The dash has top
  priority: it cancels a wind-up or a recovery (his dash rule). His pick 3: nothing hits her from
  the first frame.
- **N30. Its style shapes.** Bell Array: when it lifts the bell does not fade: it hangs where
  it stood, 5 s, as a bell that never pushes a skill's bell out. Reverb: it lifts with one
  ring, 2.5 u: 10, a Note. Harmony: it lifts on a cue 起拍: every friend within 3 u has their
  dash back at once.

## 6. Motions

- **N31. The bar** (his refs for Ashfang, the same level here): every skill is a small
  choreography: a ready pose, the cast, a flourish, an end pose held a beat. She is small,
  round and slow, so her moves are neat and exact, like a clockmaker's: the size comes from
  the bells, not from her.
- **N32. Her one rule** (from her model page, his ask): she never hits a foe. She hits a bell,
  and the bell or its sound does the damage. Every skill has a summoned bell, or her own back
  bell, in it.
- **N33. What her body can do** (rig facts from the passed page): 23 bones: the usual body,
  two antennae, two wing-case halves (the cape), the pole on her back and its bell. The mallet
  is in the right paw. Her arms reach about 16 cm: she cannot touch her own back bell (it
  rings when she rocks her body), cannot put two paws on the mallet, cannot lift a paw over
  her head. Downed is a sit. No knees on the model; the page adds knee bones from the shared
  `knees.js` (`/mnt/project-files/knees/KNEES.md`), bent in skill moves only.
- **N34. Her own gestures.**
  - The tap: the mallet taps a summoned bell at chest height (passed).
  - The drum: fast small strokes on a great bell on its side, then one big one (passed).
  - The plant and tap: a bell set on the floor, then tapped (passed, Hang Bell).
  - The sweep: a bell swung across her front (passed, Bell Swing).
  - The rock: she rocks from foot to foot and her back bell swings and rings. Her way to ring
    "herself": Peal's beats, the Hum, the Alarm Bell.
  - The baton: the mallet held upright before her face, a small lift, a small drop. A
    conductor's cue; her gesture for Tune skills.
  - The antennae: they keep time. Both flick forward on the beat; they quiver for Vibrato,
    droop for Diminuendo, stand straight up for Forte.
  - The wing cases: open for the hop (passed); flare wide for a big skill; clap shut for Click.
  - The listen: head tilted, one antenna cocked to a bell. Her end pose after a ringing skill.
- **N35. Each skill** (the base; a form's own move where it needs one).

  | # | Skill | The move |
  |---|---|---|
  | F1 | Hang Bell | the plant and tap (passed). Handful: three quick taps left to right. |
  | F2 | Great Bell | the baton lifts, holds, drops: the bell falls with the drop; she hops a little as it lands. Bell hat: she points the mallet at the foe, then taps the air twice. Three falls: three baton drops. |
  | F3 | Bell Swing | the sweep (passed). Bat the bells: a second, flatter sweep that carries through. Serve: an underhand sweep, up and over. |
  | F4 | Bell Jar | the mallet draws a small circle overhead-high (at brow height: her arm is short), then drops. Drum the jar: she trots to the jar's side and drums it, the passed drum. |
  | F5 | Rolling Bell | she sets a bell on its side and gives it one push with her shoulder and a tap to start it. Parade: she walks behind it, tapping time. |
  | F6 | Muster | the baton, then both antennae snap to the pointer; the bells come. Formation: a full turn on the spot with the mallet out. |
  | F7 | Peal | three beats of the rock (passed timings 0.50, 0.74, 0.98 s). |
  | F8 | Carillon | she conducts: eight small baton strokes left to right across the bells, wing cases flared, a last stroke held. Great Toll: one long lift on her toes, the wing cases wide, and down. |
  | F9 | Clapper | the point and tap (passed): a bell batted forward. |
  | F10 | Knell | a slow tap on a dark bell, and she bows her head as the line goes. Temple log: she steps aside and waves it through with the mallet. |
  | F11 | Jingles | she shakes a string of little bells from under a wing case and flicks it out. |
  | F12 | Deathwatch | she knocks on her own shell with the mallet's butt, three times on the beat: the deathwatch beetle's tap. |
  | F13 | Earworm | one antenna curls and twirls like a finger beside the head; a tiny bell circles the foe's head. |
  | F14 | Call Chime | a chime tossed underhand, then the baton pulls toward her. Piper: she walks, the mallet held up, and the chime goes ahead. |
  | F15 | Boom | the passed drum, held: strokes speed up while held; the big stroke on release rocks her back a step. |
  | F16 | Midnight | she plants her feet and rocks, slowly, twelve times; the wing cases open a little wider each stroke; on the twelfth they are full wide and she is on her toes. She can walk between rocks. |
  | F17 | Wing Hop | the hop (passed). Bell hop: she lands on the bell's crown, wobbles, hops on. Ride the note: she sits on the note like a sledge. |
  | F18 | Vesper Chime | the baton to each hunted friend in turn, then a slow finger-to-lips hush with one antenna laid along her face; the foes round them sag. |
  | F19 | Tuning Fork | she takes the fork from her cape and strikes it on the mallet's shaft, then holds it up. The second fork on her cape back is this one. Two-tone: she plants it in the floor. |
  | F20 | Solo | she turns to the friend, bows her head and sweeps the mallet out to them, palm up: "yours". While the solo lasts her antennae beat time to the friend's hits. Drummer: she pats the Bourdon off toward them. |
  | F21 | Allegro | she taps time on her own shell, twice as fast, antennae flicking. Largo: one slow, wide stroke in the air. |
  | F22 | Curfew | the mallet draws a circle on the floor before her; the ring rises from the line. |
  | F23 | Click | she folds, the wing cases clap shut, and the snap flings her; she lands on her back and rocks upright (a click beetle's flip). Meteor: she lands sitting on the Bourdon's crown. |
  | F24 | Anthem | wing cases full wide, the mallet high as her arm goes, held for a beat; then she conducts in small strokes while it lasts. |
  | F25 | Hum | no move: her back bell sways on the beat. |
  | F26 | Alarm Bell | her hit flinch is the rock: the back bell rings by itself. |

- **N36. End poses.** After a Bell skill: the listen. After a Note: the mallet back to her
  chest, antennae settle. After a Tune: a small bow of the head. After a big skill: she sits
  back on her pack for a beat, then stands.

## 7. Formula, AI seat, look, sound

- **N37. The damage formula** (v1.2, `/mnt/project-files/damage-formula/`). Audit, section
  "The damage formula on her kit". In short: Strikes, tolls, Notes and second hearings are
  direct hits; answers, chords' tolls, Gift bells and Many voices are bonus damage; Earworm is
  damage over time. She has no shield.
- **N38. AI seat, all styles.** Today's rules (`partyai.js`): she hangs bells where foes stand
  or will pass, keeps the Archer's stand-off, lulls the foes that hunt a friend. New: she casts a
  Note only when a Ringing foe is in its path, or a bell is; she keeps the Chord for a pack in
  the fan; she never lets the pips sit full for more than 3 s.
  - Bell Array: bells go in a ring round the Bourdon within chord reach; she moves the Bourdon
    onto the biggest foe.
  - Reverb: she lines up a Note with a bell and a foe; she never tries the Downbeat window: an
    AI seat rings true one cast in four.
  - Harmony: she stands within 5 u of the most friends; debuffs go to the foe most friends are
    hitting; Solo goes to the friend that has dealt the most in this room; she starts Midnight
    (Crescendo) when two or more friends are within 4 u.
  - She never hops, clicks or rides onto a floor warning or a bed (audit G25).
- **N39. The look.** She takes the magic template for everything but Bell Swing (blade), as
  today (`docs/VFX_TEMPLATES.md`, "Which heroes take which"). Summoned bells are faded copies
  that turn solid at the strike (her model page). Bell Brass for bells and Notes, Verdigris for
  her own back bell, her buffs on friends and returning sound, Old Bronze for the Bourdon and for dust. She
  never wears Ember or Violet (the colour rule), so Off-key is not purple: it is a dull, cracked
  verdigris ring that wobbles over the foe's head. In Tune is a thin steady brass ring at a
  friend's feet. Ringing is two small brass arcs shaking beside the foe's head. Glows stay dim;
  rings and warnings stay at full strength.
  - Bell Array: chords are hair lines of brass that flash on the beat. The Bourdon is Old
    Bronze with a verdigris lip, and its ring is drawn double.
  - Reverb: every sound ring has a second, fainter ring behind it. A returning Note is
    verdigris.
  - Harmony: her rings are drawn as two thin lines, brass and verdigris, a hand apart.
- **N40. Sound.** Today's bell voices (`src/audio/bellcues.js`) carry most of it. A bell: a
  clear strike and a long tail. A chime: a small high tink. The Bourdon: a low strike you feel.
  An answer: the bell's own note, softer. A second hearing: the same sound, softer and a touch
  lower. The beat: a very soft tick from her back bell. Forte: a full strike; Vibrato: a strike
  that wavers; Diminuendo: a strike that sinks. In Tune: a clean fifth; Off-key: the same note
  bent flat. New voices: the click of her shell (Click, Deathwatch), the tuning fork's hum, the
  rumble of a rolling bell, the crack of the Glass Note. The Chord's three colours want three
  notes that sit well with the music's key; that is his speaker pass.

## 8. For the page and the build

- **N41. The model.** The page thread should first check on the rig: drumming a bell on its
  side at two heights; the rock at three sizes; the shoulder push on a bell; the wing cases
  clapping shut and her landing on her back; her sitting on a bell's crown; the fork drawn from
  the cape (the paw does not reach the cape back: it may appear in the paw); knocking on her
  own shell (the mallet's butt reaches her belly, not her back). No move here puts a paw over
  her head or two paws on the mallet.
- **N42. New moves** (beyond the passed set): the rock, the baton, the listen, the shoulder
  push, the walk behind a bell, the conductor's eight strokes, the knock on the shell, the
  antenna curl, the underhand toss, the held drum, the twelve rocks, the bell landing and
  wobble, the sledge ride, the fork strike and the fork plant, the flat paw, the floor circle,
  the snap and the back landing, the sit on the crown.
- **N43. Things to show.** The beat on her bell; a toll, Ringing, and a Note on a Ringing foe
  beside a Note on a quiet one; a bell answering; the three pips, a cast heard twice, and the
  three Chords; a bell, a great bell, a chime and the Bourdon side by side; chords; In Tune and
  Off-key; a Lulled foe; a soloist; a held foe and the cap.
- **N44. Order for the page.** The passive, basic attack and dash; then base forms (24 clips);
  then one style at a time; then the combos. Chinese first with an English switch; a flat grid
  floor with dummy units, friends as dummy heroes where a form needs them; few words; knees
  from the start (his rules for review pages).
- **N45. For the build.** New machinery: one beat clock; a Ringing status; Notes as a tag on
  hits and a ring test for answers; pips, the second hearing and the Chord; chimes and the
  chime cap; one Bourdon and chords with a line test; a held state with its cap (shared with
  the Tide Caller's); a bell that traps, a bell that rolls with a wall test, bells that fly to
  a point; a count on a foe that ends in a hit (Deathwatch); a status that hops at death; a
  fence ring with rank rules; a friend-aimed buff with a reset on a kill; a tempo change; bells that follow
  friends; In Tune and Off-key; a foe that fights foes (his pick 4); a stored bonus for a next skill (Crescendo); debuffs
  that spread (Catching); a
  timing window read on the caster's own screen (his pick 5). Each goes in the module that owns the
  job: bells in `src/sim/zones.js` and `allycast.js`, as today.

## 9. Every form on a boss

A boss is never moved, trapped, flipped or held (N24). "20% more" is on that form's own hit. A
daze or stun on a boss lasts a fifth as long, never under 0.25 s (the formula). A champion:
moved half as far, never held, 10% more in place of a hold. "Same": nothing in the form needs
a ruling.

| # | Skill | Base | Bell Array | Reverb | Harmony |
|---|---|---|---|---|---|
| F1 | Hang Bell | same | same | same | same |
| F2 | Great Bell | daze a fifth | it rides the boss's head and tolls double; no blind | same | same |
| F3 | Bell Swing | no knock back: 20% more | batted bells hit it: same | its shots are sent back: same | no move: 20% more, daze a fifth |
| F4 | Bell Jar | no trap: 20% more | no trap: the five strokes land on it, 20% more | no trap: the jar rings on it 1.5 s all the same and repeats 40% | no trap: 20% more; its debuffs still spread from it 1.5 s later |
| F5 | Rolling Bell | no knock: 20% more; the bell stops at the boss and stands there | same; the chord sweeps over it | same; it bursts beside the boss twice | it stops at the boss and tolls there |
| F6 | Muster | same | same | same | same |
| F7 | Peal | daze a fifth | same | no drag: 20% more on the ring coming back | no flight: Off-key at full value |
| F8 | Carillon | same | stun a fifth | same | same |
| F9 | Clapper | same | same | same | same |
| F10 | Knell | same | same | same | defence cut 15% |
| F11 | Jingles | same | same | same | same |
| F12 | Deathwatch | same | same | same | same |
| F13 | Earworm | same | same | same | no turning: Off-key at double value, 5 s |
| F14 | Call Chime | no pull: 20% more | no yank: the Bourdon tolls on it once, 20% more | it does not follow: 20% more | shares pain with the foes called to it |
| F15 | Boom | no knock back: 20% more | same | no throw: 20% more at the far end | same |
| F16 | Midnight | stun a fifth | same | same | same |
| F17 | Wing Hop | same | same | same | the boss turns to the chime 1 s |
| F18 | Vesper Chime | Lulled at half: 15% slower (22% in a ring) | same | same | same |
| F19 | Tuning Fork | same | same | same | slow 12% |
| F20 | Solo | same | same | same | Upstaged at half: deals 15% less |
| F21 | Allegro | same | no knock down: each toll 20% more | same | wind-ups 30% longer; a move it has shown is never stopped |
| F22 | Curfew | crosses, dazed a fifth of 0.4 s (0.25 s) | not herded: the closing ring deals 10 as it passes | never silenced: its wind-ups inside take 0.5 s longer | not pushed out; it may enter |
| F23 | Click | no flip: 20% more | no flip: 20% more | no flip: 20% more on both landings | no flip: 20% more |
| F24 | Anthem | same | same | same | loses 2.5% damage a beat, to 15% |

## 10. Rules the kit's table cuts short

- **F2 Bell hat.** "The biggest foe" is the boss, else a champion, else an elite, else the foe
  with the most health within 5 u of the pointer. A blind small foe swings and misses.
- **F4 Drum the jar.** The Bourdon covers a 2 u circle; small foes in it are trapped for the
  five strokes (1.5 s). Elites inside are trapped 1 s.
- **F5 Drag chord.** The chord is drawn at any length while the bell rolls and for the 4 s it
  stands; after that the common 4 u rule holds.
- **F6 Formation.** The ring is 2.5 u from the Bourdon; the bells are spaced evenly. "The
  chords snap shut": each chord deals 12 once to the foes on it as it forms.
- **F6 Counterpoint.** A line runs from each bell to the pointer and 2 u past it. Two lines
  cross at the pointer by design; with three bells there is one crossing, counted once.
- **F8 Carillon.** The eight strokes go round the bells in the order they were hung. A foe in
  two rings takes both strokes. Chimes hung by the tune last until it ends.
- **F8 Sing along.** A friend counts as one more bell in the round; the tune still has eight
  strokes.
- **F9 Carom.** Up to five bells, nearest first, each bell once; chimes count.
- **F11 Hung notes.** They hang in a line of five, 1 u apart, across her aim at the pointer.
- **F12 Deathwatch.** The mark shows a small clock of three knocks. If the foe dies before
  the knell, the mark and its count pass to the nearest foe within 4 u.
- **F13 Earworm.** At the carrier's death it hops to the nearest foe within 4 u with its time
  left.
- **F17 Bell hop.** Each hop is a new press within 1.5 s; the cooldown starts after the last.
- **F18 Leftover.** It rings once, when the 4 s end, on every foe still Lulled by this cast,
  wherever it stands.
- **F18 Friends' chord.** With one hunted friend the chord runs from her to that friend.
- **F19 Two-tone.** A Note within 1 u of the fork splits once into two at 20° either side;
  each half deals 70%.
- **F20 Solo.** The reset is once for each cast. Your turn: the solo passes at 30% for 2 s to
  the nearest other friend within 8 u, then once more to a third; never back to the first.
  Drummer: the Bourdon follows the soloist for the solo, then hangs where they stand.
- **F16 Crescendo.** The stored bonus is kept 6 s after the twelfth stroke and is spent by
  the friend's next skill cast. Her own next skill counts.
- **F1 Loud bell.** "Larger": rings, cones and lines 30% wider and longer. Not damage.
- **F4 Catching.** Spreads Ringing, Off-key, Lulled, Diminuendo, Upstaged, Called out,
  Strip's defence cut and bell slows, each with the time it has left. Not Earworm, not a hold.
- **F22 Curfew.** The ring is 2.5 u across, set within 5 u. Foes inside when it rises stay
  in; foes outside stay out.
- **F24 War song.** "Near a friend": within 1.3 u, the Anthem bell's ring. Verses last while
  the Anthem does.
