import {defineField, defineType} from 'sanity'
import {CogIcon} from '@sanity/icons'

export default defineType({
  name: 'siteConfig',
  title: 'Site Configuration',
  description: 'Site general settings, header and footer configuration.',
  type: 'document',
  icon: CogIcon,
  groups: [
    {
      name: 'content',
      title: 'Content',
      default: true,
    },
    {
      name: 'seo',
      title: 'SEO',
    },
    {
      name: 'monitoring',
      title: 'Monitoring Configuration',
    },
  ],
  fields: [
    defineField({
      name: 'favicon',
      title: 'Favicon',
      type: 'image',
      group: 'content',
    }),
    defineField({
      name: 'header',
      title: 'Header',
      type: 'header',
      group: 'content',
    }),
    defineField({
      name: 'footer',
      title: 'Footer',
      type: 'footer',
      group: 'content',
    }),
    defineField({
      name: 'titleSuffix',
      title: 'Suffix for page titles',
      description:
        'Suffix to append to the title tag of all pages, except in pages where the this behavior is disabled.',
      type: 'string',
      group: 'seo',
    }),
    defineField({
      name: 'monitoringConfiguration',
      title: 'Monitoring Configuration',
      description: 'Central configuration for all monitoring locations and API parameters',
      type: 'object',
      group: 'monitoring',
      fields: [
        defineField({
          name: 'primaryLocation',
          title: 'Primary Monitoring Location',
          type: 'object',
          fields: [
            defineField({
              name: 'name',
              title: 'Location Name',
              type: 'string',
              initialValue: 'Calstock',
            }),
            defineField({
              name: 'center',
              title: 'Center Coordinates',
              type: 'object',
              fields: [
                defineField({
                  name: 'lat',
                  title: 'Latitude',
                  type: 'number',
                  initialValue: 50.497,
                  validation: Rule => Rule.required().min(-90).max(90),
                }),
                defineField({
                  name: 'lng',
                  title: 'Longitude',
                  type: 'number',
                  initialValue: -4.202,
                  validation: Rule => Rule.required().min(-180).max(180),
                }),
              ],
            }),
            defineField({
              name: 'defaultRadius',
              title: 'Default Radius (km)',
              type: 'number',
              initialValue: 10,
              validation: Rule => Rule.required().positive(),
            }),
            defineField({
              name: 'description',
              title: 'Description',
              type: 'text',
            }),
          ],
        }),
        defineField({
          name: 'riverStations',
          title: 'River Monitoring Stations',
          type: 'object',
          fields: [
            defineField({
              name: 'freshwaterStationId',
              title: 'Freshwater Station ID (Gunnislake)',
              type: 'string',
              initialValue: '47117',
              description: 'Environment Agency station ID for freshwater flow monitoring',
            }),
            defineField({
              name: 'tidalStationId',
              title: 'Tidal Station ID (Plymouth/Devonport)',
              type: 'string',
              initialValue: 'E72139',
              description: 'Environment Agency station ID for tidal level monitoring',
            }),
          ],
        }),
        defineField({
          name: 'bathingWaters',
          title: 'Bathing Water Monitoring Points',
          type: 'array',
          of: [
            {
              type: 'object',
              fields: [
                defineField({
                  name: 'id',
                  title: 'Bathing Water ID',
                  type: 'string',
                  validation: Rule => Rule.required(),
                }),
                defineField({
                  name: 'label',
                  title: 'Display Name',
                  type: 'string',
                  validation: Rule => Rule.required(),
                }),
              ],
            },
          ],
          initialValue: [
            { id: 'ukk4100-26400', label: 'Plymouth Hoe East' },
            { id: 'ukk4100-26500', label: 'Plymouth Hoe West' },
          ],
        }),
      ],
    }),
  ],
  preview: {
    select: {
      title: 'header.title',
    },
    prepare(selection) {
      return {
        title: selection.title,
      }
    },
  },
})
