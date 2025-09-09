---
task: m-refactor-api-location-config
branch: feature/refactor-api-location-config
status: in-progress
created: 2025-09-09
started: 2025-09-09
modules: [api, sanity, components]
---

# Refactor API Location Configuration

## Problem/Goal
Optimize API fetches and introduce a single variable that defines the location and range for all API fetches. This will allow us to change the target location (epi-centre and range) without updating all charts and maps. The configuration should be managed through Sanity CMS for easy updates.

## Success Criteria
- [ ] Create centralized location configuration in Sanity
- [ ] Implement single source of truth for location (epi-centre and range)
- [ ] Refactor all API fetch calls to use the centralized configuration
- [ ] Optimize API requests to reduce redundancy
- [ ] Ensure we don't overload or get blacklisted by external APIs
- [ ] Simplify API request patterns where possible
- [ ] Test that changing location in Sanity updates all components

## Context Manifest

### How Location-Based API Fetching Currently Works

The application currently has multiple hardcoded location references scattered across various API endpoints and components, all centered around Calstock (50.497, -4.202) as the monitoring epicenter. This hardcoded approach creates tight coupling and makes location changes require updates in multiple files.

**Current API Architecture:**
When components need environmental data, they make fetch requests to local API endpoints under `/api/` that then proxy to external data sources like Environment Agency flood monitoring, South West Water ArcGIS services, and Rivers Trust datasets. Each API endpoint has hardcoded coordinates:

- `rainfall.json.ts`: Uses `CALSTOCK_LAT = 50.497` and `CALSTOCK_LON = -4.202` with `RADIUS_KM = 10` to query EA rainfall stations within a 10km radius
- `cso.json.ts` and `cso-map.json.ts`: Default to `lat: 50.497, lon: -4.202` in query parameters if not provided, using these for distance calculations to filter CSO locations
- `cso-live.json.ts`: Also uses hardcoded Calstock coordinates for live storm overflow monitoring

**Distance Calculation Pattern:**
All location-based APIs use a consistent distance calculation function:
```javascript
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  // ... haversine formula
  return R * c;
}
```

This is used to filter results within specified radius distances (typically 10km) from the center point.

**Component Data Flow:**
Components like `TamarStormOverflowMap.astro` receive location props with defaults (`centre = { lat: 50.497, lon: -4.202 }`), pass these to API endpoints via URL parameters, and render the results. The components use JavaScript fetch calls to load data dynamically:

```javascript
const response = await fetch(`${apiUrl}?lat=${lat}&lon=${lon}&radiusKm=${radiusKm}&days=${days}`);
```

**External API Integration Points:**
- **Environment Agency**: `https://environment.data.gov.uk/flood-monitoring` for river levels, rainfall data, and station information
- **South West Water ArcGIS**: `https://services-eu1.arcgis.com/OMdMOtfhATJPcHe3/arcgis/rest/services/NEH_outlets_PROD/FeatureServer` for live CSO events
- **Rivers Trust EDM 2023**: `https://services3.arcgis.com/Bb8lfThdhugyc4G3/arcgis/rest/services/edm_2023_tidy_final/FeatureServer` for historical CSO locations

Each external API has different query patterns and rate limiting concerns. The EA API supports geographic filtering with lat/long/distance parameters. ArcGIS services use more complex spatial queries with geometry parameters converted to meters.

**Data Caching Strategy:**
API responses include cache headers like `'Cache-Control': 's-maxage=300, stale-while-revalidate=1800'` to prevent overloading external services. This 5-minute cache with 30-minute stale-while-revalidate helps manage API rate limits.

### For New Centralized Location Configuration

The new implementation needs to create a single source of truth that all components and APIs can reference. Based on the existing Sanity schema patterns, this should extend the `siteConfig` schema which already handles global configuration.

**Current Sanity Configuration Pattern:**
The `siteConfig.ts` schema defines global settings and uses a standardized query pattern in `src/data/siteConfig.js`:
```javascript
const CONFIG_QUERY_OBJ = `{
  _id,
  // ... existing fields
}`;

export async function fetchData() {
    return await client.fetch(`*[_type == "siteConfig"][0] ${CONFIG_QUERY_OBJ}`);
}
```

This same pattern should be extended to include location configuration. The `samplingSite.ts` schema already demonstrates how coordinates should be structured:
```typescript
coordinates: {
  type: 'object',
  fields: [
    { name: 'lat', type: 'number' },
    { name: 'lng', type: 'number' }  // Note: uses 'lng' not 'lon'
  ]
}
```

**API Refactoring Requirements:**
Currently, each API endpoint imports its own constants and defaults. The refactored approach should:

1. Create a centralized location service that fetches configuration from Sanity
2. Modify each API endpoint to use this service instead of hardcoded values
3. Update components to fetch location config and pass to APIs
4. Implement fallback values if Sanity is unavailable

**Component Update Pattern:**
Components like `TamarStormOverflowMap.astro` currently accept location props but default to hardcoded values. The new pattern should:
- Fetch location config in the component's frontmatter using Sanity client
- Use config values as defaults instead of hardcoded coordinates
- Maintain prop override capability for flexibility

**Cache and Performance Considerations:**
The location configuration will be read frequently by multiple API endpoints, so it should be:
- Cached at the application level to avoid repeated Sanity queries
- Include reasonable defaults to prevent API failures if Sanity is unreachable
- Support both server-side and client-side access patterns

### Technical Reference Details

#### Current API Endpoints That Need Refactoring
- `/src/pages/api/rainfall.json.ts` - Hardcoded CALSTOCK_LAT/LON constants
- `/src/pages/api/cso.json.ts` - Default coordinates in URL parameter parsing
- `/src/pages/api/cso-map.json.ts` - Default coordinates in URL parameter parsing  
- `/src/pages/api/cso-live.json.ts` - Hardcoded CALSTOCK_LAT/LON constants
- `/src/pages/api/tamar-level.json.ts` - Hardcoded station IDs (GUNNISLAKE_STATION='47117', PLYMOUTH_STATION='E72139')
- `/src/pages/api/prf.json.ts` - Hardcoded bathing water IDs for Plymouth area

#### Components Using Location Data
- `/src/components/TamarStormOverflowMap.astro` - Centre prop with hardcoded defaults (used by map page)
- `/src/components/TamarStormOverflow.astro` - Fetches CSO live data (used by map page)
- `/src/components/TamarEnvironmentalMonitoring.astro` - Fetches tamar-level, rainfall, cso-live (used by results page)
- `/src/components/PollutionRiskForecast.astro` - Fetches PRF data (used by results page)

#### Sanity Schema Additions Needed
- Extend `siteConfig.ts` to include monitoring location configuration
- Add fields for center coordinates, default radius, monitoring station IDs, and bathing water IDs
- Support multiple monitoring locations for different purposes (CSO tracking, river levels, bathing water quality)
- Follow existing coordinate structure pattern from `samplingSite.ts`

#### Data Fetching Utilities
- Extend `/src/data/siteConfig.js` to include location configuration in queries
- Create location-specific utility functions for common operations
- Implement caching strategy for location config

#### File Locations for Implementation

**Schema Changes:**
- `/studio/schemaTypes/siteConfig.ts` - Add location configuration fields

**Data Layer:**
- `/src/data/siteConfig.js` - Extend query and add location utilities  
- `/src/data/locationConfig.js` - New utility for location-specific functions

**API Refactoring:**
- All `/src/pages/api/*.ts` files that use hardcoded coordinates
- Create shared location service utility

**Component Updates:**
- `/src/components/TamarStormOverflowMap.astro` and any other location-dependent components

#### Configuration Structure Recommendation
```typescript
monitoringConfiguration: {
  type: 'object',
  fields: [
    { name: 'primaryLocation', type: 'object', fields: [
      { name: 'name', type: 'string' }, // "Calstock"
      { name: 'center', type: 'object', fields: [
        { name: 'lat', type: 'number' }, // 50.497
        { name: 'lng', type: 'number' }  // -4.202
      ]},
      { name: 'defaultRadius', type: 'number' }, // 10
      { name: 'description', type: 'text' }
    ]},
    { name: 'riverStations', type: 'object', fields: [
      { name: 'freshwaterStationId', type: 'string' }, // "47117" (Gunnislake)
      { name: 'tidalStationId', type: 'string' }       // "E72139" (Plymouth/Devonport)
    ]},
    { name: 'bathingWaters', type: 'array', of: [
      { type: 'object', fields: [
        { name: 'id', type: 'string' },    // "ukk4100-26400"
        { name: 'label', type: 'string' }  // "Plymouth Hoe East"
      ]}
    ]}
  ]
}
```

## User Notes
- Location variable should be managed in Sanity
- Need to be able to set epi-centre and range
- All charts and maps should respond to location changes
- Focus on API optimization to prevent blacklisting
- Simplify request patterns where possible

## Work Log
<!-- Updated as work progresses -->
- [2025-09-09] Task created
- [2025-09-09] Created Sanity schema for monitoring configuration with primary location, river stations, and bathing waters
- [2025-09-09] Created location configuration utilities with caching and fallback defaults
- [2025-09-09] Refactored all 8 API endpoints to use centralized configuration
- [2025-09-09] Updated TamarStormOverflowMap component to fetch location from Sanity
- [2025-09-09] Build successful - all changes integrated without errors