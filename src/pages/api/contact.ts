import type { APIRoute } from 'astro';
import { createClient } from '@sanity/client';
import crypto from 'crypto';

// Mark this endpoint as server-rendered (not pre-rendered)
export const prerender = false;

// Create Sanity client with server-side token
const sanityClient = createClient({
  projectId: import.meta.env.SANITY_PROJECT_ID,
  dataset: import.meta.env.SANITY_DATASET || 'production',
  apiVersion: '2024-01-31',
  token: import.meta.env.SANITY_TOKEN,
  useCdn: false
});

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
    
    // Anti-spam checks
    const honeypot = formData.get('_website')?.toString(); // Hidden field
    const formStartedAt = formData.get('form_started_at')?.toString();
    
    // Check honeypot (should be empty)
    if (honeypot) {
      // Silently reject spam
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Check time (form should take more than 3 seconds to fill)
    if (formStartedAt) {
      const timeDiff = Date.now() - parseInt(formStartedAt);
      if (timeDiff < 3000) {
        return new Response(JSON.stringify({ 
          ok: false, 
          error: 'Please take your time filling out the form' 
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    // Validate required fields
    if (!name || !email || !message || !consent) {
      return new Response(JSON.stringify({ 
        ok: false, 
        error: 'Please fill in all required fields and accept the privacy policy' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({ 
        ok: false, 
        error: 'Please provide a valid email address' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Get IP and user agent for security tracking
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    // Hash IP for privacy
    const ipHash = crypto.createHash('sha256').update(ip).digest('hex');
    
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
      createdAt: new Date().toISOString()
    };
    
    // Store in Sanity
    await sanityClient.create(contactMessage);
    
    // Return success response
    return new Response(JSON.stringify({ 
      ok: true,
      message: 'Thank you for your message. We will get back to you soon.'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Contact form error:', error);
    
    return new Response(JSON.stringify({ 
      ok: false, 
      error: 'Sorry, something went wrong. Please try again later or email us directly.' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};