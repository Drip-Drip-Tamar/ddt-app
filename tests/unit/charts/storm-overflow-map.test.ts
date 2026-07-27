// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mapInstance, LMock } = vi.hoisted(() => {
  const mapInstance = {
    remove: vi.fn(),
    on: vi.fn()
  };
  const tileLayerAddTo = vi.fn();
  const controlAddTo = vi.fn();
  const circleAddTo = vi.fn();
  const markerBindPopup = vi.fn();
  const markerAddTo = vi.fn(() => ({ bindPopup: markerBindPopup }));

  const LMock = {
    map: vi.fn(() => mapInstance),
    tileLayer: vi.fn(() => ({ addTo: tileLayerAddTo })),
    control: { attribution: vi.fn(() => ({ addTo: controlAddTo })) },
    circle: vi.fn(() => ({ addTo: circleAddTo })),
    divIcon: vi.fn(() => ({})),
    marker: vi.fn(() => ({ addTo: markerAddTo }))
  };
  return { mapInstance, LMock };
});

vi.mock('../../../src/scripts/charts/leaflet-setup', () => ({
  default: LMock
}));

import {
  markerStyleFor,
  statusBadgeFor,
  buildPopupContent,
  initializeStormOverflowMap,
  mountStormOverflowMap,
  registerStormOverflowMaps,
  type CsoFeature,
  type CsoMapData
} from '../../../src/scripts/charts/storm-overflow-map';

describe('storm-overflow-map.ts', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  describe('markerStyleFor', () => {
    it('returns red/high-zindex for active status', () => {
      expect(markerStyleFor('active')).toEqual({ color: '#EF4444', zIndex: 300 });
    });

    it('returns amber/mid-zindex for recent status', () => {
      expect(markerStyleFor('recent')).toEqual({ color: '#F59E0B', zIndex: 200 });
    });

    it('returns grey/low-zindex for any other status (including undefined)', () => {
      expect(markerStyleFor('inactive')).toEqual({ color: '#6B7280', zIndex: 100 });
      expect(markerStyleFor(undefined)).toEqual({ color: '#6B7280', zIndex: 100 });
    });
  });

  describe('statusBadgeFor', () => {
    it('shows active count when there are active overflows', () => {
      expect(statusBadgeFor({ activeCount: 2, recentCount: 0 })).toEqual({
        text: '2 Active',
        className: 'badge badge-lg badge-error'
      });
    });

    it('shows recent count when there are no active but some recent', () => {
      expect(statusBadgeFor({ activeCount: 0, recentCount: 3 })).toEqual({
        text: '3 Recent',
        className: 'badge badge-lg badge-warning'
      });
    });

    it('shows "No Live Data" when data source is base-only', () => {
      expect(statusBadgeFor({ activeCount: 0, recentCount: 0, dataSource: 'base-only' })).toEqual({
        text: 'No Live Data',
        className: 'badge badge-lg badge-info'
      });
    });

    it('shows "All Clear" otherwise', () => {
      expect(statusBadgeFor({})).toEqual({ text: 'All Clear', className: 'badge badge-lg badge-success' });
    });
  });

  describe('buildPopupContent', () => {
    it('includes name, active status and start time', () => {
      const feature: CsoFeature = { name: 'Calstock CSO', lat: 0, lon: 0, status: 'active', startedAt: '2026-07-05T12:00:00Z' };
      const html = buildPopupContent(feature);
      expect(html).toContain('Calstock CSO');
      expect(html).toContain('Active');
      expect(html).toContain('Started:');
      expect(html).toContain('Duration: Ongoing');
    });

    it('shows ended time when endedAt is present', () => {
      const feature: CsoFeature = {
        name: 'Site',
        lat: 0,
        lon: 0,
        status: 'recent',
        startedAt: '2026-07-05T10:00:00Z',
        endedAt: '2026-07-05T12:00:00Z'
      };
      const html = buildPopupContent(feature);
      expect(html).toContain('Ended:');
      expect(html).toContain('Recent');
    });

    it('shows inactive status with no timing when neither start nor end given', () => {
      const feature: CsoFeature = { name: 'Site', lat: 0, lon: 0, status: 'inactive' };
      const html = buildPopupContent(feature);
      expect(html).toContain('Inactive');
      expect(html).not.toContain('Started');
      expect(html).not.toContain('Duration');
    });

    it('includes 2023 stats, receiving water and operator when present, escaping names', () => {
      const feature: CsoFeature = {
        name: 'Site',
        lat: 0,
        lon: 0,
        spillCount2023: 12,
        totalDuration2023: 34,
        receivingWater: '<script>River</script>',
        waterCompany: 'South West Water'
      };
      const html = buildPopupContent(feature);
      expect(html).toContain('Spills: 12 events');
      expect(html).toContain('Total duration: 34 hrs');
      expect(html).not.toContain('<script>River</script>');
      expect(html).toContain('&lt;script&gt;River&lt;/script&gt;');
      expect(html).toContain('South West Water');
    });
  });

  describe('initializeStormOverflowMap', () => {
    function buildMapElement(overrides: Partial<Record<string, string>> = {}): HTMLElement {
      const el = document.createElement('div');
      el.id = 'cso-map';
      el.dataset.lat = '50.5';
      el.dataset.lon = '-4.2';
      el.dataset.radius = '5';
      el.dataset.days = '5';
      el.dataset.api = '/api/cso.json';
      el.dataset.name = 'Calstock';
      Object.entries(overrides).forEach(([key, value]) => {
        if (value === undefined) delete (el.dataset as Record<string, string | undefined>)[key];
        else el.dataset[key] = value;
      });
      return el;
    }

    it('builds the map, adds markers for each feature and updates the status badge', async () => {
      document.body.innerHTML = '<span id="cso-map-status"></span>';
      const mapEl = buildMapElement();
      document.body.appendChild(mapEl);

      const data: CsoMapData = {
        activeCount: 1,
        recentCount: 0,
        features: [{ name: 'A', lat: 50.1, lon: -4.1, status: 'active' }]
      };
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, json: () => Promise.resolve(data) });

      await initializeStormOverflowMap(mapEl);

      expect(LMock.map).toHaveBeenCalled();
      expect(LMock.marker).toHaveBeenCalled();
      expect(document.getElementById('cso-map-status')?.textContent).toBe('1 Active');
    });

    it('shows the notice element when dataSource is base-only', async () => {
      document.body.innerHTML = '<span id="cso-map-status"></span><div id="cso-map-notice" class="hidden"></div>';
      const mapEl = buildMapElement();
      document.body.appendChild(mapEl);

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ dataSource: 'base-only', features: [] })
      });

      await initializeStormOverflowMap(mapEl);

      expect(document.getElementById('cso-map-notice')?.classList.contains('hidden')).toBe(false);
    });

    it('shows the error banner when the fetch fails', async () => {
      document.body.innerHTML = '<div id="cso-map-error" class="hidden"></div>';
      const mapEl = buildMapElement();
      document.body.appendChild(mapEl);

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, json: vi.fn() });

      await initializeStormOverflowMap(mapEl);

      expect(document.getElementById('cso-map-error')?.classList.contains('hidden')).toBe(false);
    });

    it('removes any previously registered map instance for the same element before re-initializing', async () => {
      document.body.innerHTML = '<span id="cso-map-status"></span>';
      const mapEl = buildMapElement();
      document.body.appendChild(mapEl);

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, json: () => Promise.resolve({ features: [] }) });

      await initializeStormOverflowMap(mapEl);
      await initializeStormOverflowMap(mapEl);

      expect(mapInstance.remove).toHaveBeenCalledTimes(1);
    });
  });

  describe('mountStormOverflowMap / registerStormOverflowMaps', () => {
    it('initializes the map once it becomes visible', () => {
      const observe = vi.fn();
      let capturedCallback: IntersectionObserverCallback = () => {};
      // @ts-expect-error minimal IntersectionObserver stub for jsdom
      global.IntersectionObserver = vi.fn(function (cb: IntersectionObserverCallback) {
        capturedCallback = cb;
        return { observe, disconnect: vi.fn(), unobserve: vi.fn() };
      });

      const mapEl = document.createElement('div');
      mapEl.id = 'cso-map';
      mapEl.dataset.lat = '50.5';
      mapEl.dataset.lon = '-4.2';
      mapEl.dataset.radius = '5';
      mapEl.dataset.days = '5';
      document.body.appendChild(mapEl);

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, json: () => Promise.resolve({ features: [] }) });

      mountStormOverflowMap(mapEl);
      expect(observe).toHaveBeenCalledWith(mapEl);

      capturedCallback([{ isIntersecting: true, target: mapEl } as unknown as IntersectionObserverEntry], {} as unknown as IntersectionObserver);
      expect(LMock.map).toHaveBeenCalled();
    });

    it('registerStormOverflowMaps is idempotent across repeated calls', () => {
      expect(() => {
        registerStormOverflowMaps();
        registerStormOverflowMaps();
      }).not.toThrow();
    });
  });
});
