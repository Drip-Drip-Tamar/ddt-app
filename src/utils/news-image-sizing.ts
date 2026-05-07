export type NewsImageSizingMode = 'cover' | 'container' | 'fill' | 'stretch';
export type NewsImagePlacement = 'banner' | 'card';

const STEGA_MARKERS_REGEX = /[\u200b-\u200d\ufeff]/g;
const NEWS_IMAGE_BACKGROUND_COLOR_REGEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const NEWS_IMAGE_DEFAULT_BACKGROUND_COLORS: Record<NewsImagePlacement, string> = {
  banner: '#e5e7eb',
  card: '#f3f4f6'
};

const NEWS_IMAGE_SIZING_MODES = new Set<NewsImageSizingMode>([
  'cover',
  'container',
  'fill',
  'stretch'
]);

export function normalizeNewsImageSizingMode(value: unknown): NewsImageSizingMode {
  if (typeof value !== 'string') {
    return 'cover';
  }

  const normalizedValue = stripSanityStegaMarkers(value);

  return NEWS_IMAGE_SIZING_MODES.has(normalizedValue as NewsImageSizingMode)
    ? (normalizedValue as NewsImageSizingMode)
    : 'cover';
}

export function normalizeNewsImageBackgroundColor(
  value: unknown,
  placement: NewsImagePlacement
): string {
  const defaultColor = NEWS_IMAGE_DEFAULT_BACKGROUND_COLORS[placement];

  if (typeof value !== 'string') {
    return defaultColor;
  }

  const normalizedValue = stripSanityStegaMarkers(value);

  return NEWS_IMAGE_BACKGROUND_COLOR_REGEX.test(normalizedValue)
    ? normalizedValue
    : defaultColor;
}

export function getNewsImageBackgroundStyle(
  value: unknown,
  placement: NewsImagePlacement
): string {
  return `background-color: ${normalizeNewsImageBackgroundColor(value, placement)};`;
}

export function getNewsImageSizingClasses(
  placement: 'banner',
  mode: unknown
): string;
export function getNewsImageSizingClasses(
  placement: 'card',
  mode: unknown
): { figure: string; image: string };
export function getNewsImageSizingClasses(
  placement: NewsImagePlacement,
  mode: unknown
): string | { figure: string; image: string } {
  const normalizedMode = normalizeNewsImageSizingMode(mode);

  if (placement === 'banner') {
    const frameClasses =
      normalizedMode === 'fill'
        ? 'w-full h-auto object-contain'
        : `w-full h-64 md:h-[28rem] ${getObjectFitClass(normalizedMode)}`;

    return `${frameClasses} object-center`;
  }

  const fixedFrame = 'w-full h-48 sm:h-full';
  const fluidFrame = 'w-full h-auto';

  return {
    figure: 'w-full sm:w-64 md:w-80 flex-shrink-0 overflow-hidden bg-gray-100',
    image: `${
      normalizedMode === 'fill'
        ? `${fluidFrame} object-contain`
        : `${fixedFrame} ${getObjectFitClass(normalizedMode)}`
    } object-center transition-transform duration-500 group-hover:scale-110`
  };
}

function getObjectFitClass(mode: Exclude<NewsImageSizingMode, 'fill'>): string {
  if (mode === 'container') {
    return 'object-contain';
  }

  if (mode === 'stretch') {
    return 'object-fill';
  }

  return 'object-cover';
}

function stripSanityStegaMarkers(value: string): string {
  return value.replace(STEGA_MARKERS_REGEX, '').trim();
}
