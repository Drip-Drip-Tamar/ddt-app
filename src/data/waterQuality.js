import groq from 'groq'
import { client } from '@utils/sanity-client'

/**
 * Fetch all water samples with site information
 */
export const SAMPLES_QUERY = groq`
  *[_type == "waterSample"] | order(date desc) {
    _id,
    date,
    "siteName": site->title,
    "siteSlug": site->slug.current,
    ecoli,
    enterococci,
    rainfall,
    notes
  }
`

/**
 * Fetch water samples within a date range
 */
export const SAMPLES_RANGE_QUERY = groq`
  *[_type == "waterSample" && date >= $startDate && date <= $endDate] | order(date asc) {
    _id,
    date,
    "siteName": site->title,
    "siteSlug": site->slug.current,
    ecoli,
    enterococci,
    rainfall,
    notes
  }
`

/**
 * Fetch all sampling sites
 */
export const SITES_QUERY = groq`
  *[_type == "samplingSite"] | order(title asc) {
    _id,
    title,
    slug,
    description,
    coordinates
  }
`

/**
 * Get all water samples
 */
export async function getWaterSamples() {
  try {
    const samples = await client.fetch(SAMPLES_QUERY)
    return samples || []
  } catch (error) {
    console.error('Error fetching water samples:', error)
    return []
  }
}

/**
 * Get water samples within a date range
 */
export async function getWaterSamplesInRange(startDate, endDate) {
  try {
    const samples = await client.fetch(SAMPLES_RANGE_QUERY, { startDate, endDate })
    return samples || []
  } catch (error) {
    console.error('Error fetching water samples in range:', error)
    return []
  }
}

/**
 * Get all sampling sites
 */
export async function getSamplingSites() {
  try {
    const sites = await client.fetch(SITES_QUERY)
    return sites || []
  } catch (error) {
    console.error('Error fetching sampling sites:', error)
    return []
  }
}

/**
 * Transform actual value to display position using shifted log scale
 * log10(value + 100) - compresses low values less than standard log
 */
export const SHIFT_OFFSET = 100
export const toDisplay = (value) => Math.log10(value + SHIFT_OFFSET)

/**
 * Transform samples data for Chart.js format
 * Uses shifted logarithmic scale for more balanced visual distribution
 */
export function transformSamplesToChartData(samples) {
  // Get unique dates and sites
  const dates = [...new Set(samples.map(s => s.date))].sort()
  const sites = [...new Set(samples.map(s => s.siteName))]

  // Prepare datasets for each site and bacteria type
  const datasets = []
  // Note: Colors are applied client-side in WaterQualityChart.astro
  // after normalizing site names to handle Unicode characters

  // Create dataset for each site and bacteria combination
  sites.forEach(site => {
    // E. coli dataset - store raw values separately for tooltips
    const rawValues = dates.map(date => {
      const sample = samples.find(s => s.date === date && s.siteName === site)
      const value = sample?.ecoli
      if (value === null || value === undefined) return null
      return value < 1 ? 1 : value
    })

    datasets.push({
      label: `${site} - E. coli`,
      data: rawValues.map(v => v === null ? null : toDisplay(v)),
      rawValues: rawValues, // Store raw values for tooltips
      tension: 0.1,
      borderWidth: 2,
      pointRadius: 3,
      pointHoverRadius: 5
    })

    // Enterococci dataset
    const rawEnteroValues = dates.map(date => {
      const sample = samples.find(s => s.date === date && s.siteName === site)
      const value = sample?.enterococci
      if (value === null || value === undefined) return null
      return value < 1 ? 1 : value
    })

    datasets.push({
      label: `${site} - Enterococci`,
      data: rawEnteroValues.map(v => v === null ? null : toDisplay(v)),
      rawValues: rawEnteroValues, // Store raw values for tooltips
      tension: 0.1,
      borderWidth: 2,
      borderDash: [5, 5], // Dashed line for enterococci
      pointRadius: 3,
      pointHoverRadius: 5
    })
  })
  
  return {
    labels: dates.map(d => new Date(d).toLocaleDateString('en-GB', { 
      day: 'numeric',
      month: 'short',
      year: '2-digit'
    })),
    datasets
  }
}

/**
 * Get chart configuration with thresholds
 * Uses shifted log scale transformation for annotations
 */
export function getChartConfig(showThresholds = true) {
  const annotations = {}

  if (showThresholds) {
    // Background zones for water quality levels (EU Bathing Water Quality thresholds)
    // All values transformed using shifted log: log10(value + 100)
    annotations.excellentZone = {
      type: 'box',
      yMin: toDisplay(0),
      yMax: toDisplay(500),
      backgroundColor: 'rgba(34, 197, 94, 0.08)',
      borderWidth: 0,
      drawTime: 'beforeDatasetsDraw'
    }

    annotations.goodZone = {
      type: 'box',
      yMin: toDisplay(500),
      yMax: toDisplay(1000),
      backgroundColor: 'rgba(251, 191, 36, 0.08)',
      borderWidth: 0,
      drawTime: 'beforeDatasetsDraw'
    }

    annotations.sufficientZone = {
      type: 'box',
      yMin: toDisplay(1000),
      yMax: toDisplay(1800),
      backgroundColor: 'rgba(249, 115, 22, 0.08)',
      borderWidth: 0,
      drawTime: 'beforeDatasetsDraw'
    }

    annotations.poorZone = {
      type: 'box',
      yMin: toDisplay(1800),
      yMax: 6, // log10(1000000 + 100) ≈ 6, covers extreme spikes
      backgroundColor: 'rgba(239, 68, 68, 0.08)',
      borderWidth: 0,
      drawTime: 'beforeDatasetsDraw'
    }

    // EU Bathing Water Quality threshold lines for E. coli
    annotations.ecoliExcellent = {
      type: 'line',
      yMin: toDisplay(500),
      yMax: toDisplay(500),
      borderColor: 'rgba(34, 197, 94, 0.5)',
      borderWidth: 1,
      borderDash: [5, 5],
      label: {
        display: false
      }
    }

    annotations.ecoliGood = {
      type: 'line',
      yMin: toDisplay(1000),
      yMax: toDisplay(1000),
      borderColor: 'rgba(251, 191, 36, 0.5)',
      borderWidth: 1,
      borderDash: [5, 5],
      label: {
        display: false
      }
    }

    annotations.ecoliSufficient = {
      type: 'line',
      yMin: toDisplay(1800),
      yMax: toDisplay(1800),
      borderColor: 'rgba(249, 115, 22, 0.5)',
      borderWidth: 1,
      borderDash: [5, 5],
      label: {
        display: false
      }
    }

    // EU Bathing Water Quality threshold lines for Enterococci
    annotations.enteroExcellent = {
      type: 'line',
      yMin: toDisplay(200),
      yMax: toDisplay(200),
      borderColor: 'rgba(34, 197, 94, 0.4)',
      borderWidth: 1,
      borderDash: [3, 3],
      label: {
        display: false
      }
    }

    annotations.enteroGood = {
      type: 'line',
      yMin: toDisplay(400),
      yMax: toDisplay(400),
      borderColor: 'rgba(251, 191, 36, 0.4)',
      borderWidth: 1,
      borderDash: [3, 3],
      label: {
        display: false
      }
    }

    annotations.enteroSufficient = {
      type: 'line',
      yMin: toDisplay(660),
      yMax: toDisplay(660),
      borderColor: 'rgba(249, 115, 22, 0.4)',
      borderWidth: 1,
      borderDash: [3, 3],
      label: {
        display: false
      }
    }
  }

  return {
    responsive: true,
    maintainAspectRatio: false,
    aspectRatio: 2.5,
    interaction: {
      mode: 'index',
      intersect: false
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 15,
          font: { size: 12 }
        }
      },
      tooltip: {
        // Callback added client-side (functions don't survive JSON serialization)
      },
      annotation: {
        annotations
      }
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Sample Date'
        },
        ticks: {
          maxRotation: 45,
          minRotation: 45
        }
      },
      y: {
        type: 'linear',
        min: toDisplay(10),
        display: true,
        title: {
          display: true,
          text: 'Colony Forming Units per 100ml'
        }
        // Tick callback added client-side (functions don't survive JSON serialization)
      }
    }
  }
}