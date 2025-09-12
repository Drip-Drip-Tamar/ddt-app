import '@testing-library/jest-dom';
import { vi } from 'vitest';

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