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
      name: 'spamStatus',
      title: 'Spam Status',
      type: 'string',
      initialValue: 'clean',
      options: {
        list: [
          {title: 'Clean', value: 'clean'},
          {title: 'Suspicious', value: 'suspicious'}
        ]
      },
      description: 'Automated spam assessment for review'
    }),
    defineField({
      name: 'spamReasons',
      title: 'Spam Reasons',
      type: 'array',
      of: [{type: 'string'}],
      description: 'Signals that caused the message to be flagged'
    }),
    defineField({
      name: 'turnstileOutcome',
      title: 'Turnstile Outcome',
      type: 'string',
      options: {
        list: [
          {title: 'Success', value: 'success'}
        ]
      },
      description: 'Result of the Cloudflare Turnstile verification'
    }),
    defineField({
      name: 'reviewedAt',
      title: 'Reviewed At',
      type: 'datetime',
      description: 'Optional timestamp for manual review workflow'
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
