/**
 * Deep envelope for all chart panels.
 *
 * Owns the shared lifecycle once for every panel:
 *   fetch → ok-check → json → DOM updates → lazy chart render → error banner
 *
 * Also owns the page lifecycle (Task 8): panels register via `onPageLoad`,
 * which runs the mount immediately (bundled module scripts are deferred, so
 * the DOM is ready) AND on `astro:page-load` so charts re-initialise after
 * any future view-transition navigation. Mounting is idempotent — any Chart
 * instance already attached to a canvas is destroyed before re-creating.
 */
import type { Chart, ChartConfiguration } from './chart-setup';

export interface PanelChart<T> {
    /** id of the target <canvas> element. */
    canvasId: string;
    /** Build the Chart.js configuration; return null to skip this chart. */
    buildConfig: (data: T) => ChartConfiguration | null;
}

export interface MountPanelOptions<T> {
    /** Endpoint fetched with an ok-check and a bounded wait. */
    endpoint: string;
    /** id of the error banner to reveal on any failure. */
    errorId: string;
    /** Optional id of an element to hide when data loading fails. */
    hideOnErrorId?: string;
    /** DOM updates to run as soon as data arrives (before charts render). */
    onData?: (data: T) => void;
    /** Charts to render lazily once the panel scrolls into view. */
    charts?: PanelChart<T>[];
    /** Called if chart rendering fails (in addition to the error banner). */
    logLabel?: string;
}

/** Fetch JSON with the shared ok-check. */
export async function fetchJson<T>(endpoint: string): Promise<T> {
    const response = await fetch(endpoint, { signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error(`Failed to fetch ${endpoint}`);
    return response.json() as Promise<T>;
}

/** Reveal an error banner by id (no-op when the element is absent). */
export function showError(errorId: string): void {
    document.getElementById(errorId)?.classList.remove('hidden');
}

/** Settle the reserved loading area on success, missing data, or failure. */
export function finishVisualization(element: Element, message?: string): void {
    const frame = element.closest<HTMLElement>('[data-visualization]');
    if (!frame) return;
    frame.setAttribute('aria-busy', 'false');
    frame.dataset.state = message ? 'unavailable' : 'ready';
    const loading = frame.querySelector<HTMLElement>('[data-visualization-loading]');
    if (!loading) return;
    if (message) loading.textContent = message;
    else loading.hidden = true;
}

/**
 * Render a chart onto a canvas, destroying any existing Chart instance
 * bound to it first so re-mounting is idempotent.
 */
export async function renderChart(canvas: HTMLCanvasElement, config: ChartConfiguration): Promise<Chart | undefined> {
    const { Chart } = await import('./chart-setup');
    if (!canvas.isConnected) return;
    Chart.getChart(canvas)?.destroy();
    const chart = new Chart(canvas, { ...config, options: { ...config.options, animation: false } });
    finishVisualization(canvas);
    return chart;
}

/**
 * Run a callback once when an element scrolls near the viewport
 * (IntersectionObserver, 50px root margin — matches previous behaviour).
 */
export function whenVisible(element: Element, callback: () => void): void {
    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    observer.disconnect();
                    callback();
                }
            });
        },
        { rootMargin: '50px' }
    );
    observer.observe(element);
}

/**
 * Read a typed panel configuration from an element's data-attributes.
 * Missing keys fall back to the supplied defaults.
 */
export function readPanelConfig<T extends Record<string, string>>(element: HTMLElement, defaults: T): T {
    const config = { ...defaults };
    for (const key of Object.keys(defaults) as (keyof T)[]) {
        const value = element.dataset[key as string];
        if (value !== undefined) config[key] = value as T[keyof T];
    }
    return config;
}

/** The shared panel lifecycle. */
export async function mountPanel<T>(options: MountPanelOptions<T>): Promise<void> {
    const { endpoint, errorId, hideOnErrorId, onData, charts = [], logLabel = 'panel' } = options;

    try {
        const data = await fetchJson<T>(endpoint);

        onData?.(data);

        for (const { canvasId, buildConfig } of charts) {
            const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
            if (!canvas) continue;
            whenVisible(canvas, async () => {
                try {
                    const config = buildConfig(data);
                    if (!config) {
                        finishVisualization(canvas, 'No chart data is available.');
                        return;
                    }
                    await renderChart(canvas, config);
                } catch (error) {
                    console.error(`Failed to render ${logLabel} charts:`, error);
                    finishVisualization(canvas, 'Unable to display this chart. Please reload to try again.');
                    showError(errorId);
                }
            });
        }
    } catch (error) {
        console.error(`Error loading ${logLabel} data:`, error);
        showError(errorId);
        if (hideOnErrorId) document.getElementById(hideOnErrorId)?.classList.add('hidden');
        for (const { canvasId } of charts) {
            const canvas = document.getElementById(canvasId);
            if (canvas) finishVisualization(canvas, 'Data unavailable. Please reload to try again.');
            for (const suffix of ['current', 'stations', 'events']) {
                document.getElementById(`${canvasId}-${suffix}`)?.classList.add('hidden');
            }
        }
    }
}

/**
 * Register a mount function for the page lifecycle: run it now (module
 * scripts are deferred, so the DOM is parsed) and again after every
 * `astro:page-load` (view-transition navigation), relying on idempotent
 * mounting to avoid duplicates.
 */
export function onPageLoad(mount: () => void): void {
    document.addEventListener('astro:page-load', mount);
    mount();
}
