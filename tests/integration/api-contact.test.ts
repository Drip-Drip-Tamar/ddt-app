import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { APIContext } from 'astro';

// Mock Sanity client to prevent actual database writes
const mockCreate = vi.fn(() => Promise.resolve({ _id: 'test-message-123' }));
vi.mock('@sanity/client', () => ({
  createClient: vi.fn(() => ({
    create: mockCreate
  }))
}));

// Mock crypto for IP hashing
vi.mock('crypto', () => ({
  default: {
    createHash: vi.fn(() => ({
      update: vi.fn().mockReturnThis(),
      digest: vi.fn(() => 'mock-hash-abc123')
    }))
  }
}));

describe('Contact Form API Endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
        ipHash: 'mock-hash-abc123'
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
