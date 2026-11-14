/**
 * Text used in every chapter: names, pickup text, HUD and menu labels,
 * prompts, and Myko's general-purpose remarks. Tone rules: DESIGN.md section 2
 * and docs/style-guide.md section 6.
 */

import type { DialogueFile } from './index';
import { box, linePool, mykoPool, scene } from './build';

const death = mykoPool('myko.death', [
  "You're grand. You fell over with great conviction.",
  "I'd have helped, but I'm here in an advisory capacity.",
  'Take your time. They seem happy to wait.',
  "That's the worst I've seen you since the table quiz final.",
  "In fairness, he didn't look like he could do that.",
  'Up you get. Same again, only different.',
  'I rang nobody. I assumed you had a plan.',
  "You went down like the county team. Second half, mind.",
]);

const idle = mykoPool('myko.idle', [
  "No rush. I've a smoke on.",
  'Is this the plan, or are we between plans?',
  "You're thinking. I can hear it from here.",
  "I'll just stand here, so. Advising.",
  "If you're waiting on the aliens to come to you, fair enough. It's worked before.",
  'I could have stayed at home for this. I had the immersion on and everything.',
]);

const hangover = mykoPool('myko.hangover', [
  'Morning. You look like a removal.',
  "It's bright, yeah. It's called day. Tea or a roll, either will sort you.",
  "You'd a great night. You told a bus driver about the fragment.",
]);

const drinkComment = mykoPool('myko.drink', [
  "That's the stuff. Mind yourself, you've a job on.",
  'Go easy. You get very sure of yourself after three.',
  "You're drinking that like there's a lock-in.",
  'Fair play. Hydration.',
]);

const banjaxed = mykoPool('myko.banjaxed', [
  "And he's down. Take a minute. Take two.",
  'That was eight great seconds, in fairness.',
  "You've gone past brave and out the far side.",
]);

const callRefusedNone = mykoPool('myko.callRefused.noCallsLeft', [
  "You've had your three. I'm back to advising.",
  "No. I've my own things to be doing. I'm watching, for one.",
]);

const callRefusedNotNow = mykoPool('myko.callRefused.notCallable', [
  "There's nothing here needs me. There's barely anything here needs you.",
  'Call me for what, Andrew? Walking?',
]);

const heat = mykoPool('myko.heat', [
  'You need water. Actual water. I know, I was surprised too.',
  "You're the colour of a hang sandwich. Find shade.",
  'Stand under that rock a minute. The aliens will keep.',
  "It was never this warm in Ohio. It was perfect in Ohio.",
  "You're cooking. Drink the water, not the other thing.",
]);

const heatDrink = mykoPool('myko.heat.wrongDrink', [
  "That's not water. That's the opposite of water.",
  "It won't cool you down. It'll just make you confident about being warm.",
  "I'm not carrying you. I'll advise you along the ground.",
]);

const sober = linePool('andrew', 'andrew.sober', [
  "Everything is very clear. I don't like it.",
  "I can hear my own thoughts. They're not helping.",
  "I'm sober. Write that down. No, don't.",
]);

export const COMMON: DialogueFile = {
  text: {
    // Title and menus
    'ui.title': 'Same Again',
    'ui.menu.continue': 'Continue',
    'ui.menu.newGame': 'New Game',
    'ui.menu.chapterSelect': 'Chapter Select',
    'ui.menu.settings': 'Settings',
    'ui.menu.back': 'Back',
    'ui.menu.newGameConfirm': 'Start again? The current save will be replaced.',
    'ui.menu.yes': 'Yes',
    'ui.menu.no': 'No',
    'ui.pause.title': 'Paused',
    'ui.pause.resume': 'Resume',
    'ui.pause.quit': 'Quit to title',
    'ui.settings.music': 'Music',
    'ui.settings.effects': 'Effects',
    'ui.settings.fullscreen': 'Fullscreen',
    'ui.settings.on': 'On',
    'ui.settings.off': 'Off',
    'ui.settings.fullscreenHint': 'F11 or Alt+Enter also works',
    'ui.chapter.label': 'Chapter {n}',
    'ui.chapter.locked': 'Not yet',
    'ui.saved': 'Saved',

    // HUD
    'ui.hud.empties': 'Empties',
    'ui.hud.noDrink': 'Nothing',
    'ui.hud.noSpecial': 'Sober',
    'ui.hud.heat': 'Heat',
    'ui.hud.special.needBuzz': 'More drink',
    'ui.hud.special.recharging': 'Hang on',
    'ui.key.1': '1',
    'ui.key.2': '2',
    'ui.key.3': '3',
    'ui.key.q': 'Q',
    'ui.key.f': 'F',
    'ui.key.r': 'R',
    'ui.key.m': 'M',
    'ui.key.space': 'Space',
    'ui.buzz.sober': 'Sober',
    'ui.buzz.grand': 'Grand',
    'ui.buzz.locked': 'Locked',
    'ui.buzz.banjaxed': 'Banjaxed',

    // Prompts
    'ui.prompt.interact': 'E',
    'ui.prompt.advance': 'E / click',
    'ui.prompt.move': 'WASD to move',
    'ui.prompt.talk': 'E to talk',
    'ui.prompt.examine': 'E to examine',
    'ui.prompt.drink': 'Q to drink',
    'ui.prompt.punch': 'Left click to punch. Three in a row.',
    'ui.prompt.push': 'Walk into it to push',
    'ui.prompt.throw': 'Right click to throw an empty',
    'ui.prompt.sneak': 'Hold Shift to sneak',
    'ui.prompt.stumble': 'Space to stumble',
    'ui.prompt.special': 'F to use. R to change.',
    'ui.prompt.actNatural': 'Stand still beside it',
    'ui.prompt.charge': 'Hold right click, then let go',
    'ui.prompt.deflect': 'Swing as it arrives',
    'ui.prompt.hint': 'H to ask Myko',
    'ui.prompt.callMyko': 'Hold M to call Myko in. Three for the whole game.',
    'ui.prompt.casebook': 'Tab for the casebook',
    'ui.prompt.selectDrink': '1, 2, 3 or the wheel to choose a drink',

    // Casebook and deduction board
    'ui.casebook.title': 'Casebook',
    'ui.casebook.clues': 'Clues',
    'ui.casebook.leads': 'Leads',
    'ui.casebook.proof': 'Proof',
    'ui.casebook.empty': 'Nothing yet. Give it time.',
    'ui.casebook.callTitle': 'A bit of help',
    'ui.deduction.title': 'What does it add up to?',
    'ui.deduction.instruction': 'Link three.',
    'ui.deduction.confirm': 'That’s it',
    'ui.deduction.clear': 'Start over',
    'ui.puzzle.reset': 'Reset',

    // Speakers
    'speaker.andrew': 'Andrew',
    'speaker.myko': 'Myko',
    'speaker.dympna': 'Dympna',
    'speaker.halloran': 'Mr Halloran',
    'speaker.colleenAnn': 'Colleen-Ann',
    'speaker.pruitt': 'Agent Pruitt',
    'speaker.gary': 'Gary',
    'speaker.administrator': 'The Administrator',

    // Drinks
    'drink.stout.name': 'Pint of stout',
    'drink.stout.pickup': 'Pint of stout. Buzz +20, heals 15. It was just sitting there, which is not like a pint.',
    'drink.whiskey.name': 'Whiskey',
    'drink.whiskey.pickup': 'Whiskey. Buzz +30. For the cold. It is not cold.',
    'drink.poitin.name': 'Poitín',
    'drink.poitin.pickup': 'Poitín. Buzz +60. No label. The bottle has had a previous career.',
    'drink.lightBeer.name': 'American light beer',
    'drink.lightBeer.pickup': 'American light beer. Buzz +2. Andrew isn’t angry. He’s just disappointed.',
    'drink.bourbon.name': 'Bourbon',
    'drink.bourbon.pickup': 'Bourbon. Buzz +30, and a short burst of speed. Sweet. Andrew says nothing, loudly.',
    'drink.craftIpa.name': 'Craft IPA',
    'drink.craftIpa.pickup': 'Craft IPA. Buzz +15. The can has a paragraph on it.',
    'drink.tequila.name': 'Tequila',
    'drink.tequila.pickup': 'Tequila. Buzz +40, and the room moves more. Andrew has heard of it.',
    'drink.water.name': 'Water',
    'drink.water.pickup': 'Water. Resets heat. Andrew reads the label twice to be sure.',

    // Food
    'food.crisps.name': 'Crisps',
    'food.crisps.pickup': 'Crisps. Heals 10. Cheese and onion. There was no other kind.',
    'food.chickenFilletRoll.name': 'Chicken fillet roll',
    'food.chickenFilletRoll.pickup': 'Chicken fillet roll. Heals 40, cures a hangover. Andrew goes quiet for a moment, out of respect.',
    'food.breakfastRoll.name': 'Breakfast roll',
    'food.breakfastRoll.pickup': 'Breakfast roll. Heals 40, cures a hangover. Everything in it is a different temperature.',
    'food.spiceBag.name': 'Spice bag',
    'food.spiceBag.pickup': 'Spice bag. Heals fully. Still warm. Some things are meant.',
    'food.tea.name': 'Tea',
    'food.tea.pickup': 'Tea. Buzz −25, cures a hangover, steadies the hand. Andrew feels better and resents it.',

    // Pickup refusals
    'pickup.refused.noFreeSlot': 'Andrew has no pocket left for a third kind of anything.',
    'pickup.refused.slotFull': 'He has enough of those. He checks. He has enough.',
    'pickup.refused.emptiesFull': 'The anorak is clinking as it is.',
    'pickup.refused.noEffect': 'He isn’t hungry. He leaves it where he can find it.',
    'pickup.empties': 'Empties +{n}.',

    // Abilities
    'ability.punchCombo.name': 'Punch',
    'ability.bottleThrow.name': 'Bottle Throw',
    'ability.stumble.name': 'The Stumble',
    'ability.stoutSlam.name': 'Stout Slam',
    'ability.actNatural.name': 'Act Natural',
    'ability.hurley.name': 'Hurley',
    'ability.sliotarStrike.name': 'Sliotar Strike',
    'ability.poitinBreath.name': 'Poitín Breath',
    'ability.borrowedGlove.name': 'The Borrowed Glove',
    'ability.unlocked': 'New: {name}',

    // Enemies
    'enemy.lad.name': 'A lad',
    'enemy.cousin.name': 'A Brennan cousin',
    'enemy.suit.name': 'Department man',
    'enemy.worker.name': 'Depot worker',
    'enemy.brawler.name': 'A regular',
    'enemy.docker.name': 'Docker',
    'enemy.agent.name': 'Agent',
    'enemy.drone.name': 'Drone',
    'enemy.mascot.name': 'Mascot',
    'enemy.clerk.name': 'Clerk',
    'enemy.security.name': 'Security',

    // Bosses and set pieces
    'boss.c1.boss.bigtom.name': 'Big Tom Brennan',
    'boss.c2.setpiece.ram.name': 'The ram',
    'boss.c3.boss.halloran.name': 'Mr Halloran',
    'boss.c4.boss.foreman.name': 'The foreman',
    'boss.c5.boss.pruitt1.name': 'Agent Pruitt',
    'boss.c6.setpiece.combine.name': 'The combine',
    'boss.c7.boss.mascots.name': 'Zip, Zap and Zorp',
    'boss.c8.boss.pruitt2.name': 'Agent Pruitt',
    'boss.c9.setpiece.lockdown.name': 'Lockdown',
    'boss.c10.boss.administrator.name': 'The Administrator',

  },
  sequences: [
    ...death.sequences,
    ...idle.sequences,
    ...hangover.sequences,
    ...drinkComment.sequences,
    ...banjaxed.sequences,
    ...callRefusedNone.sequences,
    ...callRefusedNotNow.sequences,
    ...heat.sequences,
    ...heatDrink.sequences,
    ...sober.sequences,
    box('myko.callRefused.administrator', ['myko', "No. This one's yours. I'll be here.", 'by phone']),
    box(
      'myko.callRefused.administrator.callsLeft',
      ['myko', "No. This one's yours.", 'by phone'],
      ['myko', "I'll hang on to the others for you. You won't need them."],
    ),
    box('myko.cleanRun', ['myko', 'Nobody saw you. I barely saw you, and I was looking.']),
    // A second call in the one chapter: the same scene in every chapter.
    scene(
      'myko.call.again',
      ['myko', 'Again.'],
      ['andrew', 'It was a different thing.'],
      ['myko', "It was the same thing, Andrew. It was a thing you couldn't do. Same place, same day, same face on you."],
      ['myko', "You get three of me. For the whole lot. There's a world out there you want to show something to, and you can't get out of the one postcode without ringing me."],
      ['andrew', 'I had it mostly done.'],
      ['myko', "You'd it mostly started. Will I just stay standing beside you? Save you holding the button."],
      ['myko', "Three-time winner of the Feeney's table quiz. I'd love to have seen the other tables."],
    ),
    // The third call when all three went in the one chapter. The hardest he is on Andrew. Hard, not cruel.
    scene(
      'myko.call.allThree',
      ['myko', 'That was the three.'],
      ['andrew', 'I know.'],
      ['myko', "All three, Andrew. In the one place. There's a long road ahead of us, by your own account, and you've nothing left for it now but yourself."],
      ['myko', "I've watched you lose to a fruit machine, a stile and a seagull. I thought I'd seen the full range. I had not."],
      ['andrew', 'They were hard ones.'],
      ['myko', "They were not. I've had more trouble opening crisps."],
      ['myko', "So I'm back to advising, and here's the advice. Whatever's next, you're all that's coming. I'd pity it, only it'll be grand. It's you I'd pity."],
      ['myko', "Go on. I'll be right behind you. A good bit behind you."],
    ),
    box('myko.caught', ['myko', "They've seen you. Go on, so. Plan B was always the plan."]),
  ],
  pools: {
    ...death.pool,
    ...idle.pool,
    ...hangover.pool,
    ...drinkComment.pool,
    ...banjaxed.pool,
    ...callRefusedNone.pool,
    ...callRefusedNotNow.pool,
    ...heat.pool,
    ...heatDrink.pool,
    ...sober.pool,
  },
};
