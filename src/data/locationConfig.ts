import { fetchData as fetchSiteConfig } from './siteConfig';

// Hand-written rather than generated: the Sanity-generated
// `monitoringConfiguration` shape (from sanity.types.ts) has every field
// optional/nullable, since none of it is required in the CMS. This module's
// whole job is to guarantee callers a fully-populated config (via
// DEFAULT_CONFIG), so its public types describe that post-fallback shape.
export interface MonitoringLocation {
  name: string;
  center: {
    lat: number;
    lng: number;
  };
  defaultRadius: number;
  description?: string;
}

export interface RiverStations {
  freshwaterStationId: string;
  tidalStationId: string;
}

export interface BathingWater {
  id: string;
  label: string;
}

export interface MonitoringConfig {
  primaryLocation: MonitoringLocation;
  riverStations: RiverStations;
  bathingWaters: BathingWater[];
}

// Cache the monitoring configuration to avoid repeated Sanity queries
let configCache: MonitoringConfig | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Default fallback configuration if Sanity is unavailable
const DEFAULT_CONFIG: MonitoringConfig = {
  primaryLocation: {
    name: 'Calstock',
    center: {
      lat: 50.497,
      lng: -4.202
    },
    defaultRadius: 10,
    description: 'Default monitoring location'
  },
  riverStations: {
    freshwaterStationId: '47117',
    tidalStationId: 'E72139'
  },
  bathingWaters: [
    { id: 'ukk4100-26400', label: 'Plymouth Hoe East' },
    { id: 'ukk4100-26500', label: 'Plymouth Hoe West' }
  ]
};

/**
 * Fetch monitoring configuration from Sanity with caching
 */
export async function getMonitoringConfig(): Promise<MonitoringConfig> {
  const now = Date.now();

  // Return cached config if still valid
  if (configCache && (now - cacheTimestamp) < CACHE_TTL) {
    return configCache;
  }

  try {
    const siteConfig = await fetchSiteConfig();

    if (siteConfig?.monitoringConfiguration) {
      // Cast: see the module-level comment above on why this module's
      // public types describe the post-fallback shape rather than the
      // fully-optional generated query type.
      configCache = siteConfig.monitoringConfiguration as MonitoringConfig;
      cacheTimestamp = now;
      return configCache;
    }

    // If no config in Sanity, return defaults
    console.warn('No monitoring configuration found in Sanity, using defaults');
    return DEFAULT_CONFIG;
  } catch (error) {
    console.error('Error fetching monitoring configuration:', error);
    // Return defaults if Sanity is unavailable
    return DEFAULT_CONFIG;
  }
}

/**
 * Get the primary monitoring location
 */
export async function getPrimaryLocation(): Promise<MonitoringLocation> {
  const config = await getMonitoringConfig();
  return config.primaryLocation;
}

/**
 * Get river monitoring station IDs
 */
export async function getRiverStations(): Promise<RiverStations> {
  const config = await getMonitoringConfig();
  return config.riverStations;
}

/**
 * Get bathing water monitoring points
 */
export async function getBathingWaters(): Promise<BathingWater[]> {
  const config = await getMonitoringConfig();
  return config.bathingWaters || [];
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @returns Distance in kilometers
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Clear the configuration cache. Kept (not confirmed-dead): used by
 * tests/unit/location-config.test.ts to bust the in-memory cache between
 * cases so each test observes a fresh fetch.
 */
export function clearConfigCache(): void {
  configCache = null;
  cacheTimestamp = 0;
}
