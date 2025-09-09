import { fetchData as fetchSiteConfig } from './siteConfig';

// Cache the monitoring configuration to avoid repeated Sanity queries
let configCache = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Default fallback configuration if Sanity is unavailable
const DEFAULT_CONFIG = {
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
 * @returns {Promise<Object>} The monitoring configuration
 */
export async function getMonitoringConfig() {
  const now = Date.now();
  
  // Return cached config if still valid
  if (configCache && (now - cacheTimestamp) < CACHE_TTL) {
    return configCache;
  }

  try {
    const siteConfig = await fetchSiteConfig();
    
    if (siteConfig?.monitoringConfiguration) {
      configCache = siteConfig.monitoringConfiguration;
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
 * @returns {Promise<Object>} Primary location with lat, lng, radius
 */
export async function getPrimaryLocation() {
  const config = await getMonitoringConfig();
  return config.primaryLocation;
}

/**
 * Get river monitoring station IDs
 * @returns {Promise<Object>} Object with freshwaterStationId and tidalStationId
 */
export async function getRiverStations() {
  const config = await getMonitoringConfig();
  return config.riverStations;
}

/**
 * Get bathing water monitoring points
 * @returns {Promise<Array>} Array of bathing water locations
 */
export async function getBathingWaters() {
  const config = await getMonitoringConfig();
  return config.bathingWaters || [];
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - First latitude
 * @param {number} lon1 - First longitude
 * @param {number} lat2 - Second latitude
 * @param {number} lon2 - Second longitude
 * @returns {number} Distance in kilometers
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
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
 * Clear the configuration cache (useful for testing or forced refresh)
 */
export function clearConfigCache() {
  configCache = null;
  cacheTimestamp = 0;
}