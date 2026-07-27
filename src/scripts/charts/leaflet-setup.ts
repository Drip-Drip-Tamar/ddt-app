/**
 * Central Leaflet setup.
 *
 * Imports Leaflet and its stylesheet from npm (bundled by Vite) and fixes
 * the default marker icon paths so bundled image assets are used instead
 * of Leaflet's runtime-resolved URLs (which break under bundlers).
 */
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

// Classic bundler fix: remove the URL-guessing method and point the default
// icon at the bundled assets.
delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl,
    iconUrl,
    shadowUrl
});

export default L;
