import { client } from '@utils/sanity-client';
import { IMAGE } from './blocks';

const CONFIG_QUERY_OBJ = `{
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

export async function fetchData() {
    return await client.fetch(`*[_type == "siteConfig"][0] ${CONFIG_QUERY_OBJ}`);
}
