// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  mountContactForm,
  submitContactForm,
  attachValidationFeedback,
  stampFormStartTime
} from '../../src/scripts/contact-form';

function renderFormMarkup(): void {
  document.body.innerHTML = `
    <div class="order-2">
      <form id="contactForm" method="POST" action="/api/contact">
        <input type="hidden" name="_website" value="" aria-hidden="true" tabindex="-1" autocomplete="off">
        <input type="hidden" name="form_started_at" id="form_started_at" value="">

        <input type="text" id="name" name="name" required>
        <span id="name-error" class="hidden"></span>

        <input type="email" id="email" name="email" required>
        <span id="email-error" class="hidden"></span>

        <textarea id="message" name="message" required></textarea>
        <span id="message-error" class="hidden"></span>

        <button type="submit">Send Message</button>

        <div id="formMessage" class="alert hidden" role="alert">
          <span id="formMessageText"></span>
        </div>
      </form>
    </div>
  `;
}

describe('contact-form', () => {
  beforeEach(() => {
    renderFormMarkup();
    vi.restoreAllMocks();
  });

  describe('mountContactForm', () => {
    it('is idempotent — mounting twice only attaches one submit listener', async () => {
      mountContactForm();
      mountContactForm();

      const fetchMock = vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ ok: true })
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      const form = document.getElementById('contactForm') as HTMLFormElement;
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

      // Allow the async handler's microtasks to flush.
      await Promise.resolve();
      await Promise.resolve();

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('stamps the form_started_at hidden field on mount', () => {
      const before = Date.now();
      mountContactForm();
      const field = document.getElementById('form_started_at') as HTMLInputElement;

      expect(Number(field.value)).toBeGreaterThanOrEqual(before);
    });
  });

  describe('successful submit path', () => {
    it('replaces the form with a success message when the API returns ok', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ ok: true })
      }) as unknown as typeof fetch;

      mountContactForm();

      const form = document.getElementById('contactForm') as HTMLFormElement;
      const formContainer = form.parentElement as HTMLElement;

      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      expect(formContainer.innerHTML).toContain('Thank you!');
      expect(formContainer.querySelector('#contactForm')).toBeNull();
    });
  });

  describe('server error path', () => {
    it('shows the returned error message and re-enables the submit button', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ ok: false, error: 'Verification failed.' })
      }) as unknown as typeof fetch;

      mountContactForm();

      const form = document.getElementById('contactForm') as HTMLFormElement;
      const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement;
      const formMessage = document.getElementById('formMessage') as HTMLElement;
      const formMessageText = document.getElementById('formMessageText') as HTMLElement;

      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      expect(formMessage.classList.contains('hidden')).toBe(false);
      expect(formMessage.classList.contains('alert-error')).toBe(true);
      expect(formMessageText.textContent).toBe('Verification failed.');
      expect(submitBtn.disabled).toBe(false);
      expect(submitBtn.textContent).toBe('Send Message');
    });

    it('falls back to a default message when the API omits one', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ ok: false })
      }) as unknown as typeof fetch;

      const form = document.getElementById('contactForm') as HTMLFormElement;
      const result = await submitContactForm(form);

      expect(result.ok).toBe(false);
      expect(result.error).toBe('Something went wrong. Please try again.');
    });
  });

  describe('network error path', () => {
    it('shows a network error message when fetch rejects', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('offline')) as unknown as typeof fetch;

      mountContactForm();

      const form = document.getElementById('contactForm') as HTMLFormElement;
      const formMessage = document.getElementById('formMessage') as HTMLElement;
      const formMessageText = document.getElementById('formMessageText') as HTMLElement;

      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      expect(formMessage.classList.contains('alert-error')).toBe(true);
      expect(formMessageText.textContent).toBe('Network error. Please check your connection and try again.');
    });
  });

  describe('submitContactForm', () => {
    it('posts the form as FormData to /api/contact', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ ok: true })
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      const form = document.getElementById('contactForm') as HTMLFormElement;
      (document.getElementById('name') as HTMLInputElement).value = 'Jane';

      const result = await submitContactForm(form);

      expect(result).toEqual({ ok: true });
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/contact',
        expect.objectContaining({ method: 'POST', body: expect.any(FormData) })
      );
    });
  });

  describe('stampFormStartTime', () => {
    it('sets the hidden timestamp field used by the API 3s anti-spam gate', () => {
      const form = document.getElementById('contactForm') as HTMLFormElement;
      const field = document.getElementById('form_started_at') as HTMLInputElement;
      expect(field.value).toBe('');

      stampFormStartTime(form);

      expect(field.value).not.toBe('');
      expect(Number.isNaN(Number(field.value))).toBe(false);
    });
  });

  describe('attachValidationFeedback', () => {
    it('shows a required-field error on blur when a required input is empty', () => {
      const form = document.getElementById('contactForm') as HTMLFormElement;
      attachValidationFeedback(form);

      const nameInput = document.getElementById('name') as HTMLInputElement;
      const errorSpan = document.getElementById('name-error') as HTMLElement;

      nameInput.dispatchEvent(new Event('blur'));

      expect(errorSpan.classList.contains('hidden')).toBe(false);
      expect(errorSpan.textContent).toBe('This field is required');
      expect(nameInput.classList.contains('input-error')).toBe(true);
    });

    it('shows an email-format error on blur for an invalid email', () => {
      const form = document.getElementById('contactForm') as HTMLFormElement;
      attachValidationFeedback(form);

      const emailInput = document.getElementById('email') as HTMLInputElement;
      const errorSpan = document.getElementById('email-error') as HTMLElement;

      emailInput.value = 'not-an-email';
      emailInput.dispatchEvent(new Event('blur'));

      expect(errorSpan.classList.contains('hidden')).toBe(false);
      expect(errorSpan.textContent).toBe('Please enter a valid email address');
    });

    it('clears the error once a valid value is provided', () => {
      const form = document.getElementById('contactForm') as HTMLFormElement;
      attachValidationFeedback(form);

      const nameInput = document.getElementById('name') as HTMLInputElement;
      const errorSpan = document.getElementById('name-error') as HTMLElement;

      nameInput.dispatchEvent(new Event('blur'));
      expect(errorSpan.classList.contains('hidden')).toBe(false);

      nameInput.value = 'Jane';
      nameInput.dispatchEvent(new Event('blur'));

      expect(errorSpan.classList.contains('hidden')).toBe(true);
      expect(nameInput.classList.contains('input-error')).toBe(false);
    });
  });
});
