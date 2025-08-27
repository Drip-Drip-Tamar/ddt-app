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
        title: 'How healthy is the River Tamar?',
        subtitle: 'That\'s what we want to know. We collect weekly samples at key spots and publish what we find so river users can make informed choices.',
        backgroundImage: {
          _type: 'backgroundImage',
          type: 'color',
          color: '#1a75ff'
        }
      },
      {
        _type: 'cardsSection',
        _key: 'cards1',
        title: 'What we do',
        cards: [
          {
            _type: 'card',
            _key: 'card1',
            title: 'Monitoring',
            subtitle: 'We take river samples for professional lab testing to track bacteria such as E. coli and Intestinal Enterococci.',
            image: null
          },
          {
            _type: 'card',
            _key: 'card2',
            title: 'Action',
            subtitle: 'We advocate for cleaner, safer water by engaging with those who can fix problems.',
            image: null
          },
          {
            _type: 'card',
            _key: 'card3',
            title: 'Community',
            subtitle: 'We organise local events and encourage residents to get involved.',
            image: null
          }
        ]
      },
      {
        _type: 'heroSection',
        _key: 'hero3',
        title: 'Before you swim or paddle',
        subtitle: 'Check live storm overflow status on South West Water\'s WaterFit Live maps. They show near-real-time sewer overflow activity across the region.',
        backgroundImage: {
          _type: 'backgroundImage',
          type: 'color',
          color: '#ffa500'
        },
        actionButtons: [
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
        title: 'Get involved',
        subtitle: 'Join us in protecting the River Tamar',
        actionButtons: [
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
        title: 'Who we are',
        subtitle: 'Drip Drip began after a People\'s Assembly raised serious community concerns about the River Tamar\'s condition. Based around Calstock, we\'re volunteers focused on protecting and restoring the river for current and future generations.',
        backgroundImage: {
          _type: 'backgroundImage',
          type: 'color',
          color: '#0066CC'
        }
      },
      {
        _type: 'heroSection',
        _key: 'hero2',
        title: 'Why the Tamar matters',
        subtitle: 'The Tamar supports iconic and protected species and is central to local life and recreation. Keeping it healthy benefits everyone who lives by, works on, or enjoys the river.'
      },
      {
        _type: 'cardsSection',
        _key: 'cards1',
        title: 'What we do',
        cards: [
          {
            _type: 'card',
            _key: 'card1',
            title: 'Weekly water sampling',
            subtitle: 'We collect at strategic sites and send samples to an accredited laboratory to test for faecal-indicator bacteria (E. coli, Intestinal Enterococci).'
          },
          {
            _type: 'card',
            _key: 'card2',
            title: 'Sharing results',
            subtitle: 'We publish clear updates so people can gauge risk, especially after rainfall when spikes in bacteria are more likely.'
          },
          {
            _type: 'card',
            _key: 'card3',
            title: 'Advocacy & collaboration',
            subtitle: 'We talk with councils, agencies and groups to push for improvements.'
          }
        ]
      },
      {
        _type: 'heroSection',
        _key: 'hero3',
        title: 'Our journey so far',
        subtitle: 'We\'ve launched a structured sampling programme, built community momentum through events, and secured support via crowdfunding to sustain year-round monitoring.'
      },
      {
        _type: 'ctaSection',
        _key: 'cta1',
        title: 'How you can help',
        subtitle: 'Volunteer on sampling days, share our updates, attend events, or support our running costs.',
        actionButtons: [
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
        title: 'Get in touch',
        subtitle: 'Questions, ideas, media queries, or want to volunteer? Send us a message using the contact form below.',
        backgroundImage: {
          _type: 'backgroundImage',
          type: 'color',
          color: '#0066CC'
        }
      },
      {
        _type: 'heroSection',
        _key: 'hero2',
        title: 'Connect on social',
        subtitle: 'Prefer social? Reach us via our Facebook page.',
        actionButtons: [
          {
            _type: 'actionButton',
            _key: 'btn1',
            label: 'Visit our Facebook page',
            url: 'https://www.facebook.com/people/Drip-Drip-friends-of-the-Tamar-River/61564869366844/'
          }
        ]
      },
      {
        _type: 'heroSection',
        _key: 'hero3',
        title: 'Press & organisations',
        subtitle: 'Please include your name, outlet/organisation, and deadline so we can respond quickly.'
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
        title: 'News',
        subtitle: 'Welcome to our update hub. Here we share results summaries, project milestones, volunteer stories, and notices about local river events.',
        backgroundImage: {
          _type: 'backgroundImage',
          type: 'color',
          color: '#0066CC'
        }
      },
      {
        _type: 'cardsSection',
        _key: 'cards1',
        title: 'What to expect',
        cards: [
          {
            _type: 'card',
            _key: 'card1',
            title: 'Regular updates',
            subtitle: 'Regular updates from our weekly sampling'
          },
          {
            _type: 'card',
            _key: 'card2',
            title: 'River safety guidance',
            subtitle: 'Guidance on safer river use'
          },
          {
            _type: 'card',
            _key: 'card3',
            title: 'Community stories',
            subtitle: 'Community stories and ways to get involved'
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
        title: 'Understanding our river water test results',
        subtitle: 'We publish weekly bacteria measurements for two Tamar locations near Calstock. Results help you judge health risks from swimming, paddling or other contact—particularly after rain.',
        backgroundImage: {
          _type: 'backgroundImage',
          type: 'color',
          color: '#0066CC'
        }
      },
      {
        _type: 'heroSection',
        _key: 'hero2',
        title: 'Why rainfall matters',
        subtitle: 'Rain can trigger storm overflows and wash runoff from land into the river, which can rapidly increase bacteria levels. Always check recent rain and overflow status before entering the water using WaterFit Live.',
        actionButtons: [
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
        title: 'How to read our results',
        subtitle: 'We test for E. coli and Intestinal Enterococci, standard indicators of faecal contamination used across the UK. Results are shown by date and site. (Official Bathing Water classifications use many samples over four years at designated sites; our data is an advisory snapshot for these locations.)'
      },
      {
        _type: 'cardsSection',
        _key: 'cards1',
        title: 'Key takeaways',
        cards: [
          {
            _type: 'card',
            _key: 'card1',
            title: 'Dry weather ≈ lower risk',
            subtitle: 'Lower bacteria levels typically occur during dry periods'
          },
          {
            _type: 'card',
            _key: 'card2',
            title: 'After rain, risk rises',
            subtitle: 'Risk rises until the river has flushed through'
          },
          {
            _type: 'card',
            _key: 'card3',
            title: 'Check before you go in',
            subtitle: 'Check live storm overflows on WaterFit Live and read our latest results before you go in'
          }
        ]
      },
      {
        _type: 'heroSection',
        _key: 'hero4',
        title: 'Where we sample',
        subtitle: 'We routinely sample around Calstock/Okel Tor to build a long-term picture of local conditions.',
        backgroundImage: {
          _type: 'backgroundImage',
          type: 'color',
          color: '#1a75ff'
        }
      },
      {
        _type: 'ctaSection',
        _key: 'cta1',
        title: 'Stay informed',
        subtitle: 'Check our latest results and stay safe',
        actionButtons: [
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
            url: 'https://www.facebook.com/people/Drip-Drip-friends-of-the-Tamar-River/61564869366844/'
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