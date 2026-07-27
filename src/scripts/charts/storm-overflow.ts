/**
 * Storm overflow (CSO) panel: transforms + chart config for the 5-day CSO
 * activity chart and the recent-events table. Shared by the standalone
 * TamarStormOverflow component and the environmental monitoring section.
 */
import type { ChartConfiguration } from 'chart.js';
import { angledTicks, axisTitle, baseChartOptions, chartColors, tooltipY, type AnyTooltipItem } from './theme';
import { escapeHtml, formatDayHour, formatDurationMinutes, formatShortDateTime } from './format';
import { mountPanel, onPageLoad, readPanelConfig } from './mount-panel';

export interface CsoEvent {
    site: string;
    start: string;
    status: string;
    durationMin?: number | null;
    distanceKm?: number | null;
}

export interface CsoSeriesPoint {
    t: string;
    count: number;
}

export interface CsoData {
    events?: CsoEvent[];
    activeSeries?: CsoSeriesPoint[];
}

export interface CsoStatus {
    activeCount: number;
    status: string;
    statusColor: string;
}

/** Count active overflows and derive the badge status/colour. */
export function summarizeCsoStatus(events: CsoEvent[] | undefined): CsoStatus {
    const activeCount = events ? events.filter((e) => e.status === 'active').length : 0;

    let status = 'Clear';
    let statusColor = 'success';
    if (activeCount > 2) {
        status = 'Multiple Active';
        statusColor = 'error';
    } else if (activeCount > 0) {
        status = 'Active';
        statusColor = 'warning';
    }

    return { activeCount, status, statusColor };
}

/** Render the recent-events table rows as an HTML string. */
export function renderCsoEventRows(events: CsoEvent[] | undefined, limit: number, maxWidthClass: string): string {
    const empty = '<tr><td colspan="4" class="text-center text-base-content/60">No recent events</td></tr>';
    if (!events || events.length === 0) return empty;

    const rows = events
        .slice(0, limit)
        .map((event) => {
            const startStr = formatShortDateTime(event.start);

            let durationStr = '—';
            if (event.durationMin) {
                durationStr = formatDurationMinutes(event.durationMin);
            } else if (event.status === 'active') {
                durationStr = 'Ongoing';
            }

            const statusBadge =
                event.status === 'active'
                    ? '<span class="badge badge-error badge-xs">Active</span>'
                    : '<span class="badge badge-ghost badge-xs">Ended</span>';

            const distance = event.distanceKm ? ` (${event.distanceKm}km)` : '';
            const site = escapeHtml(event.site);

            return `
            <tr>
              <td class="truncate ${maxWidthClass}" title="${site}">
                ${site}${distance}
              </td>
              <td>${startStr}</td>
              <td>${durationStr}</td>
              <td>${statusBadge}</td>
            </tr>
          `;
        })
        .join('');

    return rows || empty;
}

/** Build the stepped "active overflows" line chart configuration. */
export function buildCsoActivityConfig(data: CsoData): ChartConfiguration | null {
    if (!data.activeSeries) return null;

    const base = baseChartOptions();
    return {
        type: 'line',
        data: {
            labels: data.activeSeries.map((point) => formatDayHour(point.t)),
            datasets: [
                {
                    label: 'Active Overflows',
                    data: data.activeSeries.map((point) => point.count),
                    borderColor: chartColors.red,
                    backgroundColor: chartColors.redFillStrong,
                    borderWidth: 2,
                    tension: 0.1,
                    fill: true,
                    stepped: 'before',
                    pointRadius: 0,
                    pointHoverRadius: 3
                }
            ]
        },
        options: {
            ...base,
            plugins: {
                ...base.plugins,
                tooltip: {
                    callbacks: {
                        label: (context: AnyTooltipItem) => {
                            const count = tooltipY(context);
                            return count === 1 ? '1 active overflow' : `${count} active overflows`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    ticks: angledTicks(10, 9)
                },
                y: {
                    display: true,
                    title: axisTitle('Active Count'),
                    ticks: {
                        stepSize: 1,
                        font: { size: 10 }
                    },
                    beginAtZero: true
                }
            }
        }
    };
}

/** Update the status display (count, timestamp, badge) and events table. */
export function updateCsoDisplay(data: CsoData, chartId: string, eventRowLimit: number, maxWidthClass: string): void {
    const valueEl = document.getElementById(`${chartId}-value`);
    const timeEl = document.getElementById(`${chartId}-time`);
    const badgeEl = document.getElementById(`${chartId}-badge`);
    const eventsEl = document.getElementById(`${chartId}-events`);

    const { activeCount, status, statusColor } = summarizeCsoStatus(data.events);

    if (valueEl) valueEl.textContent = activeCount.toString();
    if (timeEl) timeEl.textContent = `As of ${formatShortDateTime(new Date())}`;
    if (badgeEl) {
        badgeEl.textContent = status;
        badgeEl.className = `badge badge-lg badge-${statusColor}`;
    }
    if (eventsEl) eventsEl.innerHTML = renderCsoEventRows(data.events, eventRowLimit, maxWidthClass);
}

/** Mount one standalone storm overflow panel. */
export function mountStormOverflowPanel(root: HTMLElement): void {
    const { chartId, endpoint } = readPanelConfig(root, {
        chartId: '',
        endpoint: '/api/cso-live.json'
    });
    if (!chartId) return;

    void mountPanel<CsoData>({
        endpoint,
        errorId: 'cso-error',
        hideOnErrorId: `${chartId}-current`,
        onData: (data) => updateCsoDisplay(data, chartId, 10, 'max-w-[150px]'),
        charts: [{ canvasId: chartId, buildConfig: buildCsoActivityConfig }],
        logLabel: 'CSO'
    });
}

let registered = false;

/** Mount all storm overflow panels now and after client-side navigation. */
export function registerStormOverflowPanels(): void {
    if (registered) return;
    registered = true;
    onPageLoad(() => {
        document.querySelectorAll<HTMLElement>('[data-storm-overflow]').forEach(mountStormOverflowPanel);
    });
}
