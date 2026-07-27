// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../src/scripts/charts/chart-setup', () => ({
  Chart: class {
    static getChart = vi.fn(() => undefined);
    destroy = vi.fn();
    constructor(
      public canvas: unknown,
      public config: unknown
    ) {}
  }
}));

import {
  summarizeCsoStatus,
  renderCsoEventRows,
  buildCsoActivityConfig,
  updateCsoDisplay,
  mountStormOverflowPanel,
  registerStormOverflowPanels,
  type CsoEvent,
  type CsoData
} from '../../../src/scripts/charts/storm-overflow';

describe('storm-overflow.ts', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  describe('summarizeCsoStatus', () => {
    it('reports "Clear" when there are no active events', () => {
      const events: CsoEvent[] = [{ site: 'A', start: '2026-01-01', status: 'ended' }];
      expect(summarizeCsoStatus(events)).toEqual({ activeCount: 0, status: 'Clear', statusColor: 'success' });
    });

    it('reports "Clear" with count 0 when events is undefined', () => {
      expect(summarizeCsoStatus(undefined)).toEqual({ activeCount: 0, status: 'Clear', statusColor: 'success' });
    });

    it('reports "Active" (warning) for 1-2 active events', () => {
      const events: CsoEvent[] = [
        { site: 'A', start: '2026-01-01', status: 'active' },
        { site: 'B', start: '2026-01-01', status: 'active' }
      ];
      expect(summarizeCsoStatus(events)).toEqual({ activeCount: 2, status: 'Active', statusColor: 'warning' });
    });

    it('reports "Multiple Active" (error) for more than 2 active events', () => {
      const events: CsoEvent[] = [
        { site: 'A', start: '2026-01-01', status: 'active' },
        { site: 'B', start: '2026-01-01', status: 'active' },
        { site: 'C', start: '2026-01-01', status: 'active' }
      ];
      expect(summarizeCsoStatus(events)).toEqual({ activeCount: 3, status: 'Multiple Active', statusColor: 'error' });
    });
  });

  describe('renderCsoEventRows', () => {
    it('renders the empty-state row when there are no events', () => {
      expect(renderCsoEventRows(undefined, 10, 'max-w-[150px]')).toContain('No recent events');
      expect(renderCsoEventRows([], 10, 'max-w-[150px]')).toContain('No recent events');
    });

    it('renders a row per event, respecting the limit', () => {
      const events: CsoEvent[] = Array.from({ length: 3 }, (_, i) => ({
        site: `Site ${i}`,
        start: '2026-07-05T12:00:00Z',
        status: 'ended',
        durationMin: 90
      }));
      const html = renderCsoEventRows(events, 2, 'max-w-[150px]');
      expect((html.match(/<tr>/g) || []).length).toBe(2);
      expect(html).toContain('Site 0');
      expect(html).toContain('Site 1');
      expect(html).not.toContain('Site 2');
      expect(html).toContain('1h 30m');
    });

    it('shows "Ongoing" duration for active events without a durationMin', () => {
      const events: CsoEvent[] = [{ site: 'Live Site', start: '2026-07-05T12:00:00Z', status: 'active' }];
      const html = renderCsoEventRows(events, 10, 'max-w-[150px]');
      expect(html).toContain('Ongoing');
      expect(html).toContain('badge-error');
    });

    it('shows an em-dash duration for ended events without a durationMin', () => {
      const events: CsoEvent[] = [{ site: 'Ended Site', start: '2026-07-05T12:00:00Z', status: 'ended' }];
      const html = renderCsoEventRows(events, 10, 'max-w-[150px]');
      expect(html).toContain('—');
      expect(html).toContain('badge-ghost');
    });

    it('includes distance when provided and escapes site names', () => {
      const events: CsoEvent[] = [{ site: '<b>Bad</b>', start: '2026-07-05T12:00:00Z', status: 'ended', distanceKm: 2.5 }];
      const html = renderCsoEventRows(events, 10, 'max-w-[150px]');
      expect(html).toContain('(2.5km)');
      expect(html).not.toContain('<b>Bad</b>');
      expect(html).toContain('&lt;b&gt;Bad&lt;/b&gt;');
    });
  });

  describe('buildCsoActivityConfig', () => {
    it('returns null when activeSeries is absent', () => {
      expect(buildCsoActivityConfig({})).toBeNull();
    });

    it('builds a stepped line chart config from the active series', () => {
      const data: CsoData = {
        activeSeries: [
          { t: '2026-07-05T00:00:00Z', count: 0 },
          { t: '2026-07-05T01:00:00Z', count: 2 }
        ]
      };
      const config = buildCsoActivityConfig(data);
      expect(config?.type).toBe('line');
      expect(config?.data.labels).toHaveLength(2);
      expect(config?.data.datasets[0].data).toEqual([0, 2]);
      expect((config?.data.datasets[0] as unknown as { stepped: string }).stepped).toBe('before');
    });

    it('formats the tooltip label singular/plural', () => {
      const data: CsoData = { activeSeries: [{ t: '2026-07-05T00:00:00Z', count: 1 }] };
      const config = buildCsoActivityConfig(data);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const label = (config?.options?.plugins as any).tooltip.callbacks.label;
      expect(label({ parsed: { y: 1 } })).toBe('1 active overflow');
      expect(label({ parsed: { y: 3 } })).toBe('3 active overflows');
    });
  });

  describe('updateCsoDisplay', () => {
    it('updates the value, timestamp, badge and events table for the given chartId', () => {
      document.body.innerHTML = `
        <span id="cso-value"></span>
        <span id="cso-time"></span>
        <span id="cso-badge"></span>
        <table><tbody id="cso-events"></tbody></table>
      `;
      const data: CsoData = { events: [{ site: 'A', start: '2026-07-05T12:00:00Z', status: 'active' }] };
      updateCsoDisplay(data, 'cso', 10, 'max-w-[150px]');

      expect(document.getElementById('cso-value')?.textContent).toBe('1');
      expect(document.getElementById('cso-badge')?.textContent).toBe('Active');
      expect(document.getElementById('cso-badge')?.className).toBe('badge badge-lg badge-warning');
      expect(document.getElementById('cso-events')?.innerHTML).toContain('badge-error');
      expect(document.getElementById('cso-time')?.textContent).toMatch(/^As of/);
    });

    it('does nothing to missing elements', () => {
      document.body.innerHTML = '';
      expect(() => updateCsoDisplay({ events: [] }, 'missing', 10, 'max-w-[150px]')).not.toThrow();
    });
  });

  describe('mountStormOverflowPanel', () => {
    it('does nothing when chartId is not configured', async () => {
      const root = document.createElement('div');
      mountStormOverflowPanel(root);
      // allow any microtasks to flush
      await Promise.resolve();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('fetches the configured endpoint and shows the error banner on failure', async () => {
      document.body.innerHTML = '<div id="cso-error" class="hidden"></div>';
      const root = document.createElement('div');
      root.dataset.chartId = 'cso';
      root.dataset.endpoint = '/api/cso-live.json';

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, json: vi.fn() });

      mountStormOverflowPanel(root);
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      expect(global.fetch).toHaveBeenCalledWith('/api/cso-live.json');
      expect(document.getElementById('cso-error')?.classList.contains('hidden')).toBe(false);
    });
  });

  describe('registerStormOverflowPanels', () => {
    it('registers page-load handling exactly once even if called repeatedly', () => {
      document.body.innerHTML = '<div data-storm-overflow data-chart-id=""></div>';
      expect(() => {
        registerStormOverflowPanels();
        registerStormOverflowPanels();
      }).not.toThrow();
    });
  });
});
