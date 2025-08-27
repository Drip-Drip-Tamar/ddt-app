import {defineType, defineField} from 'sanity'
import {DropIcon} from '@sanity/icons'

export default defineType({
  name: 'waterSample',
  type: 'document',
  title: 'Water Sample',
  icon: DropIcon,
  fields: [
    defineField({
      name: 'date',
      type: 'date',
      title: 'Sample Date',
      validation: Rule => Rule.required(),
      options: {
        dateFormat: 'DD/MM/YYYY'
      }
    }),
    defineField({
      name: 'site',
      type: 'reference',
      title: 'Sampling Site',
      to: [{type: 'samplingSite'}],
      validation: Rule => Rule.required()
    }),
    defineField({
      name: 'ecoli',
      title: 'E. coli (cfu/100ml)',
      type: 'number',
      description: 'E. coli colony forming units per 100ml',
      validation: Rule => Rule.min(0)
    }),
    defineField({
      name: 'enterococci',
      title: 'Enterococci (cfu/100ml)',
      type: 'number',
      description: 'Intestinal Enterococci colony forming units per 100ml',
      validation: Rule => Rule.min(0)
    }),
    defineField({
      name: 'rainfall',
      title: 'Rainfall (mm)',
      type: 'number',
      description: 'Rainfall amount in millimeters (optional)',
      validation: Rule => Rule.min(0)
    }),
    defineField({
      name: 'notes',
      type: 'text',
      title: 'Notes',
      description: 'Additional observations or notes about this sample'
    }),
    defineField({
      name: 'labReference',
      type: 'string',
      title: 'Lab Reference',
      description: 'Laboratory reference number if available'
    })
  ],
  preview: {
    select: {
      date: 'date',
      siteName: 'site.title',
      ecoli: 'ecoli',
      enterococci: 'enterococci'
    },
    prepare(selection) {
      const {date, siteName, ecoli, enterococci} = selection
      return {
        title: `${date} - ${siteName || 'No site'}`,
        subtitle: `E.coli: ${ecoli ?? 'N/A'} | Entero: ${enterococci ?? 'N/A'}`
      }
    }
  },
  orderings: [
    {
      title: 'Date, New',
      name: 'dateDesc',
      by: [{field: 'date', direction: 'desc'}]
    },
    {
      title: 'Date, Old',
      name: 'dateAsc',
      by: [{field: 'date', direction: 'asc'}]
    }
  ]
})