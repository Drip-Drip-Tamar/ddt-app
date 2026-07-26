// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { FakeChart, constructChart } = vi.hoisted(() => {
  const destroyMock = vi.fn();
  const getChartMock = vi.fn(() => undefined as { destroy: () => void } | undefined);
  const constructChart = vi.fn();
  class FakeChart {
    static getChart = getChartMock;
    destroy = destroyMock;
    constructor(
      public canvas: unknown,
      public config: unknown
    ) {
      constructChart(canvas, config);
    }
  }
  return { destroyMock, getChartMock, constructChart, FakeChart };
});

vi.mock('../../../src/scripts/charts/chart-setup', () => ({
  Chart: FakeChart
}));

import {
  SHIFT_OFFSET,
  waterQualityColors,
  normalizeSiteName,
  applyDatasetStyles,
  computeDataMaxY,
  formatYAxisTick,
  finalizeChartConfig,
  mountWaterQualityChart,
  initTableToggle,
  registerWaterQualityCharts,
  type WaterChartData,
  type WaterDataset,
  type WaterChartOptions
} from '../../../src/scripts/charts/water-quality';
import type { ScriptableContext } from 'chart.js';

describe('water-quality.ts', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  it('SHIFT_OFFSET is 100', () => {
    expect(SHIFT_OFFSET).toBe(100);
  });

  describe('normalizeSiteName', () => {
    it('strips zero-width and non-breaking space characters and trims', () => {
      expect(normalizeSiteName('Calstock​')).toBe('Calstock');
      expect(normalizeSiteName(' Okel Tor ')).toBe('Okel Tor');
    });

    it('leaves an already-clean name unchanged', () => {
      expect(normalizeSiteName('Calstock')).toBe('Calstock');
    });
  });

  describe('waterQualityColors', () => {
    it('groups colours by bacteria type with Calstock/Okel Tor variants', () => {
      expect(waterQualityColors.ecoli.Calstock).toBe('rgb(37, 99, 235)');
      expect(waterQualityColors.enterococci['Okel Tor']).toBe('rgb(167, 139, 250)');
    });
  });

  function makeDataset(label: string, rawValues: (number | null)[]): WaterDataset {
    return {
      label,
      data: rawValues.map((v) => (v === null ? null : Math.log10(v + SHIFT_OFFSET))),
      rawValues
    };
  }

  describe('applyDatasetStyles', () => {
    it('applies E. coli Calstock colours based on the label', () => {
      const chartData: WaterChartData = {
        labels: ['1 Jan'],
        datasets: [makeDataset('Calstock - E. coli', [500])]
      };
      applyDatasetStyles(chartData);
      expect(chartData.datasets[0].borderColor).toBe(waterQualityColors.ecoli.Calstock);
      expect(chartData.datasets[0].backgroundColor).toBe(waterQualityColors.ecoli['Calstock-bg']);
    });

    it('applies Enterococci Okel Tor colours based on the label', () => {
      const chartData: WaterChartData = {
        labels: ['1 Jan'],
        datasets: [makeDataset('Okel Tor - Enterococci', [50])]
      };
      applyDatasetStyles(chartData);
      expect(chartData.datasets[0].borderColor).toBe(waterQualityColors.enterococci['Okel Tor']);
    });

    it('normalizes an invisible-character site name before colour lookup', () => {
      const chartData: WaterChartData = {
        labels: ['1 Jan'],
        datasets: [makeDataset('Calstock​ - E. coli', [500])]
      };
      applyDatasetStyles(chartData);
      expect(chartData.datasets[0].borderColor).toBe(waterQualityColors.ecoli.Calstock);
    });

    it('sizes points larger for E. coli spikes above 1000 cfu', () => {
      const chartData: WaterChartData = {
        labels: ['1 Jan', '2 Jan'],
        datasets: [makeDataset('Calstock - E. coli', [1500, 200])]
      };
      applyDatasetStyles(chartData);
      const pointRadius = chartData.datasets[0].pointRadius as (ctx: ScriptableContext<'line'>) => number;
      expect(pointRadius({ dataset: chartData.datasets[0], dataIndex: 0 } as unknown as ScriptableContext<'line'>)).toBe(6);
      expect(pointRadius({ dataset: chartData.datasets[0], dataIndex: 1 } as unknown as ScriptableContext<'line'>)).toBe(3);
    });

    it('sizes points larger for Enterococci spikes above 400 cfu', () => {
      const chartData: WaterChartData = {
        labels: ['1 Jan', '2 Jan'],
        datasets: [makeDataset('Calstock - Enterococci', [500, 100])]
      };
      applyDatasetStyles(chartData);
      const pointRadius = chartData.datasets[0].pointRadius as (ctx: ScriptableContext<'line'>) => number;
      expect(pointRadius({ dataset: chartData.datasets[0], dataIndex: 0 } as unknown as ScriptableContext<'line'>)).toBe(6);
      expect(pointRadius({ dataset: chartData.datasets[0], dataIndex: 1 } as unknown as ScriptableContext<'line'>)).toBe(3);
    });

    it('returns 0/transparent point styling for missing raw values (null gaps)', () => {
      const chartData: WaterChartData = {
        labels: ['1 Jan'],
        datasets: [makeDataset('Calstock - E. coli', [null])]
      };
      applyDatasetStyles(chartData);
      const ds = chartData.datasets[0];
      const ctx = { dataset: ds, dataIndex: 0 } as unknown as ScriptableContext<'line'>;
      expect((ds.pointRadius as (c: typeof ctx) => number)(ctx)).toBe(0);
      expect((ds.pointHoverRadius as (c: typeof ctx) => number)(ctx)).toBe(0);
      expect((ds.pointBackgroundColor as (c: typeof ctx) => string)(ctx)).toBe('transparent');
      expect((ds.pointBorderColor as (c: typeof ctx) => string)(ctx)).toBe('transparent');
      expect((ds.pointBorderWidth as (c: typeof ctx) => number)(ctx)).toBe(0);
    });

    it('falls back to red/blue defaults for an unrecognised site', () => {
      const chartData: WaterChartData = {
        labels: ['1 Jan'],
        datasets: [makeDataset('Unknown Site - E. coli', [2000])]
      };
      applyDatasetStyles(chartData);
      const ds = chartData.datasets[0];
      const ctx = { dataset: ds, dataIndex: 0 } as unknown as ScriptableContext<'line'>;
      expect((ds.pointBackgroundColor as (c: typeof ctx) => string)(ctx)).toBe('rgb(239, 68, 68)');
    });
  });

  describe('computeDataMaxY', () => {
    it('returns the minimum floor of 2 when all values are below it', () => {
      const chartData: WaterChartData = {
        labels: [],
        datasets: [{ label: 'A', data: [1, 1.5] }]
      };
      expect(computeDataMaxY(chartData)).toBe(2);
    });

    it('returns the maximum transformed value across datasets, ignoring null', () => {
      const chartData: WaterChartData = {
        labels: [],
        datasets: [
          { label: 'A', data: [1, 3.5, null] },
          { label: 'B', data: [2, 4.2] }
        ]
      };
      expect(computeDataMaxY(chartData)).toBe(4.2);
    });
  });

  describe('formatYAxisTick', () => {
    it('inverts the shifted log transform back to cfu', () => {
      const transformed = Math.log10(500 + SHIFT_OFFSET);
      expect(formatYAxisTick(transformed)).toBe('500 cfu');
    });

    it('formats values >= 1000 in K cfu', () => {
      const transformed = Math.log10(5000 + SHIFT_OFFSET);
      expect(formatYAxisTick(transformed)).toBe('5K cfu');
    });

    it('formats values >= 10000 in K cfu', () => {
      const transformed = Math.log10(25000 + SHIFT_OFFSET);
      expect(formatYAxisTick(transformed)).toBe('25K cfu');
    });

    it('returns an empty string for out-of-range values (negative or > 100000)', () => {
      expect(formatYAxisTick(-5)).toBe('');
      expect(formatYAxisTick(Math.log10(200000 + SHIFT_OFFSET))).toBe('');
    });

    it('returns an empty string for values under 1 cfu', () => {
      expect(formatYAxisTick(Math.log10(0.5 + SHIFT_OFFSET) - 2)).toBe('');
    });
  });

  describe('finalizeChartConfig', () => {
    it('sets the y-axis max from computeDataMaxY plus a 0.3 buffer', () => {
      const chartData: WaterChartData = { labels: [], datasets: [{ label: 'A', data: [1, 3] }] };
      const chartConfig: WaterChartOptions = {};
      const result = finalizeChartConfig(chartConfig, chartData);
      expect(result.scales?.y?.max).toBeCloseTo(3.3);
    });

    it('attaches a tooltip label callback that reads the raw value', () => {
      const chartData: WaterChartData = {
        labels: ['1 Jan'],
        datasets: [{ label: 'Calstock - E. coli', data: [2.7], rawValues: [500] }]
      };
      const result = finalizeChartConfig({}, chartData);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const label = (result.plugins as any).tooltip.callbacks.label;
      expect(label({ dataset: chartData.datasets[0], dataIndex: 0 })).toBe('Calstock - E. coli: 500 cfu/100ml');
    });

    it('reports "No data" in the tooltip when the raw value is null', () => {
      const chartData: WaterChartData = {
        labels: ['1 Jan'],
        datasets: [{ label: 'Calstock - E. coli', data: [null], rawValues: [null] }]
      };
      const result = finalizeChartConfig({}, chartData);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const label = (result.plugins as any).tooltip.callbacks.label;
      expect(label({ dataset: chartData.datasets[0], dataIndex: 0 })).toBe('Calstock - E. coli: No data');
    });

    it('attaches a y-axis tick callback delegating to formatYAxisTick', () => {
      const chartData: WaterChartData = { labels: [], datasets: [{ label: 'A', data: [1] }] };
      const result = finalizeChartConfig({}, chartData);
      const transformed = Math.log10(500 + SHIFT_OFFSET);
      expect(result.scales?.y?.ticks?.callback?.(transformed)).toBe('500 cfu');
    });

    it('preserves existing scales/plugins config while adding to it', () => {
      const chartData: WaterChartData = { labels: [], datasets: [{ label: 'A', data: [1] }] };
      const chartConfig: WaterChartOptions = { scales: { x: { display: true } } };
      const result = finalizeChartConfig(chartConfig, chartData);
      expect(result.scales?.x).toEqual({ display: true });
    });
  });

  describe('mountWaterQualityChart', () => {
    it('does nothing when the payload script or canvas is missing', () => {
      const root = document.createElement('div');
      expect(() => mountWaterQualityChart(root)).not.toThrow();
    });

    it('parses the payload and renders the chart once visible', () => {
      const root = document.createElement('div');
      const script = document.createElement('script');
      script.setAttribute('type', 'application/json');
      script.setAttribute('data-water-chart-payload', '');
      script.textContent = JSON.stringify({
        chartData: { labels: ['1 Jan'], datasets: [{ label: 'Calstock - E. coli', data: [2.7], rawValues: [500] }] },
        chartConfig: {},
        chartType: 'line'
      });
      const canvas = document.createElement('canvas');
      canvas.className = 'water-chart';
      root.appendChild(script);
      root.appendChild(canvas);
      document.body.appendChild(root);

      const observe = vi.fn();
      // @ts-expect-error minimal IntersectionObserver stub for jsdom
      global.IntersectionObserver = vi.fn(function (cb: IntersectionObserverCallback) {
        return {
          observe: (el: Element) => {
            observe(el);
            cb([{ isIntersecting: true, target: el } as unknown as IntersectionObserverEntry], {} as unknown as IntersectionObserver);
          },
          disconnect: vi.fn(),
          unobserve: vi.fn()
        };
      });

      mountWaterQualityChart(root);

      expect(observe).toHaveBeenCalledWith(canvas);
    });

    it('reveals its error alert without throwing on invalid JSON payload', () => {
      const root = document.createElement('div');
      const script = document.createElement('script');
      script.setAttribute('type', 'application/json');
      script.setAttribute('data-water-chart-payload', '');
      script.textContent = '{not valid json';
      const canvas = document.createElement('canvas');
      canvas.className = 'water-chart';
      const errorAlert = document.createElement('div');
      errorAlert.className = 'hidden';
      errorAlert.setAttribute('data-water-chart-error', '');
      root.appendChild(script);
      root.appendChild(canvas);
      root.appendChild(errorAlert);

      expect(() => mountWaterQualityChart(root)).not.toThrow();
      expect(errorAlert.classList.contains('hidden')).toBe(false);
    });

    it('reveals only its own error alert when chart rendering fails', () => {
      document.body.innerHTML = `
        <div id="other-chart">
          <div class="hidden" data-water-chart-error></div>
        </div>
      `;
      const root = document.createElement('div');
      root.innerHTML = `
        <script type="application/json" data-water-chart-payload>
          {"chartData":{"labels":[],"datasets":[]},"chartConfig":{},"chartType":"line"}
        </script>
        <canvas class="water-chart"></canvas>
        <div class="hidden" data-water-chart-error></div>
      `;
      document.body.appendChild(root);
      const errorAlert = root.querySelector<HTMLElement>('[data-water-chart-error]')!;
      const otherErrorAlert = document.querySelector<HTMLElement>('#other-chart [data-water-chart-error]')!;
      constructChart.mockImplementationOnce(() => {
        throw new Error('render failed');
      });
      // @ts-expect-error minimal IntersectionObserver stub for jsdom
      global.IntersectionObserver = vi.fn(function (cb: IntersectionObserverCallback) {
        return {
          observe: (el: Element) => {
            cb([{ isIntersecting: true, target: el } as unknown as IntersectionObserverEntry], {} as IntersectionObserver);
          },
          disconnect: vi.fn(),
          unobserve: vi.fn()
        };
      });

      mountWaterQualityChart(root);

      expect(errorAlert.classList.contains('hidden')).toBe(false);
      expect(otherErrorAlert.classList.contains('hidden')).toBe(true);
    });
  });

  describe('initTableToggle', () => {
    it('does nothing when there is no toggle button', () => {
      const root = document.createElement('div');
      expect(() => initTableToggle(root)).not.toThrow();
    });

    it('toggles aria-expanded, text and max-height on click', () => {
      document.body.innerHTML = `
        <div id="root">
          <button class="table-toggle" aria-controls="table-container" aria-expanded="false">
            <span class="toggle-text">View data table</span>
            <span class="chevron-icon"></span>
          </button>
        </div>
        <div id="table-container"></div>
      `;
      const root = document.getElementById('root')!;
      initTableToggle(root);

      const btn = root.querySelector('.table-toggle') as HTMLButtonElement;
      btn.click();
      expect(btn.getAttribute('aria-expanded')).toBe('true');
      expect(btn.querySelector('.toggle-text')?.textContent).toBe('Hide data table');

      btn.click();
      expect(btn.getAttribute('aria-expanded')).toBe('false');
      expect(btn.querySelector('.toggle-text')?.textContent).toBe('View data table');
    });

    it('does not bind a second click listener when called twice', () => {
      document.body.innerHTML = `
        <div id="root">
          <button class="table-toggle" aria-controls="table-container" aria-expanded="false">
            <span class="toggle-text">View data table</span>
          </button>
        </div>
        <div id="table-container"></div>
      `;
      const root = document.getElementById('root')!;
      initTableToggle(root);
      initTableToggle(root);

      const btn = root.querySelector('.table-toggle') as HTMLButtonElement;
      btn.click();
      expect(btn.getAttribute('aria-expanded')).toBe('true');
      btn.click();
      expect(btn.getAttribute('aria-expanded')).toBe('false');
    });
  });

  describe('registerWaterQualityCharts', () => {
    it('is idempotent across repeated calls', () => {
      expect(() => {
        registerWaterQualityCharts();
        registerWaterQualityCharts();
      }).not.toThrow();
    });
  });
});
