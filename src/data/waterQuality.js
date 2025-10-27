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
 * Transform samples data for Chart.js format
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
    // E. coli dataset
    datasets.push({
      label: `${site} - E. coli`,
      data: dates.map(date => {
        const sample = samples.find(s => s.date === date && s.siteName === site)
        const value = sample?.ecoli
        // For log scale, replace 0 or null with null (Chart.js will skip)
        // Values < 1 get clamped to 1 for visibility
        if (value === null || value === undefined) return null
        return value < 1 ? 1 : value
      }),
      tension: 0.3,
      borderWidth: 2,
      pointRadius: 3,
      pointHoverRadius: 5
    })

    // Enterococci dataset
    datasets.push({
      label: `${site} - Enterococci`,
      data: dates.map(date => {
        const sample = samples.find(s => s.date === date && s.siteName === site)
        const value = sample?.enterococci
        // For log scale, replace 0 or null with null (Chart.js will skip)
        // Values < 1 get clamped to 1 for visibility
        if (value === null || value === undefined) return null
        return value < 1 ? 1 : value
      }),
      tension: 0.3,
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
 */
export function getChartConfig(showThresholds = true) {
  const annotations = {}
  
  if (showThresholds) {
    // Background zones for water quality levels (using E. coli thresholds)
    annotations.excellentZone = {
      type: 'box',
      yMin: 0,
      yMax: 500,
      backgroundColor: 'rgba(34, 197, 94, 0.08)',
      borderWidth: 0,
      drawTime: 'beforeDatasetsDraw'
    }

    annotations.goodZone = {
      type: 'box',
      yMin: 500,
      yMax: 1000,
      backgroundColor: 'rgba(251, 191, 36, 0.08)',
      borderWidth: 0,
      drawTime: 'beforeDatasetsDraw'
    }

    annotations.sufficientZone = {
      type: 'box',
      yMin: 1000,
      yMax: 1800,
      backgroundColor: 'rgba(249, 115, 22, 0.08)',
      borderWidth: 0,
      drawTime: 'beforeDatasetsDraw'
    }

    annotations.poorZone = {
      type: 'box',
      yMin: 1800,
      yMax: 100000,
      backgroundColor: 'rgba(239, 68, 68, 0.08)',
      borderWidth: 0,
      drawTime: 'beforeDatasetsDraw'
    }

    // EU Bathing Water Quality threshold lines (more subtle)
    annotations.ecoliExcellent = {
      type: 'line',
      yMin: 500,
      yMax: 500,
      borderColor: 'rgba(34, 197, 94, 0.5)',
      borderWidth: 1,
      borderDash: [5, 5],
      label: {
        display: false
      }
    }

    annotations.ecoliGood = {
      type: 'line',
      yMin: 1000,
      yMax: 1000,
      borderColor: 'rgba(251, 191, 36, 0.5)',
      borderWidth: 1,
      borderDash: [5, 5],
      label: {
        display: false
      }
    }

    annotations.ecoliSufficient = {
      type: 'line',
      yMin: 1800,
      yMax: 1800,
      borderColor: 'rgba(249, 115, 22, 0.5)',
      borderWidth: 1,
      borderDash: [5, 5],
      label: {
        display: false
      }
    }

    annotations.enteroExcellent = {
      type: 'line',
      yMin: 200,
      yMax: 200,
      borderColor: 'rgba(34, 197, 94, 0.4)',
      borderWidth: 1,
      borderDash: [3, 3],
      label: {
        display: false
      }
    }

    annotations.enteroGood = {
      type: 'line',
      yMin: 400,
      yMax: 400,
      borderColor: 'rgba(251, 191, 36, 0.4)',
      borderWidth: 1,
      borderDash: [3, 3],
      label: {
        display: false
      }
    }

    annotations.enteroSufficient = {
      type: 'line',
      yMin: 660,
      yMax: 660,
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
        callbacks: {
          label: function(context) {
            const value = context.parsed.y
            if (value === null) return `${context.dataset.label}: No data`
            return `${context.dataset.label}: ${value} cfu/100ml`
          }
        }
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
        type: 'logarithmic',
        display: true,
        title: {
          display: true,
          text: 'Colony Forming Units per 100ml (log scale)'
        },
        ticks: {
          callback: function(value) {
            // Format log scale ticks nicely
            if (value === 1 || value === 10 || value === 100 || value === 1000 || value === 10000 || value === 100000) {
              return value + ' cfu'
            }
            return ''
          }
        }
      }
    }
  }
}