/**
 * Pollution risk forecast panel: renders EA bathing-water risk badges.
 * No chart — DOM only — but shares the panel lifecycle helpers.
 */
import { escapeHtml } from './format';
import { fetchJson, onPageLoad, readPanelConfig } from './mount-panel';

export interface PrfSite {
    label: string;
    season?: boolean;
    risk?: string;
    expiresAt?: string;
}

export interface PrfData {
    sites?: PrfSite[];
}

export interface SiteCardView {
    badgeClass: string;
    statusText: string;
    statusIcon: string;
    expiryText: string;
    title: string | null;
}

const REFRESH_INTERVAL_MS = 15 * 60 * 1000;

/** Derive the badge presentation for one forecast site. */
export function buildSiteCardView(site: PrfSite, now: Date = new Date()): SiteCardView {
    let badgeClass = 'badge-neutral';
    let statusText = 'No Data';
    let statusIcon = '';

    if (site.season && site.risk === 'normal') {
        badgeClass = 'badge-success';
        statusText = 'Low potential danger';
        statusIcon = '✓';
    } else if (site.season && site.risk === 'increased') {
        badgeClass = 'badge-warning';
        statusText = 'High potential danger';
        statusIcon = '⚠';
    } else if (!site.season) {
        statusText = 'Off-season';
        statusIcon = '—';
    }

    let expiryText = '';
    if (site.expiresAt) {
        const expiryDate = new Date(site.expiresAt);
        if (expiryDate > now) {
            expiryText = `Valid until ${expiryDate.toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit'
            })}`;
        } else {
            expiryText = 'Forecast expired';
            badgeClass = 'badge-neutral';
        }
    }

    const title = site.season
        ? `EA Pollution Risk Forecast for ${site.label}. ${
              site.risk === 'increased'
                  ? 'Increased risk may be due to recent rainfall or storm overflows.'
                  : 'Normal risk indicates typical conditions.'
          } ${expiryText}`
        : null;

    return { badgeClass, statusText, statusIcon, expiryText, title };
}

/** Build the card element for one forecast site. */
export function createSiteCard(site: PrfSite, now: Date = new Date()): HTMLElement {
    const view = buildSiteCardView(site, now);

    const siteCard = document.createElement('div');
    siteCard.className = 'bg-base-100 rounded-lg shadow-md p-4';
    siteCard.innerHTML = `
          <h4 class="font-semibold text-base mb-2">${escapeHtml(site.label)}</h4>
          <div class="flex flex-col gap-2">
            <div class="badge ${view.badgeClass} badge-lg gap-2 py-4 px-3 w-full justify-center">
              <span class="text-lg">${view.statusIcon}</span>
              <span class="font-medium">${view.statusText}</span>
            </div>
            ${view.expiryText ? `<p class="text-xs text-base-content/60 text-center">${view.expiryText}</p>` : ''}
          </div>
        `;

    if (view.title) siteCard.setAttribute('title', view.title);

    return siteCard;
}

/** Load the forecast and render badges (or the off-season/error state). */
export async function loadPollutionRiskForecast(containerId: string, endpoint: string): Promise<void> {
    const badgesContainer = document.getElementById(`${containerId}-badges`);
    const errorAlert = document.getElementById(`${containerId}-error`);
    const offseasonAlert = document.getElementById(`${containerId}-offseason`);
    if (!badgesContainer) return;

    try {
        const data = await fetchJson<PrfData>(endpoint);

        if (!data.sites || data.sites.length === 0) {
            throw new Error('No data available');
        }

        badgesContainer.style.removeProperty('display');
        errorAlert?.classList.add('hidden');
        offseasonAlert?.classList.add('hidden');

        const allOffSeason = data.sites.every((site) => !site.season);
        if (allOffSeason) {
            badgesContainer.style.display = 'none';
            offseasonAlert?.classList.remove('hidden');
            return;
        }

        badgesContainer.innerHTML = '';
        data.sites.forEach((site) => {
            badgesContainer.appendChild(createSiteCard(site));
        });
    } catch (error) {
        console.error('Error loading pollution risk forecast:', error);
        badgesContainer.style.display = 'none';
        errorAlert?.classList.remove('hidden');
    }
}

let refreshTimer: ReturnType<typeof setInterval> | undefined;

/** Mount one pollution risk forecast panel (with 15-minute refresh). */
export function mountPollutionRiskForecast(root: HTMLElement): void {
    const { containerId, endpoint } = readPanelConfig(root, {
        containerId: '',
        endpoint: '/api/prf.json'
    });
    if (!containerId) return;

    void loadPollutionRiskForecast(containerId, endpoint);

    // Refresh every 15 minutes while the page is open; reset on re-mount.
    if (refreshTimer !== undefined) clearInterval(refreshTimer);
    refreshTimer = setInterval(() => void loadPollutionRiskForecast(containerId, endpoint), REFRESH_INTERVAL_MS);
}

let registered = false;

/** Mount all pollution risk forecast panels now and after navigation. */
export function registerPollutionRiskForecast(): void {
    if (registered) return;
    registered = true;
    onPageLoad(() => {
        document.querySelectorAll<HTMLElement>('[data-pollution-risk]').forEach(mountPollutionRiskForecast);
    });
}
