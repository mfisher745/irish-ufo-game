/** src/ui/model: dialogue queue and typewriter, wrapping, HUD, deduction selection, casebook, overlays. */

import { describe, expect, it } from 'vitest';
import { hasText, sequence, text } from '../../src/content/dialogue';
import { TUNING } from '../../src/content/tuning';
import type { BuzzSnapshot, DialogueId, DialogueLine, DialogueSequence } from '../../src/core/types';
import { EventBus } from '../../src/core/events';
import { DIALOGUE_TEXT, DIALOGUE_TIMING } from '../../src/ui/layout';
import type { UiStateSource } from '../../src/ui/contract';
import { CASEBOOK_TABS, groupCasebook, tabTextId, toItem } from '../../src/ui/model/casebook';
import { LINKS_REQUIRED, LinkSelection } from '../../src/ui/model/deduction';
import { DialogueQueue } from '../../src/ui/model/dialogue';
import { buildHudModel, perimeterSegments, pipFills } from '../../src/ui/model/hud';
import { OverlayTracker } from '../../src/ui/model/overlay';
import { paginate, wrapText } from '../../src/ui/model/wrap';

describe('wrapText', () => {
  it('wraps greedily at 64 characters on word breaks', () => {
    const words = Array.from({ length: 40 }, (_, i) => `word${i}`).join(' ');
    const lines = wrapText(words, 64);
    for (const l of lines) expect(l.length).toBeLessThanOrEqual(64);
    expect(lines.join(' ')).toBe(words);
  });
  it('keeps a short line whole and drops extra whitespace', () => {
    expect(wrapText('hello   world', 64)).toEqual(['hello world']);
    expect(wrapText('', 64)).toEqual([]);
    expect(wrapText('   ', 64)).toEqual([]);
  });
  it('exactly 64 characters stays on one line, 65 breaks', () => {
    const a = 'a'.repeat(32);
    expect(wrapText(`${a} ${a.slice(1)}`, 64)).toHaveLength(1); // 32 + 1 + 31 = 64
    expect(wrapText(`${a} ${a}`, 64)).toHaveLength(2); // 65
  });
  it('splits a word longer than the width', () => {
    expect(wrapText('x'.repeat(130), 64).map((l) => l.length)).toEqual([64, 64, 2]);
  });
});

describe('paginate', () => {
  it('three lines per page, more text makes more pages, never empty', () => {
    const long = Array.from({ length: 60 }, (_, i) => `word${i}`).join(' ');
    const pages = paginate(long, 64, 3);
    expect(pages.length).toBeGreaterThan(1);
    for (const p of pages) expect(p.length).toBeLessThanOrEqual(3);
    expect(paginate('', 64, 3)).toEqual([[]]);
  });
  it('every real dialogue line fits one page', () => {
    // Pairs with the 192 character content rule: no line needs a second page.
    const ids = ['c1.pub.open', 'c1.pub.stool'];
    for (const id of ids) for (const l of sequence(id).lines) expect(paginate(l.text, DIALOGUE_TEXT.maxChars, DIALOGUE_TEXT.maxLines)).toHaveLength(1);
  });
  it('layout says 64 characters and 3 lines', () => {
    expect(DIALOGUE_TEXT.maxChars).toBe(64);
    expect(DIALOGUE_TEXT.maxLines).toBe(3);
  });
});

// ---------------------------------------------------------------------------

const line = (id: string, speaker: DialogueLine['speaker'], t: string): DialogueLine => ({ id, speaker, text: t });
const seq = (id: DialogueId, delivery: DialogueSequence['delivery'], ...texts: [DialogueLine['speaker'], string][]): DialogueSequence => ({
  id,
  delivery,
  lines: texts.map(([sp, t], i) => line(`${id}.${i + 1}`, sp, t)),
});

function queue(seqs: DialogueSequence[]) {
  const finished: DialogueId[] = [];
  const chars: string[] = [];
  const errors: string[] = [];
  const q = new DialogueQueue({
    lookup: (id) => {
      const s = seqs.find((x) => x.id === id);
      if (!s) throw new Error('missing');
      return s;
    },
    speakerName: (l) => (l.speaker === 'narrator' ? null : l.speaker.toUpperCase()),
    onFinished: (id) => void finished.push(id),
    onChar: (l) => void chars.push(l.speaker),
    onError: (id) => void errors.push(id),
  });
  return { q, finished, chars, errors };
}

describe('DialogueQueue', () => {
  it('plays sequences in the order they were enqueued, one at a time', () => {
    const { q, finished } = queue([seq('a', 'box', ['andrew', 'one']), seq('b', 'box', ['myko', 'two'])]);
    q.enqueue('a');
    q.enqueue('b');
    expect(q.view()?.sequenceId).toBe('a');
    expect(q.queued).toBe(1);
    for (let i = 0; i < 400; i++) q.update(16);
    expect(finished).toEqual(['a', 'b']);
    expect(q.idle).toBe(true);
    expect(q.view()).toBeNull();
  });

  it('steps through the lines of a sequence in order', () => {
    const { q } = queue([seq('a', 'box', ['andrew', 'first'], ['myko', 'second'])]);
    q.enqueue('a');
    const seen: string[] = [];
    for (let i = 0; i < 600; i++) {
      q.update(16);
      const v = q.view();
      if (v && v.lines[0] && !seen.includes(v.lines[0])) seen.push(v.lines[0]);
    }
    expect(seen).toEqual(['first', 'second']);
  });

  it('typewriter reveals characterPerSecond characters per second and reports revealed', () => {
    const { q } = queue([seq('a', 'scene', ['andrew', 'abcdefghij'])]);
    q.enqueue('a');
    expect(q.view()?.shown).toEqual(['']);
    q.update(1000 / DIALOGUE_TIMING.charsPerSecond);
    expect(q.view()?.shown).toEqual(['a']);
    q.update((1000 / DIALOGUE_TIMING.charsPerSecond) * 4);
    expect(q.view()?.shown).toEqual(['abcde']);
    expect(q.view()?.revealed).toBe(false);
    q.update(10_000);
    expect(q.view()?.shown).toEqual(['abcdefghij']);
    expect(q.view()?.revealed).toBe(true);
  });

  it('the typewriter cuts across wrapped lines', () => {
    const t = `${'a'.repeat(40)} ${'b'.repeat(40)}`;
    const { q } = queue([seq('a', 'scene', ['myko', t])]);
    q.enqueue('a');
    q.update((50 * 1000) / DIALOGUE_TIMING.charsPerSecond);
    const v = q.view();
    expect(v?.lines).toEqual(['a'.repeat(40), 'b'.repeat(40)]);
    expect(v?.shown).toEqual(['a'.repeat(40), 'b'.repeat(10)]);
  });

  it('scene delivery blocks play and waits for advance; the first advance completes the line, the next moves on', () => {
    const { q, finished } = queue([seq('s', 'scene', ['dympna', 'hello there'], ['andrew', 'hi'])]);
    q.enqueue('s');
    expect(q.blocking).toBe(true);
    q.update(10_000);
    expect(q.view()?.awaitingAdvance).toBe(true);
    expect(q.view()?.lineIndex).toBe(0);
    q.advance();
    expect(q.view()?.lineIndex).toBe(1);
    q.update(10);
    q.advance(); // skips to the end of the typewriter
    expect(q.view()?.revealed).toBe(true);
    expect(finished).toEqual([]);
    q.advance();
    expect(finished).toEqual(['s']);
    expect(q.blocking).toBe(false);
  });

  it('box and caption delivery never block and ignore advance', () => {
    const { q } = queue([seq('b', 'box', ['myko', 'commentary']), seq('c', 'caption', ['narrator', 'A Quiet Pint'])]);
    q.enqueue('b');
    expect(q.blocking).toBe(false);
    q.advance();
    expect(q.view()?.lineIndex).toBe(0);
    expect(q.view()?.shown[0]).toBe('');
  });

  it('box lines advance on their own after the hold time', () => {
    const { q, finished } = queue([seq('b', 'box', ['myko', 'hi'])]);
    q.enqueue('b');
    q.update(1000);
    expect(finished).toEqual([]);
    q.update(DIALOGUE_TIMING.boxHoldBaseMs + 2000);
    q.update(16);
    expect(finished).toEqual(['b']);
  });

  it('blips once per visible character, not for spaces, and not for captions', () => {
    const a = queue([seq('b', 'box', ['andrew', 'a b c'])]);
    a.q.enqueue('b');
    a.q.update(5000);
    expect(a.chars).toHaveLength(3);
    const c = queue([seq('c', 'caption', ['narrator', 'hello'])]);
    c.q.enqueue('c');
    c.q.update(5000);
    expect(c.chars).toHaveLength(0);
  });

  it('a missing sequence reports an error and still finishes, so nothing waits forever', () => {
    const { q, finished, errors } = queue([seq('b', 'box', ['myko', 'x'])]);
    q.enqueue('nope');
    q.enqueue('b');
    expect(errors).toEqual(['nope']);
    expect(finished).toEqual(['nope']);
    expect(q.view()?.sequenceId).toBe('b');
  });

  it('exposes speaker, name and direction', () => {
    const s: DialogueSequence = { id: 'd', delivery: 'box', lines: [{ id: 'd.1', speaker: 'myko', direction: 'quietly', text: 'You don\'t.' }] };
    const { q } = queue([s]);
    q.enqueue('d');
    expect(q.view()).toMatchObject({ speaker: 'myko', name: 'MYKO', direction: 'quietly' });
  });

  it('plays real content: a real scene blocks and finishes', () => {
    const real = sequence('c1.pub.open');
    const finished: string[] = [];
    const q = new DialogueQueue({ lookup: sequence, speakerName: () => 'x', onFinished: (id) => void finished.push(id) });
    q.enqueue('c1.pub.open');
    expect(q.blocking).toBe(true);
    for (let i = 0; i < real.lines.length * 2; i++) {
      q.update(10_000);
      q.advance();
    }
    expect(finished).toEqual(['c1.pub.open']);
  });
});

// ---------------------------------------------------------------------------

describe('LinkSelection (deduction board)', () => {
  const cands = ['c3.clue.map', 'c3.clue.manifest', 'c2.clue.fragment', 'c3.clue.brochure'] as const;

  it('needs three links', () => {
    expect(LINKS_REQUIRED).toBe(3);
  });

  it('selection is capped at three', () => {
    const s = new LinkSelection(cands);
    expect(s.toggle(cands[0])).toBe(true);
    expect(s.toggle(cands[1])).toBe(true);
    expect(s.toggle(cands[2])).toBe(true);
    expect(s.complete).toBe(true);
    expect(s.toggle(cands[3])).toBe(false);
    expect(s.picks()).toEqual([cands[0], cands[1], cands[2]]);
  });

  it('toggling a selected item removes it and frees a place', () => {
    const s = new LinkSelection(cands);
    s.toggle(cands[0]);
    s.toggle(cands[1]);
    s.toggle(cands[2]);
    expect(s.toggle(cands[1])).toBe(true);
    expect(s.complete).toBe(false);
    expect(s.toggle(cands[3])).toBe(true);
    expect(s.picks()).toEqual([cands[0], cands[2], cands[3]]);
  });

  it('ignores things that are not candidates', () => {
    const s = new LinkSelection(cands);
    expect(s.toggle('c9.proof.log')).toBe(false);
    expect(s.picks()).toEqual([]);
  });

  it('numbers picks from 1 and draws links between consecutive picks', () => {
    const s = new LinkSelection(cands);
    s.toggle(cands[2]);
    s.toggle(cands[0]);
    expect(s.order(cands[2])).toBe(1);
    expect(s.order(cands[0])).toBe(2);
    expect(s.order(cands[1])).toBe(0);
    expect(s.links()).toEqual([[cands[2], cands[0]]]);
    expect(s.has(cands[0])).toBe(true);
    s.clear();
    expect(s.picks()).toEqual([]);
  });

  it('a double toggle in one frame returns to empty', () => {
    const s = new LinkSelection(cands);
    s.toggle(cands[0]);
    s.toggle(cands[0]);
    expect(s.picks()).toEqual([]);
  });
});

// ---------------------------------------------------------------------------

describe('casebook model', () => {
  it('evidence entries use <evidenceId>.title|body|margin', () => {
    const it = toItem({ kind: 'evidence', evidenceId: 'c2.clue.fragment', chapter: 2 });
    expect(it).toMatchObject({ tab: 'clues', titleId: 'c2.clue.fragment.title', bodyId: 'c2.clue.fragment.body', marginId: 'c2.clue.fragment.margin', chapter: 2 });
  });

  it('proofs go to the proof tab', () => {
    expect(toItem({ kind: 'evidence', evidenceId: 'c9.proof.log', chapter: 9 }).tab).toBe('proof');
  });

  it('leads use <deductionId>.lead.title|body|margin', () => {
    const it = toItem({ kind: 'lead', deductionId: 'c3.deduction.boston', chapter: 3 });
    expect(it).toMatchObject({ tab: 'leads', titleId: 'c3.deduction.boston.lead.title', bodyId: 'c3.deduction.boston.lead.body', marginId: 'c3.deduction.boston.lead.margin' });
  });

  it('Myko calls use c<chapter>.call.<kind>.casebook|margin with the shared title', () => {
    const it = toItem({ kind: 'mykoCall', sectionId: 'c4.fight.brawl', callKind: 'fight', chapter: 4 });
    expect(it).toMatchObject({ bodyId: 'c4.call.fight.casebook', marginId: 'c4.call.fight.margin', titleId: 'ui.casebook.callTitle', tab: 'clues' });
    expect(toItem({ kind: 'mykoCall', sectionId: 'c4.puzzle.containers', callKind: 'puzzle', chapter: 4 }).bodyId).toBe('c4.call.puzzle.casebook');
  });

  it('every ID the model produces for real content exists', () => {
    const entries = [
      { kind: 'evidence', evidenceId: 'c2.clue.fragment', chapter: 2 },
      { kind: 'evidence', evidenceId: 'c9.proof.craft', chapter: 9 },
      { kind: 'lead', deductionId: 'c3.deduction.boston', chapter: 3 },
      { kind: 'mykoCall', sectionId: 'c1.fight.chipper', callKind: 'fight', chapter: 1 },
      { kind: 'mykoCall', sectionId: 'c10.puzzle.broadcast', callKind: 'puzzle', chapter: 10 },
    ] as const;
    for (const e of entries) {
      const it = toItem(e);
      for (const id of [it.titleId, it.bodyId, it.marginId]) if (id) expect(hasText(id), id).toBe(true);
    }
  });

  it('groups by tab, keeping the order entries were added, and never loses one', () => {
    const entries = [
      { kind: 'evidence', evidenceId: 'c2.clue.ring', chapter: 2 },
      { kind: 'lead', deductionId: 'c3.deduction.boston', chapter: 3 },
      { kind: 'evidence', evidenceId: 'c9.proof.log', chapter: 9 },
      { kind: 'mykoCall', sectionId: 'c2.fight.yard', callKind: 'fight', chapter: 2 },
      { kind: 'evidence', evidenceId: 'c2.clue.tracks', chapter: 2 },
    ] as const;
    const g = groupCasebook(entries);
    expect(g.clues.map((i) => i.key)).toEqual(['e:c2.clue.ring', 'm:c2.fight.yard', 'e:c2.clue.tracks']);
    expect(g.leads).toHaveLength(1);
    expect(g.proof).toHaveLength(1);
    expect(g.clues.length + g.leads.length + g.proof.length).toBe(entries.length);
    expect(groupCasebook([])).toEqual({ clues: [], leads: [], proof: [] });
  });

  it('tab labels exist as text', () => {
    for (const t of CASEBOOK_TABS) expect(hasText(tabTextId(t)), t).toBe(true);
    expect(hasText('ui.casebook.callTitle')).toBe(true);
  });
});

// ---------------------------------------------------------------------------

function source(over: Partial<UiStateSource> = {}): UiStateSource {
  const buzz = (value: number): BuzzSnapshot => ({ value, state: value >= 90 ? 'banjaxed' : value >= 60 ? 'locked' : value >= 20 ? 'grand' : 'sober', banjaxedPhase: 'none', banjaxedPhaseMsLeft: 0 });
  const base = {
    bus: new EventBus(),
    health: () => ({ current: 100, max: 100 }),
    buzz: () => buzz(0),
    heat: () => ({ active: false, value: 0 }),
    hangover: () => ({ active: false }),
    empties: () => 0,
    drinkSlots: () => [null, null, null] as const,
    selectedDrink: () => 0 as const,
    selectedSpecial: () => null,
    unlockedAbilities: () => [],
    mykoCallsLeft: () => 3,
    mykoCallHoldProgress: () => 0,
    casebook: () => [],
    currentObjective: () => null,
    boss: () => null,
    activeDeduction: () => null,
    submitDeduction: () => false,
    dialogueFinished: () => undefined,
    save: () => null,
    audioSettings: () => ({ musicVolume: 1, effectsVolume: 1 }),
    setAudioSettings: () => undefined,
    newGame: () => undefined,
    continueGame: () => undefined,
    startChapter: () => undefined,
    pause: () => undefined,
    resume: () => undefined,
    quitToTitle: () => undefined,
  };
  return { ...base, ...over } as unknown as UiStateSource;
}

describe('HUD model', () => {
  it('health pips: five at full, half pips, fewer under a hangover', () => {
    expect(pipFills(100, 100)).toEqual(['full', 'full', 'full', 'full', 'full']);
    expect(pipFills(50, 100)).toEqual(['full', 'full', 'half', 'empty', 'empty']);
    expect(pipFills(0, 100)).toEqual(['empty', 'empty', 'empty', 'empty', 'empty']);
    expect(pipFills(75, 75)).toHaveLength(4);
  });

it('a hungover Andrew at full health shows only full pips', () => {
    expect(pipFills(75, 75).every((p) => p === 'full')).toBe(true);
  });

  it('the Buzz meter has notches at 20, 60 and 90 and a fraction', () => {
    const m = buildHudModel(source({ buzz: () => ({ value: 45, state: 'grand', banjaxedPhase: 'none', banjaxedPhaseMsLeft: 0 }) }));
    expect(m.buzz.notches).toEqual([0.2, 0.6, 0.9]);
    expect(m.buzz.fraction).toBeCloseTo(0.45, 5);
    expect(m.buzz.state).toBe('grand');
    expect(hasText(m.buzz.stateTextId)).toBe(true);
    expect(m.buzz.flashing).toBe(false);
  });

  it('every Buzz state has HUD text and the meter flashes during the Banjaxed peak', () => {
    for (const state of ['sober', 'grand', 'locked', 'banjaxed'] as const) {
      const m = buildHudModel(source({ buzz: () => ({ value: 95, state, banjaxedPhase: state === 'banjaxed' ? 'peak' : 'none', banjaxedPhaseMsLeft: 0 }) }));
      expect(hasText(m.buzz.stateTextId)).toBe(true);
      expect(m.buzz.flashing).toBe(state === 'banjaxed');
    }
  });

  it('clamps a nonsense Buzz value', () => {
    const m = buildHudModel(source({ buzz: () => ({ value: 250, state: 'banjaxed', banjaxedPhase: 'none', banjaxedPhaseMsLeft: 0 }) }));
    expect(m.buzz.fraction).toBe(1);
  });

  it('three rollie flags for Myko calls, spent ones false', () => {
    expect(buildHudModel(source()).calls).toEqual([true, true, true]);
    expect(buildHudModel(source({ mykoCallsLeft: () => 1 })).calls).toEqual([true, false, false]);
    expect(buildHudModel(source({ mykoCallsLeft: () => 0 })).calls).toEqual([false, false, false]);
  });

  it('heat only shows when active', () => {
    expect(buildHudModel(source()).heat).toBeNull();
    expect(buildHudModel(source({ heat: () => ({ active: true, value: 50 }) })).heat).toEqual({ fraction: 0.5 });
  });

  it('specials are dimmed when Sober or when none is selected', () => {
    expect(buildHudModel(source()).special.locked).toBe(true);
    const grand = buildHudModel(source({ selectedSpecial: () => 'stoutSlam', buzz: () => ({ value: 40, state: 'grand', banjaxedPhase: 'none', banjaxedPhaseMsLeft: 0 }) }));
    expect(grand.special.locked).toBe(false);
    expect(hasText(grand.special.labelTextId)).toBe(true);
    const sober = buildHudModel(source({ selectedSpecial: () => 'stoutSlam' }));
    expect(sober.special.locked).toBe(true);
  });

  it('slots show drink, count and selection', () => {
    const m = buildHudModel(source({ drinkSlots: () => [{ drinkId: 'stout', count: 2 }, null, { drinkId: 'whiskey', count: 1 }] as const, selectedDrink: () => 2 as const, empties: () => 4 }));
    expect(m.slots.map((s) => [s.drinkId, s.count, s.selected])).toEqual([['stout', 2, false], [null, 0, false], ['whiskey', 1, true]]);
    expect(m.empties).toBe(4);
  });

  it('boss bar fraction and name', () => {
    const m = buildHudModel(source({ boss: () => ({ bossId: 'c1.boss.bigtom', health: { current: 110, max: 220 } }) }));
    expect(m.boss).toMatchObject({ bossId: 'c1.boss.bigtom', fraction: 0.5 });
    expect(hasText(m.boss?.nameTextId ?? '')).toBe(true);
    expect(buildHudModel(source()).boss).toBeNull();
  });

  it('hangover flag', () => {
    expect(buildHudModel(source({ hangover: () => ({ active: true }) })).hangover).toBe(true);
  });

  it('the Myko call ring covers a quarter of the perimeter at 0.25', () => {
    expect(perimeterSegments(0, 10, 10)).toEqual([]);
    const total = (p: number) => perimeterSegments(p, 10, 6).reduce((n, [a, b, c, d]) => n + Math.abs(c - a) + Math.abs(d - b), 0);
    expect(total(0.5)).toBeCloseTo(16, 5);
    expect(total(1)).toBeCloseTo(32, 5);
    expect(total(7)).toBeCloseTo(32, 5);
    expect(perimeterSegments(0.1, 10, 10)[0]?.slice(0, 2)).toEqual([0, 0]);
  });

  it('uses the DESIGN buzz thresholds from tuning for notches', () => {
    expect(TUNING.buzz.thresholds.grand / TUNING.buzz.max).toBe(0.2);
  });
});

describe('OverlayTracker', () => {
  it('pauses on the first overlay and resumes only when the last closes', () => {
    const log: string[] = [];
    const t = new OverlayTracker(() => void log.push('pause'), () => void log.push('resume'));
    t.show('casebook');
    t.show('settings');
    t.show('settings');
    expect(log).toEqual(['pause']);
    t.hide('casebook');
    expect(log).toEqual(['pause']);
    t.hide('settings');
    expect(log).toEqual(['pause', 'resume']);
    expect(t.any).toBe(false);
  });
  it('hiding something never shown does nothing', () => {
    const log: string[] = [];
    const t = new OverlayTracker(() => void log.push('p'), () => void log.push('r'));
    t.hide('x');
    expect(log).toEqual([]);
  });
});

describe('real content in the UI model', () => {
  it('speaker display names exist for all named characters', () => {
    for (const id of ['name.dympna', 'name.bigTom']) expect(text(id).length).toBeGreaterThan(0);
  });
});
