/**
 * Chapter 4: Southie. docs/chapters/04-southie.md.
 * Americans may say the cartoon things to Andrew. His tired reaction is the joke.
 */

import type { DialogueFile } from './index';
import { box, caption, scene } from './build';

export const C04: DialogueFile = {
  text: {
    'c4.title': 'Southie',
    'c4.card.airport': 'Boston. Arrivals.',
    'c4.card.bar': "Paddy O'Shamrock's",
    'c4.card.docks': 'Pier Nine',
    'name.kiosk': 'Kiosk',
    'name.patronDoug': 'Doug',
    'name.patronBarb': 'Barb',
    'name.patronKev': 'Kev',
    'name.patronSully': 'Sully',
    'name.foreman': 'Foreman',
    'name.docker': 'Docker',

    'c4.objective.tea': 'Find tea.',
    'c4.objective.bar': 'Ask around in the bar.',
    'c4.objective.brawl': 'Finish what the bar started.',
    'c4.objective.docks': 'Get into Pier Nine.',
    'c4.objective.containers': 'Reach container MAS-4471.',
    'c4.objective.board': 'Work out who took it.',
    'c4.objective.foreman': 'Deal with the foreman.',

    'c4.clue.roster.title': 'Shift roster',
    'c4.clue.roster.body': 'Pier Nine roster, pinned by the dartboard. Every second Tuesday, 3 a.m.: “FEDERAL PICKUP – NO QUESTIONS”.',
    'c4.clue.roster.margin': 'They wrote “no questions” down. On a wall. In a pub.',
    'c4.clue.patch.title': 'Jacket patch',
    'c4.clue.patch.body': 'Pier Nine Freight patch on a regular’s jacket. Small mark under the nine. Same mark as on the fragment.',
    'c4.clue.patch.margin': 'You got that close to a docker’s arm and lived.',
    'c4.clue.stout.title': 'The stout',
    'c4.clue.stout.body': 'Poured in one go. No settle. Served with a straw. Noted for the record.',
    'c4.clue.stout.margin': 'Let it go, Andrew.',
    'c4.clue.seizure.title': 'Federal notice',
    'c4.clue.seizure.body': 'Taped inside container MAS-4471. Contents removed by the Office of Atmospheric Records, Washington DC. Reference number. No explanation.',
    'c4.clue.seizure.margin': 'Atmospheric. As in the sky. Don’t look at me like that.',
    'c4.clue.foam.title': 'Packing foam',
    'c4.clue.foam.body': 'Foam insert left in the container. Cut to hold something round. About the size of a dinner plate.',
    'c4.clue.foam.margin': 'Or a dinner plate.',
    'c4.lead.dc.title': 'Lead: Washington',
    'c4.lead.dc.body': 'Meridian ships it. Pier Nine holds it. Every second Tuesday a federal office collects it: the Office of Atmospheric Records. That’s who has it now.',
    'c4.lead.dc.margin': 'You’re going to walk into a government building. In that anorak.',

    'c4.deduction.prompt': 'Who took it?',
    'c4.deduction.answer': 'The Office of Atmospheric Records',

    'c4.call.fight.casebook': 'Disagreement in a Boston bar. Six of them. Came out of it fine. Myko stepped in briefly.',
    'c4.call.fight.margin': 'I didn’t put my drink down.',
    'c4.call.puzzle.casebook': 'Container was out of reach at the docks. Worked the crane. Myko pointed.',
    'c4.call.puzzle.margin': 'I pulled one lever. You’d pulled the other two eleven times.',
  },
  sequences: [
    caption('c4.caption.title', 'Southie'),
    caption('c4.caption.airport', 'Boston. Arrivals.'),
    caption('c4.caption.bar', "Paddy O'Shamrock's"),
    caption('c4.caption.docks', 'Pier Nine'),

    // --- Arrivals, hungover ---
    scene(
      'c4.open',
      ['andrew', 'Why is it so bright?'],
      ['myko', "It's an airport. And you drank the trolley."],
      ['andrew', 'I had two.'],
      ['myko', 'You had two, and then the lad beside you fell asleep and you had his two. Tea or a roll, Andrew. Either.'],
      ['andrew', "They won't have rolls."],
      ['myko', "They won't. Find tea."],
    ),
    scene(
      'c4.kiosk',
      ['andrew', 'Tea, please.'],
      ['npc:name.kiosk', 'Hot or iced?'],
      ['andrew', '...'],
      ['myko', 'Hot. He wants it hot. He wants it to have been near a kettle.'],
      ['npc:name.kiosk', 'Sure! Do you want the bag in or on the side?'],
      ['andrew', 'I want to go home.'],
    ),
    box('c4.kiosk.after', ['myko', "It worked, though. Look at you. You've a face again."]),
    box('c4.lightBeer', ['andrew', 'Is this beer?'], ['myko', "It's adjacent. It's had beer described to it."]),

    // --- The bar ---
    scene(
      'c4.bar.enter',
      ['andrew', "There's a shillelagh over the till."],
      ['myko', "And a clock counting down to March. Say nothing. We need them."],
      ['colleenAnn', 'Welcome to Paddy O’Shamrock’s! Top o’ the mornin’ to ya!'],
      ['andrew', "It's four in the afternoon."],
      ['colleenAnn', 'Oh my God. Say that again. Your accent. Are you guys Irish? I’m Irish!'],
      ['andrew', 'Whereabouts?'],
      ['colleenAnn', 'Massachusetts!'],
    ),
    scene(
      'c4.bar.doug',
      ['npc:name.patronDoug', 'My great-great-grandmother was from County Cork! Do you know the Sullivans?'],
      ['andrew', 'I do, yeah.'],
      ['myko', "You don't.", 'quietly'],
      ['andrew', "It's quicker."],
    ),
    scene(
      'c4.bar.barb',
      ['npc:name.patronBarb', 'Now is it true you all have the potato every day?'],
      ['andrew', 'Most days.'],
      ['npc:name.patronBarb', 'I knew it. I said to Linda.'],
      ['myko', "That one's actually true, in fairness to her."],
    ),
    scene(
      'c4.bar.kev',
      ['npc:name.patronKev', 'You guys still got the leprechauns over there, or what?'],
      ['andrew', 'There was one. He moved to Boston.'],
      ['npc:name.patronKev', 'No kidding! Where?'],
      ['andrew', 'He opened a bar.'],
    ),
    scene(
      'c4.bar.sully',
      ['npc:name.patronSully', 'Pier Nine? Yeah, I work Pier Nine. Why?'],
      ['andrew', 'I like boats.'],
      ['npc:name.patronSully', "It's containers. We don't get told what's in 'em. Tuesdays we don't even get to look."],
      ['myko', "Mind his jacket, Andrew. The patch. Don't stare. You're staring.", 'quietly'],
    ),
    scene(
      'c4.bar.stout',
      ['colleenAnn', 'One pint of the black stuff, just like home!'],
      ['andrew', "You didn't let it settle."],
      ['colleenAnn', 'Let it what?'],
      ['andrew', "There's a straw in it."],
      ['myko', "Drink it, Andrew. Drink it and think of the dole office. Something that'll cheer you up."],
    ),
    box('c4.bar.ipa', ['myko', "That one's called Hop Lawyer. It tastes like someone's been cutting a hedge near it."]),
    scene(
      'c4.bar.colleenHelp',
      ['colleenAnn', 'The dock guys? Sure, they’re in every night. Roster’s right there by the darts. Why, are you guys, like, detectives?'],
      ['andrew', 'Yes.'],
      ['myko', 'No.'],
      ['colleenAnn', 'That is SO Irish.'],
    ),

    // --- Stout Slam and the brawl ---
    scene(
      'c4.slam.lesson',
      ['npc:name.patronKev', 'Hey. Hey, Irish. Say something Irish.'],
      ['andrew', 'No.'],
      ['npc:name.patronKev', 'Come on. Do the thing. Do the little dance.'],
      ['andrew', 'No.'],
      ['npc:name.patronDoug', 'Hey, he asked you nice.'],
      ['myko', "Andrew. Put your pint down. Hard. F. I've seen you do it at home when the quiz went to a tiebreak."],
    ),
    box('c4.brawl.wave2', ['colleenAnn', 'That’s four glasses and a stool! I’m keeping count! Here, catch!']),
    box('c4.brawl.wave3', ['colleenAnn', 'Seven glasses! This is the most Irish thing that’s ever happened in here!']),
    scene(
      'c4.brawl.end',
      ['colleenAnn', 'Nine glasses, two stools, and the shillelagh. You guys are the best. On the house.'],
      ['andrew', 'Sorry about the shillelagh.'],
      ['colleenAnn', 'It was plastic!'],
      ['myko', 'She’s sound, you know. Wrong about everything, and sound.'],
    ),

    // --- Docks ---
    scene(
      'c4.docks.open',
      ['myko', "I'll be at the gate with the coffee. They've floodlights. They sweep. Go with them, not against them.", 'by phone'],
      ['andrew', 'How do you know that?'],
      ['myko', "I've been to a disco."],
    ),
    box('c4.docks.overheard.1', ['npc:name.docker', 'Tuesday again. Feds show up, we all gotta go look at the wall.']),
    box('c4.docks.overheard.2', ['npc:name.docker', "I asked what's in 'em once. They sent a guy to ask why I asked."]),
    box('c4.docks.clean', ['myko', "Clean. There's a lunchbox on that bollard with bourbon in it. That's a man who hates his job. Take it.", 'by phone']),
    box('c4.docks.caught', ['myko', "Dockers. Long arms, slow to get them back. Stay inside the swing or well out of it.", 'by phone']),

    scene(
      'c4.containers.intro',
      ['andrew', "4471. It's on the top. Three up."],
      ['myko', "Then you need stairs. There's three levers and three boxes on rails. Build yourself some.", 'by phone'],
    ),
    box('c4.containers.done', ['myko', "A staircase out of freight. Your mother said you'd never build anything.", 'by phone']),
    scene(
      'c4.container.inside',
      ['andrew', "It's empty."],
      ['myko', 'Empty empty?', 'by phone'],
      ['andrew', "There's foam. Cut for something round. And a notice on the wall. Contents removed. Office of Atmospheric Records. Washington."],
      ['myko', "Atmospheric."],
      ['andrew', 'As in the sky.'],
      ['myko', "I know what it's as in."],
    ),

    box('c4.board.wrong.1', ['myko', "That's what was in it. You want who has it."]),
    box('c4.board.wrong.2', ['myko', "No. One of those is just you being upset about the pint again."]),
    box('c4.board.wrong.3', ['myko', 'Who comes on a Tuesday, Andrew. Think Tuesday.']),
    scene(
      'c4.board.right',
      ['andrew', 'Every second Tuesday. Federal pickup. The Office of Atmospheric Records.'],
      ['myko', "There's a real office with that name and they've been collecting boxes from Leitrim. Right. Fine. I'm listening."],
    ),

    // --- Foreman ---
    scene(
      'c4.foreman.intro',
      ['npc:name.foreman', 'You. Anorak. You in the union?'],
      ['andrew', 'Which union?'],
      ['npc:name.foreman', 'Wrong answer.'],
      ['andrew', "There's something going through this pier. From my town."],
      ['npc:name.foreman', "I don't care what's in the boxes, pal. I care who's on my dock. I'm gonna use the crane now."],
      ['myko', "Watch the shadow, that's where the box is going. Get in beside him and put your pint down.", 'by phone'],
    ),
    scene(
      'c4.foreman.phase2',
      ['npc:name.foreman', 'Okay. Okay. We do it old school.'],
      ['myko', "He has a hook now. He'll try and reel you in. Fall out of it.", 'by phone'],
    ),
    scene(
      'c4.foreman.end',
      ['npc:name.foreman', 'Hold up. Hold up.'],
      ['npc:name.foreman', "That's six a.m. That's my shift."],
      ['andrew', 'What?'],
      ['npc:name.foreman', "I'm not paid for this. Day guy's problem. You have a good one."],
      ['myko', 'I like this country. Everybody knows exactly when they stop caring.', 'by phone'],
    ),

    scene(
      'c4.closing',
      ['andrew', "Eleven people told me I'm Irish today."],
      ['myko', 'And were they right?'],
      ['andrew', "That's not the point."],
      ['myko', "Two tickets to Washington. Bus. Nine hours. And I got a lighter with a lobster on it."],
      ['andrew', 'Why?'],
      ['myko', "It's a lobster, Andrew. On a lighter. I don't have to explain everything."],
    ),

    // --- Hints ---
    box('c4.hint.tea.1', ['myko', "There's a kiosk with a cup on the sign. Manage your expectations."]),
    box('c4.hint.tea.2', ['myko', 'Kiosk, left of the doors. E. Say “hot”. Say it twice.']),
    box('c4.hint.bar.1', ['myko', "Talk to them. All of them. I know. I'm sorry."]),
    box('c4.hint.bar.2', ['myko', 'The roster is pinned beside the dartboard, and the lad at the end has the patch on his sleeve.']),
    box('c4.hint.brawl.1', ['myko', "When they crowd you, that's when you put the pint down."]),
    box('c4.hint.brawl.2', ['myko', 'F with a few around you. Space when one grabs. Take what Colleen-Ann throws you.']),
    box('c4.hint.docks.1', ['myko', 'The light moves in a line. There’s a gap after it. Live in the gap.', 'by phone']),
    box('c4.hint.docks.2', ['myko', 'Follow the floodlight down the second row, wait behind the blue box, bottle to the left, then go.', 'by phone']),
    box('c4.hint.containers.1', ['myko', "Low, middle, high. In that order, left to right. That's all a stairs is.", 'by phone']),
    box('c4.hint.containers.2', ['myko', 'First lever twice, second lever three times, third once. Then climb.', 'by phone']),
    box('c4.hint.board.1', ['myko', "Somebody takes it off the pier. Who has the paperwork with their name on it?"]),
    box('c4.hint.board.2', ['myko', 'The notice, the roster and the manifest from home. Meridian sends, Pier Nine holds, the Office collects.']),
    box('c4.hint.foreman.1', ['myko', "He's only dangerous in that box with the levers. Get him out of the box.", 'by phone']),
    box('c4.hint.foreman.2', ['myko', 'Dodge the swing by the shadow, stand at the control box, F. After that it’s a man with a hook; stay behind him.', 'by phone']),

    // --- Myko calls ---
    scene(
      'c4.call.fight',
      ['myko', "Excuse me. Sorry. Excuse me. Sorry now."],
      ['colleenAnn', 'Oh my GOD.'],
      ['andrew', "You didn't spill it."],
      ['myko', "It's bad stout but it's still stout. You'd them nearly beat. A few more hours and they'd have tired themselves out on you."],
      ['myko', "You said no to that man twice, though. I was proud of that part."],
    ),
    scene(
      'c4.call.puzzle',
      ['myko', 'That lever. No, your other left. Give it here.'],
      ['andrew', 'That was it?'],
      ['myko', "That was it. You'd tried every other way first, which is thorough. That's the detective in you."],
      ['myko', "Go on up your stairs. I'll mind the coffee."],
    ),
  ],
};
