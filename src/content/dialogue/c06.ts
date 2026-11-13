/**
 * Chapter 6: Flyover Country. docs/chapters/06-flyover-country.md.
 *
 * The Ohio rule: Myko's admiration is sincere. No line here may read as
 * sarcasm. He does not explain it. Andrew asks once.
 */

import type { DialogueFile } from './index';
import { box, caption, mykoPool, scene } from './build';

/** Unprompted admiration, used as his idle and tangent lines for the whole chapter. */
const admire = mykoPool('c6.ohio.general', [
  "Look at the sky, Andrew. There's so much of it. They didn't skimp.",
  'You could see a man coming for three days here. And he’d wave.',
  "It's flat. It's honest. A place this flat has nothing to hide.",
  "Nobody's in a hurry. Have you noticed? Nobody. I've never felt so understood.",
  "That's the fourth person who's held a door. I wasn't even going in.",
  "Smell that. That's nothing. That's the smell of nothing being wrong.",
  "I keep waiting for the catch. I don't think there is one. I think it's just Ohio.",
  "You know when you put the immersion on and the water's actually hot? It's like that, but a place.",
]);

export const C06: DialogueFile = {
  text: {
    'c6.title': 'Flyover Country',
    'c6.card.town': 'Wendell County, Ohio',
    'c6.card.motel': 'The Starlite Motel',
    'c6.card.fields': 'Field 9',
    'name.dale': 'Dale',
    'name.helloMan': 'Man',
    'name.waitress': 'Waitress',
    'name.motelClerk': 'Front desk',

    'c6.objective.town': 'Ask around town.',
    'c6.objective.hurley': 'Visit the sporting goods shop.',
    'c6.objective.motel': 'Check the motel.',
    'c6.objective.fields': 'Get into Field 9.',
    'c6.objective.drones': 'Deal with the drones.',
    'c6.objective.maze': 'Find the way through the formation.',
    'c6.objective.board': 'Work out who is paying for all this.',
    'c6.objective.combine': 'Stop the combine.',

    'c6.clue.noticeboard.title': 'Notice',
    'c6.clue.noticeboard.body': 'Bus station noticeboard: Field 9 closed for “soil work” until further notice. Meridian logo in the corner. They’re not even hiding it here.',
    'c6.clue.noticeboard.margin': 'It’s a lovely noticeboard. Somebody maintains that.',
    'c6.clue.ledger.title': 'Guest ledger',
    'c6.clue.ledger.body': 'Starlite Motel. Twelve rooms block-booked by Meridian for six weeks. Paid by Little Green Gifts, Roswell, New Mexico.',
    'c6.clue.ledger.margin': 'Twelve rooms and they left a review. Five stars. Correct.',
    'c6.clue.postcard.title': 'Postcard',
    'c6.clue.postcard.body': 'Aerial photo of Field 9, sold at the motel desk. The crop formation, from above. Three points and a path between them.',
    'c6.clue.postcard.margin': 'They sell postcards of it. A dollar. A dollar, Andrew.',
    'c6.clue.receipt.title': 'Receipt',
    'c6.clue.receipt.body': 'Under the hatch at the centre: nothing, and a till receipt. Forty snow globes. Little Green Gifts, Roswell.',
    'c6.clue.receipt.margin': 'Forty. Same as the containers. Same as the corn. I noticed that before you did.',
    'c6.clue.coffee.title': 'The coffee',
    'c6.clue.coffee.body': 'Diner refills the cup without being asked. No charge. Cause unknown. Monitoring.',
    'c6.clue.coffee.margin': 'It’s called being decent. Write that down.',
    'c6.deduction.roswell.lead.title': 'Lead: Roswell',
    'c6.deduction.roswell.lead.body': 'The motel was paid for by a gift shop. The receipt is from the same gift shop. And the crop formation is the gift shop’s logo. Little Green Gifts, Roswell.',
    'c6.deduction.roswell.lead.margin': 'We have to leave, then. Do we. Right.',

    'c6.deduction.roswell.prompt': 'Who is paying for this?',
    'c6.deduction.roswell.answer': 'Little Green Gifts, Roswell',

    'c6.call.fight.casebook': 'Surveillance drones over Field 9, six of them, and two agents. Brought them down. Myko assisted.',
    'c6.call.fight.margin': 'I had an ice bucket. That’s all I’ll say.',
    'c6.call.puzzle.casebook': 'Crop formation is a maze from the ground. Solved it off the postcard. Myko walked it with me.',
    'c6.call.puzzle.margin': 'I walked it. You followed, complaining.',
  },
  sequences: [
    caption('c6.caption.title', 'Flyover Country'),
    caption('c6.caption.town', 'Wendell County, Ohio'),
    caption('c6.caption.motel', 'The Starlite Motel'),
    caption('c6.caption.fields', 'Field 9'),
    ...admire.sequences,

    scene(
      'c6.open',
      ['andrew', "Right. There's a test plot somewhere. We need to find out who –"],
      ['myko', 'Andrew.'],
      ['andrew', 'What?'],
      ['myko', 'Look at that. A car park you could land a plane in, and it’s free. They just let you have it.'],
      ['andrew', "It's a car park."],
      ['myko', "It's Ohio, Andrew."],
    ),
    scene(
      'c6.askOnce',
      ['andrew', "What's got into you?"],
      ['myko', 'Nothing.'],
      ['andrew', "You've been smiling since the state line. With both sides of your mouth."],
      ['myko', "I don't know what you want me to say. Look around you."],
      ['andrew', "It's a road."],
      ['myko', "I feel sorry for you. I do. Come on."],
    ),

    // --- Admiration, tagged by the thing he is looking at ---
    box('c6.ohio.road', ['myko', "The width of that road. You could turn a combine in it. You could turn two. They planned for two."]),
    box('c6.ohio.waterTower', ['myko', "They've written the name of the town on the water tower. So you know. That's manners."]),
    box('c6.ohio.diner', ['myko', "She filled it again. I didn't ask. Andrew, she just filled it again."]),
    box('c6.ohio.carPark', ['myko', "Every space has lines. Nobody's over the lines. I could cry."]),
    box('c6.ohio.busStation', ['myko', "The bus was on time. It said 2.15 and it was 2.15. I've never seen that. I thought it was a myth."]),
    box('c6.ohio.flag', ['myko', "Somebody mows that verge. There's no house near it. They just mow it, for everyone."]),
    box('c6.ohio.iceMachine', ['myko', "Ice. Free. In the corridor. As much as you want, all night, and nobody watching you."]),
    box('c6.ohio.iceMachine.again', ['myko', "I'm not finished here. Go on in. I'll follow you."]),
    box('c6.ohio.pool', ['myko', "There's no water in it and it's still the nicest pool I've ever stood beside."]),
    box('c6.ohio.motelSign', ['myko', "“Vacancy.” They have room for you and they've put up a sign to say so. In lights."]),
    box('c6.ohio.corn', ['myko', "It goes to the edge of the world. And it's all the one height. Who did that? I want to shake his hand."]),
    box('c6.ohio.sky', ['myko', 'That is the correct size for a sky. Every other sky I’ve been under was an estimate.']),
    box('c6.ohio.shop', ['myko', "A shop for sport. All the sports, in the one shop. And a man in it who's glad you came in."]),
    box('c6.ohio.sidewalk', ['myko', "There's a footpath on both sides. Both. For a street with four people on it."]),
    box('c6.ohio.mailbox', ['myko', "They leave the post in a box at the end of the lane and nobody takes it. It just sits there, trusted."]),
    box('c6.ohio.ditch', ['myko', "Even the ditch is tidy. That's a ditch that's been thought about."]),

    // Insults continue, each followed by something nice about Ohio.
    box('c6.insult.1', ['myko', "You're holding that map upside down again. Mind you, it's a lovely county either way up."]),
    box('c6.insult.2', ['myko', "You've the investigative instincts of a bollard. A well-made bollard, like the ones they have here."]),
    box('c6.insult.3', ['myko', "That's the worst idea you've had since Boston. Still, grand day for it. Look at that light."]),

    // --- Town ---
    scene(
      'c6.town.hello',
      ['npc:name.helloMan', 'Morning! How are you folks doing?'],
      ['andrew', 'What does he want?', 'quietly'],
      ['myko', "Nothing. He wants to know how we're doing."],
      ['andrew', 'Why?'],
      ['myko', "We're doing very well, thank you. And yourself?"],
      ['npc:name.helloMan', "Can't complain!"],
      ['myko', "He can't complain, Andrew. Imagine."],
    ),
    box('c6.town.notice', ['andrew', 'Field 9. Closed for soil work. Meridian.'], ['myko', "It's all laminated. Every notice. Laminated and straight."]),
    scene(
      'c6.town.diner',
      ['npc:name.waitress', 'Coffee, hon? Bottomless.'],
      ['andrew', "What's the catch?"],
      ['npc:name.waitress', 'No catch. You just look like you need it.'],
      ['myko', "It'll do you for tea. It'll sort the head. Say thank you to the woman."],
    ),

    // --- The hurley ---
    scene(
      'c6.hurley.find',
      ['andrew', "That's a hurley."],
      ['npc:name.dale', "That? Came in a box lot. I got it in with the, uh, misc bats. Some kinda paddle?"],
      ['andrew', "It's a hurley. It's ash. It's a good one."],
      ['npc:name.dale', "If you say so! Tell you what, four dollars. Nobody's ever gonna ask me for it again."],
      ['myko', "He's holding it like it's a baby. Dale, you've made his year. This is a great shop."],
      ['npc:name.dale', 'Well, thank you! You fellas come back now.'],
      ['myko', 'We will, Dale.'],
    ),
    box('c6.hurley.got', ['myko', "Look at you. That's the happiest I've seen you since the quiz. Swing it at something that isn't me."]),

    // --- Motel ---
    scene(
      'c6.motel.desk',
      ['npc:name.motelClerk', "Ledger? Oh, sure, go ahead. It's just the big group. Meridian folks. Real quiet. Paid up front."],
      ['andrew', 'Paid by who?'],
      ['npc:name.motelClerk', 'Gift shop out in New Mexico, says here. Postcard? Dollar each. That’s our field.'],
      ['andrew', 'Where’s Myko?'],
      ['npc:name.motelClerk', "Your friend? He's been at the ice machine about twenty minutes. He seems real happy."],
    ),

    // --- Fields ---
    scene(
      'c6.fields.open',
      ['myko', "Drones. Five. They've lights on the bottom. Stand still in the tall corn and they can't pick you out.", 'by phone'],
      ['andrew', 'Where are you?'],
      ['myko', "End of the lane. There's a mailbox. I'm looking at it."],
    ),
    box('c6.fields.rustle', ['myko', "The corn's giving you away. Slow down. It's not going anywhere, it's corn.", 'by phone']),
    box('c6.fields.clean', ['myko', "Not a peep. There's a farm stand by the track with a jar on it and an honesty box. Leave a dollar. Leave two.", 'by phone']),
    box('c6.fields.caught', ['myko', "They've seen you. Ah well. They were very good drones while it lasted.", 'by phone']),
    scene(
      'c6.deflect.lesson',
      ['myko', "That one's coming straight for you regardless. Andrew. When it fires, it's slow. You've a hurley.", 'by phone'],
      ['andrew', 'So?'],
      ['myko', 'So what do you do with a ball that’s coming at you slow?'],
    ),
    box('c6.deflect.done', ['myko', "Over the bar. I'd say that's the first point ever scored in Wendell County.", 'by phone']),
    box('c6.drones.wave2', ['npc:name.agent', 'Sir! This is a restricted agricultural site! Put down the, the paddle!']),
    box('c6.drones.end', ['myko', "That's the lot. Mind where they fell, somebody will have to tidy that. They'll do it well, too.", 'by phone']),

    // --- Maze ---
    scene(
      'c6.maze.intro',
      ['andrew', "It's flattened. Paths, going everywhere. I can't see the shape from in here."],
      ['myko', "You've a picture of it from above in your pocket. You paid a dollar for it. Tab.", 'by phone'],
    ),
    box('c6.maze.wrong', ['myko', 'Wrong stone. They’ve all gone dark again. Look at the card.', 'by phone']),
    box('c6.maze.done', ['myko', "That's it open. What's in it?", 'by phone']),
    scene(
      'c6.centre',
      ['andrew', "A hatch. Nothing under it. There's a receipt."],
      ['myko', 'For what?', 'by phone'],
      ['andrew', 'Forty snow globes. Little Green Gifts. Roswell, New Mexico.'],
      ['myko', "Forty. Everything's forty with these people."],
    ),

    box('c6.board.wrong.1', ['myko', "No. And don't put the coffee on the board, it's done nothing to you."]),
    box('c6.board.wrong.2', ['myko', 'Who paid, Andrew. Follow the money. There’s only about nine dollars of it.']),
    box('c6.board.wrong.3', ['myko', 'Look at the postcard. Then look at the top of the receipt. The little picture.']),
    scene(
      'c6.board.right',
      ['andrew', "The formation. It's their logo. It's the logo of a gift shop."],
      ['myko', "They flattened forty acres of that beautiful corn to draw an advert. That's the first thing that's made me angry in a week."],
    ),

    // --- Combine ---
    scene(
      'c6.combine.intro',
      ['andrew', "What's that noise?"],
      ['myko', "That's a combine. A big one. There's nobody in it, Andrew.", 'by phone'],
      ['andrew', "It's coming this way."],
      ['myko', "It's got three red lights on the cab. I'd say it needs those. Watch the dust, that's the row it's taking next."],
    ),
    box('c6.combine.light1', ['myko', "One out. It's not happy.", 'by phone']),
    box('c6.combine.light2', ['myko', 'Two. One more. Send a bale back at it if you can’t reach.', 'by phone']),
    scene(
      'c6.combine.end',
      ['andrew', "It's stopped."],
      ['myko', "It's gone into the ditch. Slowly. With great dignity. Even the machinery here knows how to behave.", 'by phone'],
    ),

    scene(
      'c6.closing',
      ['andrew', 'Bus is in ten minutes. Roswell.'],
      ['myko', "I'll need a minute."],
      ['andrew', "We've the lead. We have to go."],
      ['myko', "I know we do. I know. I'm just going to stand here."],
      ['andrew', "What's that?"],
      ['myko', "It's a fridge magnet. It's the shape of the state. It says “Ohio”."],
      ['andrew', "You don't have a fridge."],
      ['myko', "I'll get one."],
    ),

    // --- Hints ---
    box('c6.hint.town.1', ['myko', "Ask anyone. They'll tell you. They'll tell you and then ask how you are."]),
    box('c6.hint.town.2', ['myko', 'The noticeboard at the bus station. It’s the laminated one. They’re all the laminated one.']),
    box('c6.hint.hurley.1', ['myko', "Dale's. The sport shop. He has a bin of bats by the door, and one of them isn't a bat."]),
    box('c6.hint.hurley.2', ['myko', 'Dale’s Sporting Goods, middle of Main Street. E at the bin. Be nice to Dale.']),
    box('c6.hint.motel.1', ['myko', "The Starlite. The pink one. Ask at the desk. I'll be in the corridor."]),
    box('c6.hint.motel.2', ['myko', 'The ledger on the counter, and buy the postcard. It’s a dollar. It’s the best dollar you’ll spend.']),
    box('c6.hint.fields.1', ['myko', "Tall corn hides you if you're still. Moving through it makes noise. So move a bit, stop a lot.", 'by phone']),
    box('c6.hint.fields.2', ['myko', 'Shift along the rows, stop when a light comes near. Bottle the far side to pull them off the track.', 'by phone']),
    box('c6.hint.drones.1', ['myko', "You can't reach them. But they keep giving you things to hit.", 'by phone']),
    box('c6.hint.drones.2', ['myko', 'Swing as the bolt arrives and it goes back where it came from. Do the agents on foot between volleys.', 'by phone']),
    box('c6.hint.maze.1', ['myko', "Three stones, in an order. The order's on the postcard. Tab.", 'by phone']),
    box('c6.hint.maze.2', ['myko', 'Near stone on the left first. Then the far one. Then the one by the hatch.', 'by phone']),
    box('c6.hint.board.1', ['myko', "Two bits of paper with the same name on them, and a picture that's the same shape as a field."]),
    box('c6.hint.board.2', ['myko', 'The ledger, the receipt and the postcard.']),
    box('c6.hint.combine.1', ['myko', "It's blind without the red lights. They're on the cab, where you can reach when it passes.", 'by phone']),
    box('c6.hint.combine.2', ['myko', 'Step out of its row when the dust shows, hit a light as it goes by. Or knock a drone bolt into one.', 'by phone']),

    // --- Myko calls ---
    scene(
      'c6.call.fight',
      ['myko', "Sorry, lads. Sorry. Lovely machines. Sorry."],
      ['andrew', 'Was that an ice bucket?'],
      ['myko', "It's from the motel. I'll bring it back. You'd them nearly down, I only tidied up. It's a tidy place, you'd want to leave it right."],
      ['myko', 'A man with a hurley, beaten by flying kettles. In Ohio, of all places. I’ll forgive you, because of where we are.'],
    ),
    scene(
      'c6.call.puzzle',
      ['myko', 'That one, that one, that one.'],
      ['andrew', 'You never looked at the postcard.'],
      ['myko', "I've been looking at that postcard for two days, Andrew. I know every inch of that field. I love that field."],
      ['myko', "You'd have got there. You were only on your fourth lap."],
    ),
    scene(
      'c6.call.combine',
      ['myko', 'Whoa. Whoa, now. Easy.'],
      ['andrew', 'You stopped it with your hand.'],
      ['myko', "I asked it to stop. I'm sorry about this, it's not your fault. You're a fine machine."],
      ['andrew', 'Are you talking to the combine?'],
      ['myko', "Somebody should."],
    ),
  ],
  pools: {
    ...admire.pool,
    'c6.insults': ['c6.insult.1', 'c6.insult.2', 'c6.insult.3'],
  },
};
