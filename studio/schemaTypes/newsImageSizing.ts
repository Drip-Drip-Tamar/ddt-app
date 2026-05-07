export const NEWS_IMAGE_SIZING_OPTIONS = [
  {title: 'Cover (fills the frame, may crop)', value: 'cover'},
  {title: 'Container (fits the full image inside the frame)', value: 'container'},
  {title: 'Fill (uses the image ratio, no fixed-height crop)', value: 'fill'},
  {title: 'Stretch (forces image to the frame)', value: 'stretch'},
];

export const NEWS_IMAGE_BACKGROUND_COLOR_VALIDATION_REGEX =
  /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

interface ConditionalContext {
  document?: {_type?: string};
  path?: unknown[];
}

export function isNewsFeaturedImageControlHidden(context: ConditionalContext): boolean {
  return context.document?._type !== 'post' || context.path?.[0] !== 'featuredImage';
}
