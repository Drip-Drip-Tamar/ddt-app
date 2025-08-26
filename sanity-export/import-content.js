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
        body: 'Drip Drip Tamar is a community group dedicated to understanding and advocating for the health of the River Tamar. We routinely sample the water for professional laboratory testing, building a comprehensive picture of river health to protect this vital waterway for people and wildlife.',
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
            body: 'We routinely sample the water for professional laboratory testing to track bacteria levels including E. coli and Intestinal Enterococci. Our volunteers collect samples weekly at strategic locations, building a comprehensive picture of river health over time.',
            image: null // Upload via Sanity Studio: /public/images/river_sampling.jpg
          },
          {
            _type: 'card',
            _key: 'card2',
            heading: 'Action',
            body: 'We advocate for a cleaner, safer river by engaging with water companies, local councils, environmental agencies and other stakeholders who can address pollution sources and implement solutions.',
            image: null // Upload via Sanity Studio: /public/images/water_bottles.jpg
          },
          {
            _type: 'card',
            _key: 'card3',
            heading: 'Community',
            body: 'We organise community events, share our findings in plain English, and provide opportunities for local residents to get involved through sampling, donations, or raising awareness about river health.',
            image: null // Upload via Sanity Studio: /public/images/community_event.jpg
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
        body: 'Drip Drip Tamar emerged from a People\'s Assembly where the community raised serious concerns about the River Tamar\'s deteriorating health. Based around Calstock, we are a dedicated group of volunteers working tirelessly to protect and restore this vital waterway. Our mission is to understand, document, and advocate for river health through scientific monitoring and community action.',
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
        body: 'Since emerging from the People\'s Assembly, we\'ve established a rigorous weekly water sampling programme, built strong community momentum through regular events and engagement, secured crowdfunding support to sustain year-round monitoring, and are working to strengthen scientific research partnerships. Our website serves as a hub for sharing results and mobilising community action.',
        backgroundImage: {
          _type: 'backgroundImage',
          type: 'color',
          color: '#79c3e3'
        }
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
        heading: 'News & Updates',
        body: 'Welcome to our community hub for River Tamar updates. Here we share weekly water sampling results, volunteer experiences from the field, project milestones, and opportunities to get involved. Stay informed about the health of our river and join us in protecting this precious waterway.',
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
            heading: 'Weekly sampling results',
            body: 'Every week, our volunteers collect water samples that are tested for E. coli and Intestinal Enterococci. We publish these results promptly so you can make informed decisions about river use.'
          },
          {
            _type: 'card',
            _key: 'card2',
            heading: 'River safety guidance',
            body: 'We provide clear guidance on safer river use, especially after rainfall events. Check our updates alongside South West Water\'s WaterFit Live for storm overflow status.'
          },
          {
            _type: 'card',
            _key: 'card3',
            heading: 'Community stories',
            body: 'Read about volunteer experiences, community events, and discover ways you can contribute through sampling, donations, or spreading awareness about river health.'
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
    logo: null, // Logo image can be uploaded via Sanity Studio: /public/images/drip_drip_logo.png
    navLinks: [
      { _type: 'actionLink', _key: 'link1', label: 'Home', url: '/' },
      { _type: 'actionLink', _key: 'link2', label: 'About', url: '/about' },
      { _type: 'actionLink', _key: 'link3', label: 'Results', url: '/results' },
      { _type: 'actionLink', _key: 'link4', label: 'News', url: '/news' },
      { _type: 'actionLink', _key: 'link5', label: 'Contact', url: '/contact' }
    ]
  },
  footer: {
    _type: 'footer',
    text: `© ${new Date().getFullYear()} Drip Drip Tamar - Working towards a healthy Tamar River\n\n[Facebook](https://www.facebook.com/dripdrip.tamar) | [Contact](/contact) | [WaterFit Live](https://www.southwestwater.co.uk/environment/waterfit/waterfit-live/)`
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