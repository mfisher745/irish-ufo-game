# Design: *Same Again* (working title)

Owner: `creative-director`. Every other agent builds against this document and does not change it. Send questions and proposed changes to the creative director.

## 1. Summary

A comedic top-down action-adventure for PC browsers, played with mouse and keyboard. Andrew, a drinker from a small Irish town with a chip on his shoulder, is sure that aliens are real and surer still that proving it will finally show everyone. Over ten chapters he follows the evidence from a bog in County Leitrim across the United States to a base in the Nevada desert. He is right about everything. He proves it to the whole world, and the world does not care. His best mate Myko does.

- Length: 10 chapters of about 6 minutes each, about one hour in total.
- Play per chapter: a mix of investigation, a puzzle, stealth and combat.
- Delivery: a static site on GitHub Pages, installable as a PWA and playable offline.
- Assets: everything is generated in code. There are no downloaded images, fonts or audio.

## 2. Tone

The comedy is dry and deadpan. The jokes come from people reacting calmly to absurd things, and from Andrew treating small things as serious and serious things as small.

Rules for every line of text:

- Understate. A line that announces it is a joke gets cut.
- Andrew is pathetic but lovable. The player laughs at his situation and is on his side. He is never cruel, and he is never the butt of a joke about being Irish.
- No cartoon Irishness. No leprechauns, no "top o' the morning", no "begorrah", no lucky charms, no stage accent spelled out phonetically.
- Americans may say those things *to* Andrew. His tired reaction is the joke.
- Irish slang and references are used the way people use them, without explanation. The context has to carry the meaning for players who don't know the word.
- No real people, real brands, real song lyrics or real company names. The one exception is that a famous fictional character may be named in passing as a comparison, never shown and never quoted (the narrator compares Myko to Batman).
- Text only. There is no voice acting.

Slang and references the writing can draw on:

| Kind | Examples |
|---|---|
| Everyday words | grand, sound, deadly, eejit, gobshite, yer man, yer one, the craic, notions, giving out, slagging, banjaxed, knackered, scarlet, the messages, the press, the jacks, a naggin, a lock-in |
| Phrases | "I will, yeah" (meaning no), "c'mere to me", "go 'way", "fair play", "now we're sucking diesel", "sure look", "it's a soft day", saying "bye" six times to end a phone call |
| Home life | leaving the immersion on, the good room, hang sandwiches, a chicken fillet roll, a spice bag, a 99, turf, a breakfast roll, tea as the answer to everything |
| Culture | the GAA and the county team's bad year, the parish lotto, the Angelus bells on the telly, a removal, the dole, the mart, NCT failure, a mammy's guilt |

Voice samples. These set the register; they are not required lines.

> **Myko:** You've found a scorched circle in a bog. Lads burn things in bogs, Andrew. It's most of what there is to do here.

> **Andrew:** That's a part number.
> **Myko:** It is. Off a tractor.
> **Andrew:** There's no tractor does forty thousand feet.
> **Myko:** You haven't seen the Brennans drive.

> **Bostonian:** My great-great-grandmother was from County Cork! Do you know the Sullivans?
> **Andrew:** I do, yeah.
> **Myko:** *(quietly)* You don't.
> **Andrew:** It's quicker.

> **Myko:** Look at that. A car park you could land a plane in, and it's free. They just let you have it.
> **Andrew:** It's a car park.
> **Myko:** It's Ohio, Andrew.

> *After calling Myko in:*
> **Myko:** No, you'd them well softened up. I could tell by the way they were all still standing.

> *Pickup text:* **American light beer.** Buzz +2. Andrew isn't angry. He's just disappointed.

## 3. Characters

### Andrew (player character)

- 38, from Kilnamoe, County Leitrim (a fictional town). On the dole since he lost his licence. Three-time winner of the Feeney's table quiz, which he mentions.
- He was a doctor, the GP in Kilnamoe, until he was struck off the register. The reason is never stated: not by him, not by Myko, not by the narrator, and not in a joke that gives it away. Nobody asks. People at home still call him Doctor out of habit and still tell him their symptoms, and he says he can't look at it. When he is hit he knows exactly what has been broken.
- Short and slight. He is about half a head shorter than Myko and he is not pudgy. He wears a worn green-grey anorak, jeans and runners, and has a full dark beard and tired eyes.
- He has a chip on his shoulder. He wants to prove himself to the world, and it does not matter how. Aliens are what turned up. If it had been a record-breaking turnip he would have gone after that with the same face.
- He believes in aliens with complete, calm certainty. He is polite, stubborn and hopeless with money, and he is braver than he should be once he has had a few.
- He never says any of this out loud. It shows in what he mentions (the table quiz), in who he brings up without being asked (people from school who "did well"), and in how much he hates asking Myko for help.
- He speaks in short sentences. He never explains himself more than once.

### Myko (sidekick and narrator)

- Andrew's best mate since school. Nobody remembers why he's called Myko, and he won't say.
- He is half a head taller than Andrew, thin, with a long coat, untidy brown hair, no hat and a permanent half-smile.
- He is sardonic and condescending to Andrew in almost every line. He is also completely loyal. He pays for the flights, carries the bags and never once suggests going home.
- He drinks, but he prefers to smoke cannabis. He is usually mildly stoned, which is shown by a rolled cigarette, slow blinks, the odd tangent and, about once a minute when he is standing still, a puff of smoke that hangs around his head until he moves. It is never shown as a how-to and it is never a power-up.
- His commentary does most of the narration. A narrator caption appears only for chapter titles, location cards and the blackout when Myko is called in.
- He sometimes offers an idea or a hint. Some of his ideas are good.
- He does not fight unless Andrew asks him to. His position on this: "I'm here in an advisory capacity." When he is asked, he is immediately and effortlessly better at everything than Andrew is, and he never explains how (see 7.5).
- He loves Ohio. Nothing prepares the player for this and he gives no reason. For all of chapter 6 he marvels at it: the width of the roads, the motel ice machine, the size of the sky, the manners. It is sincere, with no sarcasm in it at all, and it is the only thing besides the ending that he is sincere about. Andrew does not see it and Myko pities him for that.
- From chapter 7 onwards, most of his tangents are about Ohio. Roswell, Nevada and an alien base are all compared with it and found wanting.
- At the end he is the only person in the world who is excited by what Andrew found.

### Supporting cast

| Character | Where | Role |
|---|---|---|
| Dympna Feeney | Kilnamoe | Landlady of Feeney's. Unimpressed by everything. Gives the tutorial as a list of things Andrew owes her. |
| Mr Halloran | Kilnamoe | "Regional manager" of Meridian Agri-Solutions. Boss of chapter 3. |
| Colleen-Ann | Boston | Bartender who is extremely proud of being Irish and has never been. A useful ally. |
| Agent Pruitt | DC onwards | Senior agent of the Office of Atmospheric Records. Tired, courteous and three years from his pension. Boss of chapters 5 and 8. |
| Gary | Roswell | An alien who has worked in a UFO gift shop for 19 years. He likes it there. |
| The Administrator | Nevada | The alien in charge of the base. Final boss. Would prefer not to be having this conversation. |

## 4. Story

Andrew sees lights over the bog outside Kilnamoe. In the morning there is a scorched ring in the turf and a metal fragment stamped with a part number. Men in suits arrive and say they are from the Department of Agriculture. The fragment traces to the local depot of Meridian Agri-Solutions, a company that sells nothing anyone in town has ever bought. Its shipping records point to Boston.

Myko pays for two flights. In America the trail runs west: a freight contractor in Boston, a federal records office in Washington, a test site in the Ohio cornfields, a gift shop in Roswell and at last a base in the Nevada desert. Along the way the enemies change from local hard men to federal agents to the aliens themselves.

Andrew gathers proof, gets into the base, beats the Administrator and broadcasts everything to every screen on Earth. The broadcast works. Governments confirm it within the hour. It is the third item on the news, after the weather. His video gets 41 views. Back in Feeney's, Dympna says "Aliens, is it? Fair play," and asks if it's the same again.

Myko drops the act about Andrew for the first time in the game. Until now he has only been sincere about Ohio. He is delighted. He has slagged Andrew for twenty years and Andrew was right, and he wants to hear every detail again from the start. Andrew set out to prove himself to the world and the world did not look up. That is the ending: one person cared, and it was the right one. Myko's last tangent is that they should tell them about this in Ohio.

## 5. Chapters

Each chapter has an investigation beat, a puzzle or deduction, a stealth section and a combat section, in whatever order suits it. Each ends with a boss or set piece and a short scene with Myko.

| # | Title | Location | What happens | New this chapter | Finale |
|---|---|---|---|---|---|
| 1 | A Quiet Pint | Feeney's pub and Main Street, Kilnamoe, at night | Tutorial. Movement, punching and drinking. A row outside the chipper. The lights over the bog. | Punch combo, drinking, the Buzz meter | Big Tom Brennan, who wants the tenner back |
| 2 | The Bog | The bog and Brennan's farm, before dawn | First investigation: scorched turf, the fragment, tyre tracks. First stealth, past the "Department" men. | Casebook, stealth, **Bottle Throw** | Escape from a very committed ram |
| 3 | Regional Office | Meridian depot on the edge of town | Break in, find the shipping manifest, solve the loading-bay crate puzzle. | **The Stumble** (dodge), first deduction board | Mr Halloran and his forklift |
| 4 | Southie | Boston: airport, an "Irish" bar, the docks | First hangover. Americans explain Ireland to Andrew. Find the freight contractor. | Hangover, American drinks, **Stout Slam** | Bar brawl, then the dock foreman |
| 5 | The Paper Trail | Washington DC: a federal records office | The stealth chapter. A redacted-file puzzle. Agents appear in numbers. | **Act Natural** (blend in), agents | Agent Pruitt, round one, in the archive stacks |
| 6 | Flyover Country | Ohio: a bus station, a motel, cornfields | Crop circles as a maze puzzle. Surveillance drones. Andrew acquires a hurley from a bewildered sporting goods shop. Myko is having the best week of his life and says so throughout. | **Hurley** (melee upgrade), drones | The combine harvester |
| 7 | Gift Shop | Roswell, New Mexico | Everyone is dressed as an alien. Some of them are aliens. Work out which. | Aliens in disguise, **Sliotar Strike** (charged shot) | Three "mascots" who are not mascots |
| 8 | The Long Road | Nevada desert, the perimeter | Sensors, patrol trucks and heat. Water matters as much as drink. | **Poitín Breath**, heat and sensor stealth | Agent Pruitt, round two. He lets them through and retires. |
| 9 | Level Minus Four | Inside the base | Alien technology, gravity-switch puzzles and the last five pieces of proof. | **The Borrowed Glove** (alien stun gadget), alien enemies | The containment hall lockdown |
| 10 | Disclosure | Base control room, then Feeney's | The final fight, the broadcast, the world's reaction and home. | All abilities | The Administrator, then the epilogue |

Locations are small. Each chapter uses two or three connected screens, and no chapter needs more than about 120 by 80 tiles in total.

## 6. Controls

| Input | Action |
|---|---|
| WASD | Move |
| Mouse | Aim |
| Left click | Melee attack (punch, later hurley) |
| Right click | Ranged attack (Bottle Throw, later Sliotar Strike when held) |
| Space | The Stumble (dodge) |
| Q | Drink the selected drink |
| 1, 2, 3 or mouse wheel | Select drink |
| F | Special ability (Stout Slam, Poitín Breath or the Glove; cycle with R) |
| Shift | Sneak (hold) |
| E | Interact, talk, examine |
| H | Ask Myko for a hint |
| M (hold for 1 second) | Call Myko in (three uses per game) |
| Tab | Casebook |
| Esc | Pause |

## 7. Systems

### 7.1 Buzz

Drinking fills the Buzz meter, which runs from 0 to 100 and drains slowly over time.

| State | Buzz | Effect |
|---|---|---|
| Sober | 0 to 19 | Base damage. Steady aim. Special abilities are locked. Andrew remarks on how clear everything is and how little he likes it. |
| Grand | 20 to 59 | Damage ×1.5, faster attacks, specials unlocked. This is where the player wants to be. |
| Locked | 60 to 89 | Damage ×2 and knockback resistance. Aim sways, movement drifts, footsteps are louder in stealth and the screen wobbles slightly. |
| Banjaxed | 90 to 100 | Damage ×2.5 for 8 seconds, then Andrew falls over for 2 seconds and Buzz drops to 30. |

Costs carry over. If a chapter ends at Locked or above, the next one starts with a **hangover**: maximum health is reduced by 25% and the screen is a little too bright until Andrew eats something or drinks tea.

Every drink leaves an **empty**, and empties are the ammunition for Bottle Throw. Drinking and fighting feed each other.

Buzz does not start draining until a few seconds after the last drink, so one pint is worth having.

**Breakables.** Most loose objects in the world can be broken with a melee hit or a thrown bottle: crates, barrels, bins, boxes, flowerpots, vending machines and their like. A broken object usually drops a drink, food or an empty. If Andrew can walk up to it and it is not part of a puzzle or the plot, he should be able to break it. What drops comes from the region (stout and crisps in Kilnamoe, light beer in America).

| Drink | Found | Effect |
|---|---|---|
| Pint of stout | Ireland, the Boston bar | Buzz +20, heals 15 |
| Whiskey | Everywhere | Buzz +30 |
| Poitín | Rare, hidden | Buzz +60. Fuels Poitín Breath. |
| American light beer | USA, very common | Buzz +2 |
| Bourbon | USA | Buzz +30, short speed boost |
| Craft IPA | USA cities | Buzz +15. Myko has an opinion about each one. |
| Tequila | The Southwest | Buzz +40, more sway |

| Food | Effect |
|---|---|
| Crisps | Heals 10 |
| Chicken fillet roll, breakfast roll | Heals 40, cures a hangover |
| Spice bag | Heals fully |
| Tea | Buzz −25, cures a hangover, steadies aim for 20 seconds |
| Water (chapter 8) | Resets the heat meter |

### 7.2 Combat and abilities

Combat is fast and readable, with a handful of enemies on screen at a time. Enemies telegraph every attack.

| Ability | Chapter | Description |
|---|---|---|
| Punch combo | 1 | Three hits. The third is a haymaker with knockback. |
| Bottle Throw | 2 | Ranged. Uses one empty. Also makes a noise where it lands, which distracts guards. |
| The Stumble | 3 | A dodge that looks like an accident. Brief invulnerability. |
| Stout Slam | 4 | Area attack around Andrew. Costs 20 Buzz. |
| Act Natural | 5 | Stand still beside a prop (a queue, a noticeboard, a vending machine) to become invisible to guards. |
| Hurley | 6 | Replaces the punch. Longer reach, more damage, and it deflects projectiles when timed. |
| Sliotar Strike | 7 | Hold right click to charge and hit a ball with the hurley. Pierces a line of enemies. |
| Poitín Breath | 8 | A short cone of fire. Costs 40 Buzz. |
| The Borrowed Glove | 9 | Alien gadget. Stuns a group and operates gravity switches. Recharges on its own. |

Death returns the player to the last checkpoint with a line from Myko. Checkpoints sit before every stealth section and every boss.

### 7.3 Stealth

- Guards have visible vision cones and react to noise.
- Sneaking is quiet and slow. Buzz at Locked or above makes even sneaking audible at short range.
- A guard who sees Andrew fills a detection marker over about one second. If it fills, the stealth section becomes a fight: an alarm sounds and reinforcements arrive.
- **Getting caught is never a restart.** A clean run is rewarded with an extra clue or a drink, not required.

### 7.4 Investigation and puzzles

- Examining things with E adds clues to the **casebook**, written in Andrew's words with Myko's notes in the margin.
- Most chapters end their investigation with a **deduction board**: the player links three clues to name the next lead. A wrong answer costs nothing except a remark from Myko.
- Each chapter has one physical puzzle (crates, redacted files, the crop-circle maze, telling aliens from people, gravity switches). Each must be solvable in under two minutes.
- Chapter 9 requires five pieces of proof. They are the items shown in the final broadcast.

### 7.5 Myko

- He walks behind Andrew outside combat and stealth. During those he waits at the entrance and talks by phone, unless he is called in.
- He cannot be hurt and never needs protecting.
- H asks for a hint about the current objective. The first hint is a nudge, the second is the answer, and both arrive wrapped in an insult.
- He comments without being asked on clues, drinks, deaths, hangovers and long periods of the player doing nothing.
- Commentary must never block play. Lines appear in a box at the bottom of the screen and play continues, except in scripted scenes.
- Nothing is said twice. A scripted scene, a lesson or a remark tied to a place plays once per save and never again, even after a death or a reload. Only three kinds of line may repeat: hints the player asks for, lines drawn from a pool (death, idle, tangents), and the line for an object the player deliberately examines again. A remark that has been waiting behind other lines is dropped if Andrew has left the screen or the moment it was about.
- In chapter 6 his unprompted commentary is mostly admiration for Ohio. From chapter 7 on, about two in three of his tangents are about Ohio.

**Calling Myko in**

- Holding M asks Myko to finish the current fight or puzzle. Andrew has **three calls for the whole game**. They do not refill, and the number left is stored in the save.
- It works on any combat encounter, any boss or finale set piece, any physical puzzle and any deduction board. It does not work on stealth sections that have not turned into a fight, and it does not work on the Administrator. Andrew does that one himself.
- Myko always succeeds, at once and without effort, and the player never sees how. The screen cuts to black. Three narrator cards say, flatly, how little time it took and how little trouble it was. Each of the three calls has its own cards, chosen by whether it is the first, second or third call of the save and whether it is a fight or a puzzle, so the player never sees the same cutscene twice. The second fight cutscene compares Myko to Batman, and Batman comes off worse. The game comes back with every enemy on the ground, or the puzzle solved, and Myko standing where he was, still smoking. How he can do any of this is never explained, and nobody asks.
- Afterwards he gives Andrew a good-natured hard time about it. The slagging is warm, and it is the fondest he sounds before the ending. Each chapter has its own lines for a fight call and a puzzle call. A second call inside one chapter gets a different scene, the same one in every chapter and for both kinds of call (`myko.call.again`), in which Myko gives Andrew a much harder time for needing him twice in the same place. If all three calls are spent inside one chapter, the third gets its own scene (`myko.call.allThree`), also shared by every chapter. It is the hardest Myko is on Andrew anywhere in the game: hard, never cruel, and he is still coming with him at the end of it.
- A call costs Andrew nothing except his pride. The encounter counts as complete and gives its normal rewards. It is recorded in the casebook in Andrew's words, briefly and inaccurately ("Myko helped a bit"), with Myko's correction in the margin.
- The call is spent the moment it is used and the game saves immediately, so reloading does not give it back.
- If the player finishes the game with all three calls unused, Myko remarks on it in the epilogue. He is nearly impressed.

### 7.6 Saving

Progress saves automatically to the browser's local storage at each checkpoint, and whenever a Myko call is used. The title screen offers Continue, New Game and Chapter Select for finished chapters.

## 8. Art direction

16-bit console style, drawn in code to canvas textures at load time.

- Internal resolution 480 × 270, scaled by whole numbers to fit the window, with no smoothing. A fullscreen option in Settings (and Alt+Enter) lets it fill the screen; the installed PWA opens fullscreen.
- Tiles are 16 × 16.
- Andrew is 16 × 28. Myko is 16 × 32. Andrew is about half a head shorter, and the difference must be obvious when they stand together.
- Four-direction walk cycles of four frames. Attack, hurt, drink and fall-over animations for Andrew.
- One master palette of 48 colours, with a sub-palette per region:

| Region | Mood | Dominant colours |
|---|---|---|
| Kilnamoe | Wet, dim, warm indoors | Slate, moss, turf brown, amber pub light |
| Boston, DC | Hard edges, overlit | Brick red, navy, fluorescent white |
| Ohio | Wide and flat | Corn yellow, dusty blue, motel pink |
| Roswell | Tacky | Lime, magenta, sun-bleached tan |
| Nevada, the base | Heat outside, cold inside | Sand, rust, then teal and violet |

- The aliens are small, grey and neatly dressed. They look like people who work in an office, because they do.
- Andrew's sprite is short and slight, not round. Myko's is tall and thin, bare-headed, with brown hair.
- HUD: every slot shows its icon and the key or mouse button that uses it. Health top left. Along the bottom: the three drink slots (1, 2, 3, with Q on the selected one), empties with the right mouse button, the melee attack with the left mouse button, the dodge with Space once learned, the special with F, the Buzz meter and its state name in the centre, and Myko calls left (three small cannabis-leaf icons, M). Things Andrew can pick up or examine are drawn as themselves with a small glint, never as abstract markers. Dialogue box with a 32 × 32 portrait.
- A pixel bitmap font, generated in code.

## 9. Audio

All sound is synthesised with Web Audio. Music and effects have separate volume sliders.

- **Themes.** One theme per region, built from several sections so it does not wear out: a main section, a variation with a second whistle or recorder line in harmony, a sparser section with a plucked guitar-like accompaniment, and now and then a livelier section in the same key. Sections are chosen in a shuffled order so no loop is heard twice running. The Kilnamoe theme is melancholy, with a tin-whistle-like lead in a minor key, and stays away from jig clichés.
- **Boss music.** When a boss or set piece starts, the regional theme speeds up, gains percussion and a driving bass, and gets more intense again at each phase change. It drops back when the fight ends.
- **Effects.** About 30 (hits, bottle smash, drink, footsteps, alarm, things breaking).
- **Text sound.** A soft, short click per character, like a telegram being printed. It is quiet, slightly lower for Myko, and never tonal enough to be a tune.

## 10. Technical design

- Phaser 3, TypeScript in strict mode, Vite, pnpm, Vitest and Playwright.
- No backend, no network calls at runtime, no analytics.
- PWA: a web manifest, generated icons and a service worker that caches the build for offline play.
- Deployed by GitHub Actions to GitHub Pages on every push to `main`.

### Directory ownership

| Path | Owner | Contents |
|---|---|---|
| `DESIGN.md`, `docs/` | creative-director | This document, chapter specs, style guide |
| `src/content/dialogue/` | creative-director | All dialogue, casebook and pickup text, one file per chapter |
| `src/art/` | creative-director | Palette, sprite and tile generators, font |
| `src/content/tuning.ts` | creative-director | Every balance number in the game |
| `src/core/` | systems-dev | Shared types, events, save, input, scene flow |
| `src/systems/` | systems-dev | Combat, abilities, Buzz, stealth and AI, casebook, dialogue runner, Myko |
| `src/chapters/` | level-builder | One folder per chapter: maps, triggers, scripting, boss wiring |
| `src/ui/` | level-builder | HUD, menus, dialogue box, casebook and deduction screens |
| `src/audio/` | level-builder | Synth music and effects |
| Config, `public/`, `.github/` | planner | Vite, lint, PWA, workflow |
| `tests/` | qa | Unit tests and Playwright playthroughs |

### Rules that keep parallel work compatible

- `src/core/types.ts` is written first and defines the contracts: `ChapterDef`, `EnemyDef`, `AbilityDef`, `DrinkDef`, `DialogueLine`, `Clue`, `SaveState` (including Myko calls left) and the event names. Every fight and puzzle exposes one `completeNow()` entry point, which the Myko call and the QA playthrough both use. Only systems-dev changes it, with the creative director's approval.
- Chapters are data plus small scripts. A chapter never reaches into a system's internals; it uses the public API in `src/systems/index.ts`.
- No balance number is written anywhere except `tuning.ts`.
- No text shown to the player is written anywhere except `src/content/dialogue/`.
- Every chapter exposes a debug entry (`?chapter=N`) and a scripted way to complete it, so QA can run the whole game automatically.

## 11. Build order

1. **Foundation.** The creative director writes chapter specs, the palette and the style guide. The planner scaffolds the project and the deploy pipeline. Systems-dev writes `types.ts`.
2. **Core systems and art, in parallel.** Systems-dev builds the systems. The creative director writes the art generators and all dialogue. The level-builder builds the UI and audio.
3. **Vertical slice.** Chapter 1 is built, reviewed and tuned until it is fun. Nothing else starts on chapters until it passes.
4. **Chapters 2 to 10, in parallel** in separate worktrees, each reviewed by the creative director before merge.
5. **Integration.** Full automated playthrough, balance pass, hangover and save checks across chapter boundaries, PWA install test.
6. **Release** to GitHub Pages.

## 12. Done means

- All ten chapters can be completed from a fresh save, and the automated playthrough proves it.
- The game holds 60 frames per second in Chrome and Edge on an ordinary laptop.
- It installs as a PWA and runs with the network off.
- `pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm build` pass in CI.
- The creative director has read every line of dialogue in the built game and approved it.
