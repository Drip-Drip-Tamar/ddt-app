/**
 * Shared chart theme: colours, common option/scale/tooltip defaults and
 * annotation builders used across the environmental monitoring panels.
 */
import type { ChartOptions, ChartType, TooltipItem } from 'chart.js';

/** Tooltip item type compatible with the broad ChartOptions generic. */
export type AnyTooltipItem = TooltipItem<ChartType>;

/** Read the numeric y value from a tooltip item's parsed data. */
export function tooltipY(context: AnyTooltipItem): number {
    return (context.parsed as { y: number }).y;
}

/** Site colour palette (Tailwind-derived RGB values used by the panels). */
export const chartColors = {
    blue: 'rgb(59, 130, 246)',
    blueFill: 'rgba(59, 130, 246, 0.1)',
    blueBar: 'rgba(59, 130, 246, 0.6)',
    purple: 'rgb(139, 92, 246)',
    purpleFill: 'rgba(139, 92, 246, 0.1)',
    red: 'rgb(239, 68, 68)',
    redFill: 'rgba(239, 68, 68, 0.1)',
    redFillStrong: 'rgba(239, 68, 68, 0.2)',
    green: 'rgba(34, 197, 94, 0.5)',
    greenFill: 'rgba(34, 197, 94, 0.1)',
    greenBorder: 'rgba(34, 197, 94, 0.3)',
    grey: 'rgba(107, 114, 128, 0.5)'
} as const;

/**
 * Base options shared by every panel chart: responsive, index interaction,
 * legend hidden by default.
 */
export function baseChartOptions(): ChartOptions {
    return {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: 'index',
            intersect: false
        },
        plugins: {
            legend: {
                display: false
            }
        }
    };
}

/** Rotated, auto-skipping x-axis ticks used by all time-series panels. */
export function angledTicks(maxTicksLimit: number, fontSize = 10) {
    return {
        maxRotation: 45,
        minRotation: 45,
        autoSkip: true,
        maxTicksLimit,
        font: { size: fontSize }
    };
}

/** Small axis title used across panels. */
export function axisTitle(text: string, fontSize = 10) {
    return {
        display: true,
        text,
        font: { size: fontSize }
    };
}

/** Tooltip callback rendering "Level: <y> <unit>" with fixed decimals. */
export function levelTooltipCallbacks(unit: string, decimals: number) {
    return {
        label: (context: AnyTooltipItem) => `Level: ${tooltipY(context).toFixed(decimals)} ${unit}`
    };
}

/**
 * "Typical range" annotations: a green dashed box between low/high plus a
 * "Typical Low" marker line (used by the river level panel).
 */
export function typicalRangeAnnotations(low: number, high: number) {
    return {
        typicalRange: {
            type: 'box' as const,
            yMin: low,
            yMax: high,
            backgroundColor: chartColors.greenFill,
            borderColor: chartColors.greenBorder,
            borderWidth: 1,
            borderDash: [5, 5]
        },
        typicalLow: {
            type: 'line' as const,
            yMin: low,
            yMax: low,
            borderColor: chartColors.green,
            borderWidth: 1,
            borderDash: [2, 2],
            label: {
                display: true,
                content: 'Typical Low',
                position: 'start' as const,
                font: { size: 9 }
            }
        }
    };
}

/** Horizontal dashed reference line with an optional label. */
export function referenceLineAnnotation(y: number, label: string, position: 'start' | 'end' = 'end') {
    return {
        type: 'line' as const,
        yMin: y,
        yMax: y,
        borderColor: chartColors.grey,
        borderWidth: 1,
        borderDash: [5, 5],
        label: {
            display: true,
            content: label,
            position,
            font: { size: 9 }
        }
    };
}
