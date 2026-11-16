import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

/** Runs in every jsdom test file: each test starts with an empty document and empty storages. */
afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
});
