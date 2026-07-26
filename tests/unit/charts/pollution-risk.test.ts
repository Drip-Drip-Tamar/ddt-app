// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  buildSiteCardView,
  createSiteCard,
  loadPollutionRiskForecast,
  mountPollutionRiskForecast,
  registerPollutionRiskForecast,
  type PrfSite
} from '../../../src/scripts/charts/pollution-risk';

describe('pollution-risk.ts', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('buildSiteCardView', () => {
    it('shows "Low potential danger" (success) when in season and risk is normal', () => {
      const site: PrfSite = { label: 'Calstock', season: true, risk: 'normal' };
      const view = buildSiteCardView(site);
      expect(view.badgeClass).toBe('badge-success');
      expect(view.statusText).toBe('Low potential danger');
      expect(view.statusIcon).toBe('✓');
      expect(view.title).toContain('Normal risk indicates typical conditions.');
    });

    it('shows "High potential danger" (warning) when in season and risk is increased', () => {
      const site: PrfSite = { label: 'Calstock', season: true, risk: 'increased' };
      const view = buildSiteCardView(site);
      expect(view.badgeClass).toBe('badge-warning');
      expect(view.statusText).toBe('High potential danger');
      expect(view.statusIcon).toBe('⚠');
      expect(view.title).toContain('Increased risk may be due to recent rainfall or storm overflows.');
    });

    it('shows "Off-season" with no title when not in season', () => {
      const site: PrfSite = { label: 'Calstock', season: false };
      const view = buildSiteCardView(site);
      expect(view.statusText).toBe('Off-season');
      expect(view.statusIcon).toBe('—');
      expect(view.title).toBeNull();
    });

    it('defaults to "No Data" (neutral) when season is true but risk is missing/unrecognised', () => {
      const site: PrfSite = { label: 'Calstock', season: true };
      const view = buildSiteCardView(site);
      expect(view.badgeClass).toBe('badge-neutral');
      expect(view.statusText).toBe('No Data');
    });

    it('shows a "Valid until" expiry time when expiresAt is in the future', () => {
      const now = new Date('2026-07-05T10:00:00Z');
      const site: PrfSite = { label: 'Calstock', season: true, risk: 'normal', expiresAt: '2026-07-05T12:00:00Z' };
      const view = buildSiteCardView(site, now);
      expect(view.expiryText).toMatch(/^Valid until/);
    });

    it('shows "Forecast expired" and forces neutral badge when expiresAt is in the past', () => {
      const now = new Date('2026-07-05T14:00:00Z');
      const site: PrfSite = { label: 'Calstock', season: true, risk: 'increased', expiresAt: '2026-07-05T12:00:00Z' };
      const view = buildSiteCardView(site, now);
      expect(view.expiryText).toBe('Forecast expired');
      expect(view.badgeClass).toBe('badge-neutral');
    });

    it('has an empty expiryText when expiresAt is absent', () => {
      const site: PrfSite = { label: 'Calstock', season: true, risk: 'normal' };
      expect(buildSiteCardView(site).expiryText).toBe('');
    });
  });

  describe('createSiteCard', () => {
    it('renders a card element with escaped label and status badge', () => {
      const site: PrfSite = { label: '<b>Calstock</b>', season: true, risk: 'normal' };
      const card = createSiteCard(site, new Date('2026-07-05T10:00:00Z'));
      expect(card.innerHTML).toContain('&lt;b&gt;Calstock&lt;/b&gt;');
      expect(card.innerHTML).not.toContain('<b>Calstock</b>');
      expect(card.innerHTML).toContain('Low potential danger');
    });

    it('sets a title attribute only when the view has one', () => {
      const seasonSite: PrfSite = { label: 'Calstock', season: true, risk: 'normal' };
      const offSeasonSite: PrfSite = { label: 'Calstock', season: false };
      expect(createSiteCard(seasonSite).hasAttribute('title')).toBe(true);
      expect(createSiteCard(offSeasonSite).hasAttribute('title')).toBe(false);
    });

    it('omits the expiry paragraph when expiryText is empty', () => {
      const site: PrfSite = { label: 'Calstock', season: true, risk: 'normal' };
      const card = createSiteCard(site);
      expect(card.querySelector('p')).toBeNull();
    });
  });

  describe('loadPollutionRiskForecast', () => {
    it('does nothing when the badges container is missing', async () => {
      await expect(loadPollutionRiskForecast('missing', '/api/prf.json')).resolves.toBeUndefined();
    });

    it('renders a card per site on success', async () => {
      document.body.innerHTML = '<div id="prf-badges"></div><div id="prf-error" class="hidden"></div>';
      const sites: PrfSite[] = [
        { label: 'Calstock', season: true, risk: 'normal' },
        { label: 'Okel Tor', season: true, risk: 'increased' }
      ];
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, json: () => Promise.resolve({ sites }) });

      await loadPollutionRiskForecast('prf', '/api/prf.json');

      const badges = document.getElementById('prf-badges')!;
      expect(badges.children.length).toBe(2);
      expect(badges.textContent).toContain('Calstock');
      expect(badges.textContent).toContain('Okel Tor');
    });

    it('restores badges and clears stale alerts when a later load succeeds', async () => {
      document.body.innerHTML = `
        <div id="prf-badges" style="display:block"></div>
        <div id="prf-error" class="hidden"></div>
        <div id="prf-offseason" class="hidden"></div>
      `;
      const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
      fetchMock
        .mockResolvedValueOnce({ ok: false, json: vi.fn() })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ sites: [{ label: 'Calstock', season: false }] })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ sites: [{ label: 'Calstock', season: true, risk: 'normal' }] })
        });

      await loadPollutionRiskForecast('prf', '/api/prf.json');
      await loadPollutionRiskForecast('prf', '/api/prf.json');
      await loadPollutionRiskForecast('prf', '/api/prf.json');

      const badges = document.getElementById('prf-badges')!;
      expect(badges.style.display).not.toBe('none');
      expect(badges.textContent).toContain('Low potential danger');
      expect(document.getElementById('prf-error')?.classList.contains('hidden')).toBe(true);
      expect(document.getElementById('prf-offseason')?.classList.contains('hidden')).toBe(true);
    });

    it('shows the off-season alert and hides badges when every site is off-season', async () => {
      document.body.innerHTML = `
        <div id="prf-badges" style="display:block"></div>
        <div id="prf-offseason" class="hidden"></div>
      `;
      const sites: PrfSite[] = [{ label: 'Calstock', season: false }];
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, json: () => Promise.resolve({ sites }) });

      await loadPollutionRiskForecast('prf', '/api/prf.json');

      expect(document.getElementById('prf-badges')?.style.display).toBe('none');
      expect(document.getElementById('prf-offseason')?.classList.contains('hidden')).toBe(false);
    });

    it('shows the error alert and hides badges when the fetch fails', async () => {
      document.body.innerHTML = `
        <div id="prf-badges" style="display:block"></div>
        <div id="prf-error" class="hidden"></div>
      `;
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, json: vi.fn() });

      await loadPollutionRiskForecast('prf', '/api/prf.json');

      expect(document.getElementById('prf-badges')?.style.display).toBe('none');
      expect(document.getElementById('prf-error')?.classList.contains('hidden')).toBe(false);
    });

    it('shows the error alert when the response has no sites', async () => {
      document.body.innerHTML = `
        <div id="prf-badges" style="display:block"></div>
        <div id="prf-error" class="hidden"></div>
      `;
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, json: () => Promise.resolve({ sites: [] }) });

      await loadPollutionRiskForecast('prf', '/api/prf.json');

      expect(document.getElementById('prf-error')?.classList.contains('hidden')).toBe(false);
    });
  });

  describe('mountPollutionRiskForecast', () => {
    it('does nothing when containerId is not configured', async () => {
      const root = document.createElement('div');
      mountPollutionRiskForecast(root);
      await Promise.resolve();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('loads the forecast immediately and again on the refresh interval', async () => {
      vi.useFakeTimers();
      document.body.innerHTML = '<div id="prf-badges"></div>';
      const root = document.createElement('div');
      root.dataset.containerId = 'prf';
      root.dataset.endpoint = '/api/prf.json';

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, json: () => Promise.resolve({ sites: [] }) });

      mountPollutionRiskForecast(root);
      await vi.advanceTimersByTimeAsync(0);
      expect(global.fetch).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(15 * 60 * 1000);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('clears a previous refresh timer when mounted again', async () => {
      vi.useFakeTimers();
      document.body.innerHTML = '<div id="prf-badges"></div>';
      const root = document.createElement('div');
      root.dataset.containerId = 'prf';
      root.dataset.endpoint = '/api/prf.json';
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, json: () => Promise.resolve({ sites: [] }) });

      mountPollutionRiskForecast(root);
      await vi.advanceTimersByTimeAsync(0);
      mountPollutionRiskForecast(root);
      await vi.advanceTimersByTimeAsync(0);

      const callsAfterRemount = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.length;

      // Only one active interval should be running even though mounted twice.
      await vi.advanceTimersByTimeAsync(15 * 60 * 1000);
      expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBe(callsAfterRemount + 1);
    });
  });

  describe('registerPollutionRiskForecast', () => {
    it('is idempotent across repeated calls', () => {
      expect(() => {
        registerPollutionRiskForecast();
        registerPollutionRiskForecast();
      }).not.toThrow();
    });
  });
});
