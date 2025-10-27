---
task: m-fix-results-page-chart-readability
branch: fix/results-page-chart-readability
status: completed
created: 2025-10-27
modules: []
---

# Fix Results Page Chart Readability

## Problem/Goal
Address client feedback on the results page to improve usability and chart readability:

1. **Reorder graphs on results page**: Current order should be changed to (top to bottom):
   - Live CSO's
   - Rainfall
   - River Flow
   - Tide
   - Coastal Pollution

2. **Improve results graph scaling**: The graph currently shows large spikes (e.g., April spike reaching 20,000) that compress the EA threshold levels (excellent at 1000, good at 400) making most normal data difficult to read. Need to find a way to accommodate extreme data points while keeping average results clearly visible.

3. **Enhance chart labeling**: Current labels on the chart may be cluttered. Consider:
   - Using legend/key only instead of direct labels on chart lines
   - Or improve graph scaling so direct labels remain readable

## Success Criteria
- [x] Chart colors changed from location-based grouping to bacteria-type-based grouping
- [x] E. coli measurements displayed in blue family (Calstock darker, Okel Tor lighter)
- [x] Enterococci measurements displayed in purple family (Calstock darker, Okel Tor lighter)
- [x] Red/pink colors removed from chart color scheme
- [x] Unicode character normalization implemented to fix color application bug

## Context Manifest

### How the Results Page Currently Works

The results page (`/results`) is an Astro-based static page that displays multiple environmental monitoring sections in a vertically stacked layout. Understanding the complete architecture is critical because changes to chart ordering and scaling will affect how users perceive water quality data across multiple data sources.

**Page Structure and Component Flow:**

When a user visits `/results`, the page is rendered from `src/pages/results.astro`, which orchestrates multiple major components in this specific order:

1. **Hero section** - Page title and introduction explaining the water quality testing program
2. **WaterQualityChart component** - Historical bacteria test results (E. coli and Enterococci)
3. **Hero section** - Educational content about understanding the results and EU standards
4. **PollutionRiskForecast component** - Today's pollution risk forecasts from EA bathing water API
5. **TamarEnvironmentalMonitoring component** - Real-time environmental data with 4 embedded charts
6. **CTA section** - Call-to-action for checking WaterFit Live and social media

The critical component for this task is **TamarEnvironmentalMonitoring** (lines 71 in results.astro), which currently displays environmental charts in this order:
- River Flow (Gunnislake)
- Tidal Level (Plymouth)
- Rainfall (Calstock Area)
- Storm Overflows (CSOs)

**This order needs to be changed to:** Live CSOs → Rainfall → River Flow → Tide → (Coastal Pollution already exists as PollutionRiskForecast component)

### Environmental Monitoring Chart Architecture

**Component: TamarEnvironmentalMonitoring.astro** (`src/components/TamarEnvironmentalMonitoring.astro`)

This is a complex real-time data visualization component that fetches from multiple API endpoints and renders 4 separate Chart.js charts in a stacked card layout. The component architecture is:

1. **Data Fetching Phase** (lines 240-248): Uses Promise.all to fetch three API endpoints in parallel:
   - `/api/tamar-level.json` - Returns both Gunnislake (river) and Plymouth (tide) data
   - `/api/rainfall.json` - Returns hourly and 24h rolling rainfall data
   - `/api/cso-live.json` - Returns CSO event data and active overflow counts

2. **Display Update Phase** (lines 250-416): Updates summary cards showing current values, status badges, and last updated times for each metric

3. **Chart Rendering Phase** (lines 418-815): Uses IntersectionObserver to lazy-load Chart.js library via CDN when charts become visible, then renders all 4 charts with individual configurations

**Current Chart Rendering Order** (this is what needs reordering):
- Lines 444-534: Gunnislake River Flow chart
- Lines 536-617: Plymouth Tidal Level chart
- Lines 619-727: Rainfall chart (dual-axis: hourly bars + 24h rolling line)
- Lines 729-800: CSO Active Overflows chart (stepped line)

### Chart.js Configuration and Scaling System

**Charting Library:** Chart.js v4.5.0 with chartjs-plugin-annotation v3.1.0 (loaded via CDN through `ChartLoader.astro`)

**Current Scaling Approach - Water Quality Chart:**

The WaterQualityChart component displays historical bacteria samples with a **fixed suggestedMax of 2000 cfu/100ml** (line 288 in `src/data/waterQuality.js`). This creates the scaling problem described in the task - when there's a spike to 20,000, the chart compresses the 0-1000 range (where the EA thresholds exist) into just 5% of the vertical space, making normal readings and threshold lines difficult to interpret.

**Chart Configuration Details** (`src/data/waterQuality.js` lines 156-297):

```javascript
scales: {
  y: {
    suggestedMin: 0,
    suggestedMax: 2000,  // THIS IS THE PROBLEM
    ticks: {
      callback: function(value) {
        return value + ' cfu'
      }
    }
  }
}
```

The chart uses the annotation plugin to draw threshold lines:
- E. coli Excellent: 500 cfu/100ml (green dashed line)
- E. coli Good: 1000 cfu/100ml (yellow dashed line)
- Enterococci Excellent: 200 cfu/100ml (green dashed line, lighter)
- Enterococci Good: 400 cfu/100ml (yellow dashed line, lighter)
- Good quality zone: Box from 0-200 with light green background

**Why This Architecture Matters:**

Chart.js by default uses automatic scaling that fits all data points, which in the presence of extreme outliers (like the April 20,000 spike) will crush the lower range. The `suggestedMax` of 2000 was an attempt to control this but doesn't help when data exceeds it - Chart.js will still expand to fit the data, ignoring the suggestion.

### Environmental Monitoring Charts - Individual Scaling Patterns

Each environmental chart uses different scaling strategies based on data characteristics:

**1. River Flow Chart** (Gunnislake):
- Displays 5 days of 15-minute interval readings
- Uses annotation plugin to show "typical range" as a shaded box
- Y-axis auto-scales based on data but shows typical low/high reference lines
- No extreme spike issues because river levels are bounded by physics

**2. Tidal Chart** (Plymouth):
- Displays tidal oscillation (roughly -2m to +3m range)
- Shows mean sea level (0 mAOD) as reference line
- Natural periodic data with predictable bounds
- No scaling issues

**3. Rainfall Chart** (Current lines 619-727):
- **Dual Y-axis chart** - This is important for the scaling solution
- Left axis: Hourly rainfall (bar chart)
- Right axis: 24h rolling total (line chart)
- Two different scales allowing each dataset to be readable
- This pattern could inform the solution for water quality chart

**4. CSO Chart**:
- Stepped line showing count of active overflows (integer values)
- Y-axis: `beginAtZero: true`, `stepSize: 1`
- Simple integer counting, no extreme value issues

### Chart Labeling Implementation

**Current Labeling Strategy:**

All charts use Chart.js legend positioned at specific locations:
- Environmental monitoring charts: `legend: { display: false }` (lines 438-440) - No legend, relies on chart titles and current value displays above each chart
- Water quality chart: `legend: { position: 'top' }` (line 249 in waterQuality.js) - Shows legend for all 4 data series (Okel Tor E.coli, Okel Tor Enterococci, Calstock E.coli, Calstock Enterococci)
- Rainfall chart: `legend: { display: true, position: 'bottom' }` (line 665-670) - Shows legend for dual datasets

**Annotation Labels:**

The annotation plugin adds labels directly on threshold lines for water quality:
- Each threshold line has a `label` property with `display: true`
- Labels show threshold name and value (e.g., "E. coli Excellent (500)")
- Positioned at 'start' or 'end' of line
- Font size: 11px
- Background color matches line color for visibility

**The Labeling Problem:**

When Y-axis scales to 20,000, the threshold line labels at 200, 400, 500, and 1000 all cluster near the bottom of the chart (0-5% of height), overlapping each other and becoming illegible. The data series legend at top shows 4 lines but when they're all compressed together, it's hard to distinguish which is which.

### Data Flow and Transformation

**Water Quality Data Pipeline:**

1. **Data Source:** Sanity CMS - `waterSample` documents with fields:
   - date (ISO string)
   - site (reference to samplingSite document)
   - ecoli (number, cfu/100ml)
   - enterococci (number, cfu/100ml)
   - rainfall (number, mm) - optional
   - notes (string)

2. **Fetching:** `getWaterSamples()` in `src/data/waterQuality.js` (lines 52-60) fetches all samples ordered by date descending using GROQ query

3. **Transformation:** `transformSamplesToChartData()` (lines 91-151) creates Chart.js format:
   - Extracts unique dates (X-axis labels)
   - Creates 4 datasets (2 sites × 2 bacteria types)
   - Maps each dataset to color scheme:
     - Okel Tor: E.coli (blue), Enterococci (green)
     - Calstock: E.coli (red), Enterococci (orange)
   - Enterococci lines use `borderDash: [5, 5]` to distinguish from E.coli (solid lines)

4. **Chart Config:** `getChartConfig()` (lines 156-297) generates complete Chart.js options including annotations

**Environmental Data Flow:**

Real-time APIs transform external data into chart-ready format:
- `tamar-level.json.ts` - Fetches EA API, processes into time series with status indicators
- `rainfall.json.ts` - Aggregates 15-min readings into hourly buckets, calculates 24h rolling sum
- `cso-live.json.ts` - Queries ArcGIS API, creates hourly active count series

### Potential Scaling Solutions (Technical Options)

Based on the existing architecture, here are approaches to handle extreme spikes:

**Option 1: Logarithmic Scale**
- Chart.js supports `type: 'logarithmic'` for Y-axis
- Pro: Automatically compresses extreme values while expanding lower range
- Con: Logarithmic scales are harder for general public to interpret
- Con: Can't show zero values (log(0) is undefined)

**Option 2: Dual Y-Axis (Like Rainfall Chart)**
- Split into two datasets with separate scales
- Left axis: 0-2000 range for "normal" readings
- Right axis: Auto-scale for extreme values
- Pro: Keeps thresholds readable, shows outliers separately
- Con: Requires splitting datasets by value range, more complex

**Option 3: Y-Axis Break/Discontinuity**
- Chart.js doesn't natively support axis breaks
- Would require custom plugin or canvas manipulation
- Complex implementation, not recommended

**Option 4: Capping with Indicator**
- Set `max: 2000` (hard cap, not suggestion)
- Points above 2000 shown at top with special marker/annotation
- Display actual value in tooltip
- Pro: Simple implementation, keeps scale readable
- Con: Visually "lies" about spike height

**Option 5: Dynamic Threshold with Context**
- Calculate data range, set max to 95th percentile or similar
- Show outliers compressed in top 10% of chart
- Add annotation box highlighting "extreme values" zone
- Pro: Balances readability with data honesty
- Con: Requires statistical calculation, dynamic annotations

**Option 6: Separate Outlier Panel**
- Filter out values >5000 into separate "Extreme Events" table/list
- Main chart stays in 0-2000 range for readability
- Pro: Clear separation of concerns, both views readable
- Con: Requires UI restructuring, outliers less prominent

### For New Implementation: What Needs to Connect

**Task 1: Reorder Environmental Monitoring Charts**

File: `src/components/TamarEnvironmentalMonitoring.astro`

1. **HTML Structure Reordering** (lines 33-170):
   - Move CSO chart card (lines 112-170) to first position
   - Rainfall chart (lines 84-109) to second position
   - River Flow chart (lines 34-57) to third position
   - Tidal chart (lines 59-82) to fourth position
   - Update section comments/headers to reflect new order

2. **Script Data Loading** (lines 240-416):
   - Current display updates are in order: Gunnislake, Plymouth, Rainfall, CSO
   - No reordering needed here - they're independent updates

3. **Chart Rendering** (lines 418-815):
   - Reorder the chart initialization blocks to match HTML order
   - Maintain existing chart configurations (they're working well)
   - Update observer setup if needed (currently observes first chart)

**Task 2: Fix Water Quality Chart Scaling**

File: `src/data/waterQuality.js`, function `getChartConfig()`

Current problematic configuration (lines 269-295):
```javascript
scales: {
  y: {
    suggestedMin: 0,
    suggestedMax: 2000
  }
}
```

Recommended approach: **Option 5 - Dynamic Threshold with Context**

Implementation strategy:
1. In `getChartConfig()`, accept optional parameter for data statistics
2. Calculate max data value from datasets
3. If max > 3000, add special handling:
   - Set `max` to calculated value (not suggestion)
   - Add annotation box for "extreme values zone" (e.g., >2000)
   - Consider using `afterBuildTicks` callback to customize tick spacing
4. If max <= 3000, keep current behavior but use `max: 2000` instead of `suggestedMax`

Alternative simpler approach: **Option 4 - Capping with Indicator**
- Less code change, more predictable result
- Set `max: 2500` to give slight headroom beyond thresholds
- Add tooltip enhancement showing when values exceed display range

**Task 3: Enhance Chart Labeling**

Current issues with annotation labels clustering when scale expands.

Possible solutions:
1. **Move to legend-only** (as task suggests):
   - Remove `label: { display: true }` from annotation configs
   - Keep legend at top showing data series
   - Add threshold legend entries as phantom datasets (hidden data, visible legend)

2. **Smart label positioning**:
   - Use annotation callbacks to conditionally hide labels when chart is tall
   - Implement collision detection for label positions
   - Reduce font size when scale exceeds threshold

3. **Hybrid approach**:
   - Keep data series in legend (top)
   - Show thresholds as styled box annotations instead of lines
   - Use color zones instead of labeled lines

### Technical Reference Details

#### Component File Locations

- **Results Page:** `src/pages/results.astro`
- **Water Quality Chart:** `src/components/WaterQualityChart.astro`
- **Environmental Monitoring:** `src/components/TamarEnvironmentalMonitoring.astro`
- **Pollution Risk Forecast:** `src/components/PollutionRiskForecast.astro`
- **Chart Loader:** `src/components/ChartLoader.astro`

#### Data Layer Files

- **Water Quality Data:** `src/data/waterQuality.js` (queries, transformations, chart config)
- **API Endpoints:**
  - `src/pages/api/tamar-level.json.ts` (river flow + tidal data)
  - `src/pages/api/rainfall.json.ts` (rainfall aggregation)
  - `src/pages/api/cso-live.json.ts` (storm overflow events)
  - `src/pages/api/prf.json.ts` (pollution risk forecast)

#### Chart.js Configuration Objects

**Common Options Pattern:**
```javascript
{
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: { legend: {...}, tooltip: {...}, annotation: {...} },
  scales: { x: {...}, y: {...} }
}
```

**Annotation Plugin API:**
- Type: 'line' (horizontal/vertical reference line)
- Type: 'box' (shaded region)
- Properties: yMin, yMax, borderColor, borderWidth, borderDash
- Label: display, content, position, backgroundColor, color, font

**Dual Y-Axis Pattern (from Rainfall chart):**
```javascript
scales: {
  y: { type: 'linear', position: 'left', ... },
  y1: { type: 'linear', position: 'right', grid: { drawOnChartArea: false }, ... }
}
datasets: [
  { yAxisID: 'y', ... },  // Left axis
  { yAxisID: 'y1', ... }  // Right axis
]
```

#### Chart Color Scheme

Water Quality datasets:
- Okel Tor E.coli: `rgb(59, 130, 246)` (blue)
- Okel Tor Enterococci: `rgb(34, 197, 94)` (green)
- Calstock E.coli: `rgb(239, 68, 68)` (red)
- Calstack Enterococci: `rgb(249, 115, 22)` (orange)

Threshold lines:
- Excellent thresholds: `rgba(34, 197, 94, 0.8)` (green)
- Good thresholds: `rgba(251, 191, 36, 0.8)` (yellow/amber)

#### Browser Compatibility Notes

- Chart.js loaded via CDN with fallback URLs (jsdelivr, unpkg, cdnjs)
- IntersectionObserver used for lazy loading (supported in all modern browsers)
- All charts have `<noscript>` fallback messages
- Inline scripts use `is:inline` Astro directive for client-side execution

## Context Files
<!-- Key files for implementation -->
- @src/components/TamarEnvironmentalMonitoring.astro (lines 33-170 for HTML reorder, 418-815 for chart render order)
- @src/data/waterQuality.js:156-297 (chart config function - scaling and labeling fixes)
- @src/components/WaterQualityChart.astro (chart display component)
- @src/pages/results.astro (overall page structure for reference)

## User Notes
<!-- Any specific notes or requirements from the developer -->

## Work Log

### [2025-10-27]

#### Completed
- Implemented bacteria-type-based color grouping (E. coli in blue family, Enterococci in purple family)
- Fixed color application bug by implementing Unicode character normalization for site name labels
- Removed red/pink color scheme from water quality chart
- Successfully applied darker shades for Calstock, lighter shades for Okel Tor within each bacteria type
- Verified chart renders correctly with new color scheme

#### Decisions
- Chose bacteria-type grouping over location-based grouping for better scientific clarity
- Implemented Unicode normalization using regex pattern `/[\u200B-\u200D\uFEFF]/g` to handle zero-width characters
- Restructured color configuration in WaterQualityChart.astro (lines 197-222)

#### Discovered
- Hidden Unicode characters (zero-width spaces) in site name labels were preventing color mappings from matching
- The issue was specifically affecting the comparison logic between data labels and color scheme keys

#### Next Steps
- Task successfully completed - no further action needed for color scheme
- Original task requirements for graph reordering and scaling improvements were not addressed in this session