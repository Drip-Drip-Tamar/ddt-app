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
  const colors = {
    'Okel Tor': {
      ecoli: 'rgb(59, 130, 246)', // blue
      enterococci: 'rgb(34, 197, 94)' // green
    },
    'Calstock': {
      ecoli: 'rgb(239, 68, 68)', // red
      enterococci: 'rgb(249, 115, 22)' // orange
    }
  }
  
  // Create dataset for each site and bacteria combination
  sites.forEach(site => {
    // E. coli dataset
    datasets.push({
      label: `${site} - E. coli`,
      data: dates.map(date => {
        const sample = samples.find(s => s.date === date && s.siteName === site)
        return sample?.ecoli ?? null
      }),
      borderColor: colors[site]?.ecoli || 'rgb(75, 192, 192)',
      backgroundColor: colors[site]?.ecoli ? `${colors[site].ecoli}33` : 'rgba(75, 192, 192, 0.2)',
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
        return sample?.enterococci ?? null
      }),
      borderColor: colors[site]?.enterococci || 'rgb(255, 206, 86)',
      backgroundColor: colors[site]?.enterococci ? `${colors[site].enterococci}33` : 'rgba(255, 206, 86, 0.2)',
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
    // EU Bathing Water Quality thresholds
    annotations.ecoliExcellent = {
      type: 'line',
      yMin: 500,
      yMax: 500,
      borderColor: 'rgba(34, 197, 94, 0.8)',
      borderWidth: 2,
      borderDash: [5, 5],
      label: {
        display: true,
        content: 'E. coli Excellent (500)',
        position: 'end',
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        color: 'white',
        font: { size: 11 }
      }
    }
    
    annotations.ecoliGood = {
      type: 'line',
      yMin: 1000,
      yMax: 1000,
      borderColor: 'rgba(251, 191, 36, 0.8)',
      borderWidth: 2,
      borderDash: [5, 5],
      label: {
        display: true,
        content: 'E. coli Good (1000)',
        position: 'end',
        backgroundColor: 'rgba(251, 191, 36, 0.8)',
        color: 'white',
        font: { size: 11 }
      }
    }
    
    annotations.enteroExcellent = {
      type: 'line',
      yMin: 200,
      yMax: 200,
      borderColor: 'rgba(34, 197, 94, 0.6)',
      borderWidth: 1,
      borderDash: [3, 3],
      label: {
        display: true,
        content: 'Enterococci Excellent (200)',
        position: 'start',
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        color: 'white',
        font: { size: 11 }
      }
    }
    
    annotations.enteroGood = {
      type: 'line',
      yMin: 400,
      yMax: 400,
      borderColor: 'rgba(251, 191, 36, 0.6)',
      borderWidth: 1,
      borderDash: [3, 3],
      label: {
        display: true,
        content: 'Enterococci Good (400)',
        position: 'start',
        backgroundColor: 'rgba(251, 191, 36, 0.8)',
        color: 'white',
        font: { size: 11 }
      }
    }
    
    // Good quality zone
    annotations.goodZone = {
      type: 'box',
      yMin: 0,
      yMax: 200,
      backgroundColor: 'rgba(34, 197, 94, 0.05)',
      borderWidth: 0
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
        display: true,
        title: {
          display: true,
          text: 'Colony Forming Units per 100ml'
        },
        suggestedMin: 0,
        suggestedMax: 2000,
        ticks: {
          callback: function(value) {
            return value + ' cfu'
          }
        }
      }
    }
  }
}