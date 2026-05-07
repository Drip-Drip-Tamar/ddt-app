import {defineField, defineType} from 'sanity'
import {
  NEWS_IMAGE_BACKGROUND_COLOR_VALIDATION_REGEX,
  NEWS_IMAGE_SIZING_OPTIONS,
  isNewsFeaturedImageControlHidden,
} from './newsImageSizing'
import {HexColorInput} from './HexColorInput'

export default defineType({
  name: 'customImage',
  title: 'Image',
  type: 'object',
  fields: [
    defineField({
      title: 'Image',
      name: 'image',
      type: 'image',
    }),
    defineField({
      name: 'alt',
      title: 'Alt text',
      description: 'The alt text is used in the "alt" attribute of the img tag',
      type: 'string',
    }),
    defineField({
      name: 'sizingMode',
      title: 'Sizing mode',
      description: 'Controls how this image fits into news article banners and news cards.',
      type: 'string',
      options: {
        list: NEWS_IMAGE_SIZING_OPTIONS,
        layout: 'radio',
      },
      initialValue: 'cover',
      hidden: isNewsFeaturedImageControlHidden,
    }),
    defineField({
      name: 'backgroundColor',
      title: 'Background colour',
      description: 'Hex colour shown behind news featured images when the image does not fill the frame. Example: #000000.',
      type: 'string',
      components: {input: HexColorInput},
      initialValue: '#e5e7eb',
      validation: (rule) =>
        rule.custom((value) =>
          !value || NEWS_IMAGE_BACKGROUND_COLOR_VALIDATION_REGEX.test(value)
            ? true
            : 'Use a hex colour, for example #000000 or #e5e7eb',
        ),
      hidden: isNewsFeaturedImageControlHidden,
    }),
  ],
  preview: {
    select: {
      name: 'image.asset.originalFilename',
      media: 'image.asset',
    },
    prepare(selection) {
      return {
        title: selection.name,
        media: selection.media,
      }
    },
  },
})
