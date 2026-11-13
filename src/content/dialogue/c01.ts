/**
 * Chapter 1: A Quiet Pint. docs/chapters/01-a-quiet-pint.md.
 * Tone: DESIGN.md section 2. Andrew is short with words; Myko does the talking.
 */

import type { DialogueFile } from './index';
import { box, caption, scene } from './build';

export const C01: DialogueFile = {
  text: {
    'c1.title': 'A Quiet Pint',
    'c1.card.pub': "Feeney's, Kilnamoe. A Tuesday.",
    'c1.card.street': 'Main Street. All of it.',
    'c1.card.road': 'The bog road',

    'name.dympna': 'Dympna',
    'name.bigTom': 'Big Tom',
    'name.lad': 'A lad',
    'name.ladInQueue': 'Lad in the queue',

    // Objectives
    'c1.objective.bar': 'Go up to the bar.',
    'c1.objective.dympna': 'Talk to Dympna.',
    'c1.objective.pint': 'Drink the pint.',
    'c1.objective.machine': 'Get the euro back off the fruit machine.',
    'c1.objective.leave': 'Leave by the back.',
    'c1.objective.kegs': 'Shift the kegs.',
    'c1.objective.chipper': 'Get something to eat.',
    'c1.objective.row': 'Sort out the queue.',
    'c1.objective.bigTom': 'Deal with Big Tom.',
    'c1.objective.road': 'Walk out the bog road.',

    // Casebook entries for Myko calls (the casebook itself arrives in chapter 2;
    // these are filed retrospectively on its first page).
    'c1.call.fight.casebook': 'Tuesday. Bit of bother on Main Street. Handled it. Myko was there.',
    'c1.call.fight.margin': 'I handled it. You held my lighter.',
    'c1.call.puzzle.casebook': 'Tuesday. Kegs in the way out the back of Feeney’s. Got them moved.',
    'c1.call.puzzle.margin': 'Two kegs, Andrew. Two.',
  },
  sequences: [
    caption('c1.caption.title', 'A Quiet Pint'),
    caption('c1.caption.pub', "Feeney's, Kilnamoe. A Tuesday."),
    caption('c1.caption.street', 'Main Street. All of it.'),
    caption('c1.caption.road', 'The bog road'),

    // --- Feeney's: Dympna's list ---
    scene(
      'c1.pub.open',
      ['myko', "There he is. Three-time champion of the Feeney's table quiz, drinking alone on a Tuesday."],
      ['andrew', "I'm not alone. You're there."],
      ['myko', "I'm over here. It's a different thing."],
      ['dympna', 'Andrew. Come up here to me. I’ve a list.'],
    ),
    scene(
      'c1.pub.stool',
      ['dympna', 'Item one. The stool.'],
      ['andrew', 'What about the stool?'],
      ['dympna', 'It had four legs when you sat on it Friday.'],
    ),
    scene(
      'c1.pub.thursday',
      ['dympna', 'Item two. Last Thursday.'],
      ['andrew', 'I paid for last Thursday.'],
      ['dympna', 'You paid for a Thursday. I’ve no way of knowing which.'],
    ),
    scene(
      'c1.pub.pint',
      ['dympna', 'Item three is whatever you’re having now. Go on.'],
      ['myko', 'She’s put it on the slate, Andrew. The slate has an extension built on it at this stage.'],
    ),
    box('c1.pub.buzz', ['myko', "That's you grand. Stay around there. Under it you're no use and over it you're a hazard."]),
    scene(
      'c1.pub.listEnd',
      ['dympna', 'That’s the list. I’ll read it again tomorrow.'],
      ['andrew', 'I’ll be in.'],
      ['dympna', 'I know you will.'],
    ),

    // Optional examines
    box('c1.pub.trophies', ['andrew', 'Table quiz. Three years.'], ['myko', 'Non-consecutive. Tell them it was non-consecutive.']),
    box('c1.pub.dartboard', ['andrew', 'There’s no darts.'], ['myko', 'There was. Then there was the incident. Now there’s a board.']),
    box('c1.pub.photo', ['andrew', 'County team, ’94.'], ['myko', 'Look how happy they are. They’d no idea.']),
    box('c1.pub.telly', ['andrew', 'Is that the Angelus?'], ['myko', "It's been the Angelus for a while. I think it's stuck."]),

    // --- The fruit machine ---
    scene(
      'c1.machine.intro',
      ['andrew', 'That machine has my euro.'],
      ['myko', 'From when?'],
      ['andrew', 'March.'],
      ['myko', 'Then have a word with it. Three words. In a row.'],
    ),
    scene(
      'c1.machine.payout',
      ['andrew', 'There.'],
      ['dympna', 'I’ll take that off the slate.'],
      ['myko', "Eleven months to get a euro back, and it's gone before it's warm. That's a system working."],
    ),

    // --- Closing time and the keg yard ---
    scene(
      'c1.lockin.door',
      ['dympna', 'I’m locking the front. There’s a few staying on.'],
      ['andrew', 'I could stay on.'],
      ['dympna', 'You could not. Out the back. Mind the kegs.'],
    ),
    box('c1.yard.kegs', ['myko', 'Full ones. Put your shoulder to them, they slide. Not that one first. Well, whatever you think yourself.']),
    box('c1.yard.done', ['myko', "Look at that. A man who can leave a pub. They said it couldn't be done."]),

    // --- Main Street ---
    box('c1.street.whiskey', ['andrew', 'Someone’s left a naggin behind the bins.'], ['myko', "Someone's hidden a naggin behind the bins. There's a difference, but go on."]),
    box('c1.street.empties', ['myko', "You're keeping the empty."], ['andrew', 'Might need it.'], ['myko', "That's a habit, not a plan. I'll let you know if it ever becomes a plan."]),

    // --- The row outside the chipper ---
    scene(
      'c1.chipper.intro',
      ['npc:name.ladInQueue', 'That’s the last spice bag. Sorry now.'],
      ['andrew', 'I was ahead of you.'],
      ['npc:name.ladInQueue', 'You were looking at the sky.'],
      ['andrew', 'I was ahead of you and looking at the sky.'],
      ['myko', 'Lads. It’s chips.', 'to nobody'],
      ['npc:name.ladInQueue', 'Who asked you, lamppost?'],
      ['myko', "Ah, he's upset me now, Andrew. I'm here in an advisory capacity. I advise you to hit him."],
    ),
    box('c1.chipper.wave2', ['myko', "He has friends. Two of them. That's more than I'd have guessed."]),
    scene(
      'c1.chipper.end',
      ['npc:name.ladInQueue', 'Take it. Take the spice bag. God.'],
      ['andrew', 'I was ahead of you.'],
      ['myko', "You've made your point. Eat your dinner."],
    ),

    // --- The Myko call prompt ---
    scene(
      'c1.call.prompt',
      ['myko', "C'mere to me. If you're ever properly stuck, in a fight, or looking at something you can't work out, you can ask me."],
      ['andrew', "I won't be."],
      ['myko', "Three times. That's all I'm good for, I've a bad shoulder. After that you're on your own."],
      ['andrew', "I won't need it."],
      ['myko', 'I know. Three, anyway.'],
    ),

    // --- Big Tom Brennan ---
    scene(
      'c1.bigTom.intro',
      ['npc:name.bigTom', 'Andrew.'],
      ['andrew', 'Tom.'],
      ['npc:name.bigTom', 'The tenner.'],
      ['andrew', "I don't have it on me."],
      ['npc:name.bigTom', "You'd it on you in June when I gave it to you."],
      ['myko', "He's not angry, look. He's just very thorough. Mind the right hand, and don't stand in front of him when he runs."],
    ),
    scene(
      'c1.bigTom.phase2',
      ['npc:name.bigTom', 'Hang on.'],
      ['myko', "He's taking the jacket off. He's folding it. Andrew, he's put it on the wall. That's a man settling in."],
    ),
    box('c1.bigTom.dazed', ['myko', "He's hit the tractor. The tractor's fine. Now, go on, while he's thinking about it."]),
    scene(
      'c1.bigTom.end',
      ['npc:name.bigTom', "I'll sit down a minute."],
      ['npc:name.bigTom', 'The tenner, though. In fairness.'],
      ['andrew', "I don't have it, Tom."],
      ['myko', 'Here. Tom. Tenner. Go home.'],
      ['npc:name.bigTom', 'Sound, Myko.'],
      ['myko', "That's you owing me now. I'm much worse."],
    ),

    // --- The lights ---
    scene(
      'c1.lights.before',
      ['andrew', 'I was looking at something. Before the chipper.'],
      ['myko', 'The sky. So I heard.'],
      ['andrew', 'Out over the bog. Come on.'],
    ),
    scene(
      'c1.lights.seen',
      ['andrew', 'There.'],
      ['andrew', 'Myko. There. Three of them.'],
      ['myko', 'Hang on, this lighter’s banjaxed.'],
      ['andrew', "They're going down behind the hill."],
      ['myko', 'Got it. What am I looking at?'],
      ['andrew', "They're gone."],
    ),
    scene(
      'c1.closing',
      ['myko', 'Helicopter.'],
      ['andrew', 'No sound.'],
      ['myko', 'Plane.'],
      ['andrew', 'It stopped. Planes don’t stop.'],
      ['myko', 'A lad with a torch.'],
      ['andrew', 'Three lads with three torches, forty feet up.'],
      ['myko', 'The Brennans have ladders. Was it the drink?'],
      ['andrew', 'I know what the drink looks like.'],
      ['myko', "You do, in fairness. Nobody knows it better."],
      ['andrew', 'It landed out there. I’m going out in the morning.'],
      ['myko', "Grand. I'll come and look at your field. I've nothing on."],
    ),

    // --- Hints (nudge, then the answer; both wrapped in an insult) ---
    box('c1.hint.bar.1', ['myko', "The bar is the long wooden thing with the woman behind it. You've been before."]),
    box('c1.hint.bar.2', ['myko', 'W, A, S and D, Andrew. Walk to the end of the bar. One foot, then the other one.']),
    box('c1.hint.dympna.1', ['myko', "She's looking straight at you. That's as close as Dympna gets to an invitation."]),
    box('c1.hint.dympna.2', ['myko', 'Stand in front of her and press E. Bring your excuses.']),
    box('c1.hint.pint.1', ['myko', "There's a pint in front of you and you're asking me for advice. Things are worse than I thought."]),
    box('c1.hint.pint.2', ['myko', "Q. Press Q. I can't believe that's a thing I had to say to you of all people."]),
    box('c1.hint.machine.1', ['myko', "It's a machine. It doesn't respond to reason. Neither do you, so ye should get on."]),
    box('c1.hint.machine.2', ['myko', 'Left click, three times, quick. The third one is the one that counts.']),
    box('c1.hint.leave.1', ['myko', 'The front is locked and there’s a door behind the bar end. I won’t draw you a map.']),
    box('c1.hint.leave.2', ['myko', 'Back door, bottom corner, where the light is on the floor. Walk through it.']),
    box('c1.hint.kegs.1', ['myko', "There's two kegs and a gate. Think about which keg is in the other keg's way."]),
    box('c1.hint.kegs.2', ['myko', 'Near one up, then left, out of the road. Far one left, then up against the wall. Then the gate.']),
    box('c1.hint.chipper.1', ['myko', "Follow the smell. It's the only thing open and it's lit up like a ferry."]),
    box('c1.hint.chipper.2', ['myko', 'Right, down the street, past the bookies. Join the queue. Try to concentrate on the queue.']),
    box('c1.hint.row.1', ['myko', "They swing slow. You'll see it coming a week ahead. Don't be there when it lands."]),
    box('c1.hint.row.2', ['myko', 'Step back when he winds up, then three in a row. And have a drink, you hit harder when you’re grand.']),
    box('c1.hint.bigTom.1', ['myko', "He runs in a straight line and he doesn't steer. There's a tractor there. I'm only saying."]),
    box('c1.hint.bigTom.2', ['myko', 'Stand in front of the tractor or the gate, let him run, step aside. Hit him while he’s seeing stars.']),
    box('c1.hint.road.1', ['myko', "You were the one who wanted to look at the sky. It's out the road. Away from the chips."]),
    box('c1.hint.road.2', ['myko', 'Keep going right, past the tractor, out of the town. All four hundred yards of it.']),

    // --- Myko calls ---
    scene(
      'c1.call.fight',
      ['myko', 'There you go.'],
      ['andrew', 'I had them.'],
      ['myko', "You did. You'd them well softened up. I could tell by the way they were all still standing."],
      ['myko', "And it's a Tuesday, Andrew. You've used one on a Tuesday. In Kilnamoe."],
    ),
    scene(
      'c1.call.puzzle',
      ['myko', 'There.'],
      ['andrew', 'I was about to do that.'],
      ['myko', "I know you were. I could see you working up to it. Another hour and you'd have had the first one."],
      ['myko', "Kegs, Andrew. I want you to remember, wherever this goes, that you called me in for kegs."],
    ),
  ],
};
