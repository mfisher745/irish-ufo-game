/**
 * Chapter 10: Disclosure. docs/chapters/10-disclosure.md.
 * The ending: he proves it to the whole world and the world does not look up.
 * One person cares, and it is the right one.
 */

import type { DialogueFile } from './index';
import { box, caption, scene } from './build';

export const C10: DialogueFile = {
  text: {
    'c10.title': 'Disclosure',
    'c10.card.anteroom': 'Control level. Reception.',
    'c10.card.control': 'The Administrator’s office',
    'c10.card.pub': "Feeney's, Kilnamoe. A Tuesday.",
    'name.security': 'Security',
    'name.newsreader': 'Newsreader',
    'name.comment': 'Comment',

    'c10.objective.anteroom': 'Get through reception.',
    'c10.objective.administrator': 'Deal with the Administrator.',
    'c10.objective.broadcast': 'Load the five proofs.',
    'c10.objective.button': 'Press the button.',
    'c10.objective.pub': 'Go home.',
    'c10.objective.sit': 'Sit at the bar.',

    'c10.broadcast.prompt': 'Five proofs. Five channels.',
    'c10.broadcast.socket': 'Channel {n}',
    'c10.broadcast.button': 'Broadcast',

    // The world's reaction: narrator cards.
    'c10.reaction.governments': 'Within the hour, eleven governments confirm it.',
    'c10.reaction.statement': 'A joint statement runs to two paragraphs. The second is about parking.',
    'c10.reaction.views': 'Andrew’s video: 41 views.',
    'c10.reaction.lake': 'A lake, somewhere north. A man turns off a radio.',
    'c10.reaction.week': 'One week later',

    'c10.credits.title': 'Same Again',
    'c10.credits.line1': 'No aliens were inconvenienced beyond the ordinary.',
    'c10.credits.line2': 'Kilnamoe is not a real place. Wendell County is not a real place. Ohio is.',
    'c10.credits.line3': 'Everything you saw and heard was made in code.',
    'c10.credits.thanks': 'Thanks for playing.',

    'c10.call.fight.casebook': 'Alien security at reception, ten of them. Got to the door. Myko came up in the lift.',
    'c10.call.fight.margin': 'I took a ticket first. I’m not an animal.',
    'c10.call.puzzle.casebook': 'Loaded the five proofs into the broadcast console. Myko helped with the plugs. I pressed the button.',
    'c10.call.puzzle.margin': 'You pressed the button. That part’s true. I left it for you.',
  },
  sequences: [
    caption('c10.caption.title', 'Disclosure'),
    caption('c10.caption.anteroom', 'Control level. Reception.'),
    caption('c10.caption.control', 'The Administrator’s office'),
    caption('c10.caption.pub', "Feeney's, Kilnamoe. A Tuesday."),
    caption('c10.caption.governments', 'Within the hour, eleven governments confirm it.'),
    caption('c10.caption.statement', 'A joint statement runs to two paragraphs. The second is about parking.'),
    caption('c10.caption.views', 'Andrew’s video: 41 views.'),
    caption('c10.caption.lake', 'A lake, somewhere north. A man turns off a radio.'),
    caption('c10.caption.week', 'One week later'),
    caption('c10.caption.end', 'Same Again'),

    // --- Anteroom ---
    scene(
      'c10.open',
      ['npc:name.ticketMachine', 'Please take a number. Your number is: 848. Now serving: 12.'],
      ['andrew', '848.'],
      ['myko', "You've moved up one. Since Washington. That's progress, in a way.", 'by phone'],
      ['npc:name.security', 'Sir. The Administrator is not seeing anyone without an appointment.'],
      ['andrew', "I've a number."],
    ),
    box('c10.anteroom.wave2', ['myko', "More from the side door. They're very polite about it. Don't let that slow you.", 'by phone']),
    box('c10.anteroom.end', ['myko', "That's reception cleared. There's one door left, Andrew. I'd knock.", 'by phone']),

    // --- M refused ---
    // (The lines themselves are in common.ts: myko.callRefused.administrator.)

    // --- The Administrator ---
    scene(
      'c10.admin.intro',
      ['administrator', "Ah. You'll be the gentleman from the bog."],
      ['andrew', "You know about the bog."],
      ['administrator', "I've had four reports about the bog. I'd prefer not to be having this conversation, if I'm honest. Would you fill this in?"],
      ['andrew', 'What is it?'],
      ['administrator', "A visitor incident form. It's only two sides. It would save us both a great deal."],
      ['andrew', "I'm going to tell everyone you're here."],
      ['administrator', 'Yes. I was afraid it might be that. Security, please. I do apologise.'],
    ),
    scene(
      'c10.admin.phase2',
      ['administrator', "I had hoped to delegate this. Very well. I'm going to have to restructure the room."],
      ['myko', "He's changing which way is down. The arrows tell you. You've a glove, Andrew. Change it back on him.", 'by phone'],
    ),
    box('c10.admin.offer1', ['administrator', "A settlement. Generous. You sign, you go home, there's a sum. Think of your slate."]),
    box('c10.admin.offer2', ['administrator', "A better settlement. And the bog restored. We'd re-turf it. We have a man."]),
    box('c10.admin.offer3', ['administrator', "A position, then. Liaison. There's a desk. There's dental. You could finally be somebody, in a small way."]),
    scene(
      'c10.admin.phase3',
      ['administrator', "No? No. Then personally. One moment."],
      ['administrator', "I'll hang this up first. It's a good jacket."],
      ['myko', "He's hung his jacket up. Properly. On a hanger. Andrew, that's the most dangerous thing I've seen anyone do on this whole trip.", 'by phone'],
    ),
    scene(
      'c10.admin.end',
      ['administrator', "That will do. That will do."],
      ['administrator', "The console is the one on the dais. Five channels. You'll want the large button."],
      ['andrew', "You're telling me how?"],
      ['administrator', "It doesn't make any difference. I'm not being unkind. I've been here sixty years, and I have read a great deal about your people."],
      ['administrator', "You'll tell them. They'll know. And then it will be Wednesday."],
      ['andrew', "They'll care."],
      ['administrator', "I do hope so. For your sake. Mind the step."],
    ),

    // --- The broadcast ---
    scene(
      'c10.broadcast.intro',
      ['myko', "I'm coming up. Don't press anything till I'm there. I want to see your face."],
      ['andrew', 'Five plugs. Five sockets.'],
      ['myko', "Two of those sockets look the same. They're not. Look closer. I'll hold the bag."],
    ),
    box('c10.broadcast.wrong', ['myko', "Doesn't go. Don't force it. That's the proof of alien life, not a phone charger."]),
    scene(
      'c10.broadcast.ready',
      ['andrew', "That's all five."],
      ['myko', 'So press it.'],
      ['andrew', '...'],
      ['myko', "Twenty years I've been slagging you. Go on. Press it."],
    ),
    scene(
      'c10.broadcast.sent',
      ['andrew', "It's gone. Every screen. Everywhere."],
      ['myko', 'How long?'],
      ['andrew', 'Ninety seconds.'],
      ['myko', "Ninety seconds on every telly on earth. That's more than the Angelus gets."],
    ),

    // --- The world's reaction ---
    scene(
      'c10.reaction.news',
      ['npc:name.newsreader', 'Good evening. Tonight: a wet and windy week ahead, with a status yellow warning for the west.'],
      ['npc:name.newsreader', 'Also tonight, the bin collection dispute enters its third week, with no sign of agreement.'],
      ['npc:name.newsreader', 'And finally, aliens exist. Governments have confirmed that a facility in Nevada has housed extraterrestrial staff since 1962.'],
      ['npc:name.newsreader', 'More on that on our website. Now, sport.'],
    ),
    scene('c10.reaction.comment', ['npc:name.comment', 'nice', 'from Gary']),
    scene(
      'c10.reaction.colleen',
      ['colleenAnn', 'I ALWAYS knew. Didn’t I say? I said. And those two guys? Friends of mine. Irish guys. The aliens are probably Irish too, if you think about it.'],
    ),

    // --- Feeney's ---
    scene(
      'c10.pub.enter',
      ['andrew', "It's the same."],
      ['myko', "What did you expect, bunting?"],
      ['andrew', 'Something.'],
      ['myko', 'Go on up to the bar.'],
    ),
    box('c10.pub.machine', ['andrew', "That machine still has my euro."], ['myko', "It's a different euro now. That one you got back. This is a new grievance."]),
    box('c10.pub.telly', ['andrew', "They're showing it again."], ['myko', "They're showing the weather, Andrew. You're the bit in the corner."]),
    scene(
      'c10.pub.dympna',
      ['dympna', 'Andrew.'],
      ['andrew', 'Dympna.'],
      ['dympna', 'I saw you on the telly.'],
      ['andrew', 'You did?'],
      ['dympna', 'Aliens, is it? Fair play.'],
      ['andrew', '...'],
      ['dympna', 'Same again?'],
    ),

    // --- Epilogue ---
    scene(
      'c10.epilogue.1',
      ['andrew', 'Forty-one views.'],
      ['myko', 'I know.'],
      ['andrew', 'Third on the news. After the bins.'],
      ['myko', 'I know.'],
      ['andrew', "I proved it. To everyone. I was right about all of it and it's Tuesday and Dympna asked me about the slate."],
      ['myko', 'Andrew.'],
      ['andrew', 'What?'],
    ),
    scene(
      'c10.epilogue.2',
      ['myko', 'You were right.'],
      ['andrew', '...'],
      ['myko', "You were right. About the lights, and the bog, and the bit of metal. I said tractor. I said it to your face."],
      ['myko', 'It was a spaceship, Andrew. There was a spaceship in Leitrim and you were the only one looking up.'],
      ['myko', "I stood in a lift with you and a bag of proof. I shook hands with a man from another planet who works a till. I've never had a week like it. I've never had a life like it."],
      ['andrew', "You're not slagging me."],
      ['myko', "I'm not. I'll start again tomorrow. Tonight, tell it to me again. From the start. From the chipper. Leave nothing out."],
    ),
    // If all three calls are unused.
    scene(
      'c10.epilogue.calls.unused',
      ['myko', "And you never rang me. Not once. Three I gave you, and you still have the three."],
      ['andrew', "I said I wouldn't need them."],
      ['myko', "You did say that. I'm nearly impressed. Don't let it go to your head, there isn't room."],
    ),
    // If any were used, he does not bring them up. That is the kindness.
    scene(
      'c10.epilogue.3',
      ['andrew', 'It was a Tuesday. I was at the bar.'],
      ['myko', 'You were alone.'],
      ['andrew', "I wasn't alone. You were there."],
      ['myko', "I was. Go on."],
    ),
    scene(
      'c10.epilogue.ohio',
      ['myko', 'Do you know who’d want to hear about this?'],
      ['andrew', 'Who?'],
      ['myko', "They'd love this in Ohio. We should go back and tell them. They'd listen. They'd put it on the water tower."],
      ['andrew', '...'],
      ['dympna', 'Well? Are ye having one or are ye taking up stools?'],
      ['andrew', 'Same again.'],
    ),

    // --- Hints ---
    box('c10.hint.anteroom.1', ['myko', "Everything you have, Andrew. This is what it was all for.", 'by phone']),
    box('c10.hint.anteroom.2', ['myko', 'Glove the shields, sliotar the lines, slam when they close in. Drink between waves.', 'by phone']),
    box('c10.hint.administrator.1', ['myko', "He's behind that desk till the two guards are down. Then he isn't.", 'by phone']),
    box('c10.hint.administrator.2', ['myko', 'Drop both guards and hit him while the desk is dark. When he flips the room, glove a switch and flip it back. When he vanishes, stumble.', 'by phone']),
    box('c10.hint.broadcast.1', ['myko', "Each plug's a different shape. Match the shape, not the colour."]),
    box('c10.hint.broadcast.2', ['myko', 'The tape and the photo look like they share a socket. The tape’s has the notch. E on a socket to look closer.']),
    box('c10.hint.button.1', ['myko', "It's the big one. He told you himself."]),
    box('c10.hint.button.2', ['myko', 'E. Go on.']),
    box('c10.hint.pub.1', ['myko', "It's the bar, Andrew. You know the way. You've worn a path."]),
    box('c10.hint.pub.2', ['myko', 'Your stool. End of the bar. E.']),

    // --- Myko calls ---
    scene(
      'c10.call.fight',
      ['myko', "Number 849. That's me. Excuse me, lads."],
      ['andrew', 'You took a ticket.'],
      ['myko', "There's a system. You'd them softened. I could tell, they were all still standing but they'd a worried look."],
      ['myko', "That door's yours, though. I'm not going through that one for you. I'll be out here."],
    ),
    scene(
      'c10.call.puzzle',
      ['myko', "Give me the bag. That, that, that, that, that."],
      ['andrew', "You didn't look."],
      ['myko', "They only go the one way. You'd have had it by morning."],
      ['myko', "I'm not touching the button. Don't look at me. That's yours."],
    ),
  ],
};
