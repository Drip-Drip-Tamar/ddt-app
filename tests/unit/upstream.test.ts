import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchUpstream, UpstreamError } from '../../src/utils/upstream';

describe('fetchUpstream', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it('returns parsed JSON on a successful response', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ hello: 'world' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    );

    const data = await fetchUpstream<{ hello: string }>('https://example.com/api');

    expect(data).toEqual({ hello: 'world' });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://example.com/api',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  it('throws a non-ok UpstreamError when the response status is not ok', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response('Service Unavailable', { status: 503 })
    );

    await expect(fetchUpstream('https://example.com/api')).rejects.toMatchObject({
      name: 'UpstreamError',
      kind: 'non-ok',
      status: 503
    });
  });

  it('throws an invalid-json UpstreamError when the body cannot be parsed', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response('not json{', {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    );

    await expect(fetchUpstream('https://example.com/api')).rejects.toMatchObject({
      name: 'UpstreamError',
      kind: 'invalid-json'
    });
  });

  it('throws a network UpstreamError when fetch rejects for a reason other than abort', async () => {
    vi.mocked(global.fetch).mockRejectedValueOnce(new Error('DNS lookup failed'));

    await expect(fetchUpstream('https://example.com/api')).rejects.toMatchObject({
      name: 'UpstreamError',
      kind: 'network',
      message: 'DNS lookup failed'
    });
  });

  it('throws a timeout UpstreamError when the request exceeds timeoutMs', async () => {
    vi.mocked(global.fetch).mockImplementationOnce((_url, options) => {
      const signal = (options as RequestInit).signal as AbortSignal;
      return new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => {
          reject(new DOMException('The operation was aborted', 'AbortError'));
        });
      });
    });

    await expect(fetchUpstream('https://example.com/api', { timeoutMs: 20 })).rejects.toMatchObject({
      name: 'UpstreamError',
      kind: 'timeout'
    });
  });

  it('is an instance of UpstreamError', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(new Response('nope', { status: 404 }));

    try {
      await fetchUpstream('https://example.com/api');
      expect.unreachable('fetchUpstream should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(UpstreamError);
    }
  });
});
