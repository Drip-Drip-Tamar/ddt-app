import type { APIRoute } from 'astro';

const SWW_ARCGIS_BASE = 'https://services-eu1.arcgis.com/XxS6FebPX29TRGDJ/arcgis/rest/services/EDM_Schema/FeatureServer';

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

interface ArcGISResponse {
  features: StormOverflowFeature[];
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

async function queryStormOverflows(
  lat: number, 
  lon: number, 
  radiusKm: number,
  daysAgo: number
): Promise<StormOverflowFeature[]> {
  try {
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - daysAgo);
    const epochMs = sinceDate.getTime();
    
    // Build spatial query with geometry
    const params = new URLSearchParams({
      f: 'json',
      where: `Start_Time >= ${epochMs} OR Last_Update >= ${epochMs} OR (Status = 'Active' OR Active = 1 OR IsActive = 1)`,
      geometry: `${lon},${lat}`,
      geometryType: 'esriGeometryPoint',
      inSR: '4326',
      distance: (radiusKm * 1000).toString(),
      units: 'esriSRUnit_Meter',
      outFields: '*',
      returnGeometry: 'true',
      outSR: '4326',
      orderByFields: 'Start_Time DESC'
    });
    
    // Try layer 0 first (most common for EDM data)
    const url = `${SWW_ARCGIS_BASE}/0/query`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString()
    });
    
    if (!response.ok) {
      // Fallback: Try simpler query without spatial filter
      const fallbackParams = new URLSearchParams({
        f: 'json',
        where: '1=1',
        outFields: '*',
        returnGeometry: 'true',
        outSR: '4326',
        resultRecordCount: '200'
      });
      
      const fallbackResponse = await fetch(`${SWW_ARCGIS_BASE}/0/query?${fallbackParams}`);
      if (!fallbackResponse.ok) {
        throw new Error(`ArcGIS query failed: ${response.status}`);
      }
      
      const fallbackData = await fallbackResponse.json() as ArcGISResponse;
      
      // Filter by distance and time manually
      return fallbackData.features.filter(feature => {
        if (!feature.geometry) return false;
        
        const distance = calculateDistance(lat, lon, feature.geometry.y, feature.geometry.x);
        if (distance > radiusKm) return false;
        
        // Check if event is within time range
        const startTime = feature.attributes.Start_Time;
        const lastUpdate = feature.attributes.Last_Update;
        const isActive = feature.attributes.Active || 
                        feature.attributes.IsActive || 
                        feature.attributes.Status === 'Active';
        
        return isActive || 
               (startTime && startTime >= epochMs) || 
               (lastUpdate && lastUpdate >= epochMs);
      });
    }
    
    const data = await response.json() as ArcGISResponse;
    return data.features || [];
    
  } catch (error) {
    console.error('Error querying storm overflows:', error);
    return [];
  }
}

function determineStatus(feature: StormOverflowFeature, daysAgo: number): 'active' | 'recent' | 'inactive' {
  // Check if currently active
  const isActive = feature.attributes.Active || 
                   feature.attributes.IsActive || 
                   feature.attributes.Status === 'Active' ||
                   (feature.attributes.Start_Time && !feature.attributes.End_Time);
  
  if (isActive) {
    return 'active';
  }
  
  // Check if recently ended (within specified days)
  const now = Date.now();
  const cutoffTime = now - (daysAgo * 24 * 60 * 60 * 1000);
  
  if (feature.attributes.End_Time && feature.attributes.End_Time >= cutoffTime) {
    return 'recent';
  }
  
  if (feature.attributes.Last_Update && feature.attributes.Last_Update >= cutoffTime) {
    return 'recent';
  }
  
  return 'inactive';
}

function normalizeFeatures(
  features: StormOverflowFeature[], 
  centerLat: number, 
  centerLon: number,
  daysAgo: number
) {
  return features.map(feature => {
    const name = feature.attributes.Site_Name || 
                 feature.attributes.Outfall_Name || 
                 feature.attributes.Watercourse ||
                 `CSO ${feature.attributes.OBJECTID}`;
    
    const lat = feature.geometry?.y || centerLat;
    const lon = feature.geometry?.x || centerLon;
    const status = determineStatus(feature, daysAgo);
    
    return {
      id: `cso-${feature.attributes.OBJECTID}`,
      name: name,
      status: status,
      startedAt: feature.attributes.Start_Time 
        ? new Date(feature.attributes.Start_Time).toISOString() 
        : null,
      endedAt: feature.attributes.End_Time 
        ? new Date(feature.attributes.End_Time).toISOString() 
        : null,
      updatedAt: feature.attributes.Last_Update 
        ? new Date(feature.attributes.Last_Update).toISOString() 
        : new Date().toISOString(),
      lat: Math.round(lat * 10000) / 10000,
      lon: Math.round(lon * 10000) / 10000
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
    
    // Query storm overflow data
    const features = await queryStormOverflows(lat, lon, radiusKm, days);
    
    // Normalize and sort features
    const normalizedFeatures = normalizeFeatures(features, lat, lon, days)
      .sort((a, b) => {
        // Sort by status priority: active > recent > inactive
        const statusOrder = { active: 0, recent: 1, inactive: 2 };
        return statusOrder[a.status] - statusOrder[b.status];
      });
    
    return new Response(JSON.stringify({
      ok: true,
      centre: { lat, lon },
      radiusKm,
      days,
      features: normalizedFeatures,
      totalCount: normalizedFeatures.length,
      activeCount: normalizedFeatures.filter(f => f.status === 'active').length,
      recentCount: normalizedFeatures.filter(f => f.status === 'recent').length,
      attribution: 'South West Water – Storm Overflow Activity (Stream), CC BY 4.0',
      source: 'https://www.southwestwater.co.uk/environment/waterfit/waterfit-live/',
      refreshHintMinutes: 10,
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
      attribution: 'South West Water – Storm Overflow Activity (Stream), CC BY 4.0',
      source: 'https://www.southwestwater.co.uk/environment/waterfit/waterfit-live/'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
  }
};