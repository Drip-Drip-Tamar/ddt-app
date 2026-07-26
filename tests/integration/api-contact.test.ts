import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { APIContext } from 'astro';
import { createHmac } from 'node:crypto';

// Mock Sanity client to prevent actual database writes
const mockCreate = vi.fn<(document: Record<string, unknown>) => Promise<{ _id: string }>>(
  () => Promise.resolve({ _id: 'test-message-123' })
);
const createSanityWriteClient = vi.fn(() => ({
  create: mockCreate
}));
vi.mock('@utils/sanity-client', () => ({
  createSanityWriteClient,
  getSanityWriteToken: vi.fn(() => process.env.SANITY_WRITE_TOKEN?.trim() || undefined)
}));

describe('Contact Form API Endpoint', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'test-turnstile-secret');
    vi.stubEnv('SANITY_WRITE_TOKEN', 'write-token');
    vi.stubEnv('IP_HASH_SALT', 'test-salt');
    global.fetch = vi.fn(() => Promise.resolve(new Response(JSON.stringify({
      success: true,
      action: 'contact',
      hostname: 'localhost',
      challenge_ts: '2026-05-07T10:00:00.000Z'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })));
  });

  it('fails closed before external calls when the write token is missing', async () => {
    vi.stubEnv('SANITY_WRITE_TOKEN', '');
    vi.stubEnv('IP_HASH_SALT', 'test-salt');
    const { POST } = await import('../../src/pages/api/contact');
    const context = { request: new Request('http://localhost/api/contact', { method: 'POST' }) } as APIContext;

    const response = await POST(context);

    expect(response.status).toBe(503);
    expect(global.fetch).not.toHaveBeenCalled();
    expect(createSanityWriteClient).not.toHaveBeenCalled();
  });

  it('fails closed before external calls when the IP hash salt is missing', async () => {
    vi.stubEnv('SANITY_WRITE_TOKEN', 'write-token');
    vi.stubEnv('IP_HASH_SALT', '');
    const { POST } = await import('../../src/pages/api/contact');
    const context = { request: new Request('http://localhost/api/contact', { method: 'POST' }) } as APIContext;

    const response = await POST(context);

    expect(response.status).toBe(503);
    expect(global.fetch).not.toHaveBeenCalled();
    expect(createSanityWriteClient).not.toHaveBeenCalled();
  });

  it('stores HMAC-SHA256 IP hashes keyed by the configured salt', async () => {
    const { POST } = await import('../../src/pages/api/contact');
    const createContext = () => ({
      request: new Request('http://localhost/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '203.0.113.1'
        },
        body: JSON.stringify({
          name: 'Hash User',
          email: 'hash@example.com',
          message: 'Please hash my IP address.',
          consent: 'true',
          'cf-turnstile-response': 'valid-turnstile-token',
          form_started_at: String(Date.now() - 5000)
        })
      })
    }) as APIContext;

    vi.stubEnv('IP_HASH_SALT', 'known-salt');
    await POST(createContext());
    const firstHash = mockCreate.mock.calls[0]?.[0].ipHash;

    expect(firstHash).toBe(createHmac('sha256', 'known-salt').update('203.0.113.1').digest('hex'));

    mockCreate.mockClear();
    vi.stubEnv('IP_HASH_SALT', 'different-salt');
    await POST(createContext());
    const secondHash = mockCreate.mock.calls[0]?.[0].ipHash;

    expect(secondHash).not.toBe(firstHash);
  });

  it('should successfully process valid contact form submission', async () => {
    const { POST } = await import('../../src/pages/api/contact');

    const mockRequest = new Request('http://localhost/api/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': '192.168.1.1',
        'user-agent': 'Mozilla/5.0 Test'
      },
      body: JSON.stringify({
        name: 'Test User',
        email: 'test@example.com',
        topic: 'General enquiry',
        message: 'This is a test message',
        consent: 'true',
        'cf-turnstile-response': 'valid-turnstile-token',
        form_started_at: String(Date.now() - 5000) // 5 seconds ago
      })
    });

    const context: Partial<APIContext> = {
      request: mockRequest
    };

    const response = await POST(context as APIContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.message).toContain('Thank you');
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        _type: 'contactMessage',
        name: 'Test User',
        email: 'test@example.com',
        topic: 'General enquiry',
        message: 'This is a test message',
        consent: true,
        ipHash: createHmac('sha256', 'test-salt').update('192.168.1.1').digest('hex'),
        spamStatus: 'clean',
        spamReasons: [],
        turnstileOutcome: 'success'
      })
    );
  });

  it('should reject valid-looking submissions without Turnstile verification', async () => {
    const { POST } = await import('../../src/pages/api/contact');

    const mockRequest = new Request('http://localhost/api/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'No Token User',
        email: 'notoken@example.com',
        message: 'This looks legitimate but has no verification token',
        consent: 'true',
        form_started_at: String(Date.now() - 5000)
      })
    });

    const context: Partial<APIContext> = {
      request: mockRequest
    };

    const response = await POST(context as APIContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.ok).toBe(false);
    expect(data.error).toContain('verification');
    expect(mockCreate).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should reject submissions when Turnstile verification fails', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(new Response(JSON.stringify({
      success: false,
      'error-codes': ['timeout-or-duplicate']
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }));

    const { POST } = await import('../../src/pages/api/contact');

    const mockRequest = new Request('http://localhost/api/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Expired Token User',
        email: 'expired@example.com',
        message: 'This token has expired',
        consent: 'true',
        'cf-turnstile-response': 'expired-turnstile-token',
        form_started_at: String(Date.now() - 5000)
      })
    });

    const context: Partial<APIContext> = {
      request: mockRequest
    };

    const response = await POST(context as APIContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.ok).toBe(false);
    expect(data.error).toContain('verification');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('should reject submissions when Turnstile action or hostname does not match', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(new Response(JSON.stringify({
      success: true,
      action: 'newsletter',
      hostname: 'attacker.example'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }));

    const { POST } = await import('../../src/pages/api/contact');

    const mockRequest = new Request('http://localhost/api/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Wrong Action User',
        email: 'wrong-action@example.com',
        message: 'This token is for the wrong action',
        consent: 'true',
        'cf-turnstile-response': 'wrong-action-token',
        form_started_at: String(Date.now() - 5000)
      })
    });

    const context: Partial<APIContext> = {
      request: mockRequest
    };

    const response = await POST(context as APIContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.ok).toBe(false);
    expect(data.error).toContain('verification');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('should accept but flag suspicious submissions with repeated links', async () => {
    const { POST } = await import('../../src/pages/api/contact');

    const mockRequest = new Request('http://localhost/api/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Link Heavy User',
        email: 'links@example.com',
        message: 'Please see https://one.example https://two.example and https://three.example',
        consent: 'true',
        'cf-turnstile-response': 'valid-turnstile-token',
        form_started_at: String(Date.now() - 5000)
      })
    });

    const context: Partial<APIContext> = {
      request: mockRequest
    };

    const response = await POST(context as APIContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        spamStatus: 'suspicious',
        spamReasons: ['multiple_links'],
        turnstileOutcome: 'success'
      })
    );
  });

  it('should silently reject submissions with honeypot field filled', async () => {
    const { POST } = await import('../../src/pages/api/contact');

    const mockRequest = new Request('http://localhost/api/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Spam Bot',
        email: 'spam@example.com',
        message: 'Spam message',
        consent: 'true',
        _website: 'https://spam.com', // Honeypot field
        form_started_at: String(Date.now() - 5000)
      })
    });

    const context: Partial<APIContext> = {
      request: mockRequest
    };

    const response = await POST(context as APIContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(mockCreate).not.toHaveBeenCalled(); // Should not create document
  });

  it('should reject form submitted too quickly (< 3 seconds)', async () => {
    const { POST } = await import('../../src/pages/api/contact');

    const mockRequest = new Request('http://localhost/api/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Fast User',
        email: 'fast@example.com',
        message: 'Quick message',
        consent: 'true',
        'cf-turnstile-response': 'valid-turnstile-token',
        form_started_at: String(Date.now() - 1000) // Only 1 second ago
      })
    });

    const context: Partial<APIContext> = {
      request: mockRequest
    };

    const response = await POST(context as APIContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.ok).toBe(false);
    expect(data.error).toContain('take your time');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('should reject submission with missing name field', async () => {
    const { POST } = await import('../../src/pages/api/contact');

    const mockRequest = new Request('http://localhost/api/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'test@example.com',
        message: 'Message without name',
        consent: 'true',
        'cf-turnstile-response': 'valid-turnstile-token',
        form_started_at: String(Date.now() - 5000)
      })
    });

    const context: Partial<APIContext> = {
      request: mockRequest
    };

    const response = await POST(context as APIContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.ok).toBe(false);
    expect(data.error).toContain('required fields');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('should reject submission with missing email field', async () => {
    const { POST } = await import('../../src/pages/api/contact');

    const mockRequest = new Request('http://localhost/api/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Test User',
        message: 'Message without email',
        consent: 'true',
        'cf-turnstile-response': 'valid-turnstile-token',
        form_started_at: String(Date.now() - 5000)
      })
    });

    const context: Partial<APIContext> = {
      request: mockRequest
    };

    const response = await POST(context as APIContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.ok).toBe(false);
    expect(data.error).toContain('required fields');
  });

  it('should reject submission with missing message field', async () => {
    const { POST } = await import('../../src/pages/api/contact');

    const mockRequest = new Request('http://localhost/api/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Test User',
        email: 'test@example.com',
        consent: 'true',
        'cf-turnstile-response': 'valid-turnstile-token',
        form_started_at: String(Date.now() - 5000)
      })
    });

    const context: Partial<APIContext> = {
      request: mockRequest
    };

    const response = await POST(context as APIContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.ok).toBe(false);
    expect(data.error).toContain('required fields');
  });

  it('should reject submission without consent', async () => {
    const { POST } = await import('../../src/pages/api/contact');

    const mockRequest = new Request('http://localhost/api/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Test User',
        email: 'test@example.com',
        message: 'Message without consent',
        'cf-turnstile-response': 'valid-turnstile-token',
        form_started_at: String(Date.now() - 5000)
      })
    });

    const context: Partial<APIContext> = {
      request: mockRequest
    };

    const response = await POST(context as APIContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.ok).toBe(false);
    expect(data.error).toContain('privacy policy');
  });

  it('should reject invalid email format', async () => {
    const { POST } = await import('../../src/pages/api/contact');

    const mockRequest = new Request('http://localhost/api/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Test User',
        email: 'not-an-email',
        message: 'Message with invalid email',
        consent: 'true',
        'cf-turnstile-response': 'valid-turnstile-token',
        form_started_at: String(Date.now() - 5000)
      })
    });

    const context: Partial<APIContext> = {
      request: mockRequest
    };

    const response = await POST(context as APIContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.ok).toBe(false);
    expect(data.error).toContain('valid email');
  });

  it('should handle application/x-www-form-urlencoded content type', async () => {
    const { POST } = await import('../../src/pages/api/contact');

    const params = new URLSearchParams({
      name: 'Form User',
      email: 'form@example.com',
      message: 'URL encoded form message',
      consent: 'on',
      'cf-turnstile-response': 'valid-turnstile-token',
      form_started_at: String(Date.now() - 5000)
    });

    const mockRequest = new Request('http://localhost/api/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    const context: Partial<APIContext> = {
      request: mockRequest
    };

    const response = await POST(context as APIContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Form User',
        email: 'form@example.com',
        consent: true
      })
    );
  });

  it('should handle server errors gracefully', async () => {
    // Make the create method throw an error
    mockCreate.mockRejectedValueOnce(new Error('Database connection failed'));

    const { POST } = await import('../../src/pages/api/contact');

    const mockRequest = new Request('http://localhost/api/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Test User',
        email: 'test@example.com',
        message: 'Test message',
        consent: 'true',
        'cf-turnstile-response': 'valid-turnstile-token',
        form_started_at: String(Date.now() - 5000)
      })
    });

    const context: Partial<APIContext> = {
      request: mockRequest
    };

    const response = await POST(context as APIContext);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.ok).toBe(false);
    expect(data.error).toContain('something went wrong');
  });

  it('should reject a submission with an oversize field with a 400', async () => {
    const { POST } = await import('../../src/pages/api/contact');

    const mockRequest = new Request('http://localhost/api/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Test User',
        email: 'test@example.com',
        message: 'x'.repeat(5001),
        consent: 'true',
        'cf-turnstile-response': 'valid-turnstile-token',
        form_started_at: String(Date.now() - 5000)
      })
    });

    const context: Partial<APIContext> = {
      request: mockRequest
    };

    const response = await POST(context as APIContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.ok).toBe(false);
    expect(data.error).toContain('message');
    expect(mockCreate).not.toHaveBeenCalled();
    // Should fail fast, before calling out to Turnstile
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should reject a submission with multiple oversize fields with a 400', async () => {
    const { POST } = await import('../../src/pages/api/contact');

    const mockRequest = new Request('http://localhost/api/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'x'.repeat(201),
        email: 'test@example.com',
        message: 'A perfectly normal length message',
        consent: 'true',
        'cf-turnstile-response': 'valid-turnstile-token',
        form_started_at: String(Date.now() - 5000)
      })
    });

    const context: Partial<APIContext> = {
      request: mockRequest
    };

    const response = await POST(context as APIContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.ok).toBe(false);
    expect(data.error).toContain('name');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('should default topic to "General enquiry" when not provided', async () => {
    const { POST } = await import('../../src/pages/api/contact');

    const mockRequest = new Request('http://localhost/api/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Test User',
        email: 'test@example.com',
        message: 'Message without topic',
        consent: 'true',
        'cf-turnstile-response': 'valid-turnstile-token',
        form_started_at: String(Date.now() - 5000)
      })
    });

    const context: Partial<APIContext> = {
      request: mockRequest
    };

    const response = await POST(context as APIContext);
    await response.json();

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        topic: 'General enquiry'
      })
    );
  });
});
