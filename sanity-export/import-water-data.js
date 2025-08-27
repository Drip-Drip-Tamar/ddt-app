#!/usr/bin/env node
/**
 * Script to import water quality data from CSV into Sanity
 * Run with: node sanity-export/import-water-data.js
 */

import { createClient } from '@sanity/client'
import dotenv from 'dotenv'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') })

// Initialize Sanity client
const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_TOKEN,
  useCdn: false
})

// Helper function to create slug
const createSlug = (title) => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Helper function to parse DD/MM/YY date to YYYY-MM-DD
const parseDate = (dateStr) => {
  const [day, month, year] = dateStr.split('/')
  const fullYear = year.length === 2 ? `20${year}` : year
  return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

// Read and parse CSV data
const csvPath = join(__dirname, '..', 'DripDrip_Bacterial_Sampling_18_06_2025.csv')
const csvContent = fs.readFileSync(csvPath, 'utf-8')
const lines = csvContent.split('\n').filter(line => line.trim())
const headers = lines[0].split(',')

// Parse CSV data
const samples = []
for (let i = 1; i < lines.length; i++) {
  const values = lines[i].split(',')
  if (values[0] && values[0].trim()) { // Only process rows with dates
    const date = values[0].trim().replace('﻿', '') // Remove BOM if present
    const okelTorEcoli = parseInt(values[1]) || null
    const okelTorEnterococci = parseInt(values[2]) || null
    const calstockEcoli = parseInt(values[3]) || null
    const calstockEnterococci = parseInt(values[4]) || null
    
    if (date && date !== '') {
      // Add Okel Tor sample
      if (okelTorEcoli !== null || okelTorEnterococci !== null) {
        samples.push({
          date: parseDate(date),
          site: 'Okel Tor',
          ecoli: okelTorEcoli,
          enterococci: okelTorEnterococci
        })
      }
      
      // Add Calstock sample
      if (calstockEcoli !== null || calstockEnterococci !== null) {
        samples.push({
          date: parseDate(date),
          site: 'Calstock',
          ecoli: calstockEcoli,
          enterococci: calstockEnterococci
        })
      }
    }
  }
}

// Define sampling sites
const sites = [
  {
    _type: 'samplingSite',
    _id: 'site-okel-tor',
    title: 'Okel Tor',
    slug: { current: 'okel-tor' },
    description: 'Sampling site at Okel Tor, a popular swimming and recreation spot on the River Tamar',
    coordinates: {
      lat: 50.496,
      lng: -4.211
    },
    notes: 'Regular monitoring site near Calstock'
  },
  {
    _type: 'samplingSite',
    _id: 'site-calstock',
    title: 'Calstock',
    slug: { current: 'calstock' },
    description: 'Sampling site at Calstock Quay, historic port and current recreation area',
    coordinates: {
      lat: 50.497,
      lng: -4.209
    },
    notes: 'Key monitoring location at Calstock Quay'
  }
]

// Import function
async function importWaterData() {
  console.log('Starting water quality data import...')
  console.log(`Found ${samples.length} samples to import`)

  try {
    // Import sampling sites
    console.log('\nImporting sampling sites...')
    for (const site of sites) {
      console.log(`Importing site: ${site.title}...`)
      await client.createOrReplace(site)
      console.log(`✓ ${site.title} site imported`)
    }

    // Create water samples with references to sites
    console.log('\nImporting water samples...')
    let importedCount = 0
    
    for (const sample of samples) {
      const siteId = sample.site === 'Okel Tor' ? 'site-okel-tor' : 'site-calstock'
      
      const waterSample = {
        _type: 'waterSample',
        _id: `sample-${sample.date}-${siteId}`,
        date: sample.date,
        site: {
          _type: 'reference',
          _ref: siteId
        },
        ecoli: sample.ecoli,
        enterococci: sample.enterococci,
        rainfall: null, // No rainfall data in current CSV
        notes: null
      }
      
      await client.createOrReplace(waterSample)
      importedCount++
      
      // Progress indicator
      if (importedCount % 10 === 0) {
        console.log(`  Imported ${importedCount}/${samples.length} samples...`)
      }
    }

    console.log(`\n✓ All ${importedCount} water samples imported successfully!`)
    
    // Summary statistics
    const okelSamples = samples.filter(s => s.site === 'Okel Tor').length
    const calstockSamples = samples.filter(s => s.site === 'Calstock').length
    
    console.log('\nImport Summary:')
    console.log(`- Okel Tor samples: ${okelSamples}`)
    console.log(`- Calstock samples: ${calstockSamples}`)
    console.log(`- Date range: ${samples[0].date} to ${samples[samples.length - 1].date}`)
    
    // Find notable values
    const highEcoli = samples.filter(s => s.ecoli > 1000)
    const highEntero = samples.filter(s => s.enterococci > 400)
    
    console.log(`\nQuality Alerts:`)
    console.log(`- Samples with E.coli > 1000: ${highEcoli.length}`)
    console.log(`- Samples with Enterococci > 400: ${highEntero.length}`)
    
    console.log('\nNext steps:')
    console.log('1. Run "cd studio && sanity dev" to start Sanity Studio')
    console.log('2. Visit http://localhost:3333 to view and edit the water quality data')
    console.log('3. The water samples and sites are now available in Sanity')

  } catch (error) {
    console.error('Error importing water data:', error)
    process.exit(1)
  }
}

// Run the import
importWaterData()