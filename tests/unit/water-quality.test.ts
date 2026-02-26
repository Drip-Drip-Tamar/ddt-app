import { describe, it, expect, vi, beforeAll } from 'vitest';
import { transformSamplesToChartData, getChartConfig, toDisplay } from '../../src/data/waterQuality';

// Mock environment variables
beforeAll(() => {
  vi.stubEnv('SANITY_PROJECT_ID', 'test-project-id');
  vi.stubEnv('SANITY_DATASET', 'test-dataset');
});

// Mock the Sanity client module
vi.mock('../../src/utils/sanity-client', () => ({
  client: {
    fetch: vi.fn()
  }
}));

describe('Water Quality Data Transformation', () => {
  describe('transformSamplesToChartData', () => {
    it('should transform samples into Chart.js format with correct structure', () => {
      const samples = [
        {
          _id: 'sample-1',
          date: '2025-01-15',
          siteName: 'Calstock',
          siteSlug: 'calstock',
          ecoli: 250,
          enterococci: 100
        },
        {
          _id: 'sample-2',
          date: '2025-01-20',
          siteName: 'Calstock',
          siteSlug: 'calstock',
          ecoli: 500,
          enterococci: 200
        }
      ];

      const result = transformSamplesToChartData(samples);

      expect(result).toHaveProperty('labels');
      expect(result).toHaveProperty('datasets');
      expect(Array.isArray(result.labels)).toBe(true);
      expect(Array.isArray(result.datasets)).toBe(true);
    });

    it('should create 2N datasets for N sites (ecoli + enterococci per site)', () => {
      const samples = [
        {
          _id: 'sample-1',
          date: '2025-01-15',
          siteName: 'Calstock',
          siteSlug: 'calstock',
          ecoli: 250,
          enterococci: 100
        },
        {
          _id: 'sample-2',
          date: '2025-01-15',
          siteName: 'Okel Tor',
          siteSlug: 'okel-tor',
          ecoli: 300,
          enterococci: 150
        }
      ];

      const result = transformSamplesToChartData(samples);

      // 2 sites should produce 4 datasets (2 per site)
      expect(result.datasets).toHaveLength(4);
      expect(result.datasets[0].label).toContain('E. coli');
      expect(result.datasets[1].label).toContain('Enterococci');
      expect(result.datasets[2].label).toContain('E. coli');
      expect(result.datasets[3].label).toContain('Enterococci');
    });

    it('should format dataset labels correctly', () => {
      const samples = [
        {
          _id: 'sample-1',
          date: '2025-01-15',
          siteName: 'Calstock',
          siteSlug: 'calstock',
          ecoli: 250,
          enterococci: 100
        }
      ];

      const result = transformSamplesToChartData(samples);

      expect(result.datasets[0].label).toBe('Calstock - E. coli');
      expect(result.datasets[1].label).toBe('Calstock - Enterococci');
    });

    it('should add borderDash to enterococci datasets but not ecoli', () => {
      const samples = [
        {
          _id: 'sample-1',
          date: '2025-01-15',
          siteName: 'Calstock',
          siteSlug: 'calstock',
          ecoli: 250,
          enterococci: 100
        }
      ];

      const result = transformSamplesToChartData(samples);

      // E. coli dataset should not have borderDash
      expect(result.datasets[0].borderDash).toBeUndefined();
      // Enterococci dataset should have borderDash [5, 5]
      expect(result.datasets[1].borderDash).toEqual([5, 5]);
    });

    it('should preserve null values for Chart.js gaps', () => {
      const samples = [
        {
          _id: 'sample-1',
          date: '2025-01-15',
          siteName: 'Calstock',
          siteSlug: 'calstock',
          ecoli: null,
          enterococci: null
        }
      ];

      const result = transformSamplesToChartData(samples);

      expect(result.datasets[0].data[0]).toBeNull();
      expect(result.datasets[1].data[0]).toBeNull();
    });

    it('should preserve undefined values as null for Chart.js gaps', () => {
      const samples = [
        {
          _id: 'sample-1',
          date: '2025-01-15',
          siteName: 'Calstock',
          siteSlug: 'calstock',
          ecoli: undefined,
          enterococci: undefined
        }
      ];

      const result = transformSamplesToChartData(samples);

      expect(result.datasets[0].data[0]).toBeNull();
      expect(result.datasets[1].data[0]).toBeNull();
    });

    it('should clamp values less than 1 to 1 and apply shifted log transformation', () => {
      const samples = [
        {
          _id: 'sample-1',
          date: '2025-01-15',
          siteName: 'Calstock',
          siteSlug: 'calstock',
          ecoli: 0,
          enterococci: 0.5
        }
      ];

      const result = transformSamplesToChartData(samples);

      // Raw values should be clamped to 1
      expect(result.datasets[0].rawValues[0]).toBe(1);
      expect(result.datasets[1].rawValues[0]).toBe(1);

      // Data should be transformed using shifted log
      expect(result.datasets[0].data[0]).toBeCloseTo(toDisplay(1), 5);
      expect(result.datasets[1].data[0]).toBeCloseTo(toDisplay(1), 5);
    });

    it('should apply shifted log transformation to values equal to or greater than 1', () => {
      const samples = [
        {
          _id: 'sample-1',
          date: '2025-01-15',
          siteName: 'Calstock',
          siteSlug: 'calstock',
          ecoli: 1,
          enterococci: 1000
        }
      ];

      const result = transformSamplesToChartData(samples);

      // Raw values should be preserved
      expect(result.datasets[0].rawValues[0]).toBe(1);
      expect(result.datasets[1].rawValues[0]).toBe(1000);

      // Data should be transformed
      expect(result.datasets[0].data[0]).toBeCloseTo(toDisplay(1), 5);
      expect(result.datasets[1].data[0]).toBeCloseTo(toDisplay(1000), 5);
    });

    it('should handle extreme outliers with shifted log transformation', () => {
      const samples = [
        {
          _id: 'sample-1',
          date: '2025-01-15',
          siteName: 'Calstock',
          siteSlug: 'calstock',
          ecoli: 100000,
          enterococci: 50000
        }
      ];

      const result = transformSamplesToChartData(samples);

      // Raw values should be preserved
      expect(result.datasets[0].rawValues[0]).toBe(100000);
      expect(result.datasets[1].rawValues[0]).toBe(50000);

      // Data should be transformed using shifted log
      expect(result.datasets[0].data[0]).toBeCloseTo(toDisplay(100000), 5);
      expect(result.datasets[1].data[0]).toBeCloseTo(toDisplay(50000), 5);
    });

    it('should format dates in en-GB locale', () => {
      const samples = [
        {
          _id: 'sample-1',
          date: '2025-01-15',
          siteName: 'Calstock',
          siteSlug: 'calstock',
          ecoli: 250,
          enterococci: 100
        }
      ];

      const result = transformSamplesToChartData(samples);

      // Should format as "15 Jan 25" (day numeric, month short, year 2-digit)
      expect(result.labels[0]).toMatch(/^\d{1,2}\s\w{3}\s\d{2}$/);
    });

    it('should align data points with labels by date', () => {
      const samples = [
        {
          _id: 'sample-1',
          date: '2025-01-15',
          siteName: 'Calstock',
          siteSlug: 'calstock',
          ecoli: 250,
          enterococci: 100
        },
        {
          _id: 'sample-2',
          date: '2025-01-20',
          siteName: 'Calstock',
          siteSlug: 'calstock',
          ecoli: 500,
          enterococci: 200
        }
      ];

      const result = transformSamplesToChartData(samples);

      expect(result.labels).toHaveLength(2);
      expect(result.datasets[0].data).toHaveLength(2);

      // Check transformed values
      expect(result.datasets[0].data[0]).toBeCloseTo(toDisplay(250), 5);
      expect(result.datasets[0].data[1]).toBeCloseTo(toDisplay(500), 5);

      // Check raw values are preserved
      expect(result.datasets[0].rawValues[0]).toBe(250);
      expect(result.datasets[0].rawValues[1]).toBe(500);
    });

    it('should use null when site has no sample for a date', () => {
      const samples = [
        {
          _id: 'sample-1',
          date: '2025-01-15',
          siteName: 'Calstock',
          siteSlug: 'calstock',
          ecoli: 250,
          enterococci: 100
        },
        {
          _id: 'sample-2',
          date: '2025-01-20',
          siteName: 'Okel Tor',
          siteSlug: 'okel-tor',
          ecoli: 300,
          enterococci: 150
        }
      ];

      const result = transformSamplesToChartData(samples);

      // Calstock should have data for first date, null for second
      const calstockEcoliDataset = result.datasets.find(d => d.label === 'Calstock - E. coli');
      expect(calstockEcoliDataset?.data[0]).toBeCloseTo(toDisplay(250), 5);
      expect(calstockEcoliDataset?.data[1]).toBeNull();
      expect(calstockEcoliDataset?.rawValues[0]).toBe(250);
      expect(calstockEcoliDataset?.rawValues[1]).toBeNull();

      // Okel Tor should have null for first date, data for second
      const okelTorEcoliDataset = result.datasets.find(d => d.label === 'Okel Tor - E. coli');
      expect(okelTorEcoliDataset?.data[0]).toBeNull();
      expect(okelTorEcoliDataset?.data[1]).toBeCloseTo(toDisplay(300), 5);
      expect(okelTorEcoliDataset?.rawValues[0]).toBeNull();
      expect(okelTorEcoliDataset?.rawValues[1]).toBe(300);
    });

    it('should handle empty samples array gracefully', () => {
      const result = transformSamplesToChartData([]);

      expect(result.labels).toEqual([]);
      expect(result.datasets).toEqual([]);
    });

    it('should include required dataset properties', () => {
      const samples = [
        {
          _id: 'sample-1',
          date: '2025-01-15',
          siteName: 'Calstock',
          siteSlug: 'calstock',
          ecoli: 250,
          enterococci: 100
        }
      ];

      const result = transformSamplesToChartData(samples);
      const dataset = result.datasets[0];

      expect(dataset).toHaveProperty('label');
      expect(dataset).toHaveProperty('data');
      expect(dataset).toHaveProperty('rawValues'); // Raw values for tooltips
      expect(dataset).toHaveProperty('tension');
      expect(dataset).toHaveProperty('borderWidth');
      expect(dataset).toHaveProperty('pointRadius');
      expect(dataset).toHaveProperty('pointHoverRadius');

      expect(dataset.tension).toBe(0.1); // Reduced from 0.3 for sharper spikes
      expect(dataset.borderWidth).toBe(2);
      expect(dataset.pointRadius).toBe(3);
      expect(dataset.pointHoverRadius).toBe(5);
    });
  });

  describe('getChartConfig', () => {
    it('should include annotations when showThresholds is true', () => {
      const config = getChartConfig(true);

      expect(config.plugins?.annotation?.annotations).toBeDefined();
      expect(Object.keys(config.plugins.annotation.annotations)).toHaveLength(10);
    });

    it('should have empty annotations when showThresholds is false', () => {
      const config = getChartConfig(false);

      expect(config.plugins?.annotation?.annotations).toBeDefined();
      expect(Object.keys(config.plugins.annotation.annotations)).toHaveLength(0);
    });

    it('should include 4 quality zone boxes when thresholds enabled', () => {
      const config = getChartConfig(true);
      const annotations = config.plugins.annotation.annotations;

      expect(annotations.excellentZone).toBeDefined();
      expect(annotations.goodZone).toBeDefined();
      expect(annotations.sufficientZone).toBeDefined();
      expect(annotations.poorZone).toBeDefined();

      // Check zone is a box type
      expect(annotations.excellentZone.type).toBe('box');
      expect(annotations.goodZone.type).toBe('box');
      expect(annotations.sufficientZone.type).toBe('box');
      expect(annotations.poorZone.type).toBe('box');
    });

    it('should configure quality zones with correct transformed ranges', () => {
      const config = getChartConfig(true);
      const annotations = config.plugins.annotation.annotations;

      // Excellent: 0-500 (transformed)
      expect(annotations.excellentZone.yMin).toBeCloseTo(toDisplay(0), 5);
      expect(annotations.excellentZone.yMax).toBeCloseTo(toDisplay(500), 5);

      // Good: 500-1000 (transformed)
      expect(annotations.goodZone.yMin).toBeCloseTo(toDisplay(500), 5);
      expect(annotations.goodZone.yMax).toBeCloseTo(toDisplay(1000), 5);

      // Sufficient: 1000-1800 (transformed)
      expect(annotations.sufficientZone.yMin).toBeCloseTo(toDisplay(1000), 5);
      expect(annotations.sufficientZone.yMax).toBeCloseTo(toDisplay(1800), 5);

      // Poor: 1800-100000000 (transformed, high max to cover all spikes)
      expect(annotations.poorZone.yMin).toBeCloseTo(toDisplay(1800), 5);
      expect(annotations.poorZone.yMax).toBe(6); // log10(1000000 + 100) ≈ 6
    });

    it('should include 6 threshold lines when thresholds enabled', () => {
      const config = getChartConfig(true);
      const annotations = config.plugins.annotation.annotations;

      // 3 E. coli thresholds
      expect(annotations.ecoliExcellent).toBeDefined();
      expect(annotations.ecoliGood).toBeDefined();
      expect(annotations.ecoliSufficient).toBeDefined();

      // 3 Enterococci thresholds
      expect(annotations.enteroExcellent).toBeDefined();
      expect(annotations.enteroGood).toBeDefined();
      expect(annotations.enteroSufficient).toBeDefined();

      // All should be line type
      expect(annotations.ecoliExcellent.type).toBe('line');
      expect(annotations.enteroExcellent.type).toBe('line');
    });

    it('should configure E. coli thresholds correctly with transformed values', () => {
      const config = getChartConfig(true);
      const annotations = config.plugins.annotation.annotations;

      // E. coli excellent: 500 (transformed)
      expect(annotations.ecoliExcellent.yMin).toBeCloseTo(toDisplay(500), 5);
      expect(annotations.ecoliExcellent.yMax).toBeCloseTo(toDisplay(500), 5);

      // E. coli good: 1000 (transformed)
      expect(annotations.ecoliGood.yMin).toBeCloseTo(toDisplay(1000), 5);
      expect(annotations.ecoliGood.yMax).toBeCloseTo(toDisplay(1000), 5);

      // E. coli sufficient: 1800 (transformed)
      expect(annotations.ecoliSufficient.yMin).toBeCloseTo(toDisplay(1800), 5);
      expect(annotations.ecoliSufficient.yMax).toBeCloseTo(toDisplay(1800), 5);
    });

    it('should configure Enterococci thresholds correctly with transformed values', () => {
      const config = getChartConfig(true);
      const annotations = config.plugins.annotation.annotations;

      // Enterococci excellent: 200 (transformed)
      expect(annotations.enteroExcellent.yMin).toBeCloseTo(toDisplay(200), 5);
      expect(annotations.enteroExcellent.yMax).toBeCloseTo(toDisplay(200), 5);

      // Enterococci good: 400 (transformed)
      expect(annotations.enteroGood.yMin).toBeCloseTo(toDisplay(400), 5);
      expect(annotations.enteroGood.yMax).toBeCloseTo(toDisplay(400), 5);

      // Enterococci sufficient: 660 (transformed)
      expect(annotations.enteroSufficient.yMin).toBeCloseTo(toDisplay(660), 5);
      expect(annotations.enteroSufficient.yMax).toBeCloseTo(toDisplay(660), 5);
    });

    it('should use linear y-axis scale with shifted log transformation', () => {
      const config = getChartConfig();

      // Y-axis is now linear (not logarithmic) because we apply
      // shifted log transformation to the data values
      expect(config.scales?.y?.type).toBe('linear');

      // Y-axis min should be the transformed value of 10
      expect(config.scales?.y?.min).toBeCloseTo(toDisplay(10), 5);
    });

    it('should configure responsive behavior', () => {
      const config = getChartConfig();

      expect(config.responsive).toBe(true);
      expect(config.maintainAspectRatio).toBe(false);
      expect(config.aspectRatio).toBe(2.5);
    });

    it('should use index interaction mode', () => {
      const config = getChartConfig();

      expect(config.interaction?.mode).toBe('index');
      expect(config.interaction?.intersect).toBe(false);
    });

    // Note: Tooltip callback is now added client-side in WaterQualityChart.astro
    // since functions don't survive JSON serialization.
    // The client-side callback uses rawValues array to display actual values.
    // See WaterQualityChart.astro for the tooltip implementation.

    it('should have axis titles', () => {
      const config = getChartConfig();

      expect(config.scales?.x?.title?.display).toBe(true);
      expect(config.scales?.x?.title?.text).toBe('Sample Date');
      expect(config.scales?.y?.title?.display).toBe(true);
      expect(config.scales?.y?.title?.text).toBe('Colony Forming Units per 100ml');
    });

    it('should configure x-axis tick rotation', () => {
      const config = getChartConfig();

      expect(config.scales?.x?.ticks?.maxRotation).toBe(45);
      expect(config.scales?.x?.ticks?.minRotation).toBe(45);
    });
  });
});
