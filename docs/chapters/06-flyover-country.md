# Chapter 6: Flyover Country

Region: `ohio`. Clear, bright, enormous sky. Introduces the hurley and drones. Myko is having the best week of his life.

## The Ohio rule

For this whole chapter Myko's unprompted commentary is admiration: the width of the roads, the ice machine, free refills, the sky, the manners, a water tower. It is sincere. He does not explain it and Andrew does not ask more than once. His insults continue as normal but each is followed by something nice about Ohio. Every screen needs at least four things Myko can admire, placed where the player will walk past them.

## Screens

| ID | Name | Size | Notes |
|---|---|---|---|
| `c6.town` | Bus station and Main Street | 50 × 20 | Very wide road, a diner, Dale's Sporting Goods, a water tower, a free car park the size of Kilnamoe. |
| `c6.motel` | The Starlite Motel | 30 × 17 | Pink. An ice machine, a pool with no water, a reception with a guest ledger. |
| `c6.fields` | Cornfields | 80 × 40 | Tall corn in rows, a farm track, the crop formation in the middle, an irrigation ditch along one edge. |

## Beats

1. **The town** (`c6.explore.town`). Key clue: `c6.clue.noticeboard` (a notice that field 9 is closed for "soil work", with a Meridian logo). Colour: the diner's bottomless coffee, which counts as tea for hangovers; a man who says hello for no reason, which unsettles Andrew and delights Myko.
2. **The hurley.** Dale's Sporting Goods has one in a bin of assorted bats. Dale does not know what it is and sells it as a "paddle". It replaces the punch: longer reach, more damage. Andrew is briefly, visibly happy.
3. **The motel** (`c6.explore.motel`). Key clue: `c6.clue.ledger` (twelve rooms block-booked by Meridian, paid by a gift shop in New Mexico). Myko spends this beat at the ice machine. Pickup: a postcard with an aerial photo of the crop formation, `c6.clue.postcard`.
4. **Checkpoint, then the fields** (`c6.stealth.fields`, stealth). Five `drone`s sweep spotlight cones over the corn. Standing still in tall corn works as Act Natural. Moving through corn makes it rustle, which is noise. Clean-run reward: a jar of something from a farm stand, which is poitín in all but name.
5. **Deflection.** A drone spots Andrew on the farm track regardless (scripted). Its bolt is slow. A hurley swing timed on it sends it back. Taught on this one drone.
6. **Drones** (`c6.fight.drones`, fight). Six `drone`s in two waves and two `agent`s on foot. Deflected bolts are the main way to reach the drones.
7. **Crop-circle maze** (`c6.puzzle.maze`, puzzle). From the ground the formation is a maze of flattened paths. Three marker stones must be stepped on in the right order, and the order is the pattern on the postcard. Tab shows the postcard. Stepping on the wrong stone resets the three.
8. **The centre** (`c6.explore.centre`). The ground opens on a hatch with nothing under it but a receipt: key clue `c6.clue.receipt`, forty snow globes, Little Green Gifts, Roswell.
9. **Deduction board** (`c6.deduction.roswell`, deduction). Link `c6.clue.ledger`, `c6.clue.receipt` and `c6.clue.postcard` (the formation is the gift shop's logo) to name the lead: Little Green Gifts, Roswell.
10. **Checkpoint, then the combine** (`c6.setpiece.combine`, setpiece).

## Set piece: the combine harvester

Unmanned, Meridian-green and coming through the corn.

- It crosses the arena in straight passes, cutting corn (and cover) as it goes. A dust plume shows the next lane 1.5 seconds ahead.
- It throws bales in an arc. Bales can be deflected with the hurley but only sideways.
- Three sensor lights on its cab are the targets. Each takes hurley hits when it passes or a deflected drone bolt (two drones escort it).
- With all three out it drives in a slow, dignified curve into the irrigation ditch.

Arena: 36 × 20 of standing corn that is mostly stubble by the end.

## Sections for call-in

`c6.puzzle.maze`, `c6.fight.drones`, `c6.deduction.roswell`, `c6.setpiece.combine` (Myko stops it by holding up one hand, and apologises to it).

## Closing scene

The bus station. Andrew wants to go. Myko needs a minute. He buys a fridge magnet and holds it for the whole bus journey. From the next chapter on, about two in three of his tangents are about Ohio.

## Dialogue needed

Ohio admiration lines (at least 20, tagged by trigger object), town clues, Dale and the hurley, the motel and the ice machine, clues (5 entries with margin notes), field stealth, deflection lesson, drone fight, maze (prompt, wrong, right), board remarks (3), combine (start, each light, end), closing scene, fight call and puzzle call lines.
