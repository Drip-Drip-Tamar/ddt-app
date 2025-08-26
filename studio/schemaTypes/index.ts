// Document types
import {postType} from './postType'
import page from './page'
import person from './person'
import company from './company'
import testimonial from './testimonial'
import siteConfig from './siteConfig'
import header from './header'
import footer from './footer'

// Section types
import heroSection from './heroSection'
import cardsSection from './cardsSection'
import ctaSection from './ctaSection'
import logosSection from './logosSection'
import testimonialsSection from './testimonialsSection'

// Component types
import actionButton from './actionButton'
import actionLink from './actionLink'
import badge from './badge'
import card from './card'
import customImage from './customImage'
import backgroundImage from './backgroundImage'

export const schemaTypes = [
  // Document types
  page,
  postType,
  person,
  company,
  testimonial,
  siteConfig,
  header,
  footer,
  
  // Section types
  heroSection,
  cardsSection,
  ctaSection,
  logosSection,
  testimonialsSection,
  
  // Component types
  actionButton,
  actionLink,
  badge,
  card,
  customImage,
  backgroundImage
]
