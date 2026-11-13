/**
 * Chapter 5: The Paper Trail. docs/chapters/05-the-paper-trail.md.
 */

import type { DialogueFile } from './index';
import { box, caption, scene } from './build';

export const C05: DialogueFile = {
  text: {
    'c5.title': 'The Paper Trail',
    'c5.card.lobby': 'Office of Atmospheric Records. Washington DC.',
    'name.ticketMachine': 'Ticket machine',
    'name.agent': 'Agent',
    'name.lobbyGuard': 'Guard',

    'c5.objective.lobby': 'Get past the lobby.',
    'c5.objective.floor': 'Cross the records floor.',
    'c5.objective.files': 'Find the file.',
    'c5.objective.redacted': 'Read what they blacked out.',
    'c5.objective.fight': 'Get through the agents.',
    'c5.objective.board': 'Work out where the test site is.',
    'c5.objective.pruitt': 'Get past Agent Pruitt.',

    'c5.clue.retirement.title': 'Sign-up sheet',
    'c5.clue.retirement.body': 'Retirement party for an Agent Pruitt. Date is three years away. Two names down. One is Pruitt.',
    'c5.clue.retirement.margin': 'The other one has written “maybe”.',
    'c5.clue.memo.title': 'Memo',
    'c5.clue.memo.body': 'From Agent Pruitt to Facilities. Fourth request for a second stapler. Cites the previous three.',
    'c5.clue.memo.margin': 'This is the man guarding the aliens.',
    'c5.clue.requisition.title': 'Requisition',
    'c5.clue.requisition.body': 'Approved order: “replacement corn, 40 acres”. Reason given: “previous corn affected”.',
    'c5.clue.requisition.margin': 'Affected by what, Andrew? Don’t answer. I know what you’ll say.',
    'c5.clue.busticket.title': 'Expenses claim',
    'c5.clue.busticket.body': 'Agent’s bus fare, Washington to somewhere blacked out. Eleven hours. He has claimed for a sandwich.',
    'c5.clue.busticket.margin': 'Eleven hours on a bus. West, then.',
    'c5.clue.site.title': 'The unredacted line',
    'c5.clue.site.body': 'Three copies, held together to the light: “Recovered material to be assessed at the test plot, Wendell County, Ohio.”',
    'c5.clue.site.margin': 'Ohio?',
    'c5.deduction.ohio.lead.title': 'Lead: Ohio',
    'c5.deduction.ohio.lead.body': 'They test what they recover at a plot in Wendell County, Ohio. They ruined forty acres of corn doing it and had to send an agent on a bus. That’s where the proof is.',
    'c5.deduction.ohio.lead.margin': 'Ohio. Right. Fine. Ohio.',

    'c5.deduction.ohio.prompt': 'Where is the test site?',
    'c5.deduction.ohio.answer': 'Wendell County, Ohio',
    'c5.redacted.prompt': 'Choose three sheets for the lightbox.',
    'c5.redacted.wrong': '“Staff are reminded that the microwave is for food only.”',
    'c5.redacted.right': '“Recovered material to be assessed at the test plot, Wendell County, Ohio.”',

    'c5.call.fight.casebook': 'Nine federal agents in an open-plan office. Got clear. Myko lent a hand.',
    'c5.call.fight.margin': 'I lent a hand to nine people, one after the other.',
    'c5.call.puzzle.casebook': 'Redacted file. Cracked it with a lightbox. Myko was looking over my shoulder.',
    'c5.call.puzzle.margin': 'I was looking over your shoulder at the answer.',
  },
  sequences: [
    caption('c5.caption.title', 'The Paper Trail'),
    caption('c5.caption.lobby', 'Office of Atmospheric Records. Washington DC.'),

    scene(
      'c5.open',
      ['andrew', "I'll ask at the desk."],
      ['myko', "You'll ask the federal government where they keep the aliens."],
      ['andrew', 'Politely.'],
      ['npc:name.ticketMachine', 'Please take a number. Your number is: 847. Now serving: 12.'],
      ['myko', "Well. You've until Christmas."],
    ),
    scene(
      'c5.actNatural.lesson',
      ['myko', "See the guard? He's looked at everyone in this room except the queue. Nobody has ever looked at a man in a queue."],
      ['andrew', 'So?'],
      ['myko', "So stand in one. Stand beside anything boring and be still. You'll vanish. You've the face for it."],
      ['andrew', "What's that supposed to mean?"],
      ['myko', "It's a compliment. I'll be outside. I'm too interesting for this."],
    ),
    box('c5.actNatural.done', ['myko', 'He looked right through you. Twenty years I’ve watched barmen do that. Go on, the staff door.', 'by phone']),

    // --- Records floor ---
    box('c5.floor.overheard.1', ['npc:name.agent', 'Did you see the email about the email?']),
    box('c5.floor.overheard.2', ['npc:name.agent', "It's somebody's birthday. There's a card going round. I don't know them."]),
    box('c5.floor.overheard.3', ['npc:name.agent', 'Pruitt put in for another stapler. Fourth time. You have to admire it.']),
    box('c5.floor.overheard.4', ['npc:name.agent', 'Ohio again next month. Eleven hours on that bus.']),
    box('c5.floor.overheard.5', ['npc:name.agent', "I just file the sky stuff. I don't read the sky stuff."]),
    box('c5.floor.clean', ['myko', "Six agents and not one of them saw a man in a green anorak. There's a memo on that desk. Have it.", 'by phone']),
    box('c5.floor.caught', ['myko', "You're seen. They come in pairs and one goes round the back. Don't let him.", 'by phone']),
    box('c5.floor.locked', ['myko', "I can hear your feet from the street. You're locked, Andrew. Stand still till it passes or have a tea.", 'by phone']),

    // --- Files and the redaction puzzle ---
    box('c5.files.requisition', ['andrew', 'Forty acres of replacement corn.'], ['myko', 'What happened the first corn?', 'by phone'], ['andrew', '“Affected.”']),
    box('c5.files.sheet', ['andrew', "Another copy of the same page. Different bits blacked out."], ['myko', "Different people with different markers. That's a government for you. Collect them.", 'by phone']),
    scene(
      'c5.redacted.intro',
      ['andrew', 'Five copies. Each one has different words covered.'],
      ['myko', "Then between them they've covered nothing. Put three on that light table. The right three.", 'by phone'],
    ),
    box('c5.redacted.wrongLine', ['myko', 'That’s the one about the microwave. Try again.', 'by phone']),
    scene(
      'c5.redacted.solved',
      ['andrew', '“Recovered material to be assessed at the test plot, Wendell County, Ohio.”'],
      ['myko', 'Say the last bit again.', 'by phone'],
      ['andrew', 'Wendell County, Ohio.'],
      ['myko', 'Ohio.'],
      ['andrew', 'What?'],
      ['myko', 'Nothing. Make a copy.'],
    ),
    scene(
      'c5.copier',
      ['andrew', "It's jammed."],
      ['myko', "Don't open the side panel.", 'by phone'],
      ['andrew', 'I opened the side panel.'],
      ['myko', "That alarm isn't the photocopier, Andrew. That's the building."],
    ),

    // --- Cubicle fight ---
    scene(
      'c5.fight.intro',
      ['npc:name.agent', 'Sir. Sir, this is a staff area. Sir, we’re going to need you to come with us and fill out a form.'],
      ['andrew', 'What form?'],
      ['npc:name.agent', "We'll find out together."],
    ),
    box('c5.fight.wave2', ['myko', 'More of them, from the kitchen side. One of them is still holding a yoghurt.', 'by phone']),
    box('c5.fight.end', ['myko', "That's the floor clear. Stacks are through the double doors. He'll be in there.", 'by phone']),

    box('c5.board.wrong.1', ['myko', "That's who. I asked you where.", 'by phone']),
    box('c5.board.wrong.2', ['myko', "No. The stapler's not part of it. I know you want it to be.", 'by phone']),
    box('c5.board.wrong.3', ['myko', 'Corn, a bus, and a county. Three things, one state.', 'by phone']),
    scene(
      'c5.board.right',
      ['andrew', 'The test plot. The corn they had to replace. The bus. Wendell County, Ohio.'],
      ['myko', "Ohio. Grand. Good. Let's go there, so.", 'by phone'],
      ['andrew', 'Are you all right?'],
      ['myko', "I'm grand. Mind yourself, there's a man coming."],
    ),

    // --- Pruitt, round one ---
    scene(
      'c5.pruitt.intro',
      ['pruitt', "Evening. Agent Pruitt. You'd be the gentlemen from the lobby camera."],
      ['andrew', "I know about the bog. And Boston. And the corn."],
      ['pruitt', "I expect you do. I'd like you to stop, please. I'm asking once, and I'm asking nicely, because I'm tired and you seem all right."],
      ['andrew', "I can't."],
      ['pruitt', "No. They never can. Mind the shelves, son. They're on rails."],
    ),
    scene(
      'c5.pruitt.phase2',
      ['pruitt', "I've had to call upstairs. I didn't want to. There's a form for that too."],
      ['myko', "Two shelves at once now. There's always one lane left. Watch the floor, it lights up.", 'by phone'],
    ),
    scene(
      'c5.pruitt.end',
      ['pruitt', 'Hold on.'],
      ['pruitt', "That's five o'clock."],
      ['andrew', 'So?'],
      ['pruitt', "So I don't do this after five. Thirty-one years. I'm three from my pension and I'm not giving them a minute past."],
      ['pruitt', "Door's unlocked. I'll have to write this up in the morning. I'd be gone by the morning, if I were you."],
      ['andrew', 'Thanks.'],
      ['pruitt', "Don't thank me. Ohio's a long bus."],
    ),

    scene(
      'c5.closing',
      ['andrew', 'Ohio.'],
      ['myko', '...'],
      ['andrew', 'Wendell County. I said Ohio.'],
      ['myko', "You did. I heard you. I'm just making sure I heard you."],
      ['andrew', "You've no opinion about anywhere. You'd none about Boston."],
      ['myko', "Boston's a town. Get on the bus, Andrew."],
    ),

    // --- Hints ---
    box('c5.hint.lobby.1', ['myko', "You're not going to get to 847. Find somewhere dull to stand near the staff door.", 'by phone']),
    box('c5.hint.lobby.2', ['myko', 'Stand still beside the noticeboard till the guard turns, then through the door marked Staff.', 'by phone']),
    box('c5.hint.floor.1', ['myko', "Vending machines, the water cooler, the queue for the copier. Go from boring thing to boring thing.", 'by phone']),
    box('c5.hint.floor.2', ['myko', 'Shift between props, stop dead beside each, wait for the patrol to pass. Stay under Locked or they’ll hear you.', 'by phone']),
    box('c5.hint.files.1', ['myko', "The loose pages are on desks. They're the ones with the black lines.", 'by phone']),
    box('c5.hint.files.2', ['myko', 'Five sheets: two by the cooler, one at the copier, two in the corner cubicles. And the requisition on the big desk.', 'by phone']),
    box('c5.hint.redacted.1', ['myko', "You want three where every word shows on at least one. Look at where the black is.", 'by phone']),
    box('c5.hint.redacted.2', ['myko', 'First, third and fourth. Leave the two with the coffee rings.', 'by phone']),
    box('c5.hint.fight.1', ['myko', "The darts are slow. It's the one behind you that'll have you.", 'by phone']),
    box('c5.hint.fight.2', ['myko', 'Back into a cubicle so they come one side only. Slam when three are in. Space out of the cuffs.', 'by phone']),
    box('c5.hint.board.1', ['myko', 'You’ve a place name now. What else points at it?', 'by phone']),
    box('c5.hint.board.2', ['myko', 'The line from the file, the corn order and the bus claim.', 'by phone']),
    box('c5.hint.pruitt.1', ['myko', "He's not chasing you. He's closing the room on you. Watch the rails.", 'by phone']),
    box('c5.hint.pruitt.2', ['myko', 'Rails light, change lane. Get up to him between cranks. Bottles work, he can’t dodge and wind at once.', 'by phone']),

    // --- Myko calls ---
    scene(
      'c5.call.fight',
      ['myko', 'Afternoon. Is this the queue?'],
      ['andrew', 'You did that with a lanyard.'],
      ['myko', "It was his lanyard. You'd them very well organised, though. All in a line like that. Made it easy."],
      ['myko', "Nine of them and one of you, mind. I'd have rung me too. I'd have rung me sooner."],
    ),
    scene(
      'c5.call.puzzle',
      ['myko', 'That, that and that.'],
      ['andrew', "You didn't even read them."],
      ['myko', "I read the back of them walking over. You'd it narrowed down to five, Andrew. Out of five."],
      ['myko', "What does it say? ... Say that last bit again."],
    ),
  ],
};
