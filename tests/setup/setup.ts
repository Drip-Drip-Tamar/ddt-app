import '@testing-library/jest-dom';
import { vi, afterEach } from 'vitest';
import { TextEncoder, TextDecoder } from 'util';

// Polyfill TextEncoder/TextDecoder for Node.js environment
// This fixes the esbuild "TextEncoder instanceof Uint8Array" error
if (typeof globalThis.TextEncoder === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  globalThis.TextEncoder = TextEncoder as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  globalThis.TextDecoder = TextDecoder as any;
}

// Mock environment variables for tests
vi.stubEnv('SANITY_PROJECT_ID', 'test-project-id');
vi.stubEnv('SANITY_DATASET', 'test-dataset');
vi.stubEnv('SANITY_TOKEN', 'test-token');

// Mock fetch for API calls
global.fetch = vi.fn();

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

// Reset mocks between tests
afterEach(() => {
  vi.clearAllMocks();
});