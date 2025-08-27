import type { APIRoute } from 'astro';

const CALSTOCK_LAT = 50.497;
const CALSTOCK_LON = -4.202;
const RADIUS_METERS = 10000; // 10km in meters
const SWW_ARCGIS_BASE = 'https://services-eu1.arcgis.com/XxS6FebPX29TRGDJ/arcgis/rest/services/EDM_Schema/FeatureServer';

interface StormOverflowFeature {
  attributes: {
    OBJECTID: number;
    Site_Name?: string;
    Outfall_Name?: string;
    Start_Time?: number; // Epoch milliseconds
    End_Time?: number | null;
    Duration_mins?: number;
    Status?: string;
    Last_Update?: number;
    Latitude?: number;
    Longitude?: number;
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

async function queryStormOverflows(layerId: number, sinceDate: Date): Promise<StormOverflowFeature[]> {
  try {
    const epochMs = sinceDate.getTime();
    
    // Build query parameters
    const params = new URLSearchParams({
      f: 'json',
      where: `Start_Time >= ${epochMs} OR (End_Time IS NULL AND Status = 'Active')`,
      geometry: `${CALSTOCK_LON},${CALSTOCK_LAT}`,
      geometryType: 'esriGeometryPoint',
      inSR: '4326',
      distance: RADIUS_METERS.toString(),
      units: 'esriSRUnit_Meter',
      outFields: '*',
      returnGeometry: 'false',
      orderByFields: 'Start_Time DESC'
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
      const altParams = new URLSearchParams({
        f: 'json',
        where: '1=1', // Get all recent records
        outFields: '*',
        returnGeometry: 'true',
        orderByFields: 'OBJECTID DESC',
        resultRecordCount: '100'
      });
      
      const altResponse = await fetch(`${SWW_ARCGIS_BASE}/${layerId}/query?${altParams}`);
      if (!altResponse.ok) {
        throw new Error(`ArcGIS query failed: ${response.status}`);
      }
      
      const altData = await altResponse.json() as ArcGISResponse;
      
      // Filter by distance manually
      return altData.features.filter(feature => {
        const lat = feature.attributes.Latitude;
        const lon = feature.attributes.Longitude;
        if (!lat || !lon) return false;
        
        const distance = calculateDistance(CALSTOCK_LAT, CALSTOCK_LON, lat, lon) * 1000; // Convert to meters
        return distance <= RADIUS_METERS;
      });
    }
    
    const data = await response.json() as ArcGISResponse;
    return data.features || [];
    
  } catch (error) {
    console.error('Error querying storm overflows:', error);
    return [];
  }
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

function processOverflowData(features: StormOverflowFeature[], startDate: Date, endDate: Date) {
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
      const startTime = feature.attributes.Start_Time ? new Date(feature.attributes.Start_Time) : null;
      const endTime = feature.attributes.End_Time ? new Date(feature.attributes.End_Time) : null;
      
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
    const site = feature.attributes.Site_Name || feature.attributes.Outfall_Name || 'Unknown Site';
    const startTime = feature.attributes.Start_Time ? new Date(feature.attributes.Start_Time).toISOString() : null;
    const endTime = feature.attributes.End_Time ? new Date(feature.attributes.End_Time).toISOString() : null;
    const duration = feature.attributes.Duration_mins || null;
    const status = endTime ? 'ended' : 'active';
    
    if (startTime) {
      const event = {
        site,
        start: startTime,
        end: endTime,
        durationMin: duration,
        status: status as 'active' | 'ended'
      };
      
      // Add distance if coordinates are available
      if (feature.attributes.Latitude && feature.attributes.Longitude) {
        event.distanceKm = Math.round(
          calculateDistance(
            CALSTOCK_LAT, CALSTOCK_LON,
            feature.attributes.Latitude, feature.attributes.Longitude
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
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 5);
    
    // Discover the correct layer
    const layerId = await discoverLayers();
    
    // Query storm overflow data
    const features = await queryStormOverflows(layerId, startDate);
    
    // Process the data
    const { activeSeries, events } = processOverflowData(features, startDate, endDate);
    
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