import type { APIRoute } from 'astro';
import { getPrimaryLocation, calculateDistance } from '../../data/locationConfig.js';

// Using the same reliable data source as cso-live.json
const SWW_ARCGIS_BASE = 'https://services-eu1.arcgis.com/OMdMOtfhATJPcHe3/arcgis/rest/services/NEH_outlets_PROD/FeatureServer';

interface StormOverflowFeature {
  attributes: {
    ObjectId: number;
    ID?: string; // Site ID like 'SWW0906'
    receivingWaterCourse?: string; // e.g., 'RIVER TAMAR'
    latestEventStart?: number; // Epoch milliseconds
    latestEventEnd?: number | null; // Epoch milliseconds
    statusStart?: number; // When current status began
    status?: number; // -1=Offline, 0=Stop, 1=Start
    lastUpdated?: number;
    latitude?: number;
    longitude?: number;
    company?: string;
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

// calculateDistance is now imported from locationConfig.js

async function queryStormOverflows(lat: number, lon: number, radiusKm: number, daysAgo: number): Promise<StormOverflowFeature[]> {
  try {
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - daysAgo);
    const epochMs = sinceDate.getTime();
    
    // Use simplified query - get all records and filter manually for better compatibility
    const params = new URLSearchParams({
      f: 'json',
      where: '1=1', // Get all records, will filter manually
      outFields: '*',
      returnGeometry: 'false',
      resultRecordCount: '500' // Get more records to ensure we capture all in area
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
      throw new Error(`ArcGIS query failed: ${response.status}`);
    }
    
    const data = await response.json() as ArcGISResponse;
    
    // Filter by distance and include all sites within radius
    // We'll show their current status regardless of when last event was
    const filteredFeatures = (data.features || []).filter(feature => {
      const featLat = feature.attributes.latitude;
      const featLon = feature.attributes.longitude;
      
      if (!featLat || !featLon) return false;
      
      // Check distance
      const distance = calculateDistance(lat, lon, featLat, featLon);
      return distance <= radiusKm;
    });
    
    return filteredFeatures;
    
  } catch (error) {
    console.error('Error querying storm overflows:', error);
    return [];
  }
}

function transformToMapFeatures(features: StormOverflowFeature[], daysAgo: number) {
  const now = Date.now();
  const cutoffTime = now - (daysAgo * 24 * 60 * 60 * 1000);
  
  return features.map(feature => {
    const siteName = feature.attributes.ID || `CSO ${feature.attributes.ObjectId}`;
    const waterCourse = feature.attributes.receivingWaterCourse || 'Unknown watercourse';
    
    // Determine status based on the status field and event times
    let status: 'active' | 'recent' | 'inactive' = 'inactive';
    let startedAt: string | null = null;
    let endedAt: string | null = null;
    let duration: number | null = null;
    
    // status === 1 means currently active
    if (feature.attributes.status === 1) {
      status = 'active';
    } else if (feature.attributes.latestEventEnd && feature.attributes.latestEventEnd >= cutoffTime) {
      status = 'recent';
    } else if (feature.attributes.latestEventStart && feature.attributes.latestEventStart >= cutoffTime) {
      status = 'recent';
    }
    
    if (feature.attributes.latestEventStart) {
      startedAt = new Date(feature.attributes.latestEventStart).toISOString();
    }
    
    if (feature.attributes.latestEventEnd) {
      endedAt = new Date(feature.attributes.latestEventEnd).toISOString();
    }
    
    // Calculate duration if both start and end times exist
    if (feature.attributes.latestEventStart && feature.attributes.latestEventEnd) {
      duration = Math.round((feature.attributes.latestEventEnd - feature.attributes.latestEventStart) / 60000); // Convert to minutes
    }
    
    return {
      id: `cso-${feature.attributes.ObjectId}`,
      name: `${siteName} - ${waterCourse}`,
      status: status,
      startedAt: startedAt,
      endedAt: endedAt,
      duration: duration,
      lat: Math.round(feature.attributes.latitude! * 10000) / 10000,
      lon: Math.round(feature.attributes.longitude! * 10000) / 10000,
      waterCompany: feature.attributes.company || 'South West Water',
      receivingWater: waterCourse
    };
  });
}

export const GET: APIRoute = async ({ url }) => {
  try {
    // Get location configuration
    const location = await getPrimaryLocation();
    
    // Parse query parameters with defaults from Sanity config
    const lat = parseFloat(url.searchParams.get('lat') || location.center.lat.toString());
    const lon = parseFloat(url.searchParams.get('lon') || location.center.lng.toString());
    const radiusKm = parseFloat(url.searchParams.get('radiusKm') || location.defaultRadius.toString());
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
    
    // Query storm overflow data from the reliable source
    const liveFeatures = await queryStormOverflows(lat, lon, radiusKm, days);
    
    // Transform to map-friendly format
    const features = transformToMapFeatures(liveFeatures, days);
    
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
    
    const dataSource = liveFeatures.length > 0 ? 'live' : 'no-data';
    
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
      attribution: 'South West Water Storm Overflows – Event Duration Monitoring (Stream), CC BY 4.0',
      sources: [
        'https://www.southwestwater.co.uk/environment/waterfit/waterfit-live/'
      ],
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
      attribution: 'South West Water',
      sources: [
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