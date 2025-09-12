import {defineField, defineType} from 'sanity'
import {SquareIcon} from '@sanity/icons'
import {SECTION_BASE_FIELDS, SECTION_BASE_GROUPS} from './sectionBase'

export default defineType({
  name: 'heroSection',
  title: 'Hero',
  type: 'object',
  icon: SquareIcon,
  groups: SECTION_BASE_GROUPS,
  fields: [
    defineField({
      name: 'heading',
      title: 'Heading',
      type: 'string',
      group: 'content',
    }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'markdown',
      group: 'content',
    }),
    defineField({
      name: 'cta',
      title: 'Call-to-action',
      type: 'array',
      of: [{type: 'actionButton'}, {type: 'actionLink'}],
      group: 'content',
    }),
    defineField({
      name: 'height',
      title: 'Section Height',
      description: 'Controls the height of the hero section',
      type: 'string',
      options: {
        list: [
          {title: 'Small', value: 'small'},
          {title: 'Medium', value: 'medium'},
          {title: 'Large', value: 'large'},
          {title: 'Full Screen', value: 'full'},
        ],
      },
      initialValue: 'medium',
      group: 'styles',
    }),
    defineField({
      name: 'backgroundImageFit',
      title: 'Background Image Fit',
      description: 'How the background image should fit within the hero section',
      type: 'string',
      options: {
        list: [
          {title: 'Cover (fills container, may crop)', value: 'cover'},
          {title: 'Contain (fits entirely, may show space)', value: 'contain'},
          {title: 'Fill (stretches to fill)', value: 'fill'},
        ],
      },
      initialValue: 'cover',
      group: 'styles',
    }),
    ...SECTION_BASE_FIELDS,
  ],
  preview: {
    select: {
      heading: 'heading',
      body: 'body',
    },
    prepare(selection) {
      return {
        title: `${selection.heading || selection.body || ''}`,
        subtitle: 'Hero',
      }
    },
  },
})
