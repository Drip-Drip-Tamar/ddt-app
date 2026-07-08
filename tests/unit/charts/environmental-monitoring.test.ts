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
  summarizeRainfallStatus,
  buildRiverLevelConfig,
  buildTidalLevelConfig,
  buildRainfallConfig,
  mountEnvironmentalMonitoring,
  registerEnvironmentalMonitoring,
  type RiverData,
  type RainfallData
} from '../../../src/scripts/charts/environmental-monitoring';

describe('environmental-monitoring.ts', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  describe('summarizeRainfallStatus', () => {
    it('classifies > 25mm as Heavy/warning', () => {
      expect(summarizeRainfallStatus(30)).toEqual({ status: 'Heavy', statusColor: 'warning' });
    });

    it('classifies > 10mm as Moderate/info', () => {
      expect(summarizeRainfallStatus(15)).toEqual({ status: 'Moderate', statusColor: 'info' });
    });

    it('classifies < 1mm as Dry/secondary', () => {
      expect(summarizeRainfallStatus(0.5)).toEqual({ status: 'Dry', statusColor: 'secondary' });
    });

    it('classifies the remaining range as Light/success', () => {
      expect(summarizeRainfallStatus(5)).toEqual({ status: 'Light', statusColor: 'success' });
    });

    it('treats the boundary values correctly (10mm is Light, not Moderate)', () => {
      expect(summarizeRainfallStatus(10)).toEqual({ status: 'Light', statusColor: 'success' });
    });
  });

  describe('buildRiverLevelConfig', () => {
    it('returns null when gunnislake data is absent', () => {
      expect(buildRiverLevelConfig({})).toBeNull();
    });

    it('builds a line chart with typical-range annotations from the low/high thresholds', () => {
      const riverData: RiverData = {
        gunnislake: {
          latest: 0.5,
          labels: ['00:00', '01:00'],
          values: [0.4, 0.5],
          typicalRange: { low: 0.2, high: 0.8 }
        }
      };
      const config = buildRiverLevelConfig(riverData);
      expect(config?.type).toBe('line');
      expect(config?.data.datasets[0].data).toEqual([0.4, 0.5]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const annotations = (config?.options?.plugins as any).annotation.annotations;
      expect(annotations.typicalRange.yMin).toBe(0.2);
      expect(annotations.typicalRange.yMax).toBe(0.8);
    });

    it('defaults typical range to 0/0 when not provided', () => {
      const riverData: RiverData = { gunnislake: { latest: 0.5, labels: [], values: [] } };
      const config = buildRiverLevelConfig(riverData);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const annotations = (config?.options?.plugins as any).annotation.annotations;
      expect(annotations.typicalRange.yMin).toBe(0);
      expect(annotations.typicalRange.yMax).toBe(0);
    });
  });

  describe('buildTidalLevelConfig', () => {
    it('returns null when plymouth data is absent', () => {
      expect(buildTidalLevelConfig({})).toBeNull();
    });

    it('builds a line chart with a mean-sea-level reference line at y=0', () => {
      const riverData: RiverData = {
        plymouth: { latest: 1.2, labels: ['00:00'], values: [1.2] }
      };
      const config = buildTidalLevelConfig(riverData);
      expect(config?.type).toBe('line');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const annotations = (config?.options?.plugins as any).annotation.annotations;
      expect(annotations.meanSeaLevel.yMin).toBe(0);
      expect(annotations.meanSeaLevel.label.content).toBe('Mean Sea Level');
    });
  });

  describe('buildRainfallConfig', () => {
    it('returns null when hourly data is absent', () => {
      expect(buildRainfallConfig({})).toBeNull();
    });

    it('builds a dual-axis bar+line combo chart', () => {
      const rainfallData: RainfallData = {
        hourly: [
          { t: '2026-07-05T00:00:00Z', mm: 1.5 },
          { t: '2026-07-05T01:00:00Z', mm: 0 }
        ],
        rolling24h: [{ t: '2026-07-05T01:00:00Z', mm: 12.3 }]
      };
      const config = buildRainfallConfig(rainfallData);
      expect(config?.type).toBe('bar');
      expect(config?.data.datasets).toHaveLength(2);
      expect(config?.data.datasets[0].data).toEqual([1.5, 0]);
      expect(config?.data.datasets[1].data).toEqual([12.3]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const scales = config?.options?.scales as any;
      expect(scales.y1.position).toBe('right');
      expect(scales.y1.grid.drawOnChartArea).toBe(false);
    });

    it('defaults rolling24h to an empty series when absent', () => {
      const rainfallData: RainfallData = { hourly: [{ t: '2026-07-05T00:00:00Z', mm: 2 }] };
      const config = buildRainfallConfig(rainfallData);
      expect(config?.data.datasets[1].data).toEqual([]);
    });

    it('picks the correct tooltip label for bar vs line datasets', () => {
      const rainfallData: RainfallData = {
        hourly: [{ t: '2026-07-05T00:00:00Z', mm: 2.34 }],
        rolling24h: [{ t: '2026-07-05T00:00:00Z', mm: 9.87 }]
      };
      const config = buildRainfallConfig(rainfallData);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const label = (config?.options?.plugins as any).tooltip.callbacks.label;
      expect(label({ dataset: { type: 'bar' }, parsed: { y: 2.34 } })).toBe('Hourly: 2.3 mm');
      expect(label({ dataset: { type: 'line' }, parsed: { y: 9.87 } })).toBe('24h Total: 9.9 mm');
    });
  });

  describe('mountEnvironmentalMonitoring', () => {
    it('does nothing when gunnislakeChartId is not configured', async () => {
      const root = document.createElement('div');
      mountEnvironmentalMonitoring(root);
      await Promise.resolve();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('fetches all three endpoints and updates the DOM on success', async () => {
      document.body.innerHTML = `
        <span id="gunnislake-value"></span>
        <span id="gunnislake-badge"></span>
        <span id="plymouth-value"></span>
        <span id="rainfall-value"></span>
        <span id="rainfall-stations"></span>
        <span id="cso-value"></span>
        <span id="cso-badge"></span>
        <table><tbody id="cso-events"></tbody></table>
        <canvas id="gunnislake"></canvas>
      `;
      const root = document.createElement('div');
      root.dataset.gunnislakeChartId = 'gunnislake';
      root.dataset.plymouthChartId = 'plymouth';
      root.dataset.rainfallChartId = 'rainfall';
      root.dataset.csoChartId = 'cso';

      const riverData: RiverData = {
        gunnislake: { latest: 0.512, lastUpdated: '2026-07-05T12:00:00Z', status: 'Normal', statusColor: 'success', labels: [], values: [] },
        plymouth: { latest: 1.2, lastUpdated: '2026-07-05T12:00:00Z', status: 'Normal', statusColor: 'success', labels: [], values: [] }
      };
      const rainfallData: RainfallData = {
        hourly: [],
        rolling24h: [{ t: '2026-07-05T12:00:00Z', mm: 3.2 }],
        stations: [{ name: 'Gunnislake', distanceKm: 1.1 }]
      };
      const csoData = { events: [] };

      (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
        if (url.includes('tamar-level')) return Promise.resolve({ ok: true, json: () => Promise.resolve(riverData) });
        if (url.includes('rainfall')) return Promise.resolve({ ok: true, json: () => Promise.resolve(rainfallData) });
        return Promise.resolve({ ok: true, json: () => Promise.resolve(csoData) });
      });

      mountEnvironmentalMonitoring(root);
      await new Promise((resolve) => setTimeout(resolve, 0));
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(document.getElementById('gunnislake-value')?.textContent).toBe('0.512');
      expect(document.getElementById('plymouth-value')?.textContent).toBe('1.20');
      expect(document.getElementById('rainfall-value')?.textContent).toBe('3.2');
      expect(document.getElementById('rainfall-stations')?.textContent).toContain('Gunnislake (1.1km)');
    });
  });

  describe('registerEnvironmentalMonitoring', () => {
    it('is idempotent across repeated calls', () => {
      expect(() => {
        registerEnvironmentalMonitoring();
        registerEnvironmentalMonitoring();
      }).not.toThrow();
    });
  });
});
