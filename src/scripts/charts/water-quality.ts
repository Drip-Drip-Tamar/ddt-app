/**
 * Water quality chart: applies site colours, spike-point styling and the
 * shifted-log-scale callbacks to the server-computed chart payload, then
 * renders it. Also owns the optional data-table toggle.
 */
import type { ChartConfiguration, ScriptableContext } from 'chart.js';
import { onPageLoad, renderChart, whenVisible } from './mount-panel';

export const SHIFT_OFFSET = 100;

export interface WaterDataset {
    label: string;
    data: (number | null)[];
    rawValues?: (number | null)[];
    borderColor?: string;
    backgroundColor?: string;
    pointRadius?: unknown;
    pointHoverRadius?: unknown;
    pointBackgroundColor?: unknown;
    pointBorderColor?: unknown;
    pointBorderWidth?: unknown;
    [key: string]: unknown;
}

export interface WaterChartData {
    labels: string[];
    datasets: WaterDataset[];
}

/** Serialized chart options from the server (plain JSON, callbacks re-attached client-side). */
export interface WaterChartOptions {
    scales?: {
        y?: {
            max?: number;
            ticks?: { callback?: (value: number) => string } & Record<string, unknown>;
        } & Record<string, unknown>;
    } & Record<string, unknown>;
    plugins?: {
        tooltip?: { callbacks?: unknown } & Record<string, unknown>;
    } & Record<string, unknown>;
    [key: string]: unknown;
}

export interface WaterChartPayload {
    chartData: WaterChartData;
    chartConfig: WaterChartOptions;
    chartType: string;
}

// Colours grouped by bacteria type (blue family = E. coli, purple = Enterococci),
// with location differentiated by shade (Calstock darker, Okel Tor lighter).
export const waterQualityColors: Record<string, Record<string, string>> = {
    ecoli: {
        Calstock: 'rgb(37, 99, 235)',
        'Calstock-bg': 'rgba(37, 99, 235, 0.2)',
        'Okel Tor': 'rgb(96, 165, 250)',
        'Okel Tor-bg': 'rgba(96, 165, 250, 0.2)'
    },
    enterococci: {
        Calstock: 'rgb(124, 58, 237)',
        'Calstock-bg': 'rgba(124, 58, 237, 0.2)',
        'Okel Tor': 'rgb(167, 139, 250)',
        'Okel Tor-bg': 'rgba(167, 139, 250, 0.2)'
    }
};

/** Normalise a site name by stripping invisible Unicode characters. */
export function normalizeSiteName(rawSite: string): string {
    return rawSite.replace(/[\u200B-\u200D\uFEFF\u00A0\u202F\u205F\u3000]/g, '').trim();
}

function rawValueAt(context: ScriptableContext<'line'>): number | null | undefined {
    const rawValues = (context.dataset as WaterDataset).rawValues;
    return rawValues?.[context.dataIndex];
}

/**
 * Apply bacteria/site colours and dynamic spike-point styling to each
 * dataset (mutates the datasets, as the previous inline script did).
 */
export function applyDatasetStyles(chartData: WaterChartData): void {
    chartData.datasets.forEach((dataset) => {
        const rawSite = dataset.label.split(' - ')[0];
        const site = normalizeSiteName(rawSite);
        const bacteriaType = dataset.label.includes('E. coli') ? 'ecoli' : 'enterococci';
        const isEcoli = bacteriaType === 'ecoli';
        const spikeThreshold = isEcoli ? 1000 : 400;

        if (waterQualityColors[bacteriaType] && waterQualityColors[bacteriaType][site]) {
            dataset.borderColor = waterQualityColors[bacteriaType][site];
            dataset.backgroundColor = waterQualityColors[bacteriaType][site + '-bg'];
        }

        dataset.pointRadius = (context: ScriptableContext<'line'>) => {
            const raw = rawValueAt(context);
            if (raw === null || raw === undefined) return 0;
            return raw > spikeThreshold ? 6 : 3;
        };

        dataset.pointHoverRadius = (context: ScriptableContext<'line'>) => {
            const raw = rawValueAt(context);
            if (raw === null || raw === undefined) return 0;
            return raw > spikeThreshold ? 8 : 5;
        };

        dataset.pointBackgroundColor = (context: ScriptableContext<'line'>) => {
            const raw = rawValueAt(context);
            if (raw === null || raw === undefined) return 'transparent';
            if (raw > spikeThreshold) {
                return waterQualityColors[bacteriaType]?.[site] || 'rgb(239, 68, 68)';
            }
            return waterQualityColors[bacteriaType]?.[site] || 'rgb(59, 130, 246)';
        };

        dataset.pointBorderColor = (context: ScriptableContext<'line'>) => {
            const raw = rawValueAt(context);
            if (raw === null || raw === undefined) return 'transparent';
            return raw > spikeThreshold ? 'rgba(255, 255, 255, 0.8)' : 'transparent';
        };

        dataset.pointBorderWidth = (context: ScriptableContext<'line'>) => {
            const raw = rawValueAt(context);
            if (raw === null || raw === undefined) return 0;
            return raw > spikeThreshold ? 2 : 0;
        };
    });
}

/** Max transformed Y value across all datasets (min 2 ≈ log10(10 + 100)). */
export function computeDataMaxY(chartData: WaterChartData): number {
    let dataMaxY = 2;
    chartData.datasets.forEach((dataset) => {
        dataset.data.forEach((value) => {
            if (value !== null && value !== undefined && value > dataMaxY) {
                dataMaxY = value;
            }
        });
    });
    return dataMaxY;
}

/** Y-axis tick label in actual cfu (inverting the shifted log transform). */
export function formatYAxisTick(value: number): string {
    const actual = Math.pow(10, value) - SHIFT_OFFSET;
    if (actual < 0 || actual > 100000) return '';
    if (actual >= 10000) return Math.round(actual / 1000) + 'K cfu';
    if (actual >= 1000) return Math.round(actual / 1000) + 'K cfu';
    if (actual >= 1) return Math.round(actual) + ' cfu';
    return '';
}

/**
 * Re-attach the callbacks that don't survive JSON serialization (tooltip
 * labels, tick formatting) and set the dynamic Y max. Mutates chartConfig.
 */
export function finalizeChartConfig(chartConfig: WaterChartOptions, chartData: WaterChartData): WaterChartOptions {
    if (!chartConfig.scales) chartConfig.scales = {};
    if (!chartConfig.scales.y) chartConfig.scales.y = {};
    chartConfig.scales.y.max = computeDataMaxY(chartData) + 0.3; // buffer in transformed space

    if (!chartConfig.plugins) chartConfig.plugins = {};
    if (!chartConfig.plugins.tooltip) chartConfig.plugins.tooltip = {};
    chartConfig.plugins.tooltip.callbacks = {
        label: (context: ScriptableContext<'line'> & { dataset: WaterDataset; dataIndex: number }) => {
            const raw = context.dataset.rawValues?.[context.dataIndex];
            if (raw === null || raw === undefined) return `${context.dataset.label}: No data`;
            return `${context.dataset.label}: ${raw} cfu/100ml`;
        }
    };

    if (!chartConfig.scales.y.ticks) chartConfig.scales.y.ticks = {};
    chartConfig.scales.y.ticks.callback = (value: number) => formatYAxisTick(value);

    return chartConfig;
}

/** Mount the chart for one water quality section. */
export function mountWaterQualityChart(root: HTMLElement): void {
    const payloadEl = root.querySelector<HTMLScriptElement>('script[data-water-chart-payload]');
    const canvas = root.querySelector<HTMLCanvasElement>('canvas.water-chart');
    const errorAlert = root.querySelector<HTMLElement>('[data-water-chart-error]');
    if (!payloadEl || !canvas) return;

    let payload: WaterChartPayload;
    try {
        payload = JSON.parse(payloadEl.textContent || '{}');
    } catch (error) {
        console.error('Invalid water quality chart payload:', error);
        errorAlert?.classList.remove('hidden');
        return;
    }

    whenVisible(canvas, () => {
        try {
            const { chartData, chartConfig, chartType } = payload;
            applyDatasetStyles(chartData);
            finalizeChartConfig(chartConfig, chartData);
            renderChart(canvas, {
                type: chartType,
                data: chartData,
                options: chartConfig
            } as unknown as ChartConfiguration);
        } catch (error) {
            console.error('Failed to load chart libraries:', error);
            errorAlert?.classList.remove('hidden');
        }
    });
}

/** Wire up the optional "View data table" toggle for one section. */
export function initTableToggle(root: HTMLElement): void {
    const toggleBtn = root.querySelector<HTMLButtonElement>('.table-toggle');
    if (!toggleBtn || toggleBtn.dataset.bound === 'true') return;
    toggleBtn.dataset.bound = 'true';

    const tableContainer = document.getElementById(toggleBtn.getAttribute('aria-controls') || '');
    if (!tableContainer) return;

    toggleBtn.addEventListener('click', () => {
        const isExpanded = toggleBtn.getAttribute('aria-expanded') === 'true';
        const toggleText = toggleBtn.querySelector('.toggle-text');
        const chevron = toggleBtn.querySelector<HTMLElement>('.chevron-icon');

        if (isExpanded) {
            toggleBtn.setAttribute('aria-expanded', 'false');
            if (toggleText) toggleText.textContent = 'View data table';
            tableContainer.style.maxHeight = '0';
            if (chevron) chevron.style.transform = 'rotate(0deg)';
        } else {
            toggleBtn.setAttribute('aria-expanded', 'true');
            if (toggleText) toggleText.textContent = 'Hide data table';
            tableContainer.style.maxHeight = tableContainer.scrollHeight + 'px';
            if (chevron) chevron.style.transform = 'rotate(180deg)';
        }
    });
}

let registered = false;

/** Mount all water quality sections now and after client-side navigation. */
export function registerWaterQualityCharts(): void {
    if (registered) return;
    registered = true;
    onPageLoad(() => {
        document.querySelectorAll<HTMLElement>('[data-water-quality]').forEach((root) => {
            mountWaterQualityChart(root);
            initTableToggle(root);
        });
    });
}
