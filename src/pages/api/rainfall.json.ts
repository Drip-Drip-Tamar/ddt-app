import type { APIRoute } from 'astro';

const CALSTOCK_LAT = 50.497;
const CALSTOCK_LON = -4.202;
const RADIUS_KM = 10;
const EA_API_BASE = 'https://environment.data.gov.uk/flood-monitoring';

interface RainfallReading {
  dateTime: string;
  value: number;
}

interface RainfallStation {
  stationReference: string;
  label: string;
  lat: number;
  long: number;
  measures?: Array<{
    '@id': string;
    parameter: string;
    parameterName: string;
    unitName: string;
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

async function findNearbyRainfallStations(): Promise<RainfallStation[]> {
  try {
    const url = `${EA_API_BASE}/id/stations?parameter=rainfall&lat=${CALSTOCK_LAT}&long=${CALSTOCK_LON}&dist=${RADIUS_KM}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`EA API returned ${response.status}`);
    }
    
    const data = await response.json();
    const stations = data.items as RainfallStation[];
    
    // Sort by distance and take closest 3
    return stations
      .map(station => ({
        ...station,
        distance: calculateDistance(CALSTOCK_LAT, CALSTOCK_LON, station.lat, station.long)
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3);
      
  } catch (error) {
    console.error('Error finding rainfall stations:', error);
    return [];
  }
}

async function fetchStationReadings(station: RainfallStation, sinceDate: string): Promise<RainfallReading[]> {
  try {
    // Find the 15-minute rainfall measure
    const rainfallMeasure = station.measures?.find(m => 
      m.parameter === 'rainfall' && m.parameterName.includes('Rainfall')
    );
    
    if (!rainfallMeasure) {
      console.warn(`No rainfall measure found for station ${station.label}`);
      return [];
    }
    
    const measureId = rainfallMeasure['@id'].split('/').pop();
    const url = `${EA_API_BASE}/id/measures/${measureId}/readings?since=${sinceDate}&_sorted`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch readings for station ${station.label}`);
    }
    
    const data = await response.json();
    return data.items as RainfallReading[];
    
  } catch (error) {
    console.error(`Error fetching readings for station ${station.label}:`, error);
    return [];
  }
}

function aggregateToHourly(readings: RainfallReading[]): Map<string, number> {
  const hourlyData = new Map<string, number>();
  
  readings.forEach(reading => {
    const date = new Date(reading.dateTime);
    date.setMinutes(0, 0, 0);
    const hourKey = date.toISOString();
    
    const currentTotal = hourlyData.get(hourKey) || 0;
    hourlyData.set(hourKey, currentTotal + reading.value);
  });
  
  return hourlyData;
}

function calculateRolling24h(hourlyData: Array<{t: string, mm: number}>): Array<{t: string, mm: number}> {
  const rolling24h: Array<{t: string, mm: number}> = [];
  
  for (let i = 0; i < hourlyData.length; i++) {
    const currentTime = new Date(hourlyData[i].t);
    const twentyFourHoursAgo = new Date(currentTime.getTime() - 24 * 60 * 60 * 1000);
    
    let sum = 0;
    for (let j = 0; j <= i; j++) {
      const time = new Date(hourlyData[j].t);
      if (time >= twentyFourHoursAgo && time <= currentTime) {
        sum += hourlyData[j].mm;
      }
    }
    
    rolling24h.push({
      t: hourlyData[i].t,
      mm: Math.round(sum * 10) / 10 // Round to 1 decimal place
    });
  }
  
  return rolling24h;
}

export const GET: APIRoute = async () => {
  try {
    // Calculate date 5 days ago
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    const sinceDate = fiveDaysAgo.toISOString();
    
    // Find nearby rainfall stations
    const stations = await findNearbyRainfallStations();
    
    if (stations.length === 0) {
      return new Response(JSON.stringify({
        error: 'No rainfall stations found within 10km',
        generatedAt: new Date().toISOString(),
        stations: [],
        hourly: [],
        rolling24h: []
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 's-maxage=600, stale-while-revalidate=3600'
        }
      });
    }
    
    // Fetch readings from all stations
    const allReadings: RainfallReading[] = [];
    const stationInfo: Array<{id: string, name: string, distanceKm: number}> = [];
    
    await Promise.all(stations.map(async station => {
      const readings = await fetchStationReadings(station, sinceDate);
      allReadings.push(...readings);
      
      stationInfo.push({
        id: station.stationReference,
        name: station.label,
        distanceKm: Math.round(calculateDistance(
          CALSTOCK_LAT, CALSTOCK_LON, 
          station.lat, station.long
        ) * 10) / 10
      });
    }));
    
    // Sort all readings by time
    allReadings.sort((a, b) => 
      new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()
    );
    
    // Aggregate to hourly
    const hourlyMap = aggregateToHourly(allReadings);
    
    // Convert to array format
    const hourlyData = Array.from(hourlyMap.entries())
      .map(([time, value]) => ({
        t: time,
        mm: Math.round(value * 10) / 10 // Round to 1 decimal
      }))
      .sort((a, b) => new Date(a.t).getTime() - new Date(b.t).getTime());
    
    // Calculate 24h rolling sum
    const rolling24h = calculateRolling24h(hourlyData);
    
    return new Response(JSON.stringify({
      generatedAt: new Date().toISOString(),
      stations: stationInfo,
      hourly: hourlyData,
      rolling24h: rolling24h,
      attribution: 'Environment Agency flood and river level data from the real-time data API (Beta) - Open Government Licence v3.0'
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 's-maxage=600, stale-while-revalidate=3600'
      }
    });
    
  } catch (error) {
    console.error('Error in rainfall API:', error);
    
    return new Response(JSON.stringify({
      error: 'Failed to fetch rainfall data',
      message: error instanceof Error ? error.message : 'Unknown error',
      generatedAt: new Date().toISOString()
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
  }
};