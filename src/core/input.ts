/**
 * Input mapping. DESIGN.md section 6.
 *
 * `InputTracker` is plain TypeScript: feed it raw device events and call
 * `frame(dtMs)` once per tick to get an `InputFrame` with edges and hold
 * timing. `PhaserInput` (in `phaserInput.ts`) wires a Phaser scene to it.
 */

import { DEFAULT_BINDINGS } from './types';
import type { InputAction, InputBinding, InputFrame, Vec2 } from './types';

export type BindingName = keyof typeof DEFAULT_BINDINGS;
export type Bindings = Readonly<Record<BindingName, readonly InputBinding[]>>;

const ACTIONS: readonly InputAction[] = [
  'melee',
  'ranged',
  'dodge',
  'drink',
  'selectDrink1',
  'selectDrink2',
  'selectDrink3',
  'selectDrinkNext',
  'selectDrinkPrev',
  'special',
  'cycleSpecial',
  'sneak',
  'interact',
  'hint',
  'callMyko',
  'casebook',
  'pause',
];

const EMPTY_SET: ReadonlySet<InputAction> = new Set();

export const NO_INPUT: InputFrame = {
  move: { x: 0, y: 0 },
  aim: { x: 0, y: 0 },
  held: EMPTY_SET,
  pressed: EMPTY_SET,
  released: EMPTY_SET,
  holdMs: {},
};

export class InputTracker {
  private readonly keys = new Set<string>();
  private readonly mouse = new Set<'left' | 'right'>();
  private wheelUp = 0;
  private wheelDown = 0;
  private aim: Vec2 = { x: 0, y: 0 };
  private prevHeld = new Set<InputAction>();
  /** Edges that happened and released within one tick still count as a press. */
  private readonly tapped = new Set<InputAction>();
  private readonly holdStart = new Map<InputAction, number>();
  private elapsedMs = 0;

  constructor(private readonly bindings: Bindings = DEFAULT_BINDINGS) {}

  keyDown(code: string): void {
    this.keys.add(code);
    this.noteTaps();
  }

  keyUp(code: string): void {
    this.keys.delete(code);
  }

  mouseDown(button: 'left' | 'right'): void {
    this.mouse.add(button);
    this.noteTaps();
  }

  mouseUp(button: 'left' | 'right'): void {
    this.mouse.delete(button);
  }

  wheel(direction: 'up' | 'down'): void {
    if (direction === 'up') this.wheelUp += 1;
    else this.wheelDown += 1;
  }

  setAim(world: Vec2): void {
    this.aim = world;
  }

  /** Releases everything, e.g. when the window loses focus. */
  releaseAll(): void {
    this.keys.clear();
    this.mouse.clear();
  }

  isBindingDown(name: BindingName): boolean {
    return this.bindings[name].some((b) => this.bindingDown(b));
  }

  /** Builds this tick's frame. Call exactly once per tick. */
  frame(dtMs: number): InputFrame {
    this.elapsedMs += dtMs;
    const held = new Set<InputAction>();
    for (const action of ACTIONS) {
      if (this.isBindingDown(action)) held.add(action);
    }
    const pressed = new Set<InputAction>();
    const released = new Set<InputAction>();
    for (const action of held) if (!this.prevHeld.has(action)) pressed.add(action);
    for (const action of this.prevHeld) if (!held.has(action)) released.add(action);
    for (const action of this.tapped) {
      if (!held.has(action) && !this.prevHeld.has(action)) {
        pressed.add(action);
        released.add(action);
      }
    }
    this.tapped.clear();
    if (this.wheelUp > 0) pressed.add('selectDrinkPrev');
    if (this.wheelDown > 0) pressed.add('selectDrinkNext');
    this.wheelUp = 0;
    this.wheelDown = 0;

    const holdMs: Partial<Record<InputAction, number>> = {};
    for (const action of pressed) if (held.has(action)) this.holdStart.set(action, this.elapsedMs - dtMs);
    for (const action of held) {
      const start = this.holdStart.get(action) ?? this.elapsedMs - dtMs;
      holdMs[action] = this.elapsedMs - start;
    }
    for (const action of released) {
      const start = this.holdStart.get(action);
      if (start !== undefined) holdMs[action] = this.elapsedMs - start;
      this.holdStart.delete(action);
    }

    const x = (this.isBindingDown('moveRight') ? 1 : 0) - (this.isBindingDown('moveLeft') ? 1 : 0);
    const y = (this.isBindingDown('moveDown') ? 1 : 0) - (this.isBindingDown('moveUp') ? 1 : 0);
    this.prevHeld = held;
    return { move: { x, y }, aim: this.aim, held, pressed, released, holdMs };
  }

  private bindingDown(b: InputBinding): boolean {
    switch (b.device) {
      case 'keyboard':
        return this.keys.has(b.code);
      case 'mouse':
        return this.mouse.has(b.button);
      case 'wheel':
        return false;
    }
  }

  private noteTaps(): void {
    for (const action of ACTIONS) if (this.isBindingDown(action)) this.tapped.add(action);
  }
}
