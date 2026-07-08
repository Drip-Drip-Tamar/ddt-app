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
import { Chart, type ChartConfiguration } from './chart-setup';

export interface PanelChart<T> {
    /** id of the target <canvas> element. */
    canvasId: string;
    /** Build the Chart.js configuration; return null to skip this chart. */
    buildConfig: (data: T) => ChartConfiguration | null;
}

export interface MountPanelOptions<T> {
    /** Endpoint fetched with an ok-check; alternative to `getData`. */
    endpoint?: string;
    /** Custom data fetcher (e.g. multiple endpoints in parallel). */
    getData?: () => Promise<T>;
    /** id of the error banner to reveal on any failure. */
    errorId: string;
    /** Optional id of an element to hide when data loading fails. */
    hideOnErrorId?: string;
    /** DOM updates to run as soon as data arrives (before charts render). */
    onData?: (data: T) => void;
    /** Charts to render lazily once the panel scrolls into view. */
    charts?: PanelChart<T>[];
    /** id of the element observed for lazy rendering (default: first canvas). */
    observeId?: string;
    /** Called if chart rendering fails (in addition to the error banner). */
    logLabel?: string;
}

/** Fetch JSON with the shared ok-check. */
export async function fetchJson<T>(endpoint: string): Promise<T> {
    const response = await fetch(endpoint);
    if (!response.ok) throw new Error(`Failed to fetch ${endpoint}`);
    return response.json() as Promise<T>;
}

/** Reveal an error banner by id (no-op when the element is absent). */
export function showError(errorId: string): void {
    document.getElementById(errorId)?.classList.remove('hidden');
}

/**
 * Render a chart onto a canvas, destroying any existing Chart instance
 * bound to it first so re-mounting is idempotent.
 */
export function renderChart(canvas: HTMLCanvasElement, config: ChartConfiguration): Chart {
    Chart.getChart(canvas)?.destroy();
    return new Chart(canvas, config);
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
    const { endpoint, getData, errorId, hideOnErrorId, onData, charts = [], observeId, logLabel = 'panel' } = options;

    try {
        const data = endpoint ? await fetchJson<T>(endpoint) : await getData!();

        onData?.(data);

        if (charts.length === 0) return;

        const observedId = observeId ?? charts[0].canvasId;
        const observed = document.getElementById(observedId);
        if (!observed) return;

        whenVisible(observed, () => {
            try {
                for (const { canvasId, buildConfig } of charts) {
                    const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
                    if (!canvas) continue;
                    const config = buildConfig(data);
                    if (!config) continue;
                    renderChart(canvas, config);
                }
            } catch (error) {
                console.error(`Failed to render ${logLabel} charts:`, error);
                showError(errorId);
            }
        });
    } catch (error) {
        console.error(`Error loading ${logLabel} data:`, error);
        showError(errorId);
        if (hideOnErrorId) document.getElementById(hideOnErrorId)?.classList.add('hidden');
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
