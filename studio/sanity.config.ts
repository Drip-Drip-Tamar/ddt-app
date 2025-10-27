import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {presentationTool} from 'sanity/presentation'
import {markdownSchema} from 'sanity-plugin-markdown'
import {schemaTypes} from './schemaTypes'
import { media } from 'sanity-plugin-media'

export default defineConfig({
  name: 'default',
  title: 'ddt-app',

  projectId: 'i1ywpsq5',
  dataset: 'production',

  plugins: [
    structureTool(),
    visionTool(),
    markdownSchema(),
    presentationTool({
      // Use existing preview infrastructure that works with Netlify Visual Editor
      previewUrl: {
        origin: process.env.SANITY_STUDIO_PREVIEW_URL || 'http://localhost:3000',
        previewMode: {
          enable: '/?SANITY_PREVIEW_DRAFTS=true'
        }
      },
      resolve: {
        mainDocuments: [
          {
            route: '/:slug',
            filter: '_type == "page" && slug.current == $slug'
          }
        ],
        locations: {
          page: {
            select: {
              title: 'title',
              slug: 'slug.current',
            },
            resolve: (doc) => ({
              locations: [
                {
                  title: doc?.title || 'Untitled',
                  href: `/${doc?.slug || ''}`
                }
              ]
            })
          }
        }
      }
    }),
    media()
  ],

  schema: {
    types: schemaTypes,
  },
})
