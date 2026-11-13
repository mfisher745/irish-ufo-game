# Chapter 1: A Quiet Pint

Region: `kilnamoe`. Night, raining lightly. Teaches movement, interacting, drinking, the Buzz meter and the punch combo. This is the vertical slice, so it has to be fun on its own.

## Screens

| ID | Name | Size | Notes |
|---|---|---|---|
| `c1.pub` | Feeney's | 30 × 17 | Bar along the top wall, four tables, a fruit machine, a dartboard, the quiz trophy shelf, the jacks, a back door to the keg yard. Amber light, the only warm screen in the chapter. |
| `c1.yard` | Keg yard | 20 × 17 | Small, walled, kegs and crates. Gate to Main Street. |
| `c1.street` | Main Street | 70 × 17 | Scrolls left to right: Feeney's front, the bookies, the chipper (lit, with a queue), the church gate, a parked tractor, then the road out of town. |
| `c1.road` | Bog road | 30 × 17 | Dark. A stone wall, a gate, the bog beyond. |

## Beats

1. **Title card**, then `c1.pub`. Andrew is at the bar. Myko stands by the corner table and stays there until Andrew leaves.
2. **Dympna's list** (`c1.explore.pub`). Dympna gives the tutorial as a list of what Andrew owes her. Each item is an input prompt:
   - Walk to the end of the bar (WASD). He owes her for the stool.
   - Talk to her (E). He owes her for last Thursday.
   - Drink the pint she puts down (Q). It goes on the slate. The Buzz meter appears and reaches Grand.
   - Optional examines: the quiz trophy shelf (Andrew mentions it), the dartboard, the photo of the 1994 county team.
3. **The fruit machine.** It took Andrew's euro. Left click three times teaches the punch combo; the haymaker makes it pay out one coin, which Dympna takes off the slate. Myko comments from his table.
4. **Closing time.** Dympna has locked the front door for a lock-in that Andrew is not part of. The way out is the back.
5. **Keg puzzle** (`c1.puzzle.kegs`, puzzle). Two full kegs block the yard gate. Kegs are pushed by walking into them and slide one tile at a time. Six-by-five play area, two kegs, one fixed crate; solvable in four pushes. This teaches pushing for the crate puzzle in chapter 3. Myko follows from here.
6. **Main Street** (`c1.explore.street`). Checkpoint on arrival, so dying at the chipper does not send the player back to the pub. Pickups: a naggin of whiskey behind the bookies' bins, crisps on the chipper windowsill. Empties are counted on the HUD from the first drink; they have no use yet and Myko says collecting them is a habit, not a plan.
7. **The row outside the chipper** (`c1.fight.chipper`, fight). The last spice bag has gone to the person ahead of Andrew. Words are had. Three `lad`s: one first, then two together. The spice bag is the reward and heals fully.
8. **Checkpoint.** A prompt introduces the Myko call (hold M) here, as information only. Myko says he is there in an advisory capacity.
9. **Big Tom Brennan** (`c1.boss.bigtom`, boss) by the tractor.
10. **The lights** (`c1.explore.road`). Andrew walks out the bog road. Lights move over the bog, silently, and go down behind the hill. Myko was looking at his lighter. Chapter ends.

## Boss: Big Tom Brennan

He wants the tenner back. He is twice Andrew's width and not angry, just thorough.

- **Phase 1.** Wind-up haymaker (telegraph 800 ms, big knockback) and a straight bull charge across the street. If the charge hits the tractor or the church gate he is dazed for 2 seconds and takes double damage.
- **Phase 2 (half health).** He takes off his jacket and folds it on the wall. Attacks are 25% faster and he adds a two-swing combination.
- **End.** He sits down on the kerb and asks again, politely. Andrew does not have a tenner. Myko pays it.

Arena: 30 × 12 section of the street, tractor at one end, gate at the other. Two stout bottles on the wall of the church as pickups.

## Sections for call-in

`c1.puzzle.kegs`, `c1.fight.chipper`, `c1.boss.bigtom`. Using a call in the tutorial chapter is allowed and Myko's line should make clear what he thinks of that.

## Clues

None. The casebook arrives in chapter 2.

## Closing scene

On the bog road, after the lights. Andrew is certain. Myko asks whether it might have been a helicopter, a plane, a lad with a torch or the drink. Andrew says it was none of those. Myko agrees to come and look in the morning, because he has nothing on.

## Dialogue needed

Dympna's list (5 steps and 3 examines), fruit machine (3), lock-in (2), keg yard (2), street pickups (2), chipper row (intro, mid, end), M prompt, Big Tom (intro, phase change, end), the lights and closing scene, fight call and puzzle call lines.
