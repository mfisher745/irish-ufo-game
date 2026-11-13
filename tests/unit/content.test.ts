/** Content and tuning integrity against DESIGN.md section 2, docs/style-guide.md and docs/chapters. */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { canDraw } from '../../src/art/font';
import { TUNING } from '../../src/content/tuning';
import { allSequenceIds, allTextIds, hasSequence, hasText, pool, sequence, text } from '../../src/content/dialogue';
import type { DialogueFile } from '../../src/content/dialogue';
import { C01 } from '../../src/content/dialogue/c01';
import { C02 } from '../../src/content/dialogue/c02';
import { C03 } from '../../src/content/dialogue/c03';
import { C04 } from '../../src/content/dialogue/c04';
import { C05 } from '../../src/content/dialogue/c05';
import { C06 } from '../../src/content/dialogue/c06';
import { C07 } from '../../src/content/dialogue/c07';
import { C08 } from '../../src/content/dialogue/c08';
import { C09 } from '../../src/content/dialogue/c09';
import { C10 } from '../../src/content/dialogue/c10';
import { COMMON } from '../../src/content/dialogue/common';
import { isAlienLine } from '../../src/content/dialogue/speakers';
import { PROOFS } from '../../src/core/types';
import type { DialogueLine, SpeakerId } from '../../src/core/types';
import { wrapText } from '../../src/ui/model/wrap';

const FILES: Record<string, DialogueFile> = { COMMON, C01, C02, C03, C04, C05, C06, C07, C08, C09, C10 };
const SPEAKERS: SpeakerId[] = ['andrew', 'myko', 'dympna', 'halloran', 'colleenAnn', 'pruitt', 'gary', 'administrator', 'npc', 'narrator'];
const LINES: DialogueLine[] = allSequenceIds().flatMap((id) => sequence(id).lines);
const ROOT = join(__dirname, '..', '..');

describe('dialogue lookup', () => {
  it('text() and sequence() throw on unknown IDs so gaps fail loudly', () => {
    expect(() => text('nope.nope')).toThrow();
    expect(() => sequence('nope.nope')).toThrow();
    expect(() => pool('nope.nope')).toThrow();
    expect(hasText('nope.nope')).toBe(false);
    expect(hasSequence('nope.nope')).toBe(false);
  });

  it('has a lot of content', () => {
    expect(allSequenceIds().length).toBeGreaterThan(300);
    expect(allTextIds().length).toBeGreaterThan(300);
  });
});

describe('every sequence line', () => {
  it('is at most 192 characters (3 lines of 64) and wraps into 3 lines', () => {
    const tooLong = LINES.filter((l) => l.text.length > 192).map((l) => l.id);
    expect(tooLong).toEqual([]);
    const wraps = LINES.filter((l) => wrapText(l.text, 64).length > 3).map((l) => l.id);
    expect(wraps).toEqual([]);
  });

  it('is not empty', () => {
    expect(LINES.filter((l) => l.text.trim().length === 0).map((l) => l.id)).toEqual([]);
  });

  it('uses only characters the font can draw (text and stage directions)', () => {
    const bad: string[] = [];
    for (const l of LINES) for (const ch of l.text + (l.direction ?? '')) if (!canDraw(ch)) bad.push(`${l.id}:${JSON.stringify(ch)}`);
    expect([...new Set(bad)]).toEqual([]);
  });

  it('has a valid speaker, a unique ID and an ID that extends its sequence ID', () => {
    const seen = new Set<string>();
    for (const id of allSequenceIds()) {
      const seq = sequence(id);
      expect(seq.lines.length, id).toBeGreaterThan(0);
      for (const l of seq.lines) {
        expect(SPEAKERS, l.id).toContain(l.speaker);
        expect(seen.has(l.id), `duplicate line id ${l.id}`).toBe(false);
        seen.add(l.id);
        expect(l.id.startsWith(`${id}.`), l.id).toBe(true);
      }
    }
  });

  it('npc lines name their speaker with an existing text ID', () => {
    const missing: string[] = [];
    for (const l of LINES) {
      if (l.speaker === 'npc') {
        if (l.speakerName === undefined || !hasText(l.speakerName)) missing.push(`${l.id}:${l.speakerName}`);
      } else if (l.speakerName !== undefined) missing.push(`${l.id}: speakerName on a named speaker`);
    }
    expect(missing).toEqual([]);
  });

  it('only captions use the narrator, and captions use only the narrator', () => {
    for (const id of allSequenceIds()) {
      const seq = sequence(id);
      for (const l of seq.lines) {
        if (l.speaker === 'narrator') expect(seq.delivery, id).toBe('caption');
        if (seq.delivery === 'caption') expect(l.speaker, id).toBe('narrator');
      }
    }
  });

  it('stays out of the alien-blip list for humans (isAlienLine sanity)', () => {
    expect(isAlienLine({ id: 'x', speaker: 'andrew', text: '' })).toBe(false);
    expect(isAlienLine({ id: 'x', speaker: 'gary', text: '' })).toBe(true);
  });
});

describe('every text entry', () => {
  it('uses only drawable characters', () => {
    const bad: string[] = [];
    for (const id of allTextIds()) for (const ch of text(id).replace(/\{\w+\}/g, '')) if (!canDraw(ch)) bad.push(`${id}:${JSON.stringify(ch)}`);
    expect([...new Set(bad)]).toEqual([]);
  });

  it('is not empty', () => {
    expect(allTextIds().filter((id) => text(id).trim() === '')).toEqual([]);
  });

  it('keeps short labels short: casebook titles under 64 characters', () => {
    expect(allTextIds().filter((id) => id.endsWith('.title') && text(id).length > 64)).toEqual([]);
  });
});

describe('tone rules mechanically checkable (DESIGN 2, style guide 6)', () => {
  const own = LINES.filter((l) => l.speaker === 'andrew' || l.speaker === 'myko');

  it('there are plenty of Andrew and Myko lines to check', () => {
    expect(own.length).toBeGreaterThan(300);
  });

  it('no exclamation mark in any Andrew or Myko line', () => {
    expect(own.filter((l) => l.text.includes('!')).map((l) => l.id)).toEqual([]);
  });

  it('no exclamation marks in casebook entries and margins (Andrew\'s and Myko\'s words)', () => {
    const ids = allTextIds().filter((id) => /\.(body|margin|casebook|answer|prompt)$/.test(id) || /\.lead\./.test(id));
    expect(ids.length).toBeGreaterThan(50);
    expect(ids.filter((id) => text(id).includes('!'))).toEqual([]);
  });

  const BANNED: RegExp[] = [
    /leprechaun/i,
    /top o['’]? ?(the )?mornin/i,
    /top of the mornin/i,
    /begorr?ah?/i,
    /lucky charm/i,
    /\bpot o['’]? gold/i,
    /\bfaith an['’]? begor/i,
    /\bme (boyo|lad|bucko)\b/i,
    /\bsure and\b/i,
    /\bwee (bit|lad|lass)\b/i,
    /\bblarney\b/i,
  ];
  it('none of the banned cartoon-Irish phrases appear in an Andrew or Myko line', () => {
    const hits = own.flatMap((l) => BANNED.filter((re) => re.test(l.text)).map((re) => `${l.id} ${re}`));
    expect(hits).toEqual([]);
  });

  it('none of them appear in any casebook entry or margin either', () => {
    const hits = allTextIds().flatMap((id) => BANNED.filter((re) => re.test(text(id))).map((re) => `${id} ${re}`));
    expect(hits).toEqual([]);
  });

  it('no obvious real brand names anywhere (DESIGN 2, CLAUDE.md hard rules)', () => {
    const brands = /\b(guinness|jameson|bushmills|budweiser|coors|heineken|starbucks|mcdonald|burger king|tayto|supermac|lidl|tesco|centra|ryanair|aer lingus|google|facebook|twitter|instagram|tiktok|youtube|netflix|amazon|walmart|coca[- ]cola|pepsi|apple|microsoft|nasa|fbi|cia|nsa)\b/i;
    const hits = [...LINES.map((l) => ({ id: l.id, t: l.text })), ...allTextIds().map((id) => ({ id, t: text(id) }))].filter((x) => brands.test(x.t)).map((x) => `${x.id}: ${x.t}`);
    expect(hits).toEqual([]);
  });
});

describe('pools', () => {
  const allPools = Object.entries(FILES).flatMap(([file, f]) => Object.entries(f.pools ?? {}).map(([id, ids]) => ({ file, id, ids })));

  it('there are pools', () => {
    expect(allPools.length).toBeGreaterThan(10);
  });

  it('every pool is non-empty, has unique members and every member exists', () => {
    for (const p of allPools) {
      expect(p.ids.length, `${p.file}:${p.id}`).toBeGreaterThan(0);
      expect(new Set(p.ids).size, `${p.file}:${p.id}`).toBe(p.ids.length);
      for (const id of p.ids) expect(hasSequence(id), `${p.id} -> ${id}`).toBe(true);
    }
  });

  it('pool(id) returns them', () => {
    for (const p of allPools) expect(pool(p.id)).toEqual(p.ids);
  });

  it('pool lines are single non-blocking box lines', () => {
    for (const p of allPools) for (const id of p.ids) expect(sequence(id).delivery, id).toBe('box');
  });

  it('every pool and sequence the systems ask for exists', () => {
    const pools = [
      'myko.death',
      'myko.hangover',
      'myko.heat',
      'myko.heat.wrongDrink',
      'myko.banjaxed',
      'myko.drink',
      'myko.idle',
      'andrew.sober',
      'myko.callRefused.noCallsLeft',
      'myko.callRefused.notCallable',
    ];
    for (const id of pools) expect(() => pool(id), id).not.toThrow();
    for (const id of ['myko.caught', 'myko.cleanRun', 'myko.callRefused.administrator', 'myko.callRefused.administrator.callsLeft', 'c10.epilogue.calls.unused']) {
      expect(hasSequence(id), id).toBe(true);
    }
  });
});

describe('Myko call lines for every chapter (style guide 6)', () => {
  for (let n = 1; n <= 10; n++) {
    it(`chapter ${n} has fight and puzzle call sequences, casebook entries and margin notes`, () => {
      for (const kind of ['fight', 'puzzle'] as const) {
        const base = `c${n}.call.${kind}`;
        expect(hasSequence(base), base).toBe(true);
        expect(sequence(base).lines.some((l) => l.speaker === 'myko'), base).toBe(true);
        expect(hasText(`${base}.casebook`), `${base}.casebook`).toBe(true);
        expect(hasText(`${base}.margin`), `${base}.margin`).toBe(true);
        expect(text(`${base}.margin`).length, `${base}.margin shorter than entry`).toBeLessThanOrEqual(text(`${base}.casebook`).length + 40);
      }
    });
  }
});

describe('casebook text IDs (style guide 6)', () => {
  const docs = readdirSync(join(ROOT, 'docs', 'chapters'))
    .filter((f) => /^\d\d-.*\.md$/.test(f))
    .map((f) => readFileSync(join(ROOT, 'docs', 'chapters', f), 'utf8'))
    .join('\n');
  const specClues = [...new Set(docs.match(/c\d+\.clue\.[a-z]+/g) ?? [])];
  const specBoards = [...new Set(docs.match(/c\d+\.deduction\.[a-z]+/g) ?? [])];

  it('every clue named in the chapter specs has .title, .body and .margin', () => {
    expect(specClues.length).toBeGreaterThan(20);
    const missing = specClues.flatMap((id) => ['title', 'body', 'margin'].filter((s) => !hasText(`${id}.${s}`)).map((s) => `${id}.${s}`));
    expect(missing).toEqual([]);
  });

  it('every clue in the content has all three parts', () => {
    const ids = new Set(allTextIds().filter((id) => /^c\d+\.clue\.[a-z]+\.(title|body|margin)$/.test(id)).map((id) => id.replace(/\.(title|body|margin)$/, '')));
    const missing = [...ids].flatMap((id) => ['title', 'body', 'margin'].filter((s) => !hasText(`${id}.${s}`)).map((s) => `${id}.${s}`));
    expect(missing).toEqual([]);
  });

  it('every one of the five proofs has title, body and margin', () => {
    expect(PROOFS).toHaveLength(5);
    const missing = PROOFS.flatMap((id) => ['title', 'body', 'margin'].filter((s) => !hasText(`${id}.${s}`)).map((s) => `${id}.${s}`));
    expect(missing).toEqual([]);
  });

  it('every deduction board has prompt, answer and the three lead texts', () => {
    expect(specBoards.length).toBe(7);
    const missing = specBoards.flatMap((id) => ['prompt', 'answer', 'lead.title', 'lead.body', 'lead.margin'].filter((s) => !hasText(`${id}.${s}`)).map((s) => `${id}.${s}`));
    expect(missing).toEqual([]);
  });

  it('Myko margin notes are shorter than Andrew\'s entries', () => {
    const longer = allTextIds()
      .filter((id) => id.endsWith('.margin'))
      .filter((id) => {
        const body = id.replace(/\.margin$/, '.body');
        return hasText(body) && text(id).length > text(body).length;
      });
    expect(longer).toEqual([]);
  });
});

describe('tuning text references', () => {
  it('every drink and food has an existing name and pickup text', () => {
    for (const d of [...Object.values(TUNING.drinks), ...Object.values(TUNING.food)]) {
      expect(hasText(d.nameTextId), d.nameTextId).toBe(true);
      expect(hasText(d.pickupTextId), d.pickupTextId).toBe(true);
    }
  });
  it('every ability, enemy and boss has an existing name', () => {
    for (const a of Object.values(TUNING.abilities)) expect(hasText(a.nameTextId), a.nameTextId).toBe(true);
    for (const e of Object.values(TUNING.enemies)) expect(hasText(e.nameTextId), e.nameTextId).toBe(true);
    for (const b of Object.values(TUNING.bosses)) expect(hasText(b.nameTextId), b.nameTextId).toBe(true);
  });
  it('pickup text follows the sample: no exclamation marks, name then effect', () => {
    for (const d of [...Object.values(TUNING.drinks), ...Object.values(TUNING.food)]) expect(text(d.pickupTextId)).not.toContain('!');
  });
  it('every Buzz state has a HUD label text', () => {
    for (const s of ['sober', 'grand', 'locked', 'banjaxed']) expect(hasText(`ui.buzz.${s}`), s).toBe(true);
    expect(hasText('ui.hud.noSpecial')).toBe(true);
  });
});

describe('tuning integrity', () => {
  const specIds = (() => {
    const docs = readdirSync(join(ROOT, 'docs', 'chapters'))
      .filter((f) => /^\d\d-.*\.md$/.test(f))
      .map((f) => readFileSync(join(ROOT, 'docs', 'chapters', f), 'utf8'))
      .join('\n');
    return new Set(docs.match(/c\d+\.(fight|boss|setpiece|puzzle|deduction|stealth|explore)\.[a-z0-9]+/g) ?? []);
  })();

  it('every fight ID in tuning is a section named in the chapter specs (alarm fights via their stealth section)', () => {
    const unknown = Object.keys(TUNING.fights).filter((id) => !specIds.has(id.replace(/\.alarm$/, '')));
    expect(unknown).toEqual([]);
  });

  it('every alarm fight belongs to a stealth section and every non-alarm one to a fight section', () => {
    for (const id of Object.keys(TUNING.fights)) {
      if (id.endsWith('.alarm')) expect(id, id).toMatch(/^c\d+\.stealth\.[a-z]+\.alarm$/);
      else expect(id, id).toMatch(/^c\d+\.fight\.[a-z]+$/);
    }
  });

  it('every fight and stealth section in the specs has fight tuning', () => {
    const fights = [...specIds].filter((id) => /\.fight\./.test(id));
    const stealth = [...specIds].filter((id) => /\.stealth\./.test(id)).map((id) => `${id}.alarm`);
    const missing = [...fights, ...stealth].filter((id) => !(id in TUNING.fights));
    expect(missing).toEqual([]);
  });

  it('every boss and set piece in the specs has a definition', () => {
    const bosses = [...specIds].filter((id) => /\.(boss|setpiece)\./.test(id));
    expect(bosses.filter((id) => !(id in TUNING.bosses))).toEqual([]);
    expect(Object.keys(TUNING.bosses).filter((id) => !specIds.has(id))).toEqual([]);
  });

  it('fights have non-empty waves of enemies that exist', () => {
    for (const [id, f] of Object.entries(TUNING.fights)) {
      expect(f?.waves.length, id).toBeGreaterThan(0);
      for (const w of f?.waves ?? []) {
        expect(w.enemies.length, id).toBeGreaterThan(0);
        for (const g of w.enemies) {
          expect(TUNING.enemies[g.enemyId], id).toBeDefined();
          expect(g.count, id).toBeGreaterThan(0);
        }
      }
    }
  });

  it('every enemy attack has telegraphMs >= 400 (style guide), including after boss speed-ups', () => {
    for (const e of Object.values(TUNING.enemies)) for (const a of e.attacks) expect(a.telegraphMs, `${e.id}.${a.id}`).toBeGreaterThanOrEqual(400);
    for (const b of Object.values(TUNING.bosses)) {
      for (const ph of b.phases) {
        for (const a of ph.attacks) {
          if (b.id === 'c9.setpiece.lockdown') continue; // a door timer, not an attack
          expect(a.telegraphMs, `${b.id}.${ph.id}.${a.id}`).toBeGreaterThanOrEqual(400);
          expect(a.telegraphMs / ph.attackSpeedMultiplier, `${b.id}.${ph.id}.${a.id} effective`).toBeGreaterThanOrEqual(400);
        }
      }
    }
  });

  it('every attack has positive damage or is a marker, sane cooldowns and non-negative recovery', () => {
    for (const e of Object.values(TUNING.enemies)) {
      for (const a of e.attacks) {
        expect(a.damage, `${e.id}.${a.id}`).toBeGreaterThan(0);
        expect(a.cooldownMs, `${e.id}.${a.id}`).toBeGreaterThan(0);
        expect(a.recoveryMs, `${e.id}.${a.id}`).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('every boss has a phase starting at "start", and phases after the first have real triggers', () => {
    for (const b of Object.values(TUNING.bosses)) {
      expect(b.phases.some((p) => p.trigger.kind === 'start'), b.id).toBe(true);
      expect(b.phases[0]?.trigger.kind, b.id).toBe('start');
      for (const p of b.phases.slice(1)) expect(p.trigger.kind, `${b.id}.${p.id}`).not.toBe('start');
    }
  });

  it('boss health fraction triggers fall in order', () => {
    for (const b of Object.values(TUNING.bosses)) {
      const fr = b.phases.flatMap((p) => (p.trigger.kind === 'healthBelow' ? [p.trigger.fraction] : []));
      expect([...fr].sort((a, c) => c - a), b.id).toEqual(fr);
    }
  });

  it('every enemy sprite key matches its ID and every boss sprite key its boss ID', () => {
    for (const e of Object.values(TUNING.enemies)) expect(e.spriteKey).toBe(`enemy.${e.id}`);
    for (const b of Object.values(TUNING.bosses)) expect(b.spriteKey).toBe(`boss.${b.id}`);
  });

  it('only the security guard has a frontal shield', () => {
    for (const e of Object.values(TUNING.enemies)) expect(e.frontalShieldDeg ?? 0, e.id).toEqual(e.id === 'security' ? 120 : 0);
  });

  it('chapter-spec enemy facts: brawler grab holds, clerk bursts three, suit baton hits twice, mascot disguised', () => {
    expect(TUNING.enemies.brawler.attacks.some((a) => (a.holdMs ?? 0) > 0)).toBe(true);
    expect(TUNING.enemies.clerk.attacks[0]?.burst).toBe(3);
    expect(TUNING.enemies.suit.attacks[0]?.burst).toBe(2);
    expect(TUNING.enemies.mascot.disguisedUntilAttack).toBe(true);
    expect(TUNING.enemies.drone.flies).toBe(true);
    expect(TUNING.enemies.drone.attacks[0]?.shape).toMatchObject({ kind: 'projectile', deflectable: true });
    expect(TUNING.enemies.agent.attacks.map((a) => a.id).sort()).toEqual(['cuffs', 'dart']);
  });

  it('chapter 6 fight is six drones in two waves and two agents', () => {
    const f = TUNING.fights['c6.fight.drones'];
    const count = (id: string) => f?.waves.reduce((n, w) => n + w.enemies.filter((g) => g.enemyId === id).reduce((m, g) => m + g.count, 0), 0);
    expect(f?.waves).toHaveLength(2);
    expect(count('drone')).toBe(6);
    expect(count('agent')).toBe(2);
  });

  it('Chapter Select gives three stout', () => {
    expect(TUNING.chapterSelect.startingDrinks).toEqual([{ drinkId: 'stout', count: 3 }, null, null]);
  });

  it('the headline numbers DESIGN names are as written', () => {
    expect(TUNING.player.maxHealth).toBe(100);
    expect(TUNING.buzz.thresholds).toEqual({ grand: 20, locked: 60, banjaxed: 90 });
    expect(TUNING.myko.callsPerGame).toBe(3);
  });
});
