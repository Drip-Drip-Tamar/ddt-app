/**
 * Storm overflow map: Leaflet map with CSO markers, radius circle and
 * live-status badge, fed from the /api/cso.json endpoint.
 */
import type { Map as LeafletMap } from 'leaflet';
import L from './leaflet-setup';
import { escapeHtml, formatShortDateTime } from './format';
import { fetchJson, onPageLoad, showError, whenVisible } from './mount-panel';

export interface CsoFeature {
    name: string;
    lat: number;
    lon: number;
    status?: string;
    startedAt?: string;
    endedAt?: string;
    spillCount2023?: number;
    totalDuration2023?: number;
    receivingWater?: string;
    waterCompany?: string;
}

export interface CsoMapData {
    activeCount?: number;
    recentCount?: number;
    dataSource?: string;
    features?: CsoFeature[];
}

/** Marker colour + z-index for a CSO status. */
export function markerStyleFor(status: string | undefined): { color: string; zIndex: number } {
    if (status === 'active') return { color: '#EF4444', zIndex: 300 };
    if (status === 'recent') return { color: '#F59E0B', zIndex: 200 };
    return { color: '#6B7280', zIndex: 100 };
}

/** Status badge text + class for the map header. */
export function statusBadgeFor(data: CsoMapData): { text: string; className: string } {
    const activeCount = data.activeCount || 0;
    const recentCount = data.recentCount || 0;
    const dataSource = data.dataSource || 'unknown';

    if (activeCount > 0) return { text: `${activeCount} Active`, className: 'badge badge-lg badge-error' };
    if (recentCount > 0) return { text: `${recentCount} Recent`, className: 'badge badge-lg badge-warning' };
    if (dataSource === 'base-only') return { text: 'No Live Data', className: 'badge badge-lg badge-info' };
    return { text: 'All Clear', className: 'badge badge-lg badge-success' };
}

/** Build the popup HTML for one CSO feature. */
export function buildPopupContent(feature: CsoFeature): string {
    const { color } = markerStyleFor(feature.status);

    let popupContent = `<div style="min-width: 250px;">
            <strong>${escapeHtml(feature.name)}</strong><br>
            <span style="color: ${color}; font-weight: bold;">
              ${feature.status === 'active' ? '⚠️ Active' : feature.status === 'recent' ? '⚡ Recent' : '✓ Inactive'}
            </span><br>`;

    if (feature.startedAt) {
        popupContent += `<small>Started: ${formatShortDateTime(feature.startedAt)}</small><br>`;
    }

    if (feature.endedAt) {
        popupContent += `<small>Ended: ${formatShortDateTime(feature.endedAt)}</small><br>`;
    } else if (feature.status === 'active') {
        popupContent += `<small>Duration: Ongoing</small><br>`;
    }

    if (feature.spillCount2023 !== undefined) {
        popupContent += `<hr style="margin: 8px 0; border-color: #e5e7eb;">`;
        popupContent += `<small><strong>2023 Statistics:</strong><br>`;
        popupContent += `Spills: ${feature.spillCount2023} events<br>`;
        if (feature.totalDuration2023 !== undefined) {
            popupContent += `Total duration: ${feature.totalDuration2023} hrs</small><br>`;
        }
    }

    if (feature.receivingWater) {
        popupContent += `<small>Discharges to: ${escapeHtml(feature.receivingWater)}</small><br>`;
    }

    if (feature.waterCompany) {
        popupContent += `<small>Operator: ${escapeHtml(feature.waterCompany)}</small>`;
    }

    popupContent += '</div>';
    return popupContent;
}

// Track live maps per container element so re-mounting is idempotent.
const mapRegistry = new WeakMap<HTMLElement, LeafletMap>();

/** Initialise the Leaflet map on a container element. */
export async function initializeStormOverflowMap(mapElement: HTMLElement): Promise<void> {
    const mapId = mapElement.id;
    try {
        const lat = parseFloat(mapElement.dataset.lat ?? '');
        const lon = parseFloat(mapElement.dataset.lon ?? '');
        const radiusKm = parseFloat(mapElement.dataset.radius ?? '');
        const days = parseFloat(mapElement.dataset.days ?? '');
        const apiUrl = mapElement.dataset.api ?? '/api/cso.json';
        const centreName = mapElement.dataset.name || 'Calstock';

        // Destroy any existing map instance bound to this element.
        mapRegistry.get(mapElement)?.remove();
        mapRegistry.delete(mapElement);

        const map = L.map(mapElement, {
            center: [lat, lon],
            zoom: 11,
            scrollWheelZoom: false,
            attributionControl: false
        });
        mapRegistry.set(mapElement, map);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 18,
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        L.control
            .attribution({
                position: 'bottomright',
                prefix: false
            })
            .addTo(map);

        L.circle([lat, lon], {
            radius: radiusKm * 1000,
            color: '#4F46E5',
            fillColor: '#4F46E5',
            fillOpacity: 0.05,
            weight: 2,
            dashArray: '5, 10'
        }).addTo(map);

        const centerIcon = L.divIcon({
            html: '<div style="background: #4F46E5; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
            className: 'center-marker',
            iconSize: [16, 16],
            iconAnchor: [8, 8]
        });

        L.marker([lat, lon], {
            icon: centerIcon,
            zIndexOffset: -1000
        })
            .addTo(map)
            .bindPopup(`<strong>${escapeHtml(centreName)}</strong><br>Monitoring center`);

        const data = await fetchJson<CsoMapData>(`${apiUrl}?lat=${lat}&lon=${lon}&radiusKm=${radiusKm}&days=${days}`);

        const statusEl = document.getElementById(`${mapId}-status`);
        if (statusEl) {
            const badge = statusBadgeFor(data);
            statusEl.textContent = badge.text;
            statusEl.className = badge.className;
        }

        if (data.dataSource === 'base-only') {
            document.getElementById(`${mapId}-notice`)?.classList.remove('hidden');
        }

        if (data.features && data.features.length > 0) {
            data.features.forEach((feature) => {
                const { color, zIndex } = markerStyleFor(feature.status);

                const icon = L.divIcon({
                    html: `<div style="background: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4);"></div>`,
                    className: 'cso-marker',
                    iconSize: [26, 26],
                    iconAnchor: [13, 13],
                    popupAnchor: [0, -13]
                });

                L.marker([feature.lat, feature.lon], {
                    icon,
                    zIndexOffset: zIndex
                })
                    .addTo(map)
                    .bindPopup(buildPopupContent(feature));
            });
        }

        // Enable scroll zoom only while the map has focus.
        map.on('focus', () => {
            map.scrollWheelZoom.enable();
        });
        map.on('blur', () => {
            map.scrollWheelZoom.disable();
        });
    } catch (error) {
        console.error('Error initializing map:', error);
        showError(`${mapId}-error`);
    }
}

/** Lazy-mount one map when it scrolls near the viewport. */
export function mountStormOverflowMap(mapElement: HTMLElement): void {
    whenVisible(mapElement, () => {
        void initializeStormOverflowMap(mapElement);
    });
}

let registered = false;

/** Mount all storm overflow maps now and after client-side navigation. */
export function registerStormOverflowMaps(): void {
    if (registered) return;
    registered = true;
    onPageLoad(() => {
        document.querySelectorAll<HTMLElement>('[data-cso-map]').forEach(mountStormOverflowMap);
    });
}
