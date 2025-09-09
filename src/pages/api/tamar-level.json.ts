import type { APIRoute } from 'astro';
import { getRiverStations } from '../../data/locationConfig.js';

const EA_API_BASE = 'https://environment.data.gov.uk/flood-monitoring';
const GUNNISLAKE_TYPICAL_LOW = 0.297; // meters
const GUNNISLAKE_TYPICAL_HIGH = 3.000; // meters

interface Reading {
  dateTime: string;
  value: number;
}

interface StationData {
  items: {
    stageScale?: {
      typicalRangeLow?: number;
      typicalRangeHigh?: number;
    };
  };
}

async function fetchStationData(stationId: string, sinceDate: string) {
  try {
    // Fetch readings
    const readingsUrl = `${EA_API_BASE}/id/stations/${stationId}/readings?since=${sinceDate}&_sorted`;
    const readingsResponse = await fetch(readingsUrl);
    
    if (!readingsResponse.ok) {
      throw new Error(`EA API returned ${readingsResponse.status} for station ${stationId}`);
    }
    
    const readingsData = await readingsResponse.json();
    const readings = readingsData.items as Reading[];

    // Sort readings by date (oldest first for chart)
    readings.sort((a, b) => 
      new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()
    );

    return readings;
  } catch (error) {
    console.error(`Error fetching data for station ${stationId}:`, error);
    return [];
  }
}

function processGunnislakeData(readings: Reading[], typicalRangeLow: number, typicalRangeHigh: number) {
  const labels = readings.map(r => {
    const date = new Date(r.dateTime);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  });
  
  const values = readings.map(r => r.value);
  const latest = readings.length > 0 ? readings[readings.length - 1].value : null;
  
  // Determine flow status
  let status = 'Normal Flow';
  let statusColor = 'success';
  if (latest !== null) {
    if (latest < typicalRangeLow) {
      status = 'Low Flow';
      statusColor = 'info';
    } else if (latest > typicalRangeHigh) {
      status = 'High Flow';
      statusColor = 'warning';
    }
  }

  return {
    labels,
    values,
    latest,
    status,
    statusColor,
    typicalRange: {
      low: typicalRangeLow,
      high: typicalRangeHigh
    },
    lastUpdated: readings.length > 0 ? readings[readings.length - 1].dateTime : null,
    stationName: 'Gunnislake',
    description: 'Freshwater river flow'
  };
}

function processPlymouthData(readings: Reading[]) {
  const labels = readings.map(r => {
    const date = new Date(r.dateTime);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  });
  
  const values = readings.map(r => r.value);
  const latest = readings.length > 0 ? readings[readings.length - 1].value : null;
  
  // Determine tidal state
  let status = 'Mid Tide';
  let statusColor = 'info';
  
  if (readings.length >= 3) {
    const recent = readings.slice(-3);
    const trend = recent[2].value - recent[0].value;
    
    if (trend > 0.1) {
      status = 'Rising Tide';
      statusColor = 'success';
    } else if (trend < -0.1) {
      status = 'Falling Tide';
      statusColor = 'warning';
    }
    
    // Check if near extremes
    if (latest !== null) {
      if (latest > 2.0) {
        status = 'High Tide';
        statusColor = 'primary';
      } else if (latest < -1.5) {
        status = 'Low Tide';
        statusColor = 'secondary';
      }
    }
  }

  return {
    labels,
    values,
    latest,
    status,
    statusColor,
    lastUpdated: readings.length > 0 ? readings[readings.length - 1].dateTime : null,
    stationName: 'Plymouth (Devonport)',
    description: 'Tidal level (mAOD)',
    isTidal: true
  };
}

export const GET: APIRoute = async () => {
  try {
    // Get river station IDs from configuration
    const riverStations = await getRiverStations();
    const GUNNISLAKE_STATION = riverStations.freshwaterStationId;
    const PLYMOUTH_STATION = riverStations.tidalStationId;
    
    // Calculate date 5 days ago
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    const sinceDate = fiveDaysAgo.toISOString();

    // Fetch data from both stations in parallel
    const [gunnislakeReadings, plymouthReadings] = await Promise.all([
      fetchStationData(GUNNISLAKE_STATION, sinceDate),
      fetchStationData(PLYMOUTH_STATION, sinceDate)
    ]);

    // Fetch Gunnislake station metadata for typical range
    let typicalRangeLow = GUNNISLAKE_TYPICAL_LOW;
    let typicalRangeHigh = GUNNISLAKE_TYPICAL_HIGH;
    
    try {
      const stationUrl = `${EA_API_BASE}/id/stations/${GUNNISLAKE_STATION}`;
      const stationResponse = await fetch(stationUrl);
      if (stationResponse.ok) {
        const stationData = await stationResponse.json() as StationData;
        if (stationData.items?.stageScale) {
          typicalRangeLow = stationData.items.stageScale.typicalRangeLow || GUNNISLAKE_TYPICAL_LOW;
          typicalRangeHigh = stationData.items.stageScale.typicalRangeHigh || GUNNISLAKE_TYPICAL_HIGH;
        }
      }
    } catch (error) {
      console.warn('Failed to fetch Gunnislake station metadata, using defaults', error);
    }

    // Process data for both stations
    const gunnislakeData = processGunnislakeData(gunnislakeReadings, typicalRangeLow, typicalRangeHigh);
    const plymouthData = processPlymouthData(plymouthReadings);

    const responseData = {
      gunnislake: gunnislakeData,
      plymouth: plymouthData,
      attribution: 'Environment Agency flood and river level data from the real-time data API (Beta)'
    };

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 's-maxage=600, stale-while-revalidate=3600'
      }
    });
    
  } catch (error) {
    console.error('Error fetching river level data:', error);
    
    return new Response(JSON.stringify({
      error: 'Failed to fetch river level data',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
  }
};