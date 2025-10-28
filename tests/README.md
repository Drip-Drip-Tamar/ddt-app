# Test Suite Documentation

## Overview

This test suite provides comprehensive automated testing for the Astro + Sanity CMS application, including static analysis, unit tests, and integration tests.

## Quick Start

### Run All Tests (Recommended Post-Task)
```bash
npm run test:all
```
This runs linting, type checking, build validation, and all tests in sequence.

### Individual Test Commands
```bash
npm run test          # Run all tests once
npm run test:unit     # Run unit tests only
npm run test:integration # Run integration tests only
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
npm run test:ui       # Open Vitest UI
npm run lint          # Run ESLint
npm run typecheck     # Run TypeScript checking
npm run build         # Validate build process
```

## Test Structure

```
tests/
├── setup/
│   └── setup.ts                    # Test configuration and global mocks
├── unit/
│   ├── sanity-image.test.ts        # Image optimization utilities
│   ├── sanity-client.test.ts       # Sanity client configuration
│   ├── water-quality.test.ts       # Water quality data transformation (31 tests)
│   └── portable-text.test.ts       # Portable text conversion (35 tests)
└── integration/
    ├── page-rendering.test.ts      # Page routing and data fetching
    └── news-rendering.test.ts      # News post rendering and SEO (27 tests)
```

## Test Coverage Areas

### 1. Static Analysis
- **TypeScript Checking**: Validates all `.ts`, `.tsx`, and `.astro` files
- **ESLint**: Enforces code style and catches potential bugs
- **Build Validation**: Ensures the application builds without errors

### 2. Unit Tests
- **Sanity Image Utilities** (`sanity-image.test.ts`)
  - URL generation with different widths and formats
  - Srcset generation for responsive images
  - Image validation (`isSanityImage` function)
  - Image size configurations

- **Sanity Client** (`sanity-client.test.ts`)
  - Client initialization with correct configuration
  - Environment-based perspective switching
  - Preview mode configuration
  - Real-time listener setup in development

- **Water Quality Data Transformation** (`water-quality.test.ts`) - 31 tests
  - Chart data transformation with log-scale clamping
  - Null and zero value handling for Chart.js compatibility
  - Dataset structure validation (E. coli and Enterococci datasets)
  - Date formatting and label generation
  - Chart configuration with threshold annotations
  - EU Bathing Water Quality standard zones
  - Empty data graceful degradation
  - Coverage: 92.2%

- **Portable Text Utilities** (`portable-text.test.ts`) - 35 tests
  - Portable text to HTML conversion for all block styles (h1-h4, blockquote, normal)
  - Text mark application (strong, em, underline, code)
  - Multiple mark nesting validation
  - Plain text extraction for excerpt generation
  - Truncation and ellipsis handling
  - Edge cases (empty arrays, null values, missing children)
  - Coverage: 100%

### 3. Integration Tests
- **Page Rendering** (`page-rendering.test.ts`)
  - Dynamic page route generation
  - Page data fetching by slug
  - Homepage handling (undefined slug)
  - Site configuration loading
  - Component section mapping
  - Data structure validation
  - Error handling

- **News Post Rendering** (`news-rendering.test.ts`) - 27 tests
  - Post data fetching and structure validation
  - SEO metadata fallback logic (title, description, keywords)
  - Date formatting for listing and detail pages
  - Author data resolution
  - Featured image structure validation
  - Portable text body transformation integration
  - Multiple locale date formatting
  - Error handling for missing posts

## Writing New Tests

### Adding a Unit Test
Create a new file in `tests/unit/` following the naming convention `[module].test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { myFunction } from '../../src/utils/my-module';

describe('my-module', () => {
  it('should do something', () => {
    const result = myFunction('input');
    expect(result).toBe('expected output');
  });
});
```

### Adding an Integration Test
Create a new file in `tests/integration/` for testing multiple modules together:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Feature Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should integrate multiple components', async () => {
    // Test cross-module functionality
  });
});
```

### Mocking Best Practices
1. Mock external dependencies in `tests/setup/setup.ts` for global mocks
2. Use `vi.mock()` for module-specific mocks
3. Clear mocks between tests with `vi.clearAllMocks()`
4. Reset modules when testing different configurations with `vi.resetModules()`

## Environment Variables

Tests run with mocked environment variables defined in `tests/setup/setup.ts`:
- `SANITY_PROJECT_ID`: test-project-id
- `SANITY_DATASET`: test-dataset  
- `SANITY_TOKEN`: test-token

## Continuous Integration

The test suite is designed to run in CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run Tests
  run: |
    npm ci
    npm run test:all
```

## Performance Goals

- **Execution Time**: All 124 tests complete in under 2 minutes
- **Coverage**: Current coverage exceeds 90% on critical utilities (water quality: 92.2%, portable text: 100%, overall utils: 96.95%)
- **Fast Feedback**: Use `npm run test:watch` during development for instant test re-runs

## Troubleshooting

### Common Issues

1. **TypeScript Errors**: Run `npm run typecheck` to see detailed errors
2. **ESLint Failures**: Run `npm run lint` to see specific issues
3. **Build Failures**: Check for missing environment variables or dependencies
4. **Test Timeouts**: Increase timeout in `vitest.config.ts` if needed

### Debug Mode

Run tests with detailed output:
```bash
npm run test -- --reporter=verbose
```

## Extending the Test Suite

### Priority Areas for Additional Testing
1. Component prop validation
2. Visual editing annotations (Sanity Presentation and Stackbit)
3. Environment configuration handling
4. Error boundaries and fallbacks
5. Image optimization edge cases (invalid dimensions, missing assets)

### Adding New Test Categories
1. **Performance Tests**: Add benchmark tests for critical paths
2. **Accessibility Tests**: Test ARIA attributes and keyboard navigation
3. **Visual Regression**: Add screenshot comparison tests
4. **E2E Tests**: Add Playwright for full user journey testing

## Maintenance

- Review and update tests when adding new features
- Keep test data synchronized with TypeScript interfaces
- Update mocks when external dependencies change
- Run `npm run test:coverage` periodically to identify untested code