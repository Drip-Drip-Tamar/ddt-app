import type { APIRoute } from 'astro';

// Data source endpoints
const SWW_ARCGIS_BASE = 'https://services-eu1.arcgis.com/XxS6FebPX29TRGDJ/arcgis/rest/services/EDM_Schema/FeatureServer';
const RIVERS_TRUST_EDM_2023 = 'https://services3.arcgis.com/Bb8lfThdhugyc4G3/arcgis/rest/services/edm_2023_tidy_final/FeatureServer';

// Base CSO locations from Rivers Trust EDM 2023 dataset
interface EDM2023Feature {
  attributes: {
    ObjectId: number;
    UID: string;
    waterCompanyName?: string;
    siteNameEA?: string;
    siteNameWASC?: string;
    permitReferenceEA?: string;
    assetType?: string;
    recievingWaterName?: string;
    countedSpills?: number;
    totalDurationAllSpillsHrs?: number;
    Latitude?: number;
    Longitude?: number;
    localAuthority?: string;
  };
  geometry?: {
    x: number;
    y: number;
  };
}

// Live storm overflow data from SWW
interface StormOverflowFeature {
  attributes: {
    OBJECTID: number;
    Site_Name?: string;
    Outfall_Name?: string;
    Watercourse?: string;
    Start_Time?: number;
    End_Time?: number | null;
    Duration_mins?: number;
    Status?: string;
    Last_Update?: number;
    Active?: boolean;
    IsActive?: boolean;
  };
  geometry?: {
    x: number;
    y: number;
  };
}

interface ArcGISResponse<T> {
  features: T[];
  fields?: Array<{
    name: string;
    type: string;
    alias: string;
  }>;
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Query base CSO locations from Rivers Trust EDM 2023 dataset
async function queryBaseCSOs(
  lat: number, 
  lon: number, 
  radiusKm: number
): Promise<EDM2023Feature[]> {
  try {
    const params = new URLSearchParams({
      f: 'json',
      geometry: `${lon},${lat}`,
      geometryType: 'esriGeometryPoint',
      inSR: '4326',
      distance: (radiusKm * 1000).toString(),
      units: 'esriSRUnit_Meter',
      outFields: '*',
      returnGeometry: 'true',
      outSR: '4326'
    });
    
    const url = `${RIVERS_TRUST_EDM_2023}/0/query`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString()
    });
    
    if (!response.ok) {
      throw new Error(`Rivers Trust query failed: ${response.status}`);
    }
    
    const data = await response.json() as ArcGISResponse<EDM2023Feature>;
    return data.features || [];
    
  } catch (error) {
    console.error('Error querying base CSOs:', error);
    return [];
  }
}

// Query live storm overflow events from SWW
async function queryLiveOverflows(
  lat: number, 
  lon: number, 
  radiusKm: number,
  daysAgo: number
): Promise<StormOverflowFeature[]> {
  try {
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - daysAgo);
    const epochMs = sinceDate.getTime();
    
    // Try spatial query first
    const params = new URLSearchParams({
      f: 'json',
      where: `Start_Time >= ${epochMs} OR Last_Update >= ${epochMs} OR Status = 'Active'`,
      geometry: `${lon},${lat}`,
      geometryType: 'esriGeometryPoint',
      inSR: '4326',
      distance: (radiusKm * 1000).toString(),
      units: 'esriSRUnit_Meter',
      outFields: '*',
      returnGeometry: 'true',
      outSR: '4326'
    });
    
    const url = `${SWW_ARCGIS_BASE}/0/query`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString()
    });
    
    if (!response.ok) {
      console.log('SWW live endpoint returned status:', response.status);
      return [];
    }
    
    const data = await response.json() as ArcGISResponse<StormOverflowFeature>;
    return data.features || [];
    
  } catch (error) {
    console.error('Error querying live overflows:', error);
    return [];
  }
}

// Normalize site names for comparison
function normalizeSiteName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[_\-\.]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/pumping station/i, 'ps')
    .replace(/combined sewer overflow/i, 'cso')
    .replace(/storm overflow/i, 'so')
    .trim();
}

// Merge base CSO data with live overflow events
function mergeCSOwithLiveData(
  baseCSOs: EDM2023Feature[],
  liveOverflows: StormOverflowFeature[],
  daysAgo: number
) {
  const now = Date.now();
  const cutoffTime = now - (daysAgo * 24 * 60 * 60 * 1000);
  
  return baseCSOs.map(baseCso => {
    const baseLat = baseCso.attributes.Latitude || baseCso.geometry?.y || 0;
    const baseLon = baseCso.attributes.Longitude || baseCso.geometry?.x || 0;
    const baseName = baseCso.attributes.siteNameWASC || baseCso.attributes.siteNameEA || '';
    const normalizedBaseName = normalizeSiteName(baseName);
    
    // Find matching live event (within 100m or by name)
    const matchingLive = liveOverflows.find(live => {
      // Check by distance (within 100m)
      if (live.geometry) {
        const distance = calculateDistance(baseLat, baseLon, live.geometry.y, live.geometry.x);
        if (distance < 0.1) return true; // 100m = 0.1km
      }
      
      // Check by name similarity
      if (live.attributes.Site_Name) {
        const normalizedLiveName = normalizeSiteName(live.attributes.Site_Name);
        if (normalizedLiveName.includes(normalizedBaseName) || 
            normalizedBaseName.includes(normalizedLiveName)) {
          return true;
        }
      }
      
      return false;
    });
    
    // Determine status based on live data or defaults
    let status: 'active' | 'recent' | 'inactive' = 'inactive';
    let startedAt: string | null = null;
    let endedAt: string | null = null;
    let duration: number | null = null;
    
    if (matchingLive) {
      const isActive = matchingLive.attributes.Active || 
                      matchingLive.attributes.IsActive || 
                      matchingLive.attributes.Status === 'Active' ||
                      (matchingLive.attributes.Start_Time && !matchingLive.attributes.End_Time);
      
      if (isActive) {
        status = 'active';
      } else if (matchingLive.attributes.End_Time && matchingLive.attributes.End_Time >= cutoffTime) {
        status = 'recent';
      } else if (matchingLive.attributes.Last_Update && matchingLive.attributes.Last_Update >= cutoffTime) {
        status = 'recent';
      }
      
      startedAt = matchingLive.attributes.Start_Time 
        ? new Date(matchingLive.attributes.Start_Time).toISOString() 
        : null;
      endedAt = matchingLive.attributes.End_Time 
        ? new Date(matchingLive.attributes.End_Time).toISOString() 
        : null;
      duration = matchingLive.attributes.Duration_mins || null;
    }
    
    return {
      id: `cso-${baseCso.attributes.UID || baseCso.attributes.ObjectId}`,
      name: baseName || `CSO ${baseCso.attributes.ObjectId}`,
      status: status,
      startedAt: startedAt,
      endedAt: endedAt,
      duration: duration,
      lat: Math.round(baseLat * 10000) / 10000,
      lon: Math.round(baseLon * 10000) / 10000,
      // Include 2023 statistics for context
      spillCount2023: baseCso.attributes.countedSpills || 0,
      totalDuration2023: baseCso.attributes.totalDurationAllSpillsHrs 
        ? Math.round(baseCso.attributes.totalDurationAllSpillsHrs * 10) / 10 
        : 0,
      waterCompany: baseCso.attributes.waterCompanyName || 'Unknown',
      receivingWater: baseCso.attributes.recievingWaterName || 'Unknown'
    };
  });
}

// Mock data for development/testing
function getMockFeatures(centerLat: number, centerLon: number, radiusKm: number) {
  const mockPoints = [
    // Calstock area
    { name: 'Calstock CSO', lat: 50.497, lon: -4.202, status: 'inactive', daysAgo: 7 },
    { name: 'Calstock Quay Overflow', lat: 50.495, lon: -4.205, status: 'recent', daysAgo: 3 },
    
    // Gunnislake area
    { name: 'Gunnislake Bridge CSO', lat: 50.530, lon: -4.220, status: 'recent', daysAgo: 2 },
    { name: 'Gunnislake New Road', lat: 50.532, lon: -4.215, status: 'inactive', daysAgo: 15 },
    
    // Tamar Valley
    { name: 'Morwellham Overflow', lat: 50.505, lon: -4.195, status: 'active', daysAgo: 0 },
    { name: 'Cotehele Quay CSO', lat: 50.495, lon: -4.225, status: 'inactive', daysAgo: 20 },
    
    // Bere Alston area
    { name: 'Bere Alston Station', lat: 50.485, lon: -4.200, status: 'recent', daysAgo: 4 },
    { name: 'Bere Ferrers CSO', lat: 50.470, lon: -4.185, status: 'inactive', daysAgo: 10 },
    
    // Plymouth direction
    { name: 'Weir Quay Overflow', lat: 50.455, lon: -4.195, status: 'recent', daysAgo: 1 },
    { name: 'Cargreen CSO', lat: 50.440, lon: -4.200, status: 'active', daysAgo: 0 }
  ];
  
  // Filter by distance
  const filtered = mockPoints.filter(point => {
    const distance = calculateDistance(centerLat, centerLon, point.lat, point.lon);
    return distance <= radiusKm;
  });
  
  // Generate mock data with proper timestamps
  const now = Date.now();
  return filtered.map((point, index) => {
    const startTime = now - (point.daysAgo * 24 * 60 * 60 * 1000) - (Math.random() * 4 * 60 * 60 * 1000);
    const duration = point.status === 'active' ? null : (2 + Math.random() * 6) * 60 * 60 * 1000; // 2-8 hours
    
    return {
      id: `mock-${index + 1}`,
      name: point.name,
      status: point.status as 'active' | 'recent' | 'inactive',
      lat: Math.round(point.lat * 10000) / 10000,
      lon: Math.round(point.lon * 10000) / 10000,
      startedAt: point.status === 'inactive' && point.daysAgo > 10 ? null : new Date(startTime).toISOString(),
      endedAt: point.status === 'active' ? null : new Date(startTime + (duration || 0)).toISOString(),
      updatedAt: new Date(now - (Math.random() * 60 * 60 * 1000)).toISOString() // Within last hour
    };
  });
}

export const GET: APIRoute = async ({ url }) => {
  try {
    // Parse query parameters with defaults
    const lat = parseFloat(url.searchParams.get('lat') || '50.497'); // Calstock default
    const lon = parseFloat(url.searchParams.get('lon') || '-4.202');
    const radiusKm = parseFloat(url.searchParams.get('radiusKm') || '10');
    const days = parseFloat(url.searchParams.get('days') || '5');
    const useMockData = url.searchParams.get('mock') === 'true';
    
    // Validate parameters
    if (isNaN(lat) || isNaN(lon) || isNaN(radiusKm) || isNaN(days)) {
      return new Response(JSON.stringify({
        ok: false,
        error: 'Invalid parameters. Expected: lat, lon, radiusKm, days as numbers'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    
    let features = [];
    let dataSource = 'unknown';
    
    if (useMockData) {
      // Use mock data if explicitly requested
      console.log('Using mock data as requested');
      features = getMockFeatures(lat, lon, radiusKm);
      dataSource = 'mock';
    } else {
      // Query base CSO locations from Rivers Trust EDM 2023
      const baseCSOs = await queryBaseCSOs(lat, lon, radiusKm);
      
      if (baseCSOs.length > 0) {
        // Query live overflow events from SWW
        const liveOverflows = await queryLiveOverflows(lat, lon, radiusKm, days);
        
        // Merge base data with live events
        features = mergeCSOwithLiveData(baseCSOs, liveOverflows, days);
        dataSource = liveOverflows.length > 0 ? 'combined' : 'base-only';
        
        console.log(`Found ${baseCSOs.length} base CSOs, ${liveOverflows.length} live events`);
      } else {
        // Fallback to mock data if no base data available
        console.log('No base CSO data available, using mock data');
        features = getMockFeatures(lat, lon, radiusKm);
        dataSource = 'mock';
      }
    }
    
    // Sort features by status priority and distance
    features.sort((a, b) => {
      // Sort by status priority: active > recent > inactive
      const statusOrder = { active: 0, recent: 1, inactive: 2 };
      const statusDiff = statusOrder[a.status] - statusOrder[b.status];
      if (statusDiff !== 0) return statusDiff;
      
      // Then by distance from center
      const distA = calculateDistance(lat, lon, a.lat, a.lon);
      const distB = calculateDistance(lat, lon, b.lat, b.lon);
      return distA - distB;
    });
    
    return new Response(JSON.stringify({
      ok: true,
      centre: { lat, lon },
      radiusKm,
      days,
      features: features,
      totalCount: features.length,
      activeCount: features.filter(f => f.status === 'active').length,
      recentCount: features.filter(f => f.status === 'recent').length,
      inactiveCount: features.filter(f => f.status === 'inactive').length,
      dataSource: dataSource,
      attribution: dataSource === 'mock' 
        ? 'Mock data for demonstration'
        : 'Rivers Trust EDM Annual Returns 2023 (CC BY 4.0) + South West Water live data',
      sources: [
        'https://www.theriverstrust.org/key-issues/sewage-in-rivers',
        'https://www.southwestwater.co.uk/environment/waterfit/waterfit-live/'
      ],
      refreshHintMinutes: 5,
      generatedAt: new Date().toISOString()
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 's-maxage=300, stale-while-revalidate=1800'
      }
    });
    
  } catch (error) {
    console.error('Error in CSO map API:', error);
    
    return new Response(JSON.stringify({
      ok: false,
      error: 'Failed to fetch storm overflow data',
      message: error instanceof Error ? error.message : 'Unknown error',
      centre: { lat: 50.497, lon: -4.202 },
      features: [],
      attribution: 'Rivers Trust + South West Water',
      sources: [
        'https://www.theriverstrust.org/key-issues/sewage-in-rivers',
        'https://www.southwestwater.co.uk/environment/waterfit/waterfit-live/'
      ]
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
  }
};