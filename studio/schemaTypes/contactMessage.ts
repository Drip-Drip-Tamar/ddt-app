import {defineType, defineField} from 'sanity'

export default defineType({
  name: 'contactMessage',
  title: 'Contact Message',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      validation: Rule => Rule.required()
    }),
    defineField({
      name: 'email',
      title: 'Email',
      type: 'string',
      validation: Rule => Rule.required().email()
    }),
    defineField({
      name: 'topic',
      title: 'Topic',
      type: 'string',
      options: {
        list: [
          {title: 'General enquiry', value: 'General enquiry'},
          {title: 'Volunteering', value: 'Volunteering'},
          {title: 'Media/press', value: 'Media/press'}
        ]
      }
    }),
    defineField({
      name: 'message',
      title: 'Message',
      type: 'text',
      rows: 6,
      validation: Rule => Rule.required()
    }),
    defineField({
      name: 'consent',
      title: 'Consent',
      type: 'boolean',
      description: 'User consented to data storage'
    }),
    defineField({
      name: 'ipHash',
      title: 'IP Hash',
      type: 'string',
      description: 'Hashed IP address for security tracking'
    }),
    defineField({
      name: 'userAgent',
      title: 'User Agent',
      type: 'string',
      description: 'Browser user agent string'
    }),
    defineField({
      name: 'createdAt',
      title: 'Created At',
      type: 'datetime'
    })
  ],
  preview: {
    select: {
      title: 'email',
      subtitle: 'topic',
      date: 'createdAt'
    },
    prepare(selection) {
      const {title, subtitle, date} = selection
      return {
        title: title,
        subtitle: `${subtitle || 'No topic'} - ${date ? new Date(date).toLocaleDateString() : 'No date'}`
      }
    }
  }
})