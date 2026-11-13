# Chapter 8: The Long Road

Region: `nevada`. Afternoon into night. Introduces Poitín Breath, heat and sensor stealth. Water matters as much as drink.

## Heat

- A heat meter appears under the Buzz meter in daylight. It rises in the sun, faster when running, and falls in shade.
- Water resets it. At full heat Andrew loses health slowly and his aim sways as if Locked.
- Alcohol does not help. Myko says so every time the player tries.
- After sunset (beat 6 onward) the meter goes away.

## Screens

| ID | Name | Size | Notes |
|---|---|---|---|
| `c8.road` | Highway and gas station | 60 × 20 | One road, one gas station, an abandoned government saloon car, a sign with the distance to everything. |
| `c8.perimeter` | The perimeter | 100 × 40 | Scrub, rock outcrops for shade, ground sensors, three junction boxes, a patrol track, the fence. |
| `c8.gate` | Gate C | 40 × 20 | A barrier, a guard hut, floodlights, the service road into the hill. |

## Beats

1. **The gas station** (`c8.explore.road`). Stock up: water (three bottles, the only ones for a while), bourbon, crisps. The attendant has seen everything and has no curiosity left. Key clue: `c8.clue.schedule` (a patrol truck fuel log with times). Colour clue: Pruitt's car, with a retirement brochure for a lake house on the seat.
2. **Poitín Breath.** A wall of tumbleweed and fence wire blocks the wash that leads to the perimeter. Myko produces a bottle of poitín he has carried from Kilnamoe for emergencies, and a lighter. F breathes a short cone of fire for 40 Buzz. It clears the tumbleweed. Myko asks for the bottle back.
3. **Checkpoint, then the perimeter by day** (`c8.stealth.perimeter`, stealth). Three hazards:
   - Ground sensors detect running. Sneaking or walking is safe.
   - Thermal masts detect Andrew when his heat meter is above half. Stay in shade and drink water.
   - Two patrol trucks drive the track with headlight cones. Rock outcrops block them.
   Clean-run reward: a cooler with two waters and a tequila.
4. **Junction puzzle** (`c8.puzzle.junctions`, puzzle). Three junction boxes each toggle two of five sensor lines. Find the combination that turns off the three lines between Andrew and the fence. A diagram on each box shows which lines it toggles. Solvable in four toggles.
5. **The fence** (`c8.fight.fence`, fight). The sun goes down as Andrew reaches it. Four `agent`s and one patrol truck that parks and adds its headlights (inside the cone, agents' darts are faster). Poitín Breath clears a group. Key clue from a dropped clipboard: `c8.clue.shift` (shift change at Gate C, ten minutes with one man on).
6. **Deduction board** (`c8.deduction.gate`, deduction). Link `c8.clue.schedule`, `c8.clue.shift` and `c7.clue.permit` to name the plan: Gate C at the shift change.
7. **Checkpoint, then Agent Pruitt, round two** (`c8.boss.pruitt2`, boss).

## Boss: Agent Pruitt, round two

He is the one man on. He has a thermos and a folding chair and he gets up slowly.

- **Phase 1.** Taser darts in pairs, a flashbang with a ground marker (whites out the screen for 1 second if Andrew is inside it) and the barrier arm, which he drops on a marked line.
- **Phase 2 (60% health).** He radios a patrol truck that makes one pass through the arena every 12 seconds along a lit path.
- **End (40% health).** He stops and checks his watch. It is midnight and he has been retired for eleven seconds. He raises the barrier, gives Andrew his lanyard and says he was never sure what was in there either. He sits back down.

He is not beaten. He lets them through. A Myko call ends the fight the same way, sooner: Myko has a word and Pruitt checks his watch.

Arena: 30 × 14 at the gate.

## Sections for call-in

`c8.puzzle.junctions`, `c8.fight.fence`, `c8.deduction.gate`, `c8.boss.pruitt2`.

## Closing scene

Walking up the service road in the dark. Andrew is about to be right. He says nothing about it. Myko says the stars are good but the sky is not as wide as he had been led to believe by Ohio.

## Dialogue needed

Attendant (4), clues (4 entries with margin notes), Poitín Breath lesson, heat warnings from Myko (5), drink-instead-of-water lines (3), perimeter stealth, junction puzzle, fence fight, board remarks (3), Pruitt (intro, phase change, midnight, lanyard), closing scene, Ohio tangents (8), fight call and puzzle call lines.
