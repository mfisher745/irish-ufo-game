# Style guide

Owner: `creative-director`. This document says how the game looks, reads and sounds at the level of detail an implementer needs. DESIGN.md says what the game is; where the two disagree, DESIGN.md wins and this file has a bug.

## 1. Pixels

- Internal resolution is 480 × 270. One view is 30 × 16.875 tiles of 16 × 16, so design screens as 30 × 17 with the bottom row partly under the HUD.
- Scale by whole numbers only, with no smoothing and no sub-pixel camera positions. Round the camera to whole pixels.
- Every colour comes from `src/art/palette.ts`. No gradients, no alpha blending except for three cases: vision cones (40% alpha), the hangover brightness overlay and screen fades.
- Light comes from the top left. Shade is one palette step darker on the bottom and right. Nothing has more than three tones: light, base, shade.
- Characters and interactable objects have a 1-pixel `ink` outline. Scenery tiles do not. This is how the player tells what can be used from what cannot.
- No dithering on characters. Dithering is allowed on ground tiles (bog, sand, corn) in a 2 × 2 checker only.

## 2. Characters

| Sprite | Size | Notes |
|---|---|---|
| Andrew | 16 × 24 | Head 8 px tall, body narrow: 8 px at the shoulders, no belly curve. `anorak` jacket, `denim` legs, `bone` runners. Two-pixel stubble row in `skinShade`. Eyes are a single `ink` pixel each with a `skinShade` pixel under them (tired). |
| Myko | 16 × 32 | Head top is 8 px above Andrew's when they stand on the same row. 6 px at the shoulders. `mykoCoat` to the knee, `beanie`, one `white` pixel of rollie with an `amber` tip that blinks every 2 seconds. Mouth is a 3-pixel line raised one pixel at one end (the half-smile). It never changes until the epilogue. |
| Humans | 16 × 24 to 16 × 28 | One distinguishing item each: Dympna's tea towel, Halloran's hi-vis over a suit, Pruitt's lanyard and thermos. |
| Aliens | 16 × 20 | `alienGrey` skin, large `ink` eyes, shirt and tie. Shorter than Andrew, which he notices. |
| Bosses | Up to 32 × 40, vehicles up to 64 × 48 | Same three-tone rule. |

Animation, all at 8 frames per second unless stated:

- Walk: 4 frames × 4 directions for every character.
- Andrew only: punch (3 frames per hit, 3 hits), hurley swing (4), throw (3), drink (4, the head tips back on frame 3), hurt (2), The Stumble (5, he must look as if he tripped), fall over (4) and get up (3), Act Natural (2, hands in pockets, looking at nothing).
- Myko: idle slow blink (one frame every 4 seconds, held for 300 ms), smoke puff (3), call-in stroll (the normal walk; he does not get a run cycle, ever), one-handed swat (3).
- Enemies: walk, telegraph (2 frames, held, with a `white` flash on the first frame), attack (2 to 3), hurt (1), down (2).

Every enemy attack has a telegraph frame held for at least 400 ms. If the player cannot see it coming, it is a bug.

## 3. Tiles and screens

- Each region has one tileset texture of at most 16 × 16 tiles (256 tiles), drawn by a generator in `src/art/`.
- Walkable ground is always lower in contrast than walls and props.
- Doors and exits are marked with a 2-tile strip of `amberLight` (indoors) or a break in the wall line (outdoors). The player should never hunt for an exit.
- Stealth props that work with Act Natural share a small `white` corner bracket on their outline, shown only after chapter 5 teaches the ability.
- Vision cones are `alarm` at 40% alpha when alerted, `amberLight` at 40% otherwise.

## 4. HUD and text boxes

- HUD sits in the bottom 16 px and the top-left corner. Top left: health as pint-glass pips, the Buzz meter under it (64 × 6 px, with three notches at 20, 60 and 90). Bottom left: selected drink and empties count. Bottom right: current special ability and three rollie icons for Myko calls. A spent call is an `ink` stub.
- The commentary box is 480 × 40 at the bottom, above the HUD strip, and never pauses play. It holds a 32 × 32 portrait at the left and up to 3 lines of text.
- The scripted-scene dialogue box has the same layout, pauses play and advances with E or left click.
- Holding M draws a ring that fills clockwise around Myko's rollie icons over 1 second. Releasing early cancels with no cost.

## 5. Font

- One bitmap font generated in code: 5 × 7 glyphs in a 6 × 9 cell, upper and lower case, digits, and `. , ' " ! ? : ; - ( ) / + × € $ % &`. Include á é í ó ú and their capitals; "Poitín" must render properly.
- Text is `white` on `ink` with no shadow. Speaker names are coloured: Andrew `anorak`, Myko `beanie`, everyone else `fog`. Narrator cards are `bone`, centred, all caps.
- A dialogue line fits in 3 lines of 64 characters. Anything longer is two lines of dialogue or a worse joke.

## 6. Writing

DESIGN.md section 2 is the rule. These are the mechanics of applying it.

- All text lives in `src/content/dialogue/`, one file per chapter plus `common.ts` (pickups, HUD, menus, death lines, hints, idle lines) and `callins.ts`.
- Every line has a stable ID: `c3.halloran.intro.02`. Code refers to IDs and never to strings.
- Andrew's lines are short. If Andrew has more than two sentences, Myko should have had one of them.
- Myko insults the plan, the evidence and the outfit. He never insults Andrew's intelligence in a way that would hurt, and never his drinking.
- Stage directions go in round brackets and italics in the source and render in `fog`: *(quietly)*.
- No exclamation marks for Andrew or Myko. Americans get as many as they like.
- Pickup text follows the sample: name in bold, the effect, then one dry sentence.
- Ohio lines are sincere. If an Ohio line could be read as sarcasm, rewrite it until it cannot.
- Call-in lines: each chapter has one for a fight and one for a puzzle, plus Andrew's casebook entry and Myko's margin note. Myko's angle is always that Andrew nearly had it.
- Casebook entries are in Andrew's first person, clipped, with the confidence of a man writing a report nobody asked for. Margin notes are Myko's, in `beanie`, and are shorter than the entry.

## 7. Sound

- Dialogue blips: one square-wave blip per character shown, 880 Hz for Andrew, 440 Hz for Myko, 660 Hz for everyone else, 1320 Hz with slight detune for aliens.
- Regional themes are 16 to 32 bars, loop cleanly and stay under the effects in the mix. Kilnamoe: tin-whistle-like lead (triangle with fast vibrato) in D minor over a drone, slow. Cities: walking bass and hi-hat noise. Ohio: major key, open fifths, unhurried; it is the happiest tune in the game. Roswell: theremin-like sine with portamento over a cheap drum machine. Nevada: sparse, one low drone and wind noise. Base: detuned pads and a clock tick.
- Hits are short noise bursts with a pitch drop. The haymaker and the hurley get a lower thump layered under.
- The alarm is two alternating tones and stops as soon as the fight it triggered is over.
- Myko's call-in has no fanfare. The music drops to the bass line only until he is done.
