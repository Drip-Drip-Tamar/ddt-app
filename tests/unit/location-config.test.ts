import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getMonitoringConfig,
  getPrimaryLocation,
  getRiverStations,
  getBathingWaters,
  calculateDistance,
  clearConfigCache
} from '../../src/data/locationConfig';
import { fetchData } from '../../src/data/siteConfig';

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

    vi.mocked(fetchData).mockResolvedValueOnce({ monitoringConfiguration } as any);

    const first = await getMonitoringConfig();
    const second = await getMonitoringConfig();

    expect(first).toEqual(monitoringConfiguration);
    expect(second).toEqual(monitoringConfiguration);
    expect(fetchData).toHaveBeenCalledTimes(1);
  });

  it('falls back to defaults when monitoring config is missing', async () => {
    vi.mocked(fetchData).mockResolvedValueOnce({} as any);

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

    vi.mocked(fetchData).mockResolvedValueOnce({ monitoringConfiguration } as any);

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
