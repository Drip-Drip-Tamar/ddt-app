// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { destroyMock, getChartMock, FakeChart } = vi.hoisted(() => {
  const destroyMock = vi.fn();
  const getChartMock = vi.fn(() => undefined as { destroy: () => void } | undefined);
  class FakeChart {
    static getChart = getChartMock;
    destroy = destroyMock;
    constructor(
      public canvas: unknown,
      public config: unknown
    ) {}
  }
  return { destroyMock, getChartMock, FakeChart };
});

vi.mock('../../../src/scripts/charts/chart-setup', () => ({
  Chart: FakeChart
}));

import { fetchJson, showError, renderChart, whenVisible, readPanelConfig, onPageLoad, mountPanel } from '../../../src/scripts/charts/mount-panel';

describe('mount-panel.ts', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  describe('fetchJson', () => {
    it('resolves with parsed JSON on an ok response', async () => {
      const json = vi.fn().mockResolvedValue({ hello: 'world' });
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, json });

      const result = await fetchJson('/api/thing.json');
      expect(result).toEqual({ hello: 'world' });
      expect(global.fetch).toHaveBeenCalledWith('/api/thing.json');
    });

    it('throws when the response is not ok', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, json: vi.fn() });

      await expect(fetchJson('/api/missing.json')).rejects.toThrow('Failed to fetch /api/missing.json');
    });
  });

  describe('showError', () => {
    it('removes the "hidden" class from the target element', () => {
      document.body.innerHTML = '<div id="err" class="hidden"></div>';
      showError('err');
      expect(document.getElementById('err')?.classList.contains('hidden')).toBe(false);
    });

    it('is a no-op when the element does not exist', () => {
      expect(() => showError('missing-id')).not.toThrow();
    });
  });

  describe('renderChart', () => {
    it('destroys an existing chart on the canvas before creating a new one', () => {
      const canvas = document.createElement('canvas');
      const existing = { destroy: vi.fn() };
      getChartMock.mockReturnValueOnce(existing as unknown as { destroy: () => void });

      const config = { type: 'line', data: {}, options: {} } as never;
      const chart = renderChart(canvas, config);

      expect(getChartMock).toHaveBeenCalledWith(canvas);
      expect(existing.destroy).toHaveBeenCalled();
      expect(chart).toBeInstanceOf(FakeChart);
    });

    it('creates a chart without destroying anything when none exists', () => {
      const canvas = document.createElement('canvas');
      getChartMock.mockReturnValueOnce(undefined);

      const config = { type: 'bar', data: {}, options: {} } as never;
      renderChart(canvas, config);

      expect(destroyMock).not.toHaveBeenCalled();
    });
  });

  describe('whenVisible', () => {
    it('invokes the callback and disconnects the observer once the element intersects', () => {
      const disconnect = vi.fn();
      const observe = vi.fn();
      let capturedCallback: IntersectionObserverCallback = () => {};

      // @ts-expect-error minimal IntersectionObserver stub for jsdom
      global.IntersectionObserver = vi.fn(function (cb: IntersectionObserverCallback) {
        capturedCallback = cb;
        return { observe, disconnect, unobserve: vi.fn() };
      });

      const element = document.createElement('div');
      const callback = vi.fn();
      whenVisible(element, callback);

      expect(observe).toHaveBeenCalledWith(element);

      capturedCallback([{ isIntersecting: false, target: element } as unknown as IntersectionObserverEntry], {} as unknown as IntersectionObserver);
      expect(callback).not.toHaveBeenCalled();

      capturedCallback([{ isIntersecting: true, target: element } as unknown as IntersectionObserverEntry], {} as unknown as IntersectionObserver);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(disconnect).toHaveBeenCalledTimes(1);
    });
  });

  describe('readPanelConfig', () => {
    it('falls back to the defaults when data-attributes are absent', () => {
      const element = document.createElement('div');
      const config = readPanelConfig(element, { chartId: '', endpoint: '/api/default.json' });
      expect(config).toEqual({ chartId: '', endpoint: '/api/default.json' });
    });

    it('overrides defaults with matching data-attributes', () => {
      const element = document.createElement('div');
      element.dataset.chartId = 'my-chart';
      element.dataset.endpoint = '/api/custom.json';
      const config = readPanelConfig(element, { chartId: '', endpoint: '/api/default.json' });
      expect(config).toEqual({ chartId: 'my-chart', endpoint: '/api/custom.json' });
    });
  });

  describe('onPageLoad', () => {
    it('runs the mount function immediately and registers it for astro:page-load', () => {
      const mount = vi.fn();
      onPageLoad(mount);
      expect(mount).toHaveBeenCalledTimes(1);

      document.dispatchEvent(new Event('astro:page-load'));
      expect(mount).toHaveBeenCalledTimes(2);
    });
  });

  describe('mountPanel', () => {
    it('shows the error banner and hides the fallback element when the fetch fails', async () => {
      document.body.innerHTML = '<div id="panel-error" class="hidden"></div><div id="panel-current"></div>';
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, json: vi.fn() });

      await mountPanel({
        endpoint: '/api/fails.json',
        errorId: 'panel-error',
        hideOnErrorId: 'panel-current'
      });

      expect(document.getElementById('panel-error')?.classList.contains('hidden')).toBe(false);
      expect(document.getElementById('panel-current')?.classList.contains('hidden')).toBe(true);
    });

    it('calls onData and skips chart rendering when no charts are configured', async () => {
      const json = vi.fn().mockResolvedValue({ value: 1 });
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, json });
      const onData = vi.fn();

      await mountPanel({
        endpoint: '/api/ok.json',
        errorId: 'panel-error',
        onData
      });

      expect(onData).toHaveBeenCalledWith({ value: 1 });
    });

    it('renders charts once the observed element becomes visible', async () => {
      document.body.innerHTML = '<canvas id="chart-1"></canvas>';
      const json = vi.fn().mockResolvedValue({ value: 1 });
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, json });

      const observe = vi.fn();
      let capturedCallback: IntersectionObserverCallback = () => {};
      // @ts-expect-error minimal IntersectionObserver stub for jsdom
      global.IntersectionObserver = vi.fn(function (cb: IntersectionObserverCallback) {
        capturedCallback = cb;
        return { observe, disconnect: vi.fn(), unobserve: vi.fn() };
      });

      const buildConfig = vi.fn().mockReturnValue({ type: 'line', data: {}, options: {} });

      await mountPanel({
        endpoint: '/api/ok.json',
        errorId: 'panel-error',
        charts: [{ canvasId: 'chart-1', buildConfig }]
      });

      const canvas = document.getElementById('chart-1');
      capturedCallback([{ isIntersecting: true, target: canvas } as unknown as IntersectionObserverEntry], {} as unknown as IntersectionObserver);

      expect(buildConfig).toHaveBeenCalledWith({ value: 1 });
    });

    it('shows the error banner when chart rendering throws', async () => {
      document.body.innerHTML = '<canvas id="chart-1"></canvas><div id="panel-error" class="hidden"></div>';
      const json = vi.fn().mockResolvedValue({ value: 1 });
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, json });

      let capturedCallback: IntersectionObserverCallback = () => {};
      // @ts-expect-error minimal IntersectionObserver stub for jsdom
      global.IntersectionObserver = vi.fn(function (cb: IntersectionObserverCallback) {
        capturedCallback = cb;
        return { observe: vi.fn(), disconnect: vi.fn(), unobserve: vi.fn() };
      });

      const buildConfig = vi.fn(() => {
        throw new Error('boom');
      });

      await mountPanel({
        endpoint: '/api/ok.json',
        errorId: 'panel-error',
        charts: [{ canvasId: 'chart-1', buildConfig }]
      });

      const canvas = document.getElementById('chart-1');
      capturedCallback([{ isIntersecting: true, target: canvas } as unknown as IntersectionObserverEntry], {} as unknown as IntersectionObserver);

      expect(document.getElementById('panel-error')?.classList.contains('hidden')).toBe(false);
    });
  });
});
