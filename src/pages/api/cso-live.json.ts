import type { APIRoute } from 'astro';
import { getPrimaryLocation, calculateDistance } from '../../data/locationConfig.js';

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

async function discoverLayers(): Promise<number> {
  try {
    const url = `${SWW_ARCGIS_BASE}?f=json`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`ArcGIS service returned ${response.status}`);
    }
    
    const data = await response.json();
    
    // Look for the EDM/Storm Overflow activity layer
    // Typically layer 0 or 1
    const layers = data.layers || [];
    for (const layer of layers) {
      if (layer.name?.toLowerCase().includes('edm') || 
          layer.name?.toLowerCase().includes('storm') ||
          layer.name?.toLowerCase().includes('overflow')) {
        return layer.id;
      }
    }
    
    // Default to layer 0 if no specific match
    return 0;
    
  } catch (error) {
    console.error('Error discovering layers:', error);
    return 0; // Default to layer 0
  }
}

async function queryStormOverflows(layerId: number, sinceDate: Date, centerLat: number, centerLng: number, radiusKm: number): Promise<StormOverflowFeature[]> {
  try {
    const epochMs = sinceDate.getTime();
    
    // Build query parameters with spatial filter to avoid global caps
    const params = new URLSearchParams({
      f: 'json',
      where: '1=1',
      outFields: '*',
      returnGeometry: 'false',
      inSR: '4326',
      outSR: '4326',
      geometry: `${centerLng},${centerLat}`,
      geometryType: 'esriGeometryPoint',
      distance: String(radiusKm * 1000),
      units: 'esriSRUnit_Meter',
      spatialRel: 'esriSpatialRelIntersects'
    });
    
    const url = `${SWW_ARCGIS_BASE}/${layerId}/query`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString()
    });
    
    if (!response.ok) {
      // Try alternate query format if first fails
      // Fallback already uses simplified query
      const altParams = new URLSearchParams({
        f: 'json',
        where: '1=1',
        outFields: '*',
        returnGeometry: 'false',
        resultRecordCount: '500'
      });
      
      const altResponse = await fetch(`${SWW_ARCGIS_BASE}/${layerId}/query?${altParams}`);
      if (!altResponse.ok) {
        throw new Error(`ArcGIS query failed: ${response.status}`);
      }
      
      const altData = await altResponse.json() as ArcGISResponse;
      
      // Filter by distance and date manually
      return altData.features.filter(feature => {
        const lat = feature.attributes.latitude;
        const lon = feature.attributes.longitude;
        const eventStart = feature.attributes.latestEventStart;
        
        if (!lat || !lon) return false;
        
        // Check distance
        const distance = calculateDistance(centerLat, centerLng, lat, lon);
        if (distance > radiusKm) return false;
        
        // Check date
        if (eventStart && eventStart >= epochMs) return true;
        // Include active events even if they started before our date range
        if (feature.attributes.status === 1) return true;
        
        return false;
      });
    }
    
    const data = await response.json() as ArcGISResponse;
    
    // Filter by distance and date
    const filteredFeatures = (data.features || []).filter(feature => {
      const lat = feature.attributes.latitude;
      const lon = feature.attributes.longitude;
      const eventStart = feature.attributes.latestEventStart;
      
      if (!lat || !lon) return false;
      
      // Check distance
      const distance = calculateDistance(centerLat, centerLng, lat, lon);
      if (distance > radiusKm) return false;
      
      // Check date
      if (eventStart && eventStart >= sinceDate.getTime()) return true;
      // Include active events even if they started before our date range
      if (feature.attributes.status === 1) return true;
      
      return false;
    });
    
    return filteredFeatures;
    
  } catch (error) {
    console.error('Error querying storm overflows:', error);
    return [];
  }
}

// calculateDistance is now imported from locationConfig.js

function processOverflowData(features: StormOverflowFeature[], startDate: Date, endDate: Date, centerLat: number, centerLng: number) {
  // Create time buckets (hourly)
  const activeSeries: Array<{t: string, count: number}> = [];
  const events: Array<{
    site: string;
    start: string;
    end: string | null;
    durationMin: number | null;
    status: 'active' | 'ended';
    distanceKm?: number;
  }> = [];
  
  // Generate hourly buckets for the last 5 days
  const current = new Date(startDate);
  while (current <= endDate) {
    const bucketTime = current.toISOString();
    let activeCount = 0;
    
    // Count active overflows for this hour
    features.forEach(feature => {
      const startTime = feature.attributes.latestEventStart ? new Date(feature.attributes.latestEventStart) : null;
      const endTime = feature.attributes.latestEventEnd ? new Date(feature.attributes.latestEventEnd) : null;
      
      if (startTime && startTime <= current) {
        if (!endTime || endTime >= current) {
          activeCount++;
        }
      }
    });
    
    activeSeries.push({
      t: bucketTime,
      count: activeCount
    });
    
    current.setHours(current.getHours() + 1);
  }
  
  // Process individual events
  features.forEach(feature => {
    const site = `${feature.attributes.ID || 'Unknown'} - ${feature.attributes.receivingWaterCourse || 'Unknown Watercourse'}`;
    const startTime = feature.attributes.latestEventStart ? new Date(feature.attributes.latestEventStart).toISOString() : null;
    const endTime = feature.attributes.latestEventEnd ? new Date(feature.attributes.latestEventEnd).toISOString() : null;
    
    // Calculate duration if both start and end times exist
    let duration = null;
    if (feature.attributes.latestEventStart && feature.attributes.latestEventEnd) {
      duration = Math.round((feature.attributes.latestEventEnd - feature.attributes.latestEventStart) / 60000); // Convert to minutes
    }
    
    const status = feature.attributes.status === 1 ? 'active' : 'ended';
    
    if (startTime) {
      const event: {
        site: string;
        start: string;
        end: string;
        durationMin: number | null;
        status: 'active' | 'ended';
        distanceKm?: number;
      } = {
        site,
        start: startTime,
        end: endTime,
        durationMin: duration,
        status: status as 'active' | 'ended'
      };
      
      // Add distance if coordinates are available
      if (feature.attributes.latitude && feature.attributes.longitude) {
        event.distanceKm = Math.round(
          calculateDistance(
            centerLat, centerLng,
            feature.attributes.latitude, feature.attributes.longitude
          ) * 10
        ) / 10;
      }
      
      events.push(event);
    }
  });
  
  // Sort events by start time (most recent first)
  events.sort((a, b) => {
    const aTime = new Date(a.start).getTime();
    const bTime = new Date(b.start).getTime();
    return bTime - aTime;
  });
  
  return { activeSeries, events };
}

export const GET: APIRoute = async () => {
  try {
    // Get location configuration
    const location = await getPrimaryLocation();
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 5);
    
    // Discover the correct layer
    const layerId = await discoverLayers();
    
    // Query storm overflow data
    const features = await queryStormOverflows(layerId, startDate, location.center.lat, location.center.lng, location.defaultRadius);
    
    // Process the data
    const { activeSeries, events } = processOverflowData(features, startDate, endDate, location.center.lat, location.center.lng);
    
    return new Response(JSON.stringify({
      generatedAt: new Date().toISOString(),
      activeSeries,
      events: events.slice(0, 20), // Limit to 20 most recent events
      totalEvents: events.length,
      attribution: 'South West Water Storm Overflows – Event Duration Monitoring (Stream), CC BY 4.0',
      waterfitLiveUrl: 'https://www.southwestwater.co.uk/environment/waterfit/waterfit-live/'
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 's-maxage=300, stale-while-revalidate=1800'
      }
    });
    
  } catch (error) {
    console.error('Error in CSO API:', error);
    
    return new Response(JSON.stringify({
      error: 'Failed to fetch storm overflow data',
      message: error instanceof Error ? error.message : 'Unknown error',
      generatedAt: new Date().toISOString(),
      activeSeries: [],
      events: [],
      waterfitLiveUrl: 'https://www.southwestwater.co.uk/environment/waterfit/waterfit-live/'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
  }
};