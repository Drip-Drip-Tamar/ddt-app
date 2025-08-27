import {defineField, defineType} from 'sanity'
import {ChartUpwardIcon} from '@sanity/icons'
import {SECTION_BASE_FIELDS, SECTION_BASE_GROUPS} from './sectionBase'

export default defineType({
  name: 'waterQualitySection',
  title: 'Water Quality Chart',
  type: 'object',
  icon: ChartUpwardIcon,
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
      description: 'Optional introductory text above the chart',
      group: 'content',
    }),
    defineField({
      name: 'showChart',
      title: 'Show Interactive Chart',
      type: 'boolean',
      initialValue: true,
      group: 'content',
    }),
    defineField({
      name: 'showTable',
      title: 'Show Data Table',
      type: 'boolean',
      initialValue: false,
      description: 'Display data in table format below the chart',
      group: 'content',
    }),
    defineField({
      name: 'siteFilter',
      title: 'Filter by Sites',
      type: 'array',
      of: [{type: 'reference', to: [{type: 'samplingSite'}]}],
      description: 'Leave empty to show all sites',
      group: 'content',
    }),
    defineField({
      name: 'dateRange',
      title: 'Date Range',
      type: 'object',
      fields: [
        defineField({
          name: 'startDate',
          type: 'date',
          title: 'Start Date',
        }),
        defineField({
          name: 'endDate',
          type: 'date',
          title: 'End Date',
        })
      ],
      group: 'content',
    }),
    defineField({
      name: 'chartType',
      title: 'Chart Type',
      type: 'string',
      options: {
        list: [
          {title: 'Line Chart', value: 'line'},
          {title: 'Bar Chart', value: 'bar'},
        ],
        layout: 'radio'
      },
      initialValue: 'line',
      group: 'content',
    }),
    defineField({
      name: 'showThresholds',
      title: 'Show Quality Thresholds',
      type: 'boolean',
      initialValue: true,
      description: 'Display EU bathing water quality thresholds',
      group: 'content',
    }),
    defineField({
      name: 'cta',
      title: 'Call-to-action',
      type: 'array',
      of: [{type: 'actionButton'}, {type: 'actionLink'}],
      group: 'content',
    }),
    ...SECTION_BASE_FIELDS,
  ],
  preview: {
    select: {
      heading: 'heading',
      showChart: 'showChart',
      showTable: 'showTable',
    },
    prepare(selection) {
      const display = []
      if (selection.showChart) display.push('Chart')
      if (selection.showTable) display.push('Table')
      return {
        title: selection.heading || 'Water Quality Chart',
        subtitle: `Water Quality - ${display.join(' + ') || 'No display'}`,
      }
    },
  },
})