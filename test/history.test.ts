import { describe, it, expect } from 'vitest';
import { emptyHistory, record, undo, canUndo, HISTORY_LIMIT, COALESCE_MS } from '@/lib/history';

describe('undo history', () => {
  it('starts empty and cannot undo', () => {
    expect(canUndo(emptyHistory<number>())).toBe(false);
    expect(undo(emptyHistory<number>()).snapshot).toBeUndefined();
  });

  it('returns the state from before the change', () => {
    let h = record(emptyHistory<string>(), 'a', 1000);
    const { snapshot } = undo(h);
    expect(snapshot).toBe('a');
  });

  it('coalesces a burst of keystrokes into one undo step', () => {
    let h = emptyHistory<string>();
    h = record(h, 'before typing', 1000);
    for (let i = 1; i < 20; i++) h = record(h, `keystroke ${i}`, 1000 + i * 50);
    expect(h.past).toHaveLength(1);
    // One undo returns to before the whole burst, not one character back.
    expect(undo(h).snapshot).toBe('before typing');
  });

  it('starts a new step once the coalescing window passes', () => {
    let h = record(emptyHistory<string>(), 'first', 1000);
    h = record(h, 'second', 1000 + COALESCE_MS + 1);
    expect(h.past).toEqual(['first', 'second']);
    expect(undo(h).snapshot).toBe('second');
  });

  it('undoes repeatedly, most recent first', () => {
    let h = emptyHistory<string>();
    h = record(h, 'one', 0);
    h = record(h, 'two', 10_000);
    h = record(h, 'three', 20_000);
    const a = undo(h); expect(a.snapshot).toBe('three');
    const b = undo(a.history); expect(b.snapshot).toBe('two');
    const c = undo(b.history); expect(c.snapshot).toBe('one');
    expect(canUndo(c.history)).toBe(false);
  });

  it('bounds memory use', () => {
    let h = emptyHistory<number>();
    for (let i = 0; i < HISTORY_LIMIT + 25; i++) h = record(h, i, i * 10_000);
    expect(h.past).toHaveLength(HISTORY_LIMIT);
    // The oldest entries are dropped, the newest retained.
    expect(h.past[h.past.length - 1]).toBe(HISTORY_LIMIT + 24);
  });
});
