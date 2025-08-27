import {defineType, defineField} from 'sanity'
import {PinIcon} from '@sanity/icons'

export default defineType({
  name: 'samplingSite',
  type: 'document',
  title: 'Sampling Site',
  icon: PinIcon,
  fields: [
    defineField({
      name: 'title',
      type: 'string',
      title: 'Site Name',
      validation: Rule => Rule.required()
    }),
    defineField({
      name: 'slug',
      type: 'slug',
      title: 'Slug',
      options: {
        source: 'title',
        maxLength: 96
      },
      validation: Rule => Rule.required()
    }),
    defineField({
      name: 'description',
      type: 'text',
      title: 'Description',
      description: 'Brief description of the sampling location'
    }),
    defineField({
      name: 'coordinates',
      type: 'object',
      title: 'Coordinates',
      fields: [
        defineField({
          name: 'lat',
          type: 'number',
          title: 'Latitude'
        }),
        defineField({
          name: 'lng',
          type: 'number',
          title: 'Longitude'
        })
      ]
    }),
    defineField({
      name: 'notes',
      type: 'text',
      title: 'Notes',
      description: 'Additional notes about this site'
    })
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'description'
    }
  }
})