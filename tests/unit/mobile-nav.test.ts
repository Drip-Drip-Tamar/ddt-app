// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { mountMobileNav } from '../../src/scripts/mobile-nav';

function renderNav(): { toggle: HTMLButtonElement; panel: HTMLElement; first: HTMLElement; last: HTMLElement } {
  document.body.innerHTML = `
    <button class="nav-toggle" aria-label="Open Menu" aria-expanded="false" aria-controls="nav-panel">
      <span class="nav-toggle-icon"></span>
    </button>
    <div id="nav-panel" class="nav-panel">
      <ul>
        <li><a href="/one" id="first-link">One</a></li>
        <li><a href="/two">Two</a></li>
        <li><a href="/three" id="last-link">Three</a></li>
      </ul>
    </div>
  `;

  return {
    toggle: document.querySelector('.nav-toggle') as HTMLButtonElement,
    panel: document.getElementById('nav-panel') as HTMLElement,
    first: document.getElementById('first-link') as HTMLElement,
    last: document.getElementById('last-link') as HTMLElement
  };
}

function openNav(toggle: HTMLButtonElement): void {
  toggle.click();
}

function dispatchKeydown(target: HTMLElement, init: KeyboardEventInit): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(event);
  return event;
}

describe('mobile-nav.ts', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('opens the panel and sets aria-expanded on toggle click', () => {
    const { toggle, panel } = renderNav();
    mountMobileNav();

    openNav(toggle);

    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(panel.classList.contains('is-visible')).toBe(true);
  });

  it('Escape closes the open panel and returns focus to the toggle button', () => {
    const { toggle, panel } = renderNav();
    mountMobileNav();

    openNav(toggle);
    dispatchKeydown(panel, { key: 'Escape' });

    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(panel.classList.contains('is-visible')).toBe(false);
    expect(document.activeElement).toBe(toggle);
  });

  it('does nothing on Escape when the panel is closed', () => {
    const { toggle, panel } = renderNav();
    mountMobileNav();

    dispatchKeydown(panel, { key: 'Escape' });

    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).not.toBe(toggle);
  });

  it('Tab on the last focusable element wraps focus to the first', () => {
    const { toggle, panel, first, last } = renderNav();
    mountMobileNav();

    openNav(toggle);
    last.focus();

    const event = dispatchKeydown(panel, { key: 'Tab' });

    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(first);
  });

  it('Shift+Tab on the first focusable element wraps focus to the last', () => {
    const { toggle, panel, first, last } = renderNav();
    mountMobileNav();

    openNav(toggle);
    first.focus();

    const event = dispatchKeydown(panel, { key: 'Tab', shiftKey: true });

    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(last);
  });

  it('does not trap Tab when the panel is closed', () => {
    const { panel, first } = renderNav();
    mountMobileNav();

    first.focus();
    const event = dispatchKeydown(panel, { key: 'Tab' });

    expect(event.defaultPrevented).toBe(false);
  });
});
