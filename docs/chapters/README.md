# Chapter specs

Owner: `creative-director`. One file per chapter. The level-builder builds from these; systems-dev reads them to know what the systems must support. Dialogue is not in these files. It is written separately in `src/content/dialogue/` and referred to here by beat.

## How to read a spec

- **Screens** are given in tiles (16 × 16). One camera view is 30 × 17. Bigger screens scroll.
- **Beats** happen in the listed order unless marked optional.
- **Sections** are the units the systems care about. Every section has an ID and a kind:

| Kind | Myko call-in | Notes |
|---|---|---|
| `fight` | Yes | Ends when every enemy is down. |
| `boss` | Yes, except `c10.boss.administrator` | Has phases. |
| `setpiece` | Yes | A scripted finale that is not a straight fight. |
| `puzzle` | Yes | The chapter's physical puzzle. Solvable in under two minutes. |
| `deduction` | Yes | Link three clues to name the next lead. |
| `stealth` | No, unless it has turned into a fight | Getting caught converts it to a `fight` with the same ID plus `.alarm`. |
| `explore` | No | Investigation and walking about. |

- Every `fight`, `boss`, `setpiece`, `puzzle` and `deduction` must implement `completeNow()`.
- A checkpoint sits before every `stealth` and every `boss` or `setpiece`, and wherever a spec says so.
- Numbers in these files (enemy counts, timings, sizes of puzzles) are starting values. The authoritative copy goes in `src/content/tuning.ts` under the section ID, and code reads it from there.
- Clues have IDs like `c2.clue.fragment`. Clues marked *key* are needed for the deduction board; the rest are colour.

## Enemy roster

| ID | First seen | Behaviour |
|---|---|---|
| `lad` | 1 | Walks up, winds up a slow swing. Backs off after hitting. |
| `cousin` | 2 | A `lad` who also does a short shoulder charge. |
| `suit` | 2 | "Department" man. Patrols with a torch in stealth. In a fight, uses a baton with a two-hit pattern. |
| `worker` | 3 | Keeps his distance and throws boxes in an arc. Weak up close. |
| `brawler` | 4 | Fast jab, then a grab that holds Andrew for a second unless he Stumbles. |
| `docker` | 4 | Long reach with a cargo hook. Slow recovery. |
| `agent` | 5 | Taser dart at range (a straight, slow projectile), cuffs up close. Works in pairs and tries to flank. |
| `drone` | 6 | Flies. Spotlight cone in stealth. In a fight, fires a bolt the hurley can deflect back. |
| `mascot` | 7 | An alien in a foam costume. Looks like a tourist until it attacks. Tumbling body slam. |
| `clerk` | 7 | Alien office worker with a small ray pistol. Fires three-shot bursts, then reloads politely. |
| `security` | 9 | Alien guard with a frontal energy shield. Must be flanked, stunned with the Glove or hit with Sliotar Strike. |

Bosses and set pieces are described in their chapter.

## Carry-over rules

- Abilities, empties, drinks in hand, casebook and Myko calls carry from chapter to chapter.
- The hangover rule applies from the end of chapter 3 onward. Chapter 4 always starts with a hangover regardless of Buzz (they drank on the plane). Chapters 1 to 3 never start with one, so the tutorial does not punish drinking before it has been explained.
- A Myko call saves on the spot. If Andrew dies after one, he comes back where he stood when he called, not at the earlier checkpoint.
- Chapter Select starts a chapter with the abilities it expects, three stout, no hangover and the save's current Myko calls.

## Index

| # | File | Sections Myko can finish |
|---|---|---|
| 1 | [01-a-quiet-pint.md](01-a-quiet-pint.md) | kegs puzzle, chipper fight, Big Tom |
| 2 | [02-the-bog.md](02-the-bog.md) | sheep puzzle, yard fight, the ram |
| 3 | [03-regional-office.md](03-regional-office.md) | crate puzzle, bay fight, deduction, Halloran |
| 4 | [04-southie.md](04-southie.md) | brawl, container puzzle, deduction, foreman |
| 5 | [05-the-paper-trail.md](05-the-paper-trail.md) | redaction puzzle, cubicle fight, deduction, Pruitt 1 |
| 6 | [06-flyover-country.md](06-flyover-country.md) | maze puzzle, drone fight, deduction, combine |
| 7 | [07-gift-shop.md](07-gift-shop.md) | who-is-an-alien puzzle, stockroom fight, deduction, mascots |
| 8 | [08-the-long-road.md](08-the-long-road.md) | junction puzzle, fence fight, deduction, Pruitt 2 |
| 9 | [09-level-minus-four.md](09-level-minus-four.md) | gravity puzzle, lab fight, deduction, lockdown |
| 10 | [10-disclosure.md](10-disclosure.md) | anteroom fight, broadcast puzzle (not the Administrator) |
