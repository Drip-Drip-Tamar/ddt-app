import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createClient } from '@sanity/client';

// Mock the @sanity/client module
vi.mock('@sanity/client', () => ({
  createClient: vi.fn(() => ({
    fetch: vi.fn(),
    listen: vi.fn(),
    config: vi.fn()
  }))
}));

// Mock the fs module for the listener
vi.mock('fs', () => ({
  default: {
    utimesSync: vi.fn()
  }
}));

describe('sanity-client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    
    // Reset environment variables
    process.env.SANITY_PROJECT_ID = 'test-project-id';
    process.env.SANITY_DATASET = 'test-dataset';
    process.env.SANITY_TOKEN = 'test-token';
  });

  it('should create client with correct configuration in production', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    
    // Dynamic import to get fresh module
    const { client } = await import('../../src/utils/sanity-client');
    
    expect(createClient).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'test-project-id',
        dataset: 'test-dataset',
        apiVersion: expect.any(String),
        useCdn: false,
        perspective: 'published'
      })
    );
    
    expect(client).toBeDefined();
    
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('should create client with preview drafts in development', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    
    // Dynamic import to get fresh module  
    const { client } = await import('../../src/utils/sanity-client');
    
    expect(createClient).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'test-project-id',
        dataset: 'test-dataset',
        apiVersion: expect.any(String),
        useCdn: false,
        perspective: 'previewDrafts'
      })
    );
    
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('should handle missing environment variables gracefully', async () => {
    delete process.env.SANITY_PROJECT_ID;
    delete process.env.SANITY_DATASET;
    
    // This should not throw
    const { client } = await import('../../src/utils/sanity-client');
    
    expect(client).toBeDefined();
    expect(createClient).toHaveBeenCalled();
  });

  it('should use correct stega configuration when in preview mode', async () => {
    process.env.SANITY_PREVIEW_DRAFTS = 'true';
    
    const { client } = await import('../../src/utils/sanity-client');
    
    expect(createClient).toHaveBeenCalledWith(
      expect.objectContaining({
        stega: expect.objectContaining({
          enabled: true,
          studioUrl: expect.any(String)
        })
      })
    );
  });
});

describe('sanity-client listener', () => {
  it('should set up listener in development mode', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    
    const mockClient = {
      listen: vi.fn().mockReturnValue({
        subscribe: vi.fn()
      }),
      fetch: vi.fn(),
      config: vi.fn()
    };
    
    vi.mocked(createClient).mockReturnValue(mockClient as any);
    
    await import('../../src/utils/sanity-client');
    
    // Verify listener was called with correct query
    expect(mockClient.listen).toHaveBeenCalledWith(
      '*[_type == "page" || _type == "siteConfig"]',
      {},
      expect.objectContaining({
        includeResult: false,
        visibility: 'query'
      })
    );
    
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('should not set up listener in production mode', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    
    const mockClient = {
      listen: vi.fn(),
      fetch: vi.fn(),
      config: vi.fn()
    };
    
    vi.mocked(createClient).mockReturnValue(mockClient as any);
    
    await import('../../src/utils/sanity-client');
    
    // Verify listener was NOT called in production
    expect(mockClient.listen).not.toHaveBeenCalled();
    
    process.env.NODE_ENV = originalNodeEnv;
  });
});