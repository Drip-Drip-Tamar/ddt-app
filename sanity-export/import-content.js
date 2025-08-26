#!/usr/bin/env node
/**
 * Script to import Drip Drip Tamar site content into Sanity
 * Run with: node sanity-export/import-content.js
 */

import { createClient } from '@sanity/client'
import dotenv from 'dotenv'
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

// Helper function to create slug from title
const createSlug = (title) => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Content for each page
const pageContent = {
  // Homepage
  home: {
    _type: 'page',
    _id: 'page-home',
    title: 'Home',
    slug: { current: '' },
    sections: [
      {
        _type: 'heroSection',
        _key: 'hero1',
        heading: 'Working towards a healthy Tamar River',
        body: 'Drip Drip is a community group in the Tamar Valley working to improve the river\'s health for people and wildlife. We sample water regularly, share results in plain English, and press for practical action.',
        backgroundImage: {
          _type: 'backgroundImage',
          type: 'color',
          color: '#0066CC'
        },
        cta: []
      },
      {
        _type: 'heroSection',
        _key: 'hero2',
        heading: 'How healthy is the River Tamar?',
        body: 'That\'s what we want to know. We collect weekly samples at key spots and publish what we find so river users can make informed choices.',
        backgroundImage: {
          _type: 'backgroundImage',
          type: 'color',
          color: '#1a75ff'
        }
      },
      {
        _type: 'cardsSection',
        _key: 'cards1',
        heading: 'What we do',
        items: [
          {
            _type: 'card',
            _key: 'card1',
            heading: 'Monitoring',
            body: 'We take river samples for professional lab testing to track bacteria such as E. coli and Intestinal Enterococci.',
            image: null
          },
          {
            _type: 'card',
            _key: 'card2',
            heading: 'Action',
            body: 'We advocate for cleaner, safer water by engaging with those who can fix problems.',
            image: null
          },
          {
            _type: 'card',
            _key: 'card3',
            heading: 'Community',
            body: 'We organise local events and encourage residents to get involved.',
            image: null
          }
        ]
      },
      {
        _type: 'heroSection',
        _key: 'hero3',
        heading: 'Before you swim or paddle',
        body: 'Check live storm overflow status on South West Water\'s WaterFit Live maps. They show near-real-time sewer overflow activity across the region.',
        backgroundImage: {
          _type: 'backgroundImage',
          type: 'color',
          color: '#ffa500'
        },
        cta: [
          {
            _type: 'actionButton',
            _key: 'btn1',
            label: 'Check WaterFit Live',
            url: 'https://www.southwestwater.co.uk/environment/waterfit/waterfit-live/'
          }
        ]
      },
      {
        _type: 'ctaSection',
        _key: 'cta1',
        heading: 'Get involved',
        body: 'Join us in protecting the River Tamar',
        cta: [
          {
            _type: 'actionButton',
            _key: 'btn1',
            label: 'See our latest Results',
            url: '/results'
          },
          {
            _type: 'actionButton',
            _key: 'btn2',
            label: 'Read the News',
            url: '/news'
          },
          {
            _type: 'actionButton',
            _key: 'btn3',
            label: 'Learn About Drip Drip',
            url: '/about'
          }
        ]
      }
    ]
  },

  // About page
  about: {
    _type: 'page',
    _id: 'page-about',
    title: 'About',
    slug: { current: 'about' },
    sections: [
      {
        _type: 'heroSection',
        _key: 'hero1',
        heading: 'Who we are',
        body: 'Drip Drip began after a People\'s Assembly raised serious community concerns about the River Tamar\'s condition. Based around Calstock, we\'re volunteers focused on protecting and restoring the river for current and future generations.',
        backgroundImage: {
          _type: 'backgroundImage',
          type: 'color',
          color: '#0066CC'
        }
      },
      {
        _type: 'heroSection',
        _key: 'hero2',
        heading: 'Why the Tamar matters',
        body: 'The Tamar supports iconic and protected species and is central to local life and recreation. Keeping it healthy benefits everyone who lives by, works on, or enjoys the river.'
      },
      {
        _type: 'cardsSection',
        _key: 'cards1',
        heading: 'What we do',
        items: [
          {
            _type: 'card',
            _key: 'card1',
            heading: 'Weekly water sampling',
            body: 'We collect at strategic sites and send samples to an accredited laboratory to test for faecal-indicator bacteria (E. coli, Intestinal Enterococci).'
          },
          {
            _type: 'card',
            _key: 'card2',
            heading: 'Sharing results',
            body: 'We publish clear updates so people can gauge risk, especially after rainfall when spikes in bacteria are more likely.'
          },
          {
            _type: 'card',
            _key: 'card3',
            heading: 'Advocacy & collaboration',
            body: 'We talk with councils, agencies and groups to push for improvements.'
          }
        ]
      },
      {
        _type: 'heroSection',
        _key: 'hero3',
        heading: 'Our journey so far',
        body: 'We\'ve launched a structured sampling programme, built community momentum through events, and secured support via crowdfunding to sustain year-round monitoring.'
      },
      {
        _type: 'ctaSection',
        _key: 'cta1',
        heading: 'How you can help',
        body: 'Volunteer on sampling days, share our updates, attend events, or support our running costs.',
        cta: [
          {
            _type: 'actionButton',
            _key: 'btn1',
            label: 'Get in touch',
            url: '/contact'
          }
        ]
      }
    ]
  },

  // Contact page
  contact: {
    _type: 'page',
    _id: 'page-contact',
    title: 'Contact',
    slug: { current: 'contact' },
    sections: [
      {
        _type: 'heroSection',
        _key: 'hero1',
        heading: 'Get in touch',
        body: 'Questions, ideas, media queries, or want to volunteer? Send us a message using the contact form below.',
        backgroundImage: {
          _type: 'backgroundImage',
          type: 'color',
          color: '#0066CC'
        }
      },
      {
        _type: 'heroSection',
        _key: 'hero2',
        heading: 'Connect on social',
        body: 'Prefer social? Reach us via our Facebook page.',
        cta: [
          {
            _type: 'actionButton',
            _key: 'btn1',
            label: 'Visit our Facebook page',
            url: 'https://www.facebook.com/dripdrip.tamar'
          }
        ]
      },
      {
        _type: 'heroSection',
        _key: 'hero3',
        heading: 'Press & organisations',
        body: 'Please include your name, outlet/organisation, and deadline so we can respond quickly.'
      }
    ]
  },

  // News/Blog page
  news: {
    _type: 'page',
    _id: 'page-news',
    title: 'News',
    slug: { current: 'news' },
    sections: [
      {
        _type: 'heroSection',
        _key: 'hero1',
        heading: 'News',
        body: 'Welcome to our update hub. Here we share results summaries, project milestones, volunteer stories, and notices about local river events.',
        backgroundImage: {
          _type: 'backgroundImage',
          type: 'color',
          color: '#0066CC'
        }
      },
      {
        _type: 'cardsSection',
        _key: 'cards1',
        heading: 'What to expect',
        items: [
          {
            _type: 'card',
            _key: 'card1',
            heading: 'Regular updates',
            body: 'Regular updates from our weekly sampling'
          },
          {
            _type: 'card',
            _key: 'card2',
            heading: 'River safety guidance',
            body: 'Guidance on safer river use'
          },
          {
            _type: 'card',
            _key: 'card3',
            heading: 'Community stories',
            body: 'Community stories and ways to get involved'
          }
        ]
      }
    ]
  },

  // Results page
  results: {
    _type: 'page',
    _id: 'page-results',
    title: 'Results',
    slug: { current: 'results' },
    sections: [
      {
        _type: 'heroSection',
        _key: 'hero1',
        heading: 'Understanding our river water test results',
        body: 'We publish weekly bacteria measurements for two Tamar locations near Calstock. Results help you judge health risks from swimming, paddling or other contact—particularly after rain.',
        backgroundImage: {
          _type: 'backgroundImage',
          type: 'color',
          color: '#0066CC'
        }
      },
      {
        _type: 'heroSection',
        _key: 'hero2',
        heading: 'Why rainfall matters',
        body: 'Rain can trigger storm overflows and wash runoff from land into the river, which can rapidly increase bacteria levels. Always check recent rain and overflow status before entering the water using WaterFit Live.',
        cta: [
          {
            _type: 'actionButton',
            _key: 'btn1',
            label: 'Check WaterFit Live',
            url: 'https://www.southwestwater.co.uk/environment/waterfit/waterfit-live/'
          }
        ]
      },
      {
        _type: 'heroSection',
        _key: 'hero3',
        heading: 'How to read our results',
        body: 'We test for E. coli and Intestinal Enterococci, standard indicators of faecal contamination used across the UK. Results are shown by date and site. (Official Bathing Water classifications use many samples over four years at designated sites; our data is an advisory snapshot for these locations.)'
      },
      {
        _type: 'cardsSection',
        _key: 'cards1',
        heading: 'Key takeaways',
        items: [
          {
            _type: 'card',
            _key: 'card1',
            heading: 'Dry weather ≈ lower risk',
            body: 'Lower bacteria levels typically occur during dry periods'
          },
          {
            _type: 'card',
            _key: 'card2',
            heading: 'After rain, risk rises',
            body: 'Risk rises until the river has flushed through'
          },
          {
            _type: 'card',
            _key: 'card3',
            heading: 'Check before you go in',
            body: 'Check live storm overflows on WaterFit Live and read our latest results before you go in'
          }
        ]
      },
      {
        _type: 'heroSection',
        _key: 'hero4',
        heading: 'Where we sample',
        body: 'We routinely sample around Calstock/Okel Tor to build a long-term picture of local conditions.',
        backgroundImage: {
          _type: 'backgroundImage',
          type: 'color',
          color: '#1a75ff'
        }
      },
      {
        _type: 'ctaSection',
        _key: 'cta1',
        heading: 'Stay informed',
        body: 'Check our latest results and stay safe',
        cta: [
          {
            _type: 'actionButton',
            _key: 'btn1',
            label: 'Check WaterFit Live',
            url: 'https://www.southwestwater.co.uk/environment/waterfit/waterfit-live/'
          },
          {
            _type: 'actionButton',
            _key: 'btn2',
            label: 'Follow us on Facebook',
            url: 'https://www.facebook.com/dripdrip.tamar'
          }
        ]
      }
    ]
  }
}

// Site configuration
const siteConfig = {
  _type: 'siteConfig',
  _id: 'siteConfig',
  title: 'Drip Drip Tamar',
  description: 'Working towards a healthy Tamar River',
  copyright: `© ${new Date().getFullYear()} Drip Drip Tamar. All rights reserved.`,
  header: {
    _type: 'header',
    title: 'Drip Drip Tamar',
    logo: null,
    links: [
      { _type: 'actionLink', _key: 'link1', label: 'Home', url: '/' },
      { _type: 'actionLink', _key: 'link2', label: 'About', url: '/about' },
      { _type: 'actionLink', _key: 'link3', label: 'Results', url: '/results' },
      { _type: 'actionLink', _key: 'link4', label: 'News', url: '/news' },
      { _type: 'actionLink', _key: 'link5', label: 'Contact', url: '/contact' }
    ]
  },
  footer: {
    _type: 'footer',
    copyrightText: `© ${new Date().getFullYear()} Drip Drip Tamar`,
    links: [
      { _type: 'actionLink', _key: 'link1', label: 'Privacy Policy', url: '/privacy' },
      { _type: 'actionLink', _key: 'link2', label: 'Contact', url: '/contact' }
    ]
  }
}

// Import function
async function importContent() {
  console.log('Starting content import...')

  try {
    // Import site configuration
    console.log('Importing site configuration...')
    await client.createOrReplace(siteConfig)
    console.log('✓ Site configuration imported')

    // Import pages
    const pages = Object.values(pageContent)
    for (const page of pages) {
      console.log(`Importing page: ${page.title}...`)
      await client.createOrReplace(page)
      console.log(`✓ ${page.title} page imported`)
    }

    console.log('\n✓ All content imported successfully!')
    console.log('\nNext steps:')
    console.log('1. Run "cd studio && sanity dev" to start Sanity Studio')
    console.log('2. Visit http://localhost:3333 to see and edit your content')
    console.log('3. Run "npm run dev" in the root directory to see the site')

  } catch (error) {
    console.error('Error importing content:', error)
    process.exit(1)
  }
}

// Run the import
importContent()