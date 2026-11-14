/** Audio wiring: which effect each game event plays. The synth and music are stubbed; only the routing is under test. */

import { afterEach, describe, expect, it, vi } from 'vitest';

const played: string[] = [];
vi.mock('../../src/audio/synth', async (orig) => ({
  ...(await orig<typeof import('../../src/audio/synth')>()),
  makeNoiseBuffer: () => ({}),
  renderEffect: (id: string) => void played.push(id),
}));
vi.mock('../../src/audio/music', () => ({
  MusicPlayer: class {
    setIntensity(): void {}
    setSilent(): void {}
    setRegion(): void {}
    resumed(): void {}
    stop(): void {}
    dispose(): void {}
  },
}));

import { createAudio } from '../../src/audio';
import type { Audio } from '../../src/audio';
import { TUNING } from '../../src/content/tuning';
import { EventBus } from '../../src/core/events';
import type { HitInfo } from '../../src/core/types';

const param = () => ({ setTargetAtTime: () => undefined, value: 0 });
const node = () => ({ connect: () => undefined, gain: param() });
const fakeCtx = { state: 'running', currentTime: 0, destination: {}, createGain: node, addEventListener: undefined } as unknown as BaseAudioContext;

let audio: Audio | null = null;
function wire(): EventBus {
  const bus = new EventBus();
  audio = createAudio(bus, () => ({ musicVolume: 1, effectsVolume: 1 }), fakeCtx);
  played.length = 0;
  return bus;
}
afterEach(() => {
  audio?.dispose();
  audio = null;
});

const hit = (abilityId: 'punchCombo' | 'hurley', knockback = 0): HitInfo =>
  ({ source: { kind: 'player', abilityId }, targetInstanceId: 'e', amount: 1, knockback: { x: knockback, y: 0 }, stunMs: 0, holdMs: 0 }) as unknown as HitInfo;

describe('audio wiring', () => {
  it('AbilityUsed punchCombo plays swing', () => {
    const bus = wire();
    bus.emit('ability:used', { abilityId: 'punchCombo' } as never);
    expect(played).toContain('swing');
  });

  it('EnemyDamaged by a plain punch plays hit; the haymaker plays haymaker', () => {
    const bus = wire();
    bus.emit('enemy:damaged', { hit: hit('punchCombo') } as never);
    expect(played).toEqual(['hit']);
    played.length = 0;
    const last = TUNING.abilities.punchCombo.combo?.at(-1)?.knockback ?? 0;
    bus.emit('enemy:damaged', { hit: hit('punchCombo', last) } as never);
    expect(played).toEqual(['haymaker']);
  });
});
