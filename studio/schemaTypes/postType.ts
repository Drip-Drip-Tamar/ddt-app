import {defineField, defineType} from 'sanity'
import {DocumentTextIcon} from '@sanity/icons'

export const postType = defineType({
  name: 'post',
  title: 'Post',
  type: 'document',
  icon: DocumentTextIcon,
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
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (rule) => rule.required(),
      group: 'content',
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {source: 'title'},
      validation: (rule) => rule.required(),
      group: 'content',
    }),
    defineField({
      name: 'excerpt',
      title: 'Excerpt',
      description: 'Brief summary of the post for listing pages',
      type: 'text',
      rows: 3,
      validation: (rule) => rule.max(200),
      group: 'content',
    }),
    defineField({
      name: 'author',
      title: 'Author',
      type: 'reference',
      to: [{type: 'person'}],
      validation: (rule) => rule.required(),
      group: 'content',
    }),
    defineField({
      name: 'publishedAt',
      title: 'Published Date',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
      validation: (rule) => rule.required(),
      group: 'content',
    }),
    defineField({
      name: 'featuredImage',
      title: 'Featured Image',
      type: 'customImage',
      group: 'content',
    }),
    defineField({
      name: 'body',
      title: 'Content',
      type: 'array',
      of: [{type: 'block'}],
      validation: (rule) => rule.required(),
      group: 'content',
    }),
    defineField({
      name: 'seoTitle',
      title: 'SEO Title',
      description: 'Title for search engines (leave blank to use post title)',
      type: 'string',
      validation: (rule) => rule.max(60),
      group: 'seo',
    }),
    defineField({
      name: 'seoDescription',
      title: 'SEO Description',
      description: 'Description for search engines (leave blank to use excerpt)',
      type: 'text',
      rows: 3,
      validation: (rule) => rule.max(160),
      group: 'seo',
    }),
    defineField({
      name: 'seoKeywords',
      title: 'SEO Keywords',
      description: 'Comma-separated keywords for search engines',
      type: 'string',
      group: 'seo',
    }),
  ],
  preview: {
    select: {
      title: 'title',
      author: 'author.name',
      date: 'publishedAt',
      media: 'featuredImage.image.asset',
    },
    prepare(selection) {
      const {title, author, date, media} = selection
      const publishedDate = date ? new Date(date).toLocaleDateString() : 'Unpublished'
      return {
        title: title || 'Untitled Post',
        subtitle: `${author ? `by ${author}` : 'No author'} · ${publishedDate}`,
        media: media,
      }
    },
  },
})
