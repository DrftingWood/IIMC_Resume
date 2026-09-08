import { afterEach } from 'vitest';

// Vitest's `test.globals` is off in this project, so @testing-library/react
// cannot auto-detect a global `afterEach` to register its own cleanup.
// Register it explicitly, but only for jsdom-environment test files — the
// node-environment parser/registry tests never touch `document`, and
// importing @testing-library/react there would be an unnecessary (and, at
// module-eval time, DOM-dependent) dependency.
afterEach(async () => {
  if (typeof document !== 'undefined') {
    const { cleanup } = await import('@testing-library/react');
    cleanup();
  }
});
