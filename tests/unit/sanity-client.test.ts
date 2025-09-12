import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createClient } from '@sanity/client';

// Mock the @sanity/client module
vi.mock('@sanity/client', () => ({
  createClient: vi.fn(() => ({
    fetch: vi.fn(),
    listen: vi.fn(() => ({
      subscribe: vi.fn()
    })),
    config: vi.fn()
  }))
}));

// Mock the fs module for the listener
vi.mock('fs', () => ({
  default: {
    promises: {
      utimes: vi.fn()
    }
  }
}));

// Mock Vite's loadEnv
vi.mock('vite', () => ({
  loadEnv: vi.fn(() => ({
    SANITY_PROJECT_ID: process.env.SANITY_PROJECT_ID,
    SANITY_DATASET: process.env.SANITY_DATASET,
    SANITY_TOKEN: process.env.SANITY_TOKEN,
    STACKBIT_PREVIEW: process.env.STACKBIT_PREVIEW,
    SANITY_PREVIEW_DRAFTS: process.env.SANITY_PREVIEW_DRAFTS
  }))
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
    const originalDev = import.meta.env.DEV;
    process.env.NODE_ENV = 'production';
    import.meta.env.DEV = false;
    
    // Clear the module from cache to force re-import
    vi.resetModules();
    
    // Dynamic import to get fresh module
    await import('../../src/utils/sanity-client');
    
    expect(createClient).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'test-project-id',
        dataset: 'test-dataset',
        apiVersion: expect.any(String),
        useCdn: false,
        perspective: 'published'
      })
    );
    
    process.env.NODE_ENV = originalNodeEnv;
    import.meta.env.DEV = originalDev;
  });

  it('should create client with preview drafts in development', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    const originalDev = import.meta.env.DEV;
    process.env.NODE_ENV = 'development';
    import.meta.env.DEV = true;
    
    // Clear the module from cache to force re-import
    vi.resetModules();
    
    // Dynamic import to get fresh module  
    await import('../../src/utils/sanity-client');
    
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
    import.meta.env.DEV = originalDev;
  });

  it('should handle missing environment variables gracefully', async () => {
    delete process.env.SANITY_PROJECT_ID;
    delete process.env.SANITY_DATASET;
    
    // This should not throw
    await import('../../src/utils/sanity-client');
    
    expect(createClient).toHaveBeenCalled();
  });

  it('should use correct stega configuration when in preview mode', async () => {
    process.env.SANITY_PREVIEW_DRAFTS = 'true';
    
    await import('../../src/utils/sanity-client');
    
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
  it('should set up listener with correct query', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    
    const mockSubscribe = vi.fn();
    const mockClient = {
      listen: vi.fn().mockReturnValue({
        subscribe: mockSubscribe
      }),
      fetch: vi.fn(),
      config: vi.fn()
    };
    
    vi.mocked(createClient).mockReturnValue(mockClient as unknown as ReturnType<typeof createClient>);
    vi.resetModules();
    
    await import('../../src/utils/sanity-client');
    
    // Verify listener was called with correct query
    expect(mockClient.listen).toHaveBeenCalledWith(
      '*[_type in ["page"]]',
      {},
      expect.objectContaining({
        visibility: 'query'
      })
    );
    
    // Verify subscribe was called
    expect(mockSubscribe).toHaveBeenCalled();
    
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('should update file timestamps when page appears or disappears', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    
    let eventCallback: ((event: { transition: string }) => Promise<void>) | undefined;
    const mockSubscribe = vi.fn((callback) => {
      eventCallback = callback;
    });
    
    const mockClient = {
      listen: vi.fn().mockReturnValue({
        subscribe: mockSubscribe
      }),
      fetch: vi.fn(),
      config: vi.fn()
    };
    
    vi.mocked(createClient).mockReturnValue(mockClient as unknown as ReturnType<typeof createClient>);
    vi.resetModules();
    
    await import('../../src/utils/sanity-client');
    
    // Simulate an 'appear' event
    await eventCallback({ transition: 'appear' });
    
    // Check that fs.promises.utimes was called
    const fs = await import('fs');
    expect(fs.default.promises.utimes).toHaveBeenCalled();
    
    process.env.NODE_ENV = originalNodeEnv;
  });
});