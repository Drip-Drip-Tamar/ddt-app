/**
 * Chart.js CDN Loader Utility
 * 
 * Loads Chart.js and plugins from CDN to reduce server load and bandwidth costs.
 * Uses multiple CDN fallbacks for reliability.
 */

// CDN URLs with specific versions for consistency
const CDN_URLS = {
  chart: [
    'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js',
    'https://unpkg.com/chart.js@4.4.1/dist/chart.umd.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js'
  ],
  annotation: [
    'https://cdn.jsdelivr.net/npm/chartjs-plugin-annotation@3.0.1/dist/chartjs-plugin-annotation.min.js',
    'https://unpkg.com/chartjs-plugin-annotation@3.0.1/dist/chartjs-plugin-annotation.min.js'
  ]
};

// Track loading state to prevent duplicate loads
let chartLoadPromise = null;
let isChartLoaded = false;

/**
 * Load a script from URL
 */
function loadScript(url) {
  return new Promise((resolve, reject) => {
    // Check if script already exists
    const existingScript = document.querySelector(`script[src="${url}"]`);
    if (existingScript) {
      if (existingScript.dataset.loaded === 'true') {
        resolve();
        return;
      }
      // Wait for existing script to load
      existingScript.addEventListener('load', resolve);
      existingScript.addEventListener('error', reject);
      return;
    }

    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    script.dataset.loaded = 'false';
    
    script.onload = () => {
      script.dataset.loaded = 'true';
      resolve();
    };
    
    script.onerror = () => {
      script.remove();
      reject(new Error(`Failed to load script: ${url}`));
    };
    
    document.head.appendChild(script);
  });
}

/**
 * Try loading from multiple CDN URLs
 */
async function loadFromCDNs(urls, validateFn) {
  for (const url of urls) {
    try {
      await loadScript(url);
      if (!validateFn || validateFn()) {
        return true;
      }
    } catch (error) {
      console.warn(`CDN failed: ${url}`, error.message);
    }
  }
  return false;
}

/**
 * Load Chart.js from local bundle as last resort
 */
async function loadLocalFallback() {
  try {
    const chartModule = await import('chart.js/auto');
    window.Chart = chartModule.default || chartModule.Chart;
    
    // Try to load annotation plugin
    try {
      const annotationModule = await import('chartjs-plugin-annotation');
      if (window.Chart && annotationModule.default) {
        window.Chart.register(annotationModule.default);
      }
    } catch (error) {
      console.warn('Could not load annotation plugin locally:', error.message);
    }
    
    return true;
  } catch (error) {
    console.error('Local Chart.js fallback failed:', error);
    return false;
  }
}

/**
 * Main function to load Chart.js
 * Returns the Chart constructor when loaded
 */
export async function loadChart() {
  // Return existing Chart if already loaded
  if (isChartLoaded && window.Chart) {
    return window.Chart;
  }

  // Prevent duplicate loading
  if (chartLoadPromise) {
    return chartLoadPromise;
  }

  chartLoadPromise = (async () => {
    try {
      console.log('Loading Chart.js from CDN...');
      
      // Try loading Chart.js from CDNs
      const chartLoaded = await loadFromCDNs(
        CDN_URLS.chart,
        () => window.Chart !== undefined
      );

      if (!chartLoaded) {
        console.warn('All CDNs failed, trying local fallback...');
        const localLoaded = await loadLocalFallback();
        
        if (!localLoaded || !window.Chart) {
          throw new Error('Failed to load Chart.js from any source');
        }
      }

      // Try loading annotation plugin (optional, don't fail if it doesn't load)
      if (window.Chart && CDN_URLS.annotation) {
        const annotationLoaded = await loadFromCDNs(
          CDN_URLS.annotation,
          () => window.Chart.defaults.plugins.annotation !== undefined
        );
        
        if (!annotationLoaded) {
          console.info('Annotation plugin not loaded, annotations will be disabled');
        }
      }

      isChartLoaded = true;
      console.log('Chart.js loaded successfully');
      return window.Chart;
      
    } catch (error) {
      chartLoadPromise = null; // Reset to allow retry
      console.error('Failed to load Chart.js:', error);
      throw error;
    }
  })();

  return chartLoadPromise;
}

/**
 * Check if Chart.js is loaded
 */
export function isChartJSLoaded() {
  return isChartLoaded && window.Chart !== undefined;
}

/**
 * Reset loading state (useful for testing)
 */
export function resetChartLoader() {
  chartLoadPromise = null;
  isChartLoaded = false;
}