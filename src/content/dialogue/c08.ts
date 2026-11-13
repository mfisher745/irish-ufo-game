/**
 * Chapter 8: The Long Road. docs/chapters/08-the-long-road.md.
 */

import type { DialogueFile } from './index';
import { box, caption, mykoPool, scene } from './build';

const ohio = mykoPool('c8.ohio', [
  "It was never this warm in Ohio. It was warm, but it asked first.",
  "There's no shade here because there's nothing to make it. In Ohio a tree would have volunteered.",
  "Forty miles to anything. In Wendell County you were never more than a mile from a man who'd give you a lift.",
  "I've sand in the coat. I never had corn in the coat. Corn knows its place.",
  "Do you know what this desert needs? A water tower with its name on it.",
  "I had a dream about the ice machine. I won't go into it.",
  "The stars are good. I'll say that. But the sky's not as wide as I'd been led to believe by Ohio.",
  "I still have the magnet. I take it out now and then. It's warm from the pocket.",
]);

const other = mykoPool('c8.tangent', [
  "A lizard just looked at me like I owed him money. Everyone's Big Tom in the end.",
  "If you die out here I'm telling Dympna you paid the slate. It's what you'd want.",
  "I'd murder a 99. Just the one. With the flake.",
  "Do you ever think the aliens came all that way and got Leitrim? Imagine their faces.",
]);

export const C08: DialogueFile = {
  text: {
    'c8.title': 'The Long Road',
    'c8.card.road': 'Nevada. Somewhere on Route 9.',
    'c8.card.perimeter': 'The perimeter',
    'c8.card.gate': 'Gate C',
    'name.attendant': 'Attendant',

    'c8.objective.station': 'Stock up at the gas station.',
    'c8.objective.breath': 'Clear the wash.',
    'c8.objective.perimeter': 'Cross the perimeter.',
    'c8.objective.junctions': 'Switch off the sensor lines.',
    'c8.objective.fence': 'Get through the fence.',
    'c8.objective.board': 'Pick the way in.',
    'c8.objective.pruitt': 'Get past Agent Pruitt.',

    'c8.junction.diagram': 'Toggles lines {a} and {b}',

    'c8.clue.schedule.title': 'Fuel log',
    'c8.clue.schedule.body': 'Gas station fuel log. Two patrol trucks fill up at 15:00 and 03:00 every day. Paid on account: Meridian Basin.',
    'c8.clue.schedule.margin': 'He let you read his book. He didn’t even look up.',
    'c8.clue.car.title': 'Government car',
    'c8.clue.car.body': 'Grey saloon parked behind the station. DC plates. On the seat: a thermos, and a brochure for a house on a lake.',
    'c8.clue.car.margin': 'He’s ahead of us. On a bus he’d have been behind us.',
    'c8.clue.shift.title': 'Clipboard',
    'c8.clue.shift.body': 'Dropped at the fence. Gate C shift change is at midnight. For ten minutes there is one man on.',
    'c8.clue.shift.margin': 'One man. I’d say we know him.',
    'c8.deduction.gate.lead.title': 'Plan: Gate C at midnight',
    'c8.deduction.gate.lead.body': 'Trucks are off refuelling at 03:00 and 15:00, not midnight, but the gate has one guard for ten minutes at the shift change, and I’ve a permit for it. Gate C. Midnight.',
    'c8.deduction.gate.lead.margin': 'That’s an actual plan. Who are you?',

    'c8.deduction.gate.prompt': 'How do we get in?',
    'c8.deduction.gate.answer': 'Gate C at the shift change',

    'c8.call.fight.casebook': 'Four agents and a truck at the fence. Got through. Myko came up from the road.',
    'c8.call.fight.margin': 'I came up from the road and then they all lay down.',
    'c8.call.puzzle.casebook': 'Sensor grid, three junction boxes. Worked out the combination. Myko had a look.',
    'c8.call.puzzle.margin': 'I flicked one switch. It was the one you were standing beside.',
  },
  sequences: [
    caption('c8.caption.title', 'The Long Road'),
    caption('c8.caption.road', 'Nevada. Somewhere on Route 9.'),
    caption('c8.caption.perimeter', 'The perimeter'),
    caption('c8.caption.gate', 'Gate C'),
    ...ohio.sequences,
    ...other.sequences,

    scene(
      'c8.open',
      ['andrew', "It's very warm."],
      ['myko', "It's a desert, Andrew. They don't put them somewhere mild."],
      ['andrew', "You're still wearing the coat."],
      ['myko', "It's my coat."],
    ),
    scene(
      'c8.attendant.1',
      ['andrew', "Is there a base out that road?"],
      ['npc:name.attendant', 'Yep.'],
      ['andrew', 'A secret one?'],
      ['npc:name.attendant', 'Yep.'],
      ['andrew', 'With aliens?'],
      ['npc:name.attendant', "Couldn't say. They buy a lot of windshield fluid. You want water? You want water."],
    ),
    box('c8.attendant.2', ['npc:name.attendant', "Last fella in a suit asked me the same stuff. Bought a coffee. Sat in his car an hour looking at a brochure."]),
    box('c8.attendant.3', ['npc:name.attendant', "Three waters is what I got. Truck comes Friday."]),
    box('c8.attendant.4', ['npc:name.attendant', "Walk it? Out there? Your funeral, friend. Take a hat."]),
    box('c8.car', ['andrew', "DC plates. There's a brochure. A lake house."], ['myko', "That's Pruitt. He drove. Sensible man, he's seen the bus."]),

    // --- Poitín Breath ---
    scene(
      'c8.breath.lesson',
      ['andrew', "The wash is blocked. Tumbleweed and wire. I can't shift it."],
      ['myko', 'Hold on.'],
      ['andrew', "Is that poitín?"],
      ['myko', "From home. I've carried it since Kilnamoe. For emergencies."],
      ['andrew', "You've had that the whole time?"],
      ['myko', "It's for emergencies, Andrew, not for you. Take a sup. Don't swallow. Here's the lighter. F. Point away from the coat."],
    ),
    scene(
      'c8.breath.done',
      ['andrew', "..."],
      ['myko', "That's the lobster lighter. I told you it'd come in. Give me the bottle back."],
    ),

    // --- Perimeter ---
    scene(
      'c8.perimeter.open',
      ['myko', "Right. Posts in the ground that feel you running. Masts that see you when you're hot. Trucks with lights. I'll be at the road with the magnet.", 'by phone'],
      ['andrew', 'So walk, stay cool, hide from trucks.'],
      ['myko', "Sneak. Shade. Water. You've never done any of the three in your life. Good luck."],
    ),
    box('c8.perimeter.ground', ['myko', "You're tramping. Those posts can feel it. Shift, Andrew. Slow.", 'by phone']),
    box('c8.perimeter.thermal', ['myko', "The mast's turning toward you. You're glowing. Get under that rock and drink something clear.", 'by phone']),
    box('c8.perimeter.truck', ['myko', "Truck. Behind the outcrop. Now. Don't look at the lights, they're not for you.", 'by phone']),
    box('c8.perimeter.clean', ['myko', "Across, and not a light on you. Someone left a cooler at that marker. Two waters and a tequila. That's a desert picnic.", 'by phone']),
    box('c8.perimeter.caught', ['myko', "That's the siren. They'll come from the fence side. Use the breath if they bunch.", 'by phone']),

    // --- Junction puzzle ---
    scene(
      'c8.junctions.intro',
      ['andrew', "There's three grey boxes. Each has a picture on the door. Lines, with numbers."],
      ['myko', "Each box flips two lines. You want the three between you and the fence dark. Don't just flick things. I know you. Read the doors.", 'by phone'],
    ),
    box('c8.junctions.wrong', ['myko', "You've turned one off and one back on. That's a hobby, not progress.", 'by phone']),
    box('c8.junctions.done', ['myko', "All three dark. There's your corridor. Straight on.", 'by phone']),

    // --- Fence ---
    scene(
      'c8.fence.intro',
      ['npc:name.agent', "Sir! You are on federal land! Sir, how did you even – the sensors –"],
      ['andrew', 'I read the doors.'],
      ['myko', "Sun's gone down. That's the heat off you, anyway. Watch the truck's lights, their aim's better in them.", 'by phone'],
    ),
    scene(
      'c8.fence.end',
      ['andrew', "One of them dropped a clipboard. Gate C. Shift change at midnight. One man on for ten minutes."],
      ['myko', "Write it down. I'm coming up.", 'by phone'],
    ),

    box('c8.board.wrong.1', ['myko', "The trucks are when NOT to go. You want when to go."]),
    box('c8.board.wrong.2', ['myko', "The lake house isn't a clue. It's just sad."]),
    box('c8.board.wrong.3', ['myko', 'A time, a gate, and something that says you’re allowed.']),
    scene(
      'c8.board.right',
      ['andrew', 'Gate C. Midnight. With the permit.'],
      ['myko', "A plan with a time in it. I'm going to remember where I was."],
    ),

    // --- Pruitt, round two ---
    scene(
      'c8.pruitt.intro',
      ['pruitt', 'Evening, gentlemen.'],
      ['andrew', 'Agent Pruitt.'],
      ['pruitt', "They sent me out ahead of you. I said you'd come to the quiet gate. Nobody listens. I brought a chair."],
      ['andrew', "I'm going in."],
      ['pruitt', "I know you are, son. I've to make it look like work, though. I've nine minutes left on this job and I intend to do them properly."],
      ['myko', "He means it. Watch the barrier arm, and when he throws the tin thing, don't be standing in the circle."],
    ),
    scene(
      'c8.pruitt.phase2',
      ['pruitt', "That's the truck. I had to call it. It's in the procedure."],
      ['myko', "It comes through on the lit strip. Every twelve seconds. He's told you where. He's a gent."],
    ),
    scene(
      'c8.pruitt.end',
      ['pruitt', 'Hold it.'],
      ['pruitt', "That's midnight."],
      ['andrew', 'And?'],
      ['pruitt', "And I've been retired for eleven seconds. Thirty-four years. I'm a private citizen standing at a gate."],
      ['pruitt', "Here. My lanyard. It'll open the lift. I never did find out what's down there. They never told me, and after a while you stop asking."],
      ['andrew', "I'll tell you."],
      ['pruitt', "You know, I don't think I want to know. I've a lake to look at. Go on."],
      ['myko', 'Enjoy the lake, Pruitt.'],
      ['pruitt', "I intend to. Mind him. He's the type that's right."],
    ),

    scene(
      'c8.closing',
      ['myko', "You're very quiet."],
      ['andrew', "It's up that road."],
      ['myko', 'It is.'],
      ['andrew', '...'],
      ['myko', "You're about to be right. I can see it on you. It's a strange look. I don't know that I've seen it before."],
      ['andrew', 'Come on.'],
      ['myko', "The stars are good here. I'll say that. But the sky's not as wide as I'd been led to believe by Ohio."],
    ),

    // --- Hints ---
    box('c8.hint.station.1', ['myko', "Water. I know. But water. All of it he has."]),
    box('c8.hint.station.2', ['myko', 'Three waters from the fridge, the bourbon, the crisps. And read his book on the counter.']),
    box('c8.hint.breath.1', ['myko', "It's dry sticks and you've a mouthful of poitín and a lighter. Join it up."]),
    box('c8.hint.breath.2', ['myko', 'Be at least Grand. Face the tumbleweed. F.']),
    box('c8.hint.perimeter.1', ['myko', 'Rock to rock. Drink at each one. Slow between.', 'by phone']),
    box('c8.hint.perimeter.2', ['myko', 'Hold Shift past the posts, keep the heat under half near a mast, and get behind an outcrop when you hear an engine.', 'by phone']),
    box('c8.hint.junctions.1', ['myko', "Work out which box touches a line nothing else does. Start with that.", 'by phone']),
    box('c8.hint.junctions.2', ['myko', 'Near box, far box, near box again, then the middle one.', 'by phone']),
    box('c8.hint.fence.1', ['myko', "Stay out of the headlights. They shoot faster when they can see what they're doing.", 'by phone']),
    box('c8.hint.fence.2', ['myko', 'Pull them into the dark by the fence post, breathe on them when they bunch. Sliotar along the wire.', 'by phone']),
    box('c8.hint.board.1', ['myko', "When's the gate thin? And what have you in your pocket since Roswell?"]),
    box('c8.hint.board.2', ['myko', 'The fuel log, the clipboard, and the parking permit.']),
    box('c8.hint.pruitt.1', ['myko', "He's not trying to win. He's trying to finish. Just stay standing till he's done."]),
    box('c8.hint.pruitt.2', ['myko', 'Out of the flash circle, off the lit strip when the truck’s due, bat the darts back. Wear him to under half.']),

    // --- Myko calls ---
    scene(
      'c8.call.fight',
      ['myko', "Evening. Evening. Mind your head. Evening."],
      ['andrew', "You're not even sweating."],
      ['myko', "It's a good coat. You'd them where you wanted them. Around you. In a circle. Closing in."],
      ['myko', "I walked up a hill for you in this heat, Andrew. In Ohio I'd have been driven."],
    ),
    scene(
      'c8.call.puzzle',
      ['myko', 'That one.'],
      ['andrew', 'I was going to try that one.'],
      ['myko', "You were. Eventually. You'd tried it four times already and then untried it."],
      ['myko', "It's all right. It's the sun. That's what we'll say. It was the sun."],
    ),
    scene(
      'c8.call.pruitt',
      ['myko', 'Pruitt. A word.'],
      ['pruitt', '... Is that the time?'],
      ['myko', "It's near enough."],
      ['pruitt', "It is. It's near enough. Thirty-four years. Go on through, the pair of you."],
      ['andrew', 'What did you say to him?'],
      ['myko', "I told him about the ice machine at the Starlite. He's thinking of going by."],
    ),
  ],
  pools: {
    ...ohio.pool,
    ...other.pool,
  },
};
