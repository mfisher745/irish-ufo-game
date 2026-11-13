/**
 * Chapter 9: Level Minus Four. docs/chapters/09-level-minus-four.md.
 * The base is an office. The aliens are at work and mildly inconvenienced.
 */

import type { DialogueFile } from './index';
import { box, caption, mykoPool, scene } from './build';

const ohio = mykoPool('c9.ohio', [
  "No windows. Four floors down and not one window. The Starlite had a window.",
  "They've a water cooler. It's fine. It's no ice machine.",
  "All this technology and nobody's thought to put the name of the place on a tower.",
  "They cross the galaxy and build an open-plan office. Ohio would have given them a porch.",
  "It's very clean. I'll give them clean. Ohio was clean and it had weather.",
  "I showed one of them the magnet. He said “where is that”. Imagine. Imagine not knowing.",
  "The carpet's nice. It's no cornfield.",
  "Level Minus Four. Do you know what level Ohio is on? The right one.",
]);

const other = mykoPool('c9.tangent', [
  "There's a rota on that fridge for who cleans the microwave. Light years, Andrew. And still the rota.",
  "One of them has a mug that says something in squiggles. I'd bet you anything it's “world's best dad”.",
  "I thought I'd be more surprised. I think Gary took the good out of it.",
  "You were right. I'm not saying it yet. I'm only noting that it's there to be said.",
]);

export const C09: DialogueFile = {
  text: {
    'c9.title': 'Level Minus Four',
    'c9.card.offices': 'Meridian Basin Facility. Level −4.',
    'c9.card.labs': 'Research',
    'c9.card.hall': 'Containment',
    'name.announcement': 'Announcement',
    'name.stickyNote': 'Sticky note',

    'c9.objective.offices': 'Search the offices.',
    'c9.objective.glove': 'Check the lost property.',
    'c9.objective.gravity': 'Get through the gravity rooms.',
    'c9.objective.labs': 'Find the hangar and the records.',
    'c9.objective.fight': 'Clear the labs.',
    'c9.objective.board': 'Work out where to broadcast from.',
    'c9.objective.lockdown': 'Reach the lift before the doors close.',

    'c9.proof.count': 'Proof {n} of 5',

    'c9.proof.contract.title': 'The contract',
    'c9.proof.contract.body': 'Lease between Meridian Agri-Solutions and “the tenants”. Ninety-nine years. Signed 1962. Clause 14 covers “outbound communications” from the control level.',
    'c9.proof.contract.margin': 'They rent. They’re renting. From a company that sells soil harmoniser.',
    'c9.proof.directory.title': 'Staff directory',
    'c9.proof.directory.body': 'Photos, names, extensions. Four hundred staff. All grey. Gary is on page 3 (Retail, off-site). The Administrator’s office is on the control level.',
    'c9.proof.directory.margin': 'Gary’s photo is the only one smiling.',
    'c9.proof.craft.title': 'The craft',
    'c9.proof.craft.body': 'Photographed through the hangar window. One panel missing on the underside. I held the fragment up to the glass. It fits.',
    'c9.proof.craft.margin': 'It fits. I watched you do it. It fits.',
    'c9.proof.log.title': 'Flight log',
    'c9.proof.log.body': 'Kilnamoe, the night of the lights. Purpose of flight: soil sample. Duration: 11 minutes. Notes: “wrong field”.',
    'c9.proof.log.margin': 'They were lost, Andrew. They came to Leitrim by mistake. Like everyone.',
    'c9.proof.footage.title': 'Security tape',
    'c9.proof.footage.body': 'Hangar camera, taken from the wall recorder in bay 3. Ninety seconds. Shows the craft, the crew, and one of them dropping a clipboard.',
    'c9.proof.footage.margin': 'That’s the one they’ll remember. The clipboard.',
    'c9.deduction.uplink.lead.title': 'Plan: the control room',
    'c9.deduction.uplink.lead.body': 'The contract says communications go out from the control level. The directory puts the Administrator’s office there. Pruitt’s lanyard opens the lift. Five proofs, one uplink, every screen on Earth.',
    'c9.deduction.uplink.lead.margin': 'Every screen. Go on, so. I’ll hold the bag.',

    'c9.deduction.uplink.prompt': 'Where do we send it from?',
    'c9.deduction.uplink.answer': 'The control room uplink',

    'c9.call.fight.casebook': 'Alien security in the labs, with shields. Eight in total. Got past. Myko was involved.',
    'c9.call.fight.margin': 'I was involved the way weather is involved.',
    'c9.call.puzzle.casebook': 'Three rooms where gravity changes direction. Solved. Myko has a feel for it.',
    'c9.call.puzzle.margin': 'I pressed one button and stood still. You slid past me twice.',
  },
  sequences: [
    caption('c9.caption.title', 'Level Minus Four'),
    caption('c9.caption.offices', 'Meridian Basin Facility. Level −4.'),
    caption('c9.caption.labs', 'Research'),
    caption('c9.caption.hall', 'Containment'),
    ...ohio.sequences,
    ...other.sequences,

    scene(
      'c9.open',
      ['andrew', "It's an office."],
      ['myko', "It's an office.", 'by phone'],
      ['andrew', "There's desks. There's a kitchenette. There's a plant."],
      ['myko', "How's the plant?"],
      ['andrew', 'Thriving.'],
      ['myko', "Then they're better than Halloran. Stand at the water cooler when they look up. It works on every species."],
    ),
    box('c9.offices.overheard.1', ['npc:name.clerk', 'Did you see the memo about the memo?']),
    box('c9.offices.overheard.2', ['npc:name.clerk', "Somebody's using the long-range array for personal calls again."]),
    box('c9.offices.overheard.3', ['npc:name.clerk', 'The Leitrim crew are back on desk duty. Wrong field. Eleven minutes. You can imagine the paperwork.']),
    box('c9.offices.overheard.4', ['npc:name.clerk', "Is that Gary's replacement? The short one in the green? Nobody tells me anything."]),
    box('c9.offices.overheard.5', ['npc:name.clerk', "I've put in for a window. I know. I know there's no outside. I've put in anyway."]),
    box('c9.offices.overheard.6', ['npc:name.clerk', "Meeting's moved to Ganymede. The room. Not the – the room."]),
    box('c9.offices.contract', ['andrew', "It's a lease. They rent this. From Meridian. Since 1962."], ['myko', 'Who’s the landlord?', 'by phone'], ['andrew', 'Halloran’s head office.'], ['myko', "He's never been told. He's a form in."]),
    box('c9.offices.directory', ['andrew', "Staff directory. Four hundred. Gary's in it."], ['myko', 'Is he smiling?', 'by phone'], ['andrew', 'He is.'], ['myko', 'Good man Gary.']),
    scene(
      'c9.offices.clean',
      ['myko', "Not one of them looked twice. There's a kettle in that kitchenette. Have a tea.", 'by phone'],
      ['andrew', "... It's good tea."],
      ['myko', "Why do you sound annoyed?"],
      ['andrew', "It's better than at home."],
    ),
    box('c9.offices.caught', ['npc:name.clerk', 'Excuse me. Do you have a visitor badge? I’m going to have to raise a ticket.']),

    // --- The Glove ---
    scene(
      'c9.glove.find',
      ['andrew', "Lost property. There's an umbrella, a lunchbox and a glove. The glove is humming."],
      ['npc:name.stickyNote', '“Found in Lab 2. Please collect. It keeps turning the lights off. – Facilities”'],
      ['myko', "Borrow it. You'll bring it back.", 'by phone'],
      ['andrew', 'Will I?'],
      ['myko', "No. F. Try it on something that isn't you."],
    ),
    box('c9.glove.done', ['myko', "It stopped them dead. All of them. And it recharges itself. You've never owned anything that recharges itself.", 'by phone']),

    // --- Gravity rooms ---
    scene(
      'c9.gravity.intro',
      ['andrew', "There's a switch on the wall. I used the glove on it and I fell sideways."],
      ['myko', "You fell toward the switch's wall. So did the crate. Down is wherever you last told it to be. Think before you press.", 'by phone'],
    ),
    box('c9.gravity.room2', ['myko', "Two switches. The crate has to end up on that plate. You can end up wherever, nobody minds.", 'by phone']),
    box('c9.gravity.room3', ['myko', "You need to stop halfway. You can't. So put something in your own way first.", 'by phone']),
    box('c9.gravity.reset', ['myko', "Back to the start. Up is up again. Enjoy it while it lasts.", 'by phone']),
    box('c9.gravity.done', ['myko', "Three rooms. You fell in every direction there is and arrived. That's your whole life, in a corridor.", 'by phone']),

    // --- Hangar and the flight log ---
    scene(
      'c9.hangar',
      ['andrew', 'Myko.'],
      ['myko', 'What?', 'by phone'],
      ['andrew', "It's there. Through the glass. The whole thing. There's a panel missing underneath."],
      ['myko', 'Have you the fragment?'],
      ['andrew', "I'm holding it up."],
      ['myko', 'And?'],
      ['andrew', 'It fits.'],
      ['myko', '... Take the picture, Andrew.'],
    ),
    scene(
      'c9.log',
      ['andrew', "Flight log. Kilnamoe. That night."],
      ['myko', 'Read it.', 'by phone'],
      ['andrew', '“Purpose: soil sample. Duration: eleven minutes. Notes: wrong field.”'],
      ['myko', 'Read it again.'],
      ['andrew', '“Wrong field.”'],
      ['myko', "They weren't looking for you."],
      ['andrew', 'No.'],
      ['myko', "They weren't looking for anyone. They took a wrong turn and scorched a bog, and you followed them across the world over it."],
      ['andrew', "I was still right."],
      ['myko', "You were. That's the mad part. You were still right."],
    ),

    // --- Labs fight ---
    scene(
      'c9.fight.intro',
      ['npc:name.clerk', 'Sir, you are not on the list for this level. Security has been informed. Please remain where you are and they will be with you shortly.'],
      ['myko', "Shields on the front. Go round, or freeze them, or put the ball through. You've everything now. Use all of it.", 'by phone'],
    ),
    box('c9.fight.end', ['myko', "That's the lot. One of them apologised going down. I heard it.", 'by phone']),

    box('c9.board.wrong.1', ['myko', "That's what you have. Where do you SEND it from?", 'by phone']),
    box('c9.board.wrong.2', ['myko', 'Read clause fourteen again. Slowly. Like it’s a quiz question.', 'by phone']),
    box('c9.board.wrong.3', ['myko', 'A place it goes out from, where that place is, and how you get up there.', 'by phone']),
    scene(
      'c9.board.right',
      ['andrew', 'Control level. The uplink. The lanyard gets us the lift.'],
      ['myko', "Then that's the last piece of string. Go on.", 'by phone'],
    ),

    // --- Lockdown ---
    scene(
      'c9.lockdown.intro',
      ['npc:name.announcement', 'Attention all staff. There is an unscheduled visitor on Level Minus Four. Please remain calm and return to your desks.'],
      ['npc:name.announcement', 'Containment doors will now close. This is not a drill. The drill is Thursday.'],
      ['myko', "Five doors, Andrew, and a lift at the end. Don't fight them. Just go.", 'by phone'],
    ),
    box('c9.lockdown.announce.1', ['npc:name.announcement', 'Bay one is now sealed. Thank you for your patience.']),
    box('c9.lockdown.announce.2', ['npc:name.announcement', 'A reminder that the kitchenette is not a shelter.']),
    box('c9.lockdown.announce.3', ['npc:name.announcement', 'If you are the unscheduled visitor, please make yourself known to a member of staff.']),
    box('c9.lockdown.announce.4', ['npc:name.announcement', 'Lift access requires a valid lanyard. Lanyards are not transferable.']),
    box('c9.lockdown.myko.1', ['myko', "Switch on your left. Tip the lot of them down the far end.", 'by phone']),
    box('c9.lockdown.myko.2', ['myko', "Bay three. The box on the wall with the red light. That's the tape. It's three seconds. Take it.", 'by phone']),
    box('c9.lockdown.myko.3', ['myko', "Leave them. LEAVE them. They'll still be there. The door won't.", 'by phone']),
    box('c9.lockdown.myko.4', ['myko', "Last one. Lanyard out. Don't drop the bag.", 'by phone']),
    box('c9.lockdown.shut', ['myko', "It caught you. Back you go. It's only a door. It's a very heavy door, but it's only a door.", 'by phone']),

    scene(
      'c9.closing',
      ['andrew', "Five. I have all five."],
      ['myko', "In a carrier bag."],
      ['andrew', "It's what I had."],
      ['myko', "The proof of life beyond the stars, in a bag from a chipper in Carrick. That's about right."],
      ['andrew', "Is that music?"],
      ['myko', "It's a lift, Andrew. They all have it. The base is fine, by the way. But there's no windows. The Starlite had a window."],
    ),

    // --- Hints ---
    box('c9.hint.offices.1', ['myko', "Filing cabinet, noticeboard. Offices are the same everywhere. Stop at the boring spots on the way.", 'by phone']),
    box('c9.hint.offices.2', ['myko', 'Cooler, then the noticeboard for the directory, then the kitchenette queue, then the cabinet by the plant.', 'by phone']),
    box('c9.hint.glove.1', ['myko', "There's a box by the lift for things people have left behind. One of them is humming.", 'by phone']),
    box('c9.hint.glove.2', ['myko', 'Lost property, beside the lift lobby. E. Then R until the glove’s up, and F.', 'by phone']),
    box('c9.hint.gravity.1', ['myko', "Everything loose falls toward the switch you hit, and stops at the first thing in the way. Use the stopping.", 'by phone']),
    box('c9.hint.gravity.2', ['myko', 'Room two: left switch, then top. Room three: top first to park the crate, then left, and you’ll land against it.', 'by phone']),
    box('c9.hint.labs.1', ['myko', "There's a big window with something big behind it. And a room of filing after.", 'by phone']),
    box('c9.hint.labs.2', ['myko', 'Hangar window, E, with the fragment. Then the records room, third drawer.', 'by phone']),
    box('c9.hint.fight.1', ['myko', "Don't hit the shield. Hit anything that isn't the shield.", 'by phone']),
    box('c9.hint.fight.2', ['myko', 'Glove to freeze them, walk round, hurley. Sliotar goes through shields. Fire for the clerks.', 'by phone']),
    box('c9.hint.board.1', ['myko', 'The lease says where the signal leaves from.', 'by phone']),
    box('c9.hint.board.2', ['myko', 'The contract, the directory, and Pruitt’s gate clipboard, since that’s where you got the lanyard.', 'by phone']),
    box('c9.hint.lockdown.1', ['myko', "You're not there to win. You're there to leave.", 'by phone']),
    box('c9.hint.lockdown.2', ['myko', 'Run. Space through the gaps. Glove the switches in bays two and four. Tape in three. Lift.', 'by phone']),

    // --- Myko calls ---
    scene(
      'c9.call.fight',
      ['myko', "Sorry. Sorry now. Is this yours? Sorry."],
      ['andrew', "You took his shield and gave it back to him."],
      ['myko', "He'd dropped it. You'd them well rattled. One of them was filling in a form about you. That's fear, in here."],
      ['myko', "Aliens, Andrew. Actual aliens, and you rang me. I'd have rung me too. I'll stop saying that when it stops being true."],
    ),
    scene(
      'c9.call.puzzle',
      ['myko', 'That one.'],
      ['andrew', "You didn't even fall."],
      ['myko', "I leaned. You'd the right idea, you just had it in the wrong order, three times, at speed."],
      ['myko', "It's physics. You were never going to be good at it. You got a C in pass science and you copied that off me."],
    ),
    scene(
      'c9.call.lockdown',
      ['myko', "Go on. I have it."],
      ['andrew', "You're holding the door. With one finger."],
      ['myko', "It's well balanced. They build well. I picked this up on the way, it had a red light on it. Is it a tape?"],
      ['andrew', "That's the fifth proof."],
      ['myko', "Is it? Grand. Put it in your bag. After you."],
    ),
  ],
  pools: {
    ...ohio.pool,
    ...other.pool,
  },
};
