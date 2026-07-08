/**
 * Shared helper for calling upstream third-party APIs (Environment Agency,
 * South West Water ArcGIS, Cloudflare Turnstile, ...) with a guaranteed
 * timeout, a consistent ok-check, and a consistent JSON parse step.
 *
 * Without this, a hung upstream would hang the serverless function until
 * the platform kills it. Every API route in src/pages/api should call
 * upstream services through fetchUpstream() rather than the raw fetch().
 */

export type UpstreamErrorKind = 'timeout' | 'non-ok' | 'invalid-json' | 'network';

/**
 * Typed error thrown by fetchUpstream() so callers can distinguish
 * timeout / non-ok / malformed-JSON / network failures when they need to
 * (e.g. to decide whether to retry via a fallback query).
 */
export class UpstreamError extends Error {
  readonly kind: UpstreamErrorKind;
  readonly status?: number;
  readonly url: string;

  constructor(kind: UpstreamErrorKind, message: string, url: string, status?: number) {
    super(message);
    this.name = 'UpstreamError';
    this.kind = kind;
    this.url = url;
    this.status = status;
  }
}

const DEFAULT_TIMEOUT_MS = 8000;

export interface FetchUpstreamOptions extends Omit<RequestInit, 'signal'> {
  /** Abort the request after this many milliseconds. Defaults to 8000. */
  timeoutMs?: number;
  /** Optional caller-provided signal, combined with the timeout signal. */
  signal?: AbortSignal;
}

/**
 * Fetches `url`, aborting after `timeoutMs` (default 8s), and returns the
 * parsed JSON body. Throws UpstreamError on timeout, network failure,
 * non-ok status, or malformed JSON.
 */
export async function fetchUpstream<T = unknown>(
  url: string,
  opts: FetchUpstreamOptions = {}
): Promise<T> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, signal: externalSignal, ...init } = opts;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const onExternalAbort = () => controller.abort();
  externalSignal?.addEventListener('abort', onExternalAbort);

  let response: Response;
  try {
    response = await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new UpstreamError('timeout', `Request to ${url} timed out after ${timeoutMs}ms`, url);
    }
    throw new UpstreamError(
      'network',
      error instanceof Error ? error.message : 'Network request failed',
      url
    );
  } finally {
    clearTimeout(timeoutId);
    externalSignal?.removeEventListener('abort', onExternalAbort);
  }

  if (!response.ok) {
    throw new UpstreamError(
      'non-ok',
      `Upstream request to ${url} failed with status ${response.status}`,
      url,
      response.status
    );
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new UpstreamError('invalid-json', `Upstream response from ${url} was not valid JSON`, url, response.status);
  }
}
