// Client-side logic for the mobile nav panel (src/components/Header.astro).
// Extracted so the open/close/focus-trap behaviour is unit-testable outside
// the DOM bundle. mountMobileNav() is idempotent and safe to call on every
// astro:after-swap (initial load and, if view transitions are enabled,
// subsequent client-side navigations).

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',');

/** Returns the panel's focusable elements, in DOM order. */
export function getFocusableElements(panel: HTMLElement): HTMLElement[] {
  return Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
}

/**
 * Keeps Tab/Shift+Tab cycling within the panel's focusable elements while
 * it's open. Returns true if the event was handled (and should be prevented).
 */
export function trapTabKey(panel: HTMLElement, event: KeyboardEvent): boolean {
  if (event.key !== 'Tab') {
    return false;
  }

  const focusable = getFocusableElements(panel);
  if (focusable.length === 0) {
    return false;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = panel.ownerDocument.activeElement;

  if (event.shiftKey) {
    if (active === first || !panel.contains(active)) {
      event.preventDefault();
      last.focus();
      return true;
    }
  } else {
    if (active === last || !panel.contains(active)) {
      event.preventDefault();
      first.focus();
      return true;
    }
  }

  return false;
}

export function mountMobileNav(): void {
  const nav = document.querySelector<HTMLElement>('.nav-panel');
  const navToggleBtn = document.querySelector<HTMLButtonElement>('.nav-toggle');
  const navToggleIcon = document.querySelector<HTMLElement>('.nav-toggle-icon');

  if (!nav || !navToggleBtn) {
    return;
  }

  const isOpen = () => navToggleBtn.getAttribute('aria-expanded') === 'true';

  const closeNav = () => {
    navToggleBtn.setAttribute('aria-expanded', 'false');
    navToggleBtn.setAttribute('aria-label', 'Open Menu');
    navToggleIcon?.classList.remove('is-active');
    nav.classList.remove('is-visible');
  };

  const openNav = () => {
    navToggleBtn.setAttribute('aria-expanded', 'true');
    navToggleBtn.setAttribute('aria-label', 'Close Menu');
    navToggleIcon?.classList.add('is-active');
    nav.classList.add('is-visible');
  };

  navToggleBtn.addEventListener('click', () => {
    if (isOpen()) {
      closeNav();
    } else {
      openNav();
    }
  });

  nav.addEventListener('keydown', (event) => {
    if (!isOpen()) {
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      closeNav();
      navToggleBtn.focus();
      return;
    }

    trapTabKey(nav, event);
  });
}
