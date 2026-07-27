import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getMonitoringConfig,
  getPrimaryLocation,
  getRiverStations,
  getBathingWaters,
  calculateDistance,
  clearConfigCache
} from '../../src/data/locationConfig';
import { fetchData, type SiteConfigData } from '../../src/data/siteConfig';

vi.mock('../../src/data/siteConfig', () => ({
  fetchData: vi.fn()
}));

describe('Location configuration', () => {
  beforeEach(() => {
    clearConfigCache();
    vi.clearAllMocks();
  });

  it('returns Sanity monitoring configuration and caches it', async () => {
    const monitoringConfiguration = {
      primaryLocation: {
        name: 'Test Location',
        center: { lat: 50.1, lng: -4.1 },
        defaultRadius: 12,
        description: 'Test description'
      },
      riverStations: {
        freshwaterStationId: 'fresh-1',
        tidalStationId: 'tidal-1'
      },
      bathingWaters: [
        { id: 'test-1', label: 'Test Water' }
      ]
    };

    vi.mocked(fetchData).mockResolvedValueOnce({ monitoringConfiguration } as SiteConfigData);

    const first = await getMonitoringConfig();
    const second = await getMonitoringConfig();

    expect(first).toEqual(monitoringConfiguration);
    expect(second).toEqual(monitoringConfiguration);
    expect(fetchData).toHaveBeenCalledTimes(1);
  });

  it('normalizes a partial Sanity configuration while preserving valid values', async () => {
    const monitoringConfiguration = {
      primaryLocation: {
        name: 'Lower Tamar',
        center: { lat: 50.42, lng: 200 },
        defaultRadius: -5
      },
      riverStations: {
        freshwaterStationId: '',
        tidalStationId: 'custom-tidal'
      },
      bathingWaters: [
        { id: 'custom-water', label: 'Custom Water' }
      ]
    };

    vi.mocked(fetchData).mockResolvedValueOnce({ monitoringConfiguration } as SiteConfigData);

    const config = await getMonitoringConfig();

    expect(config).toEqual({
      primaryLocation: {
        name: 'Lower Tamar',
        center: {
          lat: 50.42,
          lng: -4.202
        },
        defaultRadius: 10,
        description: 'Default monitoring location'
      },
      riverStations: {
        freshwaterStationId: '47117',
        tidalStationId: 'custom-tidal'
      },
      bathingWaters: [
        { id: 'custom-water', label: 'Custom Water' }
      ]
    });
  });

  it('falls back to defaults when monitoring config is missing', async () => {
    vi.mocked(fetchData).mockResolvedValueOnce({} as SiteConfigData);

    const config = await getMonitoringConfig();

    expect(config.primaryLocation).toBeDefined();
    expect(config.primaryLocation.name).toBe('Calstock');
    expect(config.bathingWaters.length).toBeGreaterThan(0);
  });

  it('falls back to defaults when Sanity fetch fails', async () => {
    vi.mocked(fetchData).mockRejectedValueOnce(new Error('Sanity down'));

    const config = await getMonitoringConfig();

    expect(config.primaryLocation.name).toBe('Calstock');
    expect(config.riverStations).toBeDefined();
  });

  it('provides helper accessors for primary location and stations', async () => {
    const monitoringConfiguration = {
      primaryLocation: {
        name: 'Test Location',
        center: { lat: 50.1, lng: -4.1 },
        defaultRadius: 12,
        description: 'Test description'
      },
      riverStations: {
        freshwaterStationId: 'fresh-1',
        tidalStationId: 'tidal-1'
      },
      bathingWaters: []
    };

    vi.mocked(fetchData).mockResolvedValueOnce({ monitoringConfiguration } as SiteConfigData);

    const primary = await getPrimaryLocation();
    const stations = await getRiverStations();
    const waters = await getBathingWaters();

    expect(primary.name).toBe('Test Location');
    expect(stations.freshwaterStationId).toBe('fresh-1');
    expect(waters).toEqual([]);
  });

  it('calculates zero distance for identical coordinates', () => {
    const distance = calculateDistance(50.1, -4.1, 50.1, -4.1);
    expect(distance).toBe(0);
  });
});
