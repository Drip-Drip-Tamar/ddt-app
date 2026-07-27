// Client-side logic for the contact form (src/pages/contact.astro).
// Extracted so the submit/validation flow is unit-testable outside the DOM
// bundle. mountContactForm() is idempotent and safe to call on every
// astro:page-load (initial load and, if view transitions are enabled,
// subsequent client-side navigations).

export type TurnstileWindow = Window & {
  turnstile?: {
    reset: () => void;
  };
};

export function resetTurnstile(win: TurnstileWindow = window as TurnstileWindow): void {
  win.turnstile?.reset();
}

/** Stamps the anti-spam "form started" timestamp the API uses for the 3s gate. */
export function stampFormStartTime(form: HTMLFormElement): void {
  const field = form.querySelector<HTMLInputElement>('#form_started_at');
  if (field) {
    field.value = Date.now().toString();
  }
}

export interface SubmitResult {
  ok: boolean;
  error?: string;
}

const DEFAULT_ERROR_MESSAGE = 'Something went wrong. Please try again.';
const NETWORK_ERROR_MESSAGE = 'Network error. Please check your connection and try again.';

/** Serialises the form (including hidden honeypot/timestamp fields) and posts it to the API. */
export async function submitContactForm(form: HTMLFormElement): Promise<SubmitResult> {
  const formData = new FormData(form);

  try {
    const response = await fetch('/api/contact', {
      method: 'POST',
      body: formData
    });

    const result = await response.json();

    if (result.ok) {
      return { ok: true };
    }

    return { ok: false, error: result.error || DEFAULT_ERROR_MESSAGE };
  } catch {
    return { ok: false, error: NETWORK_ERROR_MESSAGE };
  }
}

const SUCCESS_HTML = `
  <div class="alert alert-success">
    <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    <div>
      <h3 class="font-bold">Thank you!</h3>
      <p>We've received your message and will reply via email soon.</p>
    </div>
  </div>
  <div class="mt-4">
    <a href="/" class="btn btn-primary">Return to Home</a>
  </div>
`;

/** Replaces the form with the success message, matching the original inline markup. */
export function renderSuccess(form: HTMLFormElement): void {
  const formContainer = form.parentElement;
  if (!formContainer) {
    return;
  }
  formContainer.innerHTML = SUCCESS_HTML;
}

export function clearFormMessage(formMessage: HTMLElement | null): void {
  formMessage?.classList.add('hidden');
  formMessage?.classList.remove('alert-success', 'alert-error');
}

export function showFormError(
  formMessage: HTMLElement | null,
  formMessageText: HTMLElement | null,
  message: string
): void {
  formMessage?.classList.remove('hidden');
  formMessage?.classList.add('alert-error');
  if (formMessageText) {
    formMessageText.textContent = message;
  }
}

/** Orchestrates a single submit: disable button, post, then render success or error UI. */
export async function handleFormSubmit(event: SubmitEvent, form: HTMLFormElement): Promise<void> {
  event.preventDefault();

  const formMessage = document.getElementById('formMessage');
  const formMessageText = document.getElementById('formMessageText');

  clearFormMessage(formMessage);

  const submitBtn = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  const originalText = submitBtn?.textContent ?? '';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';
  }

  const result = await submitContactForm(form);

  if (result.ok) {
    form.reset();
    stampFormStartTime(form);
    renderSuccess(form);
    return;
  }

  showFormError(formMessage, formMessageText, result.error || DEFAULT_ERROR_MESSAGE);
  resetTurnstile();
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
}

/** Wires up blur-based inline validation feedback on required fields. */
export function attachValidationFeedback(form: HTMLFormElement): void {
  const requiredFields = form.querySelectorAll<HTMLInputElement>('[required]');

  requiredFields.forEach((input) => {
    input.addEventListener('blur', () => {
      const errorSpan = document.getElementById(`${input.name}-error`);

      if (input.validity.valueMissing) {
        errorSpan?.classList.remove('hidden');
        if (errorSpan) {
          errorSpan.textContent = 'This field is required';
        }
        input.classList.add('input-error');
      } else if (input.validity.typeMismatch && input.type === 'email') {
        errorSpan?.classList.remove('hidden');
        if (errorSpan) {
          errorSpan.textContent = 'Please enter a valid email address';
        }
        input.classList.add('input-error');
      } else {
        errorSpan?.classList.add('hidden');
        input.classList.remove('input-error');
      }
    });
  });
}

const MOUNTED_ATTR = 'data-contact-form-mounted';

/** Idempotent mount: safe to call on initial load and on every astro:page-load. */
export function mountContactForm(doc: Document = document): void {
  const form = doc.getElementById('contactForm') as HTMLFormElement | null;
  if (!form || form.hasAttribute(MOUNTED_ATTR)) {
    return;
  }
  form.setAttribute(MOUNTED_ATTR, 'true');

  stampFormStartTime(form);

  form.addEventListener('submit', (event) => {
    void handleFormSubmit(event as SubmitEvent, form);
  });

  attachValidationFeedback(form);
}
