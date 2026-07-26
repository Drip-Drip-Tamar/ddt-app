// Client-side logic for the mobile nav panel (src/components/Header.astro).
// Extracted so the open/close/focus behaviour is unit-testable outside
// the DOM bundle. mountMobileNav() is idempotent and safe to call on every
// astro:after-swap (initial load and, if view transitions are enabled,
// subsequent client-side navigations).

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
    nav.querySelector<HTMLElement>('a[href]')?.focus();
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

  });

  document.addEventListener('click', (event) => {
    if (
      !isOpen() ||
      !(event.target instanceof Node) ||
      nav.contains(event.target) ||
      navToggleBtn.contains(event.target)
    ) {
      return;
    }

    closeNav();
  });
}
