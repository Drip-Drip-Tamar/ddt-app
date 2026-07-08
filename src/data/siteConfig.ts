import groq from 'groq';
import type { CustomImage, Footer, Header } from 'types';
import { client } from '@utils/sanity-client';
import { IMAGE } from './blocks';
import type { SITE_CONFIG_QUERY_RESULT } from '../sanity.types';

const CONFIG_QUERY_OBJ = groq`{
  _id,
  "favicon": {
    "src": favicon.asset->url
  },
  header {
    ...,
    logo ${IMAGE}
  },
  footer,
  titleSuffix,
  monitoringConfiguration {
    primaryLocation {
      name,
      center {
        lat,
        lng
      },
      defaultRadius,
      description
    },
    riverStations {
      freshwaterStationId,
      tidalStationId
    },
    bathingWaters[] {
      id,
      label
    }
  }
}`;

export const SITE_CONFIG_QUERY = groq`*[_type == "siteConfig"][0] ${CONFIG_QUERY_OBJ}`;

// Hand-written rather than the raw generated SITE_CONFIG_QUERY_RESULT: every
// field in that type is nullable (nothing is required in the CMS schema),
// which doesn't match the `undefined`-based optional-prop convention the
// rest of the app's components (Header.astro, Footer.astro, Layout.astro)
// already use via the hand-written `types` module. This module's job is to
// bridge the two: fetch with the generated query type for compile-time
// query safety, then hand back the shape components already expect.
export interface SiteConfigData {
    _id?: string;
    favicon?: CustomImage;
    header?: Header;
    footer?: Footer;
    titleSuffix?: string;
    monitoringConfiguration?: {
        primaryLocation?: {
            name?: string;
            center?: { lat?: number; lng?: number };
            defaultRadius?: number;
            description?: string;
        };
        riverStations?: {
            freshwaterStationId?: string;
            tidalStationId?: string;
        };
        bathingWaters?: Array<{ id?: string; label?: string }>;
    };
}

// Cache the site config to avoid repeated Sanity queries, following the same
// pattern as locationConfig.ts.
let configCache: SiteConfigData | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Fallback used when Sanity is unavailable or returns nothing, so a Sanity
// blip degrades to a minimal but working header/footer rather than a 500
// (Task 12: siteConfig/locationConfig favour graceful degradation; page
// fetches, by contrast, are allowed to fail loudly — see page.ts).
const DEFAULT_SITE_CONFIG: SiteConfigData = {
    header: {
        title: 'Drip Drip Tamar',
        navLinks: []
    },
    footer: {}
};

/**
 * Fetch global site configuration from Sanity, with a 5-minute in-memory
 * cache and a safe fallback if Sanity is unavailable.
 */
export async function fetchData(): Promise<SiteConfigData> {
    const now = Date.now();

    if (configCache && now - cacheTimestamp < CACHE_TTL) {
        return configCache;
    }

    try {
        // Cast: see the module-level comment on SiteConfigData above for why
        // the public return type isn't the raw (fully nullable) query type.
        const config = (await client.fetch<SITE_CONFIG_QUERY_RESULT>(SITE_CONFIG_QUERY)) as SiteConfigData | null;

        if (!config) {
            console.warn('No site configuration found in Sanity, using defaults');
            return DEFAULT_SITE_CONFIG;
        }

        configCache = config;
        cacheTimestamp = now;
        return config;
    } catch (error) {
        console.error('Error fetching site configuration:', error);
        return DEFAULT_SITE_CONFIG;
    }
}
