import type { APIRoute } from 'astro';
import crypto from 'crypto';
import { createSanityWriteClient } from '@utils/sanity-client';
import { fetchUpstream, UpstreamError } from '@utils/upstream';

// Mark this endpoint as server-rendered (not pre-rendered)
export const prerender = false;

// Write-capable Sanity client for creating contact form submissions
const sanityClient = createSanityWriteClient();

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const TURNSTILE_ACTION = 'contact';
const MIN_FORM_FILL_TIME_MS = 3000;
const SUSPICIOUS_LINK_THRESHOLD = 3;

const FIELD_LENGTH_LIMITS = {
  name: 200,
  email: 320,
  subject: 300,
  message: 5000
} as const;

let warnedAboutMissingIpHashSalt = false;

type TurnstileSiteverifyResponse = {
  success?: boolean;
  action?: string;
  hostname?: string;
  challenge_ts?: string;
  'error-codes'?: string[];
};

function jsonResponse(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const rawIp = forwardedFor || realIp || 'unknown';

  return rawIp.split(',')[0]?.trim() || 'unknown';
}

function isExpectedHostname(turnstileHostname: string | undefined, requestHostname: string) {
  if (!turnstileHostname) {
    return false;
  }

  return turnstileHostname.toLowerCase() === requestHostname.toLowerCase();
}

async function verifyTurnstileToken(token: string | undefined, request: Request, ip: string) {
  if (!token) {
    return { ok: false, reason: 'missing_token' };
  }

  const secret = import.meta.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    console.error('Turnstile secret is not configured');
    return { ok: false, reason: 'not_configured' };
  }

  const params = new URLSearchParams({
    secret,
    response: token
  });

  if (ip !== 'unknown') {
    params.set('remoteip', ip);
  }

  try {
    const result = await fetchUpstream<TurnstileSiteverifyResponse>(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    });

    const requestHostname = new URL(request.url).hostname;

    if (!result.success) {
      return { ok: false, reason: result['error-codes']?.join(',') || 'siteverify_failed' };
    }

    if (result.action !== TURNSTILE_ACTION) {
      return { ok: false, reason: 'action_mismatch' };
    }

    if (!isExpectedHostname(result.hostname, requestHostname)) {
      return { ok: false, reason: 'hostname_mismatch' };
    }

    return { ok: true, hostname: result.hostname, action: result.action };
  } catch (error) {
    if (error instanceof UpstreamError && error.kind === 'non-ok') {
      return { ok: false, reason: 'siteverify_http_error' };
    }
    console.error('Turnstile verification error:', error);
    return { ok: false, reason: 'siteverify_request_failed' };
  }
}

function getLengthViolations(fields: { name: string; email: string; topic: string; message: string }): string[] {
  const violations: string[] = [];
  if (fields.name.length > FIELD_LENGTH_LIMITS.name) violations.push('name');
  if (fields.email.length > FIELD_LENGTH_LIMITS.email) violations.push('email');
  if (fields.topic.length > FIELD_LENGTH_LIMITS.subject) violations.push('subject');
  if (fields.message.length > FIELD_LENGTH_LIMITS.message) violations.push('message');
  return violations;
}

function hashIp(ip: string): string {
  const salt = import.meta.env.IP_HASH_SALT || '';

  if (!salt && !warnedAboutMissingIpHashSalt) {
    warnedAboutMissingIpHashSalt = true;
    console.warn('IP_HASH_SALT is not set; IP hashes are unsalted and rainbow-tableable. Set IP_HASH_SALT to harden this.');
  }

  return crypto.createHash('sha256').update(`${salt}${ip}`).digest('hex');
}

function getSpamReasons(message: string, formStartedAt: string | undefined) {
  const reasons: string[] = [];
  const startedAt = formStartedAt ? parseInt(formStartedAt, 10) : NaN;

  if (!formStartedAt || Number.isNaN(startedAt)) {
    reasons.push('missing_form_started_at');
  }

  const linkCount = message.match(/https?:\/\/|www\./gi)?.length || 0;
  if (linkCount >= SUSPICIOUS_LINK_THRESHOLD) {
    reasons.push('multiple_links');
  }

  return reasons;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    // Parse form data
    const contentType = request.headers.get('content-type');
    let formData: FormData;
    
    if (contentType?.includes('application/x-www-form-urlencoded')) {
      const text = await request.text();
      formData = new URLSearchParams(text) as unknown as FormData;
    } else if (contentType?.includes('multipart/form-data')) {
      formData = await request.formData();
    } else if (contentType?.includes('application/json')) {
      const json = await request.json();
      formData = new FormData();
      Object.entries(json).forEach(([key, value]) => {
        formData.append(key, value as string);
      });
    } else {
      formData = await request.formData();
    }

    // Extract form fields
    const name = formData.get('name')?.toString();
    const email = formData.get('email')?.toString();
    const topic = formData.get('topic')?.toString() || 'General enquiry';
    const message = formData.get('message')?.toString();
    const consent = formData.get('consent')?.toString() === 'on' || 
                    formData.get('consent')?.toString() === 'true';
    const turnstileToken = formData.get('cf-turnstile-response')?.toString();
    
    // Anti-spam checks
    const honeypot = formData.get('_website')?.toString(); // Hidden field
    const formStartedAt = formData.get('form_started_at')?.toString();
    
    // Check honeypot (should be empty)
    if (honeypot) {
      // Silently reject spam
      return jsonResponse({ ok: true }, 200);
    }
    
    // Check time (form should take more than 3 seconds to fill)
    if (formStartedAt) {
      const timeDiff = Date.now() - parseInt(formStartedAt, 10);
      if (timeDiff < MIN_FORM_FILL_TIME_MS) {
        return jsonResponse({
          ok: false,
          error: 'Please take your time filling out the form'
        }, 400);
      }
    }
    
    // Validate required fields
    if (!name || !email || !message || !consent) {
      return jsonResponse({
        ok: false,
        error: 'Please fill in all required fields and accept the privacy policy'
      }, 400);
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return jsonResponse({
        ok: false,
        error: 'Please provide a valid email address'
      }, 400);
    }

    // Reject oversize payloads before doing any network calls
    const lengthViolations = getLengthViolations({ name, email, topic, message });
    if (lengthViolations.length > 0) {
      return jsonResponse({
        ok: false,
        error: `The following fields exceed the maximum allowed length: ${lengthViolations.join(', ')}`
      }, 400);
    }

    // Get IP and user agent for security tracking
    const ip = getClientIp(request);
    const userAgent = request.headers.get('user-agent') || 'unknown';

    const turnstileVerification = await verifyTurnstileToken(turnstileToken, request, ip);
    if (!turnstileVerification.ok) {
      return jsonResponse({
        ok: false,
        error: 'Please complete the verification check and try again.'
      }, 400);
    }
    
    // Hash IP for privacy
    const ipHash = hashIp(ip);
    const spamReasons = getSpamReasons(message, formStartedAt);
    
    // Create Sanity document
    const contactMessage = {
      _type: 'contactMessage',
      name,
      email,
      topic,
      message,
      consent,
      ipHash,
      userAgent,
      spamStatus: spamReasons.length > 0 ? 'suspicious' : 'clean',
      spamReasons,
      turnstileOutcome: 'success',
      createdAt: new Date().toISOString()
    };
    
    // Store in Sanity
    await sanityClient.create(contactMessage);
    
    // Return success response
    return jsonResponse({
      ok: true,
      message: 'Thank you for your message. We will get back to you soon.'
    }, 200);
    
  } catch (error) {
    console.error('Contact form error:', error);
    
    return jsonResponse({
      ok: false,
      error: 'Sorry, something went wrong. Please try again later or email us directly.'
    }, 500);
  }
};
