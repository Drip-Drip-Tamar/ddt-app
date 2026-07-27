/**
 * Central Chart.js setup.
 *
 * Imports Chart.js and the annotation plugin from npm (bundled by Vite)
 * and registers them once. All chart modules import `Chart` from here so
 * registration is guaranteed before any chart is created.
 */
import { Chart, registerables } from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';

Chart.register(...registerables, annotationPlugin);

export { Chart };
export type { ChartConfiguration } from 'chart.js';
