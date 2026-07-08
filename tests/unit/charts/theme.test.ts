import { describe, it, expect } from 'vitest';
import {
  chartColors,
  baseChartOptions,
  angledTicks,
  axisTitle,
  levelTooltipCallbacks,
  typicalRangeAnnotations,
  referenceLineAnnotation,
  tooltipY,
  type AnyTooltipItem
} from '../../../src/scripts/charts/theme';

describe('theme.ts', () => {
  describe('tooltipY', () => {
    it('reads the numeric y value from parsed tooltip data', () => {
      const context = { parsed: { y: 42.5 } } as unknown as AnyTooltipItem;
      expect(tooltipY(context)).toBe(42.5);
    });
  });

  describe('chartColors', () => {
    it('exposes the expected palette keys as rgb/rgba strings', () => {
      expect(chartColors.blue).toBe('rgb(59, 130, 246)');
      expect(chartColors.red).toMatch(/^rgb/);
      expect(chartColors.greenFill).toMatch(/^rgba/);
      expect(Object.keys(chartColors).length).toBeGreaterThan(5);
    });
  });

  describe('baseChartOptions', () => {
    it('returns responsive options with legend hidden and index interaction', () => {
      const options = baseChartOptions();
      expect(options.responsive).toBe(true);
      expect(options.maintainAspectRatio).toBe(false);
      expect(options.interaction).toEqual({ mode: 'index', intersect: false });
      expect(options.plugins?.legend?.display).toBe(false);
    });
  });

  describe('angledTicks', () => {
    it('builds rotated auto-skipping ticks with the given max and default font size', () => {
      const ticks = angledTicks(8);
      expect(ticks).toEqual({
        maxRotation: 45,
        minRotation: 45,
        autoSkip: true,
        maxTicksLimit: 8,
        font: { size: 10 }
      });
    });

    it('accepts a custom font size', () => {
      const ticks = angledTicks(12, 9);
      expect(ticks.font).toEqual({ size: 9 });
      expect(ticks.maxTicksLimit).toBe(12);
    });
  });

  describe('axisTitle', () => {
    it('builds a displayed title with default font size', () => {
      expect(axisTitle('Level (m)')).toEqual({
        display: true,
        text: 'Level (m)',
        font: { size: 10 }
      });
    });

    it('accepts a custom font size', () => {
      expect(axisTitle('Active Count', 12).font).toEqual({ size: 12 });
    });
  });

  describe('levelTooltipCallbacks', () => {
    it('formats the label with unit and fixed decimals', () => {
      const callbacks = levelTooltipCallbacks('m', 3);
      const context = { parsed: { y: 1.23456 } } as unknown as AnyTooltipItem;
      expect(callbacks.label(context)).toBe('Level: 1.235 m');
    });

    it('respects a different decimal count and unit', () => {
      const callbacks = levelTooltipCallbacks('mAOD', 2);
      const context = { parsed: { y: 0.5 } } as unknown as AnyTooltipItem;
      expect(callbacks.label(context)).toBe('Level: 0.50 mAOD');
    });
  });

  describe('typicalRangeAnnotations', () => {
    it('builds a green dashed box between low/high and a typical-low marker line', () => {
      const annotations = typicalRangeAnnotations(0.2, 0.8);

      expect(annotations.typicalRange).toMatchObject({
        type: 'box',
        yMin: 0.2,
        yMax: 0.8,
        backgroundColor: chartColors.greenFill,
        borderColor: chartColors.greenBorder,
        borderDash: [5, 5]
      });

      expect(annotations.typicalLow).toMatchObject({
        type: 'line',
        yMin: 0.2,
        yMax: 0.2,
        borderColor: chartColors.green
      });
      expect(annotations.typicalLow.label).toMatchObject({
        display: true,
        content: 'Typical Low',
        position: 'start'
      });
    });
  });

  describe('referenceLineAnnotation', () => {
    it('builds a grey dashed horizontal line with a label defaulting to "end" position', () => {
      const annotation = referenceLineAnnotation(0, 'Mean Sea Level');
      expect(annotation.type).toBe('line');
      expect(annotation.yMin).toBe(0);
      expect(annotation.yMax).toBe(0);
      expect(annotation.borderColor).toBe(chartColors.grey);
      expect(annotation.label).toMatchObject({
        display: true,
        content: 'Mean Sea Level',
        position: 'end'
      });
    });

    it('accepts an explicit "start" position', () => {
      const annotation = referenceLineAnnotation(5, 'Threshold', 'start');
      expect(annotation.label.position).toBe('start');
    });
  });
});
