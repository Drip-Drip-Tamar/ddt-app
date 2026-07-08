/**
 * Environmental monitoring section (Tamar): river level, tidal level,
 * rainfall and storm overflow panels fed from three API endpoints.
 */
import type { ChartConfiguration } from 'chart.js';
import {
    angledTicks,
    axisTitle,
    baseChartOptions,
    chartColors,
    levelTooltipCallbacks,
    referenceLineAnnotation,
    tooltipY,
    typicalRangeAnnotations,
    type AnyTooltipItem
} from './theme';
import { formatDayHour, formatShortDateTime } from './format';
import { buildCsoActivityConfig, updateCsoDisplay, type CsoData } from './storm-overflow';
import { fetchJson, mountPanel, onPageLoad, readPanelConfig } from './mount-panel';

export interface LevelSeries {
    latest: number | null;
    lastUpdated?: string;
    status?: string;
    statusColor?: string;
    labels?: string[];
    values?: (number | null)[];
    typicalRange?: { low: number; high: number };
}

export interface RiverData {
    gunnislake?: LevelSeries;
    plymouth?: LevelSeries;
}

export interface RainfallPoint {
    t: string;
    mm: number;
}

export interface RainfallData {
    hourly?: RainfallPoint[];
    rolling24h?: RainfallPoint[];
    stations?: { name: string; distanceKm: number }[];
}

export interface EnvData {
    riverData: RiverData;
    rainfallData: RainfallData;
    csoData: CsoData;
}

export interface RainfallStatus {
    status: string;
    statusColor: string;
}

/** Classify 24h rainfall totals into the badge status/colour. */
export function summarizeRainfallStatus(mm: number): RainfallStatus {
    if (mm > 25) return { status: 'Heavy', statusColor: 'warning' };
    if (mm > 10) return { status: 'Moderate', statusColor: 'info' };
    if (mm < 1) return { status: 'Dry', statusColor: 'secondary' };
    return { status: 'Light', statusColor: 'success' };
}

/** River level (Gunnislake) line chart with typical-range annotations. */
export function buildRiverLevelConfig(riverData: RiverData): ChartConfiguration | null {
    const gunnislake = riverData.gunnislake;
    if (!gunnislake) return null;

    const base = baseChartOptions();
    return {
        type: 'line',
        data: {
            labels: gunnislake.labels,
            datasets: [
                {
                    label: 'River Level (m)',
                    data: gunnislake.values ?? [],
                    borderColor: chartColors.blue,
                    backgroundColor: chartColors.blueFill,
                    tension: 0.3,
                    borderWidth: 2,
                    pointRadius: 1,
                    pointHoverRadius: 3,
                    fill: true
                }
            ]
        },
        options: {
            ...base,
            plugins: {
                ...base.plugins,
                tooltip: {
                    callbacks: levelTooltipCallbacks('m', 3)
                },
                annotation: {
                    annotations: typicalRangeAnnotations(gunnislake.typicalRange?.low ?? 0, gunnislake.typicalRange?.high ?? 0)
                }
            },
            scales: {
                x: {
                    display: true,
                    ticks: angledTicks(8)
                },
                y: {
                    display: true,
                    title: axisTitle('Level (m)'),
                    ticks: {
                        callback: (value) => Number(value).toFixed(1),
                        font: { size: 10 }
                    }
                }
            }
        }
    };
}

/** Tidal level (Plymouth) line chart with mean sea level reference line. */
export function buildTidalLevelConfig(riverData: RiverData): ChartConfiguration | null {
    const plymouth = riverData.plymouth;
    if (!plymouth) return null;

    const base = baseChartOptions();
    return {
        type: 'line',
        data: {
            labels: plymouth.labels,
            datasets: [
                {
                    label: 'Tidal Level (mAOD)',
                    data: plymouth.values ?? [],
                    borderColor: chartColors.purple,
                    backgroundColor: chartColors.purpleFill,
                    tension: 0.3,
                    borderWidth: 2,
                    pointRadius: 1,
                    pointHoverRadius: 3,
                    fill: true
                }
            ]
        },
        options: {
            ...base,
            plugins: {
                ...base.plugins,
                tooltip: {
                    callbacks: levelTooltipCallbacks('mAOD', 2)
                },
                annotation: {
                    annotations: {
                        meanSeaLevel: referenceLineAnnotation(0, 'Mean Sea Level')
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    ticks: angledTicks(8)
                },
                y: {
                    display: true,
                    title: axisTitle('Level (mAOD)'),
                    ticks: {
                        callback: (value) => Number(value).toFixed(1),
                        font: { size: 10 }
                    }
                }
            }
        }
    };
}

/** Rainfall combo chart: hourly bars + 24h rolling total line (dual axis). */
export function buildRainfallConfig(rainfallData: RainfallData): ChartConfiguration | null {
    if (!rainfallData.hourly) return null;

    const base = baseChartOptions();
    return {
        type: 'bar',
        data: {
            labels: rainfallData.hourly.map((h) => formatDayHour(h.t)),
            datasets: [
                {
                    label: 'Hourly Rainfall (mm)',
                    data: rainfallData.hourly.map((h) => h.mm),
                    backgroundColor: chartColors.blueBar,
                    borderColor: chartColors.blue,
                    borderWidth: 1,
                    type: 'bar',
                    yAxisID: 'y',
                    order: 2
                },
                {
                    label: '24h Rolling Total (mm)',
                    data: (rainfallData.rolling24h ?? []).map((h) => h.mm),
                    borderColor: chartColors.red,
                    backgroundColor: chartColors.redFill,
                    borderWidth: 2,
                    tension: 0.4,
                    type: 'line',
                    yAxisID: 'y1',
                    pointRadius: 0,
                    pointHoverRadius: 3,
                    order: 1
                }
            ]
        },
        options: {
            ...base,
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        boxWidth: 12,
                        font: { size: 10 }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: (context: AnyTooltipItem) => {
                            if (context.dataset.type === 'bar') {
                                return `Hourly: ${tooltipY(context).toFixed(1)} mm`;
                            }
                            return `24h Total: ${tooltipY(context).toFixed(1)} mm`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    ticks: angledTicks(12, 9)
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: axisTitle('Hourly (mm)'),
                    ticks: {
                        font: { size: 10 }
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: axisTitle('24h Total (mm)'),
                    ticks: {
                        font: { size: 10 }
                    },
                    grid: {
                        drawOnChartArea: false
                    }
                }
            }
        }
    };
}

function updateLevelDisplay(series: LevelSeries | undefined, chartId: string, decimals: number): void {
    if (!series || series.latest === null || series.latest === undefined) return;

    const valueEl = document.getElementById(`${chartId}-value`);
    const timeEl = document.getElementById(`${chartId}-time`);
    const badgeEl = document.getElementById(`${chartId}-badge`);

    if (valueEl) valueEl.textContent = series.latest.toFixed(decimals);
    if (timeEl && series.lastUpdated) timeEl.textContent = formatShortDateTime(series.lastUpdated);
    if (badgeEl) {
        badgeEl.textContent = series.status ?? '';
        badgeEl.className = `badge badge-lg badge-${series.statusColor}`;
    }
}

function updateRainfallDisplay(rainfallData: RainfallData, chartId: string): void {
    const valueEl = document.getElementById(`${chartId}-value`);
    const timeEl = document.getElementById(`${chartId}-time`);
    const badgeEl = document.getElementById(`${chartId}-badge`);
    const stationsEl = document.getElementById(`${chartId}-stations`);

    if (rainfallData.rolling24h && rainfallData.rolling24h.length > 0) {
        const latest24h = rainfallData.rolling24h[rainfallData.rolling24h.length - 1];
        if (valueEl) valueEl.textContent = latest24h.mm.toFixed(1);
        if (timeEl) timeEl.textContent = `As of ${formatShortDateTime(latest24h.t)}`;

        const { status, statusColor } = summarizeRainfallStatus(latest24h.mm);
        if (badgeEl) {
            badgeEl.textContent = status;
            badgeEl.className = `badge badge-lg badge-${statusColor}`;
        }
    }

    if (stationsEl && rainfallData.stations && rainfallData.stations.length > 0) {
        const stationNames = rainfallData.stations.map((s) => `${s.name} (${s.distanceKm}km)`).join(', ');
        stationsEl.textContent = `Stations: ${stationNames}`;
    }
}

interface EnvPanelIds {
    gunnislakeChartId: string;
    plymouthChartId: string;
    rainfallChartId: string;
    csoChartId: string;
}

/** Mount one environmental monitoring section. */
export function mountEnvironmentalMonitoring(root: HTMLElement): void {
    const ids: EnvPanelIds = readPanelConfig(root, {
        gunnislakeChartId: '',
        plymouthChartId: '',
        rainfallChartId: '',
        csoChartId: ''
    });
    if (!ids.gunnislakeChartId) return;

    void mountPanel<EnvData>({
        getData: async () => {
            const [riverData, rainfallData, csoData] = await Promise.all([
                fetchJson<RiverData>('/api/tamar-level.json'),
                fetchJson<RainfallData>('/api/rainfall.json'),
                fetchJson<CsoData>('/api/cso-live.json')
            ]);
            return { riverData, rainfallData, csoData };
        },
        errorId: 'env-monitoring-error',
        onData: ({ riverData, rainfallData, csoData }) => {
            updateLevelDisplay(riverData.gunnislake, ids.gunnislakeChartId, 3);
            updateLevelDisplay(riverData.plymouth, ids.plymouthChartId, 2);
            updateRainfallDisplay(rainfallData, ids.rainfallChartId);
            updateCsoDisplay(csoData, ids.csoChartId, 5, 'max-w-[120px]');
        },
        observeId: ids.gunnislakeChartId,
        charts: [
            { canvasId: ids.gunnislakeChartId, buildConfig: (d) => buildRiverLevelConfig(d.riverData) },
            { canvasId: ids.plymouthChartId, buildConfig: (d) => buildTidalLevelConfig(d.riverData) },
            { canvasId: ids.rainfallChartId, buildConfig: (d) => buildRainfallConfig(d.rainfallData) },
            { canvasId: ids.csoChartId, buildConfig: (d) => buildCsoActivityConfig(d.csoData) }
        ],
        logLabel: 'environmental monitoring'
    });
}

let registered = false;

/** Mount all environmental monitoring sections now and after navigation. */
export function registerEnvironmentalMonitoring(): void {
    if (registered) return;
    registered = true;
    onPageLoad(() => {
        document.querySelectorAll<HTMLElement>('[data-env-monitoring]').forEach(mountEnvironmentalMonitoring);
    });
}
