import type { APIRoute } from 'astro';

// Bathing water IDs for Plymouth area (proxy for Tamar)
const BATHING_WATERS = [
  { id: 'ukk4100-26400', label: 'Plymouth Hoe East' },
  { id: 'ukk4100-26500', label: 'Plymouth Hoe West' },
  { id: 'ukk4100-26510', label: 'Plymouth Firestone Bay' }
];

const EA_API_BASE = 'https://environment.data.gov.uk';

interface RiskPrediction {
  latestRiskPrediction?: {
    riskLevel?: {
      label?: Array<{ _value: string }>;
      name?: { _value: string };
    };
    expiresAt?: {
      _value: string;
    };
  };
  label?: Array<{ _value: string }>;
}

async function fetchBathingWaterRisk(eubwid: string): Promise<{
  id: string;
  label: string;
  risk: 'normal' | 'increased' | 'not-available';
  expiresAt: string | null;
  season: boolean;
}> {
  try {
    const url = `${EA_API_BASE}/doc/bathing-water/${eubwid}.json?_view=basic&_properties=label,latestRiskPrediction.riskLevel.*,latestRiskPrediction.expiresAt`;
    const response = await fetch(url);
    
    if (!response.ok) {
      console.warn(`Failed to fetch data for ${eubwid}: ${response.status}`);
      return {
        id: eubwid,
        label: BATHING_WATERS.find(bw => bw.id === eubwid)?.label || eubwid,
        risk: 'not-available',
        expiresAt: null,
        season: false
      };
    }

    const data = await response.json() as RiskPrediction;
    
    // Extract the label from the response or use fallback
    const label = data.label?.[0]?._value || 
                  BATHING_WATERS.find(bw => bw.id === eubwid)?.label || 
                  eubwid;
    
    // Check if we have risk prediction data (indicates in-season)
    if (!data.latestRiskPrediction?.riskLevel) {
      return {
        id: eubwid,
        label,
        risk: 'not-available',
        expiresAt: null,
        season: false
      };
    }

    // Extract risk level - check multiple possible locations in the response
    const riskValue = data.latestRiskPrediction.riskLevel.label?.[0]?._value ||
                      data.latestRiskPrediction.riskLevel.name?._value ||
                      'normal';
    
    // Map to our simplified risk levels
    const risk = riskValue === 'increased' ? 'increased' : 'normal';
    
    // Extract expiry time
    const expiresAt = data.latestRiskPrediction.expiresAt?._value || null;

    return {
      id: eubwid,
      label,
      risk,
      expiresAt,
      season: true
    };

  } catch (error) {
    console.error(`Error fetching risk for ${eubwid}:`, error);
    return {
      id: eubwid,
      label: BATHING_WATERS.find(bw => bw.id === eubwid)?.label || eubwid,
      risk: 'not-available',
      expiresAt: null,
      season: false
    };
  }
}

export const GET: APIRoute = async () => {
  try {
    // Fetch data for all three bathing waters in parallel
    const results = await Promise.all(
      BATHING_WATERS.map(bw => fetchBathingWaterRisk(bw.id))
    );

    // Add metadata
    const responseData = {
      sites: results,
      attribution: 'Environment Agency Bathing Water Pollution Risk Forecast',
      license: 'Open Government Licence v3.0',
      licenseUrl: 'https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/',
      lastUpdated: new Date().toISOString(),
      note: 'Forecasts are valid until midnight each day during bathing season (May-September)'
    };

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        // Cache for 15 minutes, serve stale while revalidating for 1 hour
        'Cache-Control': 's-maxage=900, stale-while-revalidate=3600'
      }
    });

  } catch (error) {
    console.error('Error fetching pollution risk forecast:', error);
    
    return new Response(JSON.stringify({
      error: 'Failed to fetch pollution risk forecast',
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