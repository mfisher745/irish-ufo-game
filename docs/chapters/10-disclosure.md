# Chapter 10: Disclosure

Regions: `base`, then `kilnamoe`. The final fight, the broadcast, the world's reaction and home.

## Screens

| ID | Name | Size | Notes |
|---|---|---|---|
| `c10.anteroom` | Anteroom | 30 × 17 | A waiting area with chairs, a ticket machine and a plant. A receptionist's desk, empty. |
| `c10.control` | Control room | 40 × 25 | The Administrator's desk, a wall of screens, four gravity switches, the broadcast console on a dais. |
| `c10.pub` | Feeney's | 30 × 17 | The chapter 1 screen, in daylight. The telly is on. |

## Beats

1. **The anteroom** (`c10.fight.anteroom`, fight). The ticket machine gives Andrew number 848. Six `security` and four `clerk`s in three waves. This is the last place a Myko fight call can be used.
2. **Checkpoint, then the Administrator** (`c10.boss.administrator`, boss). No Myko call. If the player holds M, the ring does not fill and Myko says, by phone, that this one is Andrew's. If there are calls left he adds that he will hang on to them.
3. **The broadcast** (`c10.puzzle.broadcast`, puzzle). At the console, slot the five proofs into five channels. Each proof has a plug shape and each channel a socket, so it is a short matching puzzle with one trick: two sockets look alike until examined. Then a large button. Andrew presses it. Every screen on Earth shows the five proofs for ninety seconds.
4. **The world's reaction** (scripted). A sequence of cards and short scenes:
   - Governments confirm it within the hour.
   - The news: the weather, then a story about a bin collection dispute, then aliens.
   - Andrew's video: 41 views. One comment. It is Gary. It says "nice".
   - Colleen-Ann tells her bar she always knew, and that the aliens are probably Irish.
   - Pruitt, by a lake, turns off the radio.
5. **Feeney's** (`c10.explore.pub`). Playable. Andrew walks in and sits at the bar with E. Dympna says "Aliens, is it? Fair play," and asks if it is the same again. The fruit machine still has his euro.
6. **Epilogue** (scripted). Myko drops the act about Andrew. He is delighted and wants every detail again from the start. If all three calls are unused he remarks on it here, nearly impressed. If any were used, he does not bring them up, and that is the kindness. His last tangent is that they should tell them about this in Ohio. Andrew says "Same again". Title card. Credits.

## Boss: the Administrator

Small, grey, in a good suit. He would prefer not to be having this conversation and opens by offering Andrew a form.

- **Phase 1: delegation.** He stays behind his desk, which projects a shield. He calls `security` in pairs and stamps documents; each stamp sends a shockwave along a marked row of floor tiles. The desk shield drops for 4 seconds whenever both guards are down.
- **Phase 2: restructuring (two-thirds health).** He uses the room. Every 10 seconds he flips gravity toward one of the four walls, marked 1.5 seconds ahead by floor arrows. Loose furniture slides and hurts. Andrew can flip it back with the Glove on any of the four switches, which throws the Administrator against the far wall and stuns him.
- **Phase 3: personally (one-third health).** He takes off his jacket, hangs it up properly and fights. He has a glove of his own: a stun pulse (dodge with The Stumble), a short teleport behind Andrew with a 600 ms telegraph, and a beam that sweeps a quarter of the room. Between attacks he offers a settlement, then a better one, then a job.
- **End.** He sits down on the floor and says the broadcast console is the one on the dais, and that it will not make any difference. He is right, and he is not being unkind.

Every ability should be useful somewhere in this fight: deflect the stamp shockwaves' debris with the hurley, pierce the guards with Sliotar Strike, Stout Slam when surrounded, Poitín Breath on the desk shield's generator, the Glove on the switches.

Arena: the whole control room, 36 × 20 playable.

## Sections for call-in

`c10.fight.anteroom`, `c10.puzzle.broadcast` (Myko plugs all five in without looking and leaves the button for Andrew). Not `c10.boss.administrator`.

## Dialogue needed

Ticket 848, anteroom fight, M refusal lines (with and without calls left), the Administrator (intro and form, phase changes, three offers, end), broadcast puzzle and the button, reaction sequence (5 scenes), Dympna, epilogue (both versions of the calls remark), last Ohio tangent, "Same again", credits text, fight call and puzzle call lines.
