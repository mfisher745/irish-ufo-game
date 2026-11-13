/**
 * Chapter 2: The Bog. docs/chapters/02-the-bog.md.
 */

import type { DialogueFile } from './index';
import { box, caption, scene } from './build';

export const C02: DialogueFile = {
  text: {
    'c2.title': 'The Bog',
    'c2.card.bog': 'The bog. Before dawn.',
    'c2.card.farm': "Brennan's",
    'name.departmentMan': 'Man in a suit',
    'name.cousin': 'A Brennan',

    'c2.objective.ring': 'Have a look at the ring.',
    'c2.objective.cross': 'Follow the tracks without being seen.',
    'c2.objective.sheep': 'Get the sheep out of the way.',
    'c2.objective.shed': 'Search the shed.',
    'c2.objective.yard': 'Deal with the cousins.',
    'c2.objective.ram': 'Run.',

    // Casebook: Andrew's entry, then Myko's margin note.
    'c2.clue.ring.title': 'Scorched ring',
    'c2.clue.ring.body': 'Perfect circle burnt into the turf. Nine metres across. I paced it twice. No fuel smell. Heat came from above.',
    'c2.clue.ring.margin': 'Nine of your paces is about six metres.',
    'c2.clue.fragment.title': 'Metal fragment',
    'c2.clue.fragment.body': 'Found at the centre. Still warm at 5 a.m. Stamped MAS-4471-K. Not off anything agricultural.',
    'c2.clue.fragment.margin': 'It’s off something. I’ll give you that much.',
    'c2.clue.tracks.title': 'Tyre tracks',
    'c2.clue.tracks.body': 'Twin rear wheels. A van, heavy, leaving towards Brennan’s. Somebody was here before us and took something.',
    'c2.clue.tracks.margin': 'Or delivered something. You always assume took.',
    'c2.clue.frog.title': 'Frog',
    'c2.clue.frog.body': 'One frog, cooked. Inside the ring. Noted.',
    'c2.clue.frog.margin': 'Poor lad.',
    'c2.clue.welly.title': 'Welly',
    'c2.clue.welly.body': 'Single wellington, left foot, melted at the toe. Size 11. Owner not present.',
    'c2.clue.welly.margin': 'That’s been there since the nineties. I know whose it is.',
    'c2.clue.lanyard.title': 'Visitor pass',
    'c2.clue.lanyard.body': 'Dropped by one of the Department men. It says VISITOR. It says Meridian Agri-Solutions. It does not say Department of Agriculture.',
    'c2.clue.lanyard.margin': 'Fair. That one’s fair.',
    'c2.clue.docket.title': 'Delivery docket',
    'c2.clue.docket.body': 'From the Meridian depot. “Soil harmoniser, 40 units.” Signed for by nobody. The Brennans don’t harmonise anything.',
    'c2.clue.docket.margin': 'What’s a soil harmoniser? No, don’t. You don’t know either.',
    'c2.conclusion.title': 'Conclusion',
    'c2.conclusion.body': 'The fragment, the van and the docket all go back to one place: the Meridian depot on the Carrick road. That’s where this came from. Going tonight.',
    'c2.conclusion.margin': 'It’s odd. I’ll say odd. I’m not saying aliens.',

    'c2.call.fight.casebook': 'Two of the Brennan cousins at the yard. Sorted. Myko helped a bit.',
    'c2.call.fight.margin': 'A bit. I never took my hands out of my pockets.',
    'c2.call.puzzle.casebook': 'Sheep in the way at Brennan’s. Moved them on with some assistance.',
    'c2.call.puzzle.margin': 'I looked at them. They moved. That’s the whole method.',
    'c2.call.ram.casebook': 'Ram at the gate. Situation resolved. Myko knows the animal.',
    'c2.call.ram.margin': 'His name is Declan and he’s very reasonable.',
  },
  sequences: [
    caption('c2.caption.title', 'The Bog'),
    caption('c2.caption.bog', 'The bog. Before dawn.'),
    caption('c2.caption.farm', "Brennan's"),

    scene(
      'c2.open',
      ['myko', "It's five in the morning, Andrew. I've seen five in the morning before, but from the other side."],
      ['andrew', "It's over here."],
      ['myko', "It's a soft day already. That's my good coat."],
    ),
    scene(
      'c2.ring.found',
      ['andrew', 'Look.'],
      ['myko', "You've found a scorched circle in a bog. Lads burn things in bogs, Andrew. It's most of what there is to do here."],
      ['andrew', "It's a perfect circle."],
      ['myko', 'So is a tyre. Go on, write it in your book. E, when you’re standing at a thing. Tab, to admire your work.'],
    ),
    scene(
      'c2.fragment.found',
      ['andrew', "That's a part number."],
      ['myko', 'It is. Off a tractor.'],
      ['andrew', "There's no tractor does forty thousand feet."],
      ['myko', "You haven't seen the Brennans drive."],
    ),
    box('c2.tracks.found', ['andrew', 'Van. Twin wheels. Went that way.'], ['myko', "Towards Brennan's. Of course. It couldn't have gone towards a café."]),

    // --- The Department men ---
    scene(
      'c2.suits.arrive',
      ['npc:name.departmentMan', 'Department of Agriculture.', 'to the bog in general'],
      ['npc:name.departmentMan', 'Routine soil inspection. Nothing to see.'],
      ['myko', "There's nobody there, lads. You're telling a bog.", 'quietly'],
      ['andrew', 'Those are four-hundred-euro shoes.'],
      ['myko', "In a bog. They're not from the Department. The Department would have the sense to wear wellies."],
    ),
    scene(
      'c2.throw.lesson',
      ['myko', "I'll wait at the gate. I'll ring you. Andrew, what's that noise when you walk?", 'by phone'],
      ['andrew', 'Empties. From last night.'],
      ['myko', "So it's a plan now. Throw one. Not at them. Past them. They'll go and look, they're the type."],
    ),
    box('c2.suits.overheard.1', ['npc:name.departmentMan', "Did you sign for the van? I didn't sign for the van."]),
    box('c2.suits.overheard.2', ['npc:name.departmentMan', "It's just turf. Miles of it. What do they do with it?"]),
    box('c2.suits.overheard.3', ['npc:name.departmentMan', 'Halloran says get it all and be back by eight. Halloran can come out and get it himself.']),
    box('c2.suits.distracted', ['npc:name.departmentMan', 'What was that? Go and look. No, you go and look.']),
    box('c2.stealth.caught', ['myko', "They've seen you. Well. They'd no wellies, you'll be faster.", 'by phone']),
    box('c2.stealth.clean', ['myko', "Not a sound. I'm nearly proud. One of them dropped something, back by the turf stack.", 'by phone']),

    // --- The yard ---
    scene(
      'c2.sheep.intro',
      ['andrew', 'The tracks go into that shed.'],
      ['myko', "And between you and the shed there's forty sheep, and every one of them has seen you."],
      ['andrew', "They'll move."],
      ['myko', "They'll move away from you. That's not the same as out of your way. Think about the gates."],
    ),
    box('c2.sheep.wrong', ['myko', "Now they're all in the one you need to walk through. You've a gift."]),
    box('c2.sheep.done', ['myko', "Penned. If the aliens don't work out there's a living in that."]),

    // --- The shed ---
    scene(
      'c2.shed.docket',
      ['andrew', 'Delivery docket. Meridian Agri-Solutions. Forty units of soil harmoniser.'],
      ['myko', "That's the depot out the Carrick road. The one with the sign and no customers."],
      ['andrew', "What do they sell?"],
      ['myko', "Nobody knows. I asked a lad who works there. He didn't know either."],
    ),
    scene(
      'c2.shed.poitin',
      ['andrew', "There's a bottle behind the hay."],
      ['myko', "That's the Brennans' poitín. Andrew. That's not a drink, it's a decision."],
      ['andrew', "I'll bring it."],
      ['myko', "You will, of course. Don't drink it unless the day has gone very wrong."],
    ),

    // --- Cousins ---
    scene(
      'c2.cousins.intro',
      ['npc:name.cousin', "You're the lad was fighting Tom."],
      ['andrew', 'He started it.'],
      ['npc:name.cousin', 'He said that you’d say that.'],
      ['myko', "Two cousins and a lad who's come for the look of it. Watch the shoulder on the big one. He leads with it.", 'by phone'],
    ),
    scene(
      'c2.cousins.end',
      ['npc:name.cousin', 'Grand. Grand. Tell Tom we tried.'],
      ['andrew', 'I will.'],
      ['myko', "You won't.", 'by phone'],
    ),

    // --- Casebook conclusion ---
    scene(
      'c2.conclusion',
      ['andrew', "The part number. The van. The docket. It's all the depot."],
      ['myko', "It's a depot that sells nothing, sent a van to a bog at night, and left a receipt in a shed."],
      ['andrew', 'So you agree.'],
      ['myko', "I agree it's odd. Write down odd."],
    ),

    // --- The ram ---
    scene(
      'c2.ram.intro',
      ['myko', "Andrew. Don't turn round quickly."],
      ['andrew', 'Why?'],
      ['myko', "There's a ram at the gate and he's taken against you. It's the anorak, I'd say."],
      ['andrew', 'What do I do?'],
      ['myko', "Run. Down the lane. He won't cross the cattle grid. I'll be here."],
    ),
    box('c2.ram.mid.1', ['myko', "He's gaining. That's not criticism, it's just what's happening.", 'by phone']),
    box('c2.ram.mid.2', ['myko', 'Throw him a bottle. He’ll stop and look at it. He’s a curious lad.', 'by phone']),
    box('c2.ram.mid.3', ['myko', "Mind the dog. The dog's asleep. The dog's always asleep. Go round.", 'by phone']),
    box('c2.ram.hit', ['myko', 'Well, that’s moved you along.', 'by phone']),
    scene(
      'c2.ram.end',
      ['andrew', "He's stopped."],
      ['myko', "Told you. He'll stand there now and look at you. He can do that all day.", 'by phone'],
      ['andrew', 'Where are you?'],
      ['myko', "On the gate. I've been on the gate the whole time. It was very good from here."],
    ),

    scene(
      'c2.closing',
      ['andrew', "They're not the Department. They work for the depot. The depot put something in that bog, or took it out."],
      ['myko', "A place on the edge of town that sells nothing to nobody. I'll give you that it's odd."],
      ['andrew', "I'm going in tonight."],
      ['myko', "You're going to break into the Meridian depot."],
      ['andrew', 'Yes.'],
      ['myko', "Grand. I'll bring the flask."],
    ),

    // --- Hints ---
    box('c2.hint.ring.1', ['myko', "It's the big burnt circle. You found it last night with your face."]),
    box('c2.hint.ring.2', ['myko', 'Middle of the bog. Stand at the ring, the shiny bit and the tracks, and press E at each. Three things.']),
    box('c2.hint.cross.1', ['myko', "They've torches and they point them where they're looking. Don't be there. Be behind turf.", 'by phone']),
    box('c2.hint.cross.2', ['myko', 'Hold Shift. Go stack to stack. Right click throws an empty the far side, and they’ll all wander over to it.', 'by phone']),
    box('c2.hint.sheep.1', ['myko', "Each gate opens one pen and shuts another. The sheep go wherever isn't you."]),
    box('c2.hint.sheep.2', ['myko', 'Open the far pen first. Then the middle gate. Then walk at them from the shed side. Shut it after them.']),
    box('c2.hint.shed.1', ['myko', "It's a shed. Things are in it. Look behind what's in front."]),
    box('c2.hint.shed.2', ['myko', 'The docket is on the bench. And there’s something behind the hay, if you’re the kind to look. You are.']),
    box('c2.hint.yard.1', ['myko', 'The big one drops his shoulder before he runs at you. You’ve time. Not loads.', 'by phone']),
    box('c2.hint.yard.2', ['myko', 'Sidestep the charge, hit him in the back. Bottles work on the other fella, he doesn’t like them.', 'by phone']),
    box('c2.hint.ram.1', ['myko', "It's a lane. There's two directions and he's in one of them.", 'by phone']),
    box('c2.hint.ram.2', ['myko', 'Keep right, go round the puddles, E for the gate, bottle behind you if he gets close. Cattle grid at the end.', 'by phone']),

    // --- Myko calls ---
    scene(
      'c2.call.fight',
      ['myko', 'Lads.'],
      ['myko', 'There.'],
      ['andrew', 'How did you do that?'],
      ['myko', "Do what? You'd them worn out. I only had to point at the ground and they lay on it."],
      ['myko', "Tell me again how you beat Big Tom on your own, though. I like that one."],
    ),
    scene(
      'c2.call.puzzle',
      ['myko', 'Hup.'],
      ['andrew', 'They just went.'],
      ['myko', "They did. You'd them confused beautifully. I only finished the thought for them."],
      ['myko', "Outwitted by sheep before breakfast. I'm not going to tell anyone. I'm going to tell everyone."],
    ),
    scene(
      'c2.call.ram',
      ['myko', 'Declan. Go home.'],
      ['andrew', '... Declan?'],
      ['myko', "We've met. He's sound. You were very brave, running away like that, he said to tell you."],
    ),
  ],
};
