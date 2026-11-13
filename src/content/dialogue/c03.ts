/**
 * Chapter 3: Regional Office. docs/chapters/03-regional-office.md.
 */

import type { DialogueFile } from './index';
import { box, caption, scene } from './build';

export const C03: DialogueFile = {
  text: {
    'c3.title': 'Regional Office',
    'c3.card.yard': 'Meridian Agri-Solutions. Kilnamoe depot.',
    'name.watchman': 'Night watchman',
    'name.worker': 'Night shift',

    'c3.objective.yard': 'Get across the yard.',
    'c3.objective.office': 'Search the office.',
    'c3.objective.crates': 'Clear a way to the bay office.',
    'c3.objective.manifest': 'Get the manifest.',
    'c3.objective.bay': 'Deal with the night shift.',
    'c3.objective.board': 'Work out where it goes.',
    'c3.objective.halloran': 'Deal with Mr Halloran.',

    'c3.clue.map.title': 'Wall map',
    'c3.clue.map.body': 'Map of the world in Halloran’s office. Two pins. One in Leitrim. One in Boston. String between them.',
    'c3.clue.map.margin': 'You have the same map. In your kitchen. I’ve seen it.',
    'c3.clue.brochure.title': 'Brochure',
    'c3.clue.brochure.body': 'Meridian product range. Twelve pages. No prices. No descriptions. A lot of photographs of fields.',
    'c3.clue.brochure.margin': 'Page 9 is the same field as page 4.',
    'c3.clue.certificate.title': 'Certificate',
    'c3.clue.certificate.body': 'Regional Manager of the Year, awarded to Mr P. Halloran, by Mr P. Halloran.',
    'c3.clue.certificate.margin': 'Four years running. Fair play to him.',
    'c3.clue.visitors.title': 'Visitors’ book',
    'c3.clue.visitors.body': 'Opened 2011. No entries.',
    'c3.clue.visitors.margin': 'Sign it. Go on. Make his year.',
    'c3.clue.manifest.title': 'Shipping manifest',
    'c3.clue.manifest.body': 'Forty containers a year, Kilnamoe to Pier Nine Freight, Boston. Contents: “agricultural”. Container numbers all start MAS.',
    'c3.clue.manifest.margin': 'Forty containers of nothing. That’s a lot of nothing to post.',
    'c3.lead.boston.title': 'Lead: Boston',
    'c3.lead.boston.body': 'The fragment is MAS-4471-K. The containers are MAS. They go to Pier Nine Freight, Boston. Whatever landed in the bog was shipped out of here in a box.',
    'c3.lead.boston.margin': 'String. It’s just string. But it’s good string.',

    'c3.deduction.prompt': 'Where did it go?',
    'c3.deduction.answer': 'Pier Nine Freight, Boston',

    'c3.call.fight.casebook': 'Night shift at the depot got physical. Held them off. Myko came in at the end.',
    'c3.call.fight.margin': 'At the end, the middle, and the start.',
    'c3.call.puzzle.casebook': 'Loading bay was blocked. Found a way through. Myko had a suggestion.',
    'c3.call.puzzle.margin': 'The suggestion was me doing it.',
  },
  sequences: [
    caption('c3.caption.title', 'Regional Office'),
    caption('c3.caption.yard', 'Meridian Agri-Solutions. Kilnamoe depot.'),

    scene(
      'c3.open',
      ['myko', "There's a gap behind the skip. There's always a gap behind the skip. I'll be in the hedge.", 'by phone'],
      ['andrew', "There's the van. Twin wheels."],
      ['myko', "So it is. Don't wave at it."],
    ),
    box('c3.watchman.1', ['npc:name.watchman', 'No. I said the blue bin. The blue one. I have to go, I’m at work.', 'on his phone']),
    box('c3.watchman.2', ['npc:name.watchman', 'Nothing ever happens here. That’s the job. I’m minding nothing.', 'on his phone']),
    box('c3.yard.clean', ['myko', "Lovely. There's a pint on the step of that cabin. I don't know whose. Yours now.", 'by phone']),
    box('c3.yard.caught', ['myko', "That's the watchman's first incident in nine years. Don't ruin it for him by losing.", 'by phone']),

    // --- Office ---
    scene(
      'c3.office.enter',
      ['andrew', 'Reception.'],
      ['myko', 'How’s the plant?', 'by phone'],
      ['andrew', 'Dead.'],
      ['myko', 'Thought so. You can tell a lot from a plant.'],
    ),
    box('c3.office.map', ['andrew', 'Leitrim to Boston. With string.'], ['myko', "A man after your own heart. I hope he's better at it.", 'by phone']),
    box('c3.office.brochure', ['andrew', "What's a yield optimiser?"], ['myko', "It's the thing on the page after the soil harmoniser. Keep up.", 'by phone']),
    box('c3.office.certificate', ['andrew', 'He gave himself an award.'], ['myko', "And he framed it. That's follow-through.", 'by phone']),

    // --- The Stumble ---
    scene(
      'c3.stumble.lesson',
      ['myko', 'What was that bang?', 'by phone'],
      ['andrew', 'A drum came off the shelf. I fell over a pallet. It missed me.'],
      ['myko', 'You fell out of the way.'],
      ['andrew', 'I suppose.'],
      ['myko', "Do that on purpose, then. Space. Nobody can hit a man who's already falling."],
    ),
    box('c3.stumble.done', ['myko', "That's it. All the grace of a bag of turf, and nothing laid a finger on you.", 'by phone']),

    // --- Crates ---
    scene(
      'c3.crates.intro',
      ['andrew', "The manifest's in that glass office. There's crates in the way."],
      ['myko', "Same as the kegs. Push, don't pull. If you make a hames of it there's a lever by the door puts them all back.", 'by phone'],
    ),
    box('c3.crates.reset', ['myko', "Again, so. Nobody's timing you. I am, but I won't say.", 'by phone']),
    box('c3.crates.done', ['myko', 'Through. You should put that on a CV. You should get a CV.', 'by phone']),

    scene(
      'c3.manifest.found',
      ['andrew', 'Forty containers a year. To Boston. Contents, “agricultural”.'],
      ['myko', 'To who?', 'by phone'],
      ['andrew', 'Pier Nine Freight.'],
      ['myko', "Andrew. The lights have come on in there. I'd turn around."],
    ),

    // --- Night shift ---
    scene(
      'c3.bay.intro',
      ['npc:name.worker', 'Here. You can’t be in here. This is a restricted loading bay.'],
      ['andrew', 'What’s restricted about it?'],
      ['npc:name.worker', "I don't know. Nobody's told us."],
      ['myko', "They throw boxes. Fall through them. You've been practising.", 'by phone'],
    ),
    scene(
      'c3.bay.end',
      ['npc:name.worker', "That's me. I'm on my break."],
      ['myko', 'Union man. Respect that.', 'by phone'],
    ),

    // --- Deduction board ---
    scene(
      'c3.board.tutorial',
      ['myko', "Right. Put it together. It's three things and a bit of string, same as your kitchen wall."],
      ['andrew', 'That wall is a system.'],
      ['myko', "It's a wall with string on it, and your mother's worried. Pick three that point the one way."],
    ),
    box('c3.board.wrong.1', ['myko', "No. That's three things you found. It's not three things that agree."]),
    box('c3.board.wrong.2', ['myko', "Closer. One of them is only there because you like it."]),
    box('c3.board.wrong.3', ['myko', "Where does it GO, Andrew. Not what is it. Where does it go."]),
    scene(
      'c3.board.right',
      ['andrew', 'Boston. Pier Nine Freight. The part number matches the containers.'],
      ['myko', "It does. I checked it twice hoping it didn't."],
    ),

    // --- Halloran ---
    scene(
      'c3.halloran.intro',
      ['halloran', 'Can I help you gentlemen? Halloran. Regional manager.'],
      ['andrew', 'What region?'],
      ['halloran', 'This one.'],
      ['andrew', 'Which is what?'],
      ['halloran', 'The building. And the yard. I’m going to have to ask you to leave, and I’m going to do it from the forklift.'],
      ['myko', "He beeps before he comes at you. Let him put the forks into something that isn't you.", 'by phone'],
    ),
    scene(
      'c3.halloran.phase2',
      ['halloran', "I didn't want to use the pallet. Head office are very strict about the pallets."],
      ['myko', "He's hiding behind it now. Get round the back of him. Fall, if you have to.", 'by phone'],
    ),
    box('c3.halloran.stuck', ['halloran', 'Bear with me. It does this.']),
    scene(
      'c3.halloran.end',
      ['halloran', "That's the gas gone."],
      ['halloran', 'Do you have an appointment at all?'],
      ['andrew', 'No.'],
      ['halloran', "Then I can't really speak to you. You'd want to ring ahead."],
      ['andrew', 'What’s in the containers?'],
      ['halloran', "I've never been told. I've asked. I've a form in."],
    ),

    scene(
      'c3.closing',
      ['andrew', 'Boston.'],
      ['myko', 'Boston.'],
      ['andrew', "That's where it went. That's where I'm going."],
      ['myko', 'How much have you?'],
      ['andrew', 'Fourteen euro.'],
      ['myko', "That'll get you to Longford. Give me a second."],
      ['myko', "Right. Two seats. Thursday. Don't ask."],
      ['andrew', 'Where did you get the money?'],
      ['myko', "I said don't ask. Bring a jumper, they've the air conditioning."],
    ),

    // --- Hints ---
    box('c3.hint.yard.1', ['myko', 'The watchman does the same loop and stops to look at his phone. You could set a watch by him. He should.', 'by phone']),
    box('c3.hint.yard.2', ['myko', 'Go when he’s on the phone. Bottle towards the vans to shift the other two. Door’s by the dead plant.', 'by phone']),
    box('c3.hint.office.1', ['myko', "It's an office. Read the walls. People put the important things on walls.", 'by phone']),
    box('c3.hint.office.2', ['myko', 'The map in Halloran’s room and the brochure on reception. E at both.', 'by phone']),
    box('c3.hint.crates.1', ['myko', "Don't push anything into a corner. A crate in a corner is there for life.", 'by phone']),
    box('c3.hint.crates.2', ['myko', 'Left column first, push them up out of the road. Then the middle one right. Then straight through.', 'by phone']),
    box('c3.hint.manifest.1', ['myko', "It's the glass room you just spent ten minutes getting to. Go in it.", 'by phone']),
    box('c3.hint.manifest.2', ['myko', 'Clipboard on the desk. E.', 'by phone']),
    box('c3.hint.bay.1', ['myko', "The lads up top are no use up close. The trouble is getting close.", 'by phone']),
    box('c3.hint.bay.2', ['myko', 'Space through the boxes, get under the gantry, three digs each. Do the hi-vis lads after.', 'by phone']),
    box('c3.hint.board.1', ['myko', "You want the three that all say the same word. It's a place."]),
    box('c3.hint.board.2', ['myko', 'The map, the manifest and your bit of metal. Boston, Boston, and a number that matches.']),
    box('c3.hint.halloran.1', ['myko', "He can't turn that thing. Be somewhere he has to turn to.", 'by phone']),
    box('c3.hint.halloran.2', ['myko', 'Stand in front of a crate stack, step off when he beeps, hit him from the side while he’s stuck.', 'by phone']),

    // --- Myko calls ---
    scene(
      'c3.call.fight',
      ['myko', "Evening, lads. Don't get up."],
      ['andrew', 'You used a clipboard.'],
      ['myko', "It was what I had. You'd them rattled, though. I'd say they were on the point of thinking about giving up."],
      ['myko', "Table quiz champion, called for backup against a night shift. I'd keep that out of the book."],
    ),
    scene(
      'c3.call.puzzle',
      ['myko', 'That one.'],
      ['andrew', 'One push.'],
      ['myko', "One push. You'd done all the hard work, arranging them so it would take one push. Very generous of you."],
      ['myko', "I'll be in the hedge. Shout if you see a drawer you can't open."],
    ),
  ],
};
