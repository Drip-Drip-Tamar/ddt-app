/**
 * Static JSON fixtures for the `/api/*.json` routes, shaped to match what
 * each Astro endpoint actually returns to the browser (see
 * `src/pages/api/*.json.ts` and the consuming `src/scripts/charts/*`
 * modules). Used to stub `page.route()` in e2e specs so the smoke suite
 * never depends on live EA/SWW upstream availability.
 */

export const csoMapFixture = {
    ok: true,
    centre: { lat: 50.497, lon: -4.202 },
    radiusKm: 10,
    days: 5,
    features: [
        {
            id: 'mock-1',
            name: 'Calstock CSO',
            status: 'inactive',
            lat: 50.497,
            lon: -4.202,
            startedAt: null,
            endedAt: null,
            updatedAt: new Date().toISOString()
        },
        {
            id: 'mock-2',
            name: 'Gunnislake CSO',
            status: 'active',
            lat: 50.52,
            lon: -4.21,
            startedAt: new Date(Date.now() - 3600_000).toISOString(),
            endedAt: null,
            updatedAt: new Date().toISOString()
        }
    ],
    totalCount: 2,
    activeCount: 1,
    recentCount: 0,
    inactiveCount: 1,
    dataSource: 'mock',
    attribution: 'Mock data for demonstration',
    sources: [],
    refreshHintMinutes: 5,
    generatedAt: new Date().toISOString()
};

export const csoLiveFixture = {
    generatedAt: new Date().toISOString(),
    activeSeries: [
        { t: new Date(Date.now() - 3600_000).toISOString(), count: 1 },
        { t: new Date().toISOString(), count: 0 }
    ],
    events: [
        {
            site: 'Calstock CSO',
            start: new Date(Date.now() - 7200_000).toISOString(),
            status: 'inactive',
            durationMin: 45,
            distanceKm: 1.2
        }
    ],
    totalEvents: 1,
    attribution: 'South West Water Storm Overflows – Event Duration Monitoring (Stream), CC BY 4.0',
    waterfitLiveUrl: 'https://www.southwestwater.co.uk/environment/rivers-and-bathing-waters/waterfitlive/'
};

export const prfFixture = {
    sites: [
        {
            id: 'ukc1234-12345',
            label: 'Calstock',
            risk: 'normal',
            expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
            season: true
        }
    ],
    attribution: 'Environment Agency Bathing Water Pollution Risk Forecast',
    license: 'Open Government Licence v3.0',
    licenseUrl: 'https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/',
    lastUpdated: new Date().toISOString(),
    note: 'Forecasts are valid until midnight each day during bathing season (May-September)'
};

export const tamarLevelFixture = {
    gunnislake: {
        latest: 0.42,
        lastUpdated: new Date().toISOString(),
        status: 'Normal',
        statusColor: 'success',
        labels: ['00:00', '06:00', '12:00', '18:00'],
        values: [0.4, 0.41, 0.43, 0.42],
        typicalRange: { low: 0.2, high: 0.8 }
    },
    plymouth: {
        latest: 1.1,
        lastUpdated: new Date().toISOString(),
        status: 'Normal',
        statusColor: 'success',
        labels: ['00:00', '06:00', '12:00', '18:00'],
        values: [1.0, 1.05, 1.15, 1.1],
        typicalRange: { low: 0.5, high: 2.0 }
    }
};

export const rainfallFixture = {
    hourly: [
        { t: new Date(Date.now() - 3600_000).toISOString(), mm: 0.2 },
        { t: new Date().toISOString(), mm: 0 }
    ],
    rolling24h: [{ t: new Date().toISOString(), mm: 3.4 }],
    stations: [{ name: 'Gunnislake', distanceKm: 2.1 }]
};
