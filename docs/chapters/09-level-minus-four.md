# Chapter 9: Level Minus Four

Region: `base`. Cold, teal and violet, very tidy. Introduces the Borrowed Glove and alien enemies. Andrew collects the five pieces of proof.

The base is an office. There are desks, a kitchenette, a noticeboard and a lost-property box. The aliens are at work and mildly inconvenienced.

## Screens

| ID | Name | Size | Notes |
|---|---|---|---|
| `c9.offices` | Lift lobby and offices | 40 × 25 | Open-plan desks, a water cooler, meeting rooms named after moons, a lost-property box. |
| `c9.labs` | Labs | 60 × 40 | Three gravity rooms in a row, a hangar viewing window, a records room. |
| `c9.hall` | Containment hall | 50 × 30 | A long hall of sealed bays, blast doors, the lift to the control room at the far end. |

## The five proofs

They are the items shown in the broadcast in chapter 10. All five are required to open the lift.

| ID | What | Where |
|---|---|---|
| `c9.proof.craft` | A photo of the craft with a panel missing. The fragment from the bog fits it. | Hangar window, after the gravity puzzle |
| `c9.proof.contract` | The contract between Meridian and "the tenants". | Offices, a filing cabinet |
| `c9.proof.directory` | The staff directory, with photos. Gary is in it. | Offices, the noticeboard |
| `c9.proof.log` | The flight log for the night over Kilnamoe. Purpose: soil sample. Note: "wrong field". | Records room |
| `c9.proof.footage` | Security footage of the hangar, on a tape. | Containment hall, taken during the lockdown |

## Beats

1. **Checkpoint, then the offices** (`c9.stealth.offices`, stealth). Eight `clerk`s at desks, two walking. Seated clerks have short vision cones and look up on noise. Act Natural works at the water cooler, the noticeboard and in the queue for the kitchenette. Proofs: `c9.proof.contract`, `c9.proof.directory`. Clean-run reward: tea from the kitchenette. It is good tea, which annoys Andrew.
2. **The Borrowed Glove.** It is in the lost-property box with a sticky note. F fires a stun pulse that holds a group for 3 seconds and operates gravity switches. It recharges by itself. R cycles between it, Stout Slam and Poitín Breath.
3. **Gravity puzzle** (`c9.puzzle.gravity`, puzzle). Three small rooms. In each, a wall switch hit with the Glove changes which way is down: everything loose, Andrew included, slides to that wall until something stops it. Room 1 has one switch and teaches the idea. Room 2 has two switches and a crate that must end up on a pressure plate. Room 3 has two switches and needs Andrew to land on a ledge by sliding into a crate he placed first. The three rooms together are solvable in under two minutes; `completeNow()` finishes all three.
4. **The hangar window and records room** (`c9.explore.labs`). Proofs: `c9.proof.craft`, `c9.proof.log`. The flight log is the answer to the whole game: they were collecting a soil sample and got the wrong field. Andrew reads it twice.
5. **The labs** (`c9.fight.labs`, fight). Four `security` and four `clerk`s in two waves. Shields have to be flanked, stunned or pierced. This is the exam for the full ability set.
6. **Deduction board** (`c9.deduction.uplink`, deduction). Link `c9.proof.contract` (a clause about "outbound communications"), `c9.proof.directory` (the Administrator's office is on the control level) and `c8.clue.shift` (Pruitt's lanyard opens the lift) to name the destination: the control room uplink.
7. **Checkpoint, then the lockdown** (`c9.setpiece.lockdown`, setpiece).

## Set piece: the containment hall lockdown

An announcement asks all staff to remain calm and return to their desks. The blast doors start to close.

- The hall is five bays long. Each bay's door closes on a timer shown above it. Andrew has to get through each before it shuts.
- Each bay has `security` and `clerk`s who do not need to be beaten, only passed.
- Bays 2 and 4 have a gravity switch that drops a barrier out of the way or slides the guards to the far wall.
- `c9.proof.footage` is in bay 3, in a wall recorder. Taking it costs 3 seconds.
- A door that closes on Andrew sends him back to the bay's start with a health cost, and the timer resets. It is never a restart.
- The last door is the lift. It needs all five proofs and the lanyard.

## Sections for call-in

`c9.puzzle.gravity`, `c9.fight.labs`, `c9.deduction.uplink`, `c9.setpiece.lockdown` (Myko walks the hall holding each door with one finger, and picks up the tape on the way).

## Closing scene

In the lift, with lift music. Andrew has the five proofs in a carrier bag. Myko says the base is fine but the offices have no windows, and that the Starlite had a window.

## Dialogue needed

Office small talk overheard (6), proofs (5 casebook entries with margin notes), the Glove and its sticky note, gravity rooms (3 prompts and a reset line), the flight log scene, labs fight, board remarks (3), lockdown announcements (4) and Myko phone lines (4), closing scene, Ohio tangents (8), fight call and puzzle call lines.
