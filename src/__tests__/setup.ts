import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Prevent real calendar API calls in all tests
vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ items: [] }),
}));
