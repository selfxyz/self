# Tree Shaking Testing and Analysis

This document explains how to test and measure tree shaking effectiveness in this project.

## Overview

Tree shaking is a technique used by modern bundlers to eliminate unused code from your final bundle. This project has been optimized for tree shaking with:

- ✅ `"sideEffects": false` in `@selfxyz/common`
- ✅ ESM modules (`"type": "module"`)
- ✅ Granular exports in `package.json`
- ✅ Code splitting with tsup
- ✅ Optimized import patterns

## Quick Start

### 1. Test Tree Shaking Effectiveness
```bash
# Run comprehensive tree shaking tests
yarn test:tree-shaking

# This will create test apps with different import patterns and compare bundle sizes
```

### 2. Analyze Current Bundle
```bash
# Analyze import patterns in your codebase
yarn analyze:tree-shaking:imports

# Analyze web bundle after building
yarn web:build
yarn analyze:tree-shaking:web

# Analyze React Native bundles
yarn analyze:tree-shaking:android
yarn analyze:tree-shaking:ios
```

### 3. View Visual Bundle Analysis
```bash
# Build web app with visual analysis
yarn web:build

# Open dist/bundle-analysis.html in your browser
# This shows a treemap of your bundle with tree shaking results
```

## Understanding the Results

### Tree Shaking Test Output

The `yarn test:tree-shaking` command will show output like:

```
🧪 Testing: full-import
📝 Import everything from @selfxyz/common (worst case)
   📊 Bundle size: 2.45 MB

🧪 Testing: granular-constants
📝 Only constants via granular import (best case)
   📊 Bundle size: 156 KB

📊 TREE SHAKING EFFECTIVENESS REPORT
=====================================

Bundle Sizes (smallest to largest):
🏆 granular-constants    156 KB (93.6% smaller, saves 2.29 MB)
🥈 granular-utils        234 KB (90.4% smaller, saves 2.21 MB)
🥉 granular-mixed        267 KB (89.1% smaller, saves 2.18 MB)
📦 mixed-import          891 KB (63.6% smaller, saves 1.56 MB)
📦 full-import           2.45 MB

🎯 Maximum tree shaking benefit: 93.6% reduction (2.29 MB saved)
```

### Import Pattern Analysis

The import analyzer will categorize your imports:

- ⭐ **Star imports** (`import * as`) - Prevents tree shaking
- 📝 **Named imports** (`import { ... }`) - Moderate tree shaking
- 🎯 **Granular imports** (`import { ... } from '@selfxyz/common/constants'`) - Best tree shaking

### Tree Shaking Score

You'll get a score based on your import patterns:
- 🟢 **80-100%** - Excellent (mostly granular imports)
- 🟡 **50-79%** - Good (mix of patterns)
- 🔴 **0-49%** - Poor (many star imports)

## Import Patterns

### ❌ Avoid: Star Imports
```typescript
// This imports everything, preventing tree shaking
import * as common from '@selfxyz/common';
console.log(common.API_URL);
```

### ⚠️ Moderate: Named Imports
```typescript
// Better, but could be more granular
import { API_URL, hash, buildSMT } from '@selfxyz/common';
console.log(API_URL);
```

### ✅ Good: Level 2 File-Based Imports
```typescript
// Good - granular file-level imports
import { API_URL } from '@selfxyz/common/constants/core';
import { hash } from '@selfxyz/common/utils/hash';
console.log(API_URL, hash('test'));
```

### 🚀 Recommended: Level 3 Function-Based Imports
```typescript
// ⭐ OPTIMAL - maximum granularity with clean re-exports
import { API_URL } from '@selfxyz/common/constants/core';
import { hash } from '@selfxyz/common/utils/hash/sha';
console.log(API_URL, hash('test'));
```

### ⚡ Level 2 Examples - Good Tree Shaking
```typescript
// Hash utilities only (no passport parsing, certificates, etc.)
import { hash, poseidon } from '@selfxyz/common/utils/hash';

// Passport operations only (no circuit generation, certificates, etc.)
import { generateCommitment } from '@selfxyz/common/utils/passports';

// Core constants only (no country data, vkeys, etc.)
import { API_URL, PASSPORT_ATTESTATION_ID } from '@selfxyz/common/constants/core';

// App types only
import type { SelfApp } from '@selfxyz/common/types/app';
```

### 🚀 Level 3 Examples - Maximum Tree Shaking
```typescript
// ⭐ OPTIMAL: Function-level imports with clean re-exports
// Only specific hash functions (not entire hash module)
import { hash } from '@selfxyz/common/utils/hash/sha';
import { flexiblePoseidon } from '@selfxyz/common/utils/hash/poseidon';

// Only specific passport functions (not entire passports module)
import { generateCommitment } from '@selfxyz/common/utils/passports/commitment';
import { initPassportDataParsing } from '@selfxyz/common/utils/passports/core';

// Only specific circuit generators (not entire circuits module)
import { generateCircuitInputsDSC } from '@selfxyz/common/utils/circuits/dsc-inputs';

// ✅ 60-90% smaller bundles vs Level 2
// ✅ Zero regression risk from clean re-exports
```

## Available Import Paths

The `@selfxyz/common` package provides these granular imports:

### Level 1: Category-Based (Good)
```typescript
// Constants (URLs, country codes, etc.)
import { API_URL, countryCodes } from '@selfxyz/common/constants';

// Utility functions (hashing, parsing, etc.)
import { hash, generateCommitment } from '@selfxyz/common/utils';

// Type definitions (eliminated at compile time)
import type { PassportData } from '@selfxyz/common/types';
```

### Level 2: File-Based (Better - NEW!)
```typescript
// Core constants only (API URLs, attestation IDs)
import { API_URL, PASSPORT_ATTESTATION_ID } from '@selfxyz/common/constants/core';

// Country data only
import { countryCodes, commonNames } from '@selfxyz/common/constants/countries';

// Hash utilities only
import { hash, poseidon } from '@selfxyz/common/utils/hash';

// Passport utilities only
import { generateCommitment, generateNullifier } from '@selfxyz/common/utils/passports';

// Circuit utilities only
import { generateCircuitInputsDSC } from '@selfxyz/common/utils/circuits';

// Certificate parsing only
import { parseCertificateSimple } from '@selfxyz/common/utils/certificates';

// App-related types
import type { SelfApp } from '@selfxyz/common/types/app';

// Passport-related types
import type { PassportData } from '@selfxyz/common/types/passport';
```

### Complete Level 2 Import Reference

#### Constants
- `@selfxyz/common/constants/core` - API URLs, attestation IDs, basic constants
- `@selfxyz/common/constants/countries` - Country codes and names
- `@selfxyz/common/constants/vkeys` - Verification keys
- `@selfxyz/common/constants/ski-pem` - SKI PEM data
- `@selfxyz/common/constants/mock-certs` - Mock certificates
- `@selfxyz/common/constants/hashes` - Sample data hashes

#### Utilities
- `@selfxyz/common/utils/hash` - Hash and Poseidon functions
- `@selfxyz/common/utils/bytes` - Byte manipulation
- `@selfxyz/common/utils/trees` - SMT and leaf operations
- `@selfxyz/common/utils/scope` - Endpoint formatting
- `@selfxyz/common/utils/app-type` - SelfApp definitions
- `@selfxyz/common/utils/date` - Date utilities
- `@selfxyz/common/utils/arrays` - Array helpers
- `@selfxyz/common/utils/passports` - Core passport functions
- `@selfxyz/common/utils/passport-format` - Passport formatting
- `@selfxyz/common/utils/passport-mock` - Mock passport generation
- `@selfxyz/common/utils/passport-dg1` - DG1 specific operations
- `@selfxyz/common/utils/certificates` - Certificate parsing
- `@selfxyz/common/utils/elliptic` - Elliptic curve operations
- `@selfxyz/common/utils/curves` - Curve definitions
- `@selfxyz/common/utils/oids` - OID handling
- `@selfxyz/common/utils/circuits` - Circuit input generation
- `@selfxyz/common/utils/circuit-names` - Circuit name logic
- `@selfxyz/common/utils/circuit-format` - Circuit formatting
- `@selfxyz/common/utils/uuid` - UUID utilities
- `@selfxyz/common/utils/contracts` - Contract utilities
- `@selfxyz/common/utils/sanctions` - OFAC/sanctions
- `@selfxyz/common/utils/csca` - CSCA operations

#### Types
- `@selfxyz/common/types/passport` - Passport and document types
- `@selfxyz/common/types/app` - SelfApp and disclosure types
- `@selfxyz/common/types/certificates` - Certificate data types
- `@selfxyz/common/types/circuits` - Circuit-related types

### Main export (less optimal for tree shaking)
```typescript
import { API_URL } from '@selfxyz/common';
```

## Testing Commands

### Basic Analysis
```bash
# Quick import pattern check
yarn analyze:tree-shaking:imports

# Full analysis including bundle sizes
yarn analyze:tree-shaking
```

### Platform-Specific Analysis
```bash
# Web bundle analysis (after yarn web:build)
yarn analyze:tree-shaking:web

# Mobile bundle analysis
yarn analyze:tree-shaking:android
yarn analyze:tree-shaking:ios
```

### Comprehensive Testing
```bash
# Test different import strategies with real bundlers
yarn test:tree-shaking

# Run all analysis tools
yarn analyze:tree-shaking all
```

## Continuous Integration

Tree shaking is automatically tested in CI:

1. **Bundle Size Monitoring**: Bundle analysis runs on every PR
2. **Size Thresholds**: Builds fail if bundles exceed size limits
3. **Visual Reports**: Bundle analysis HTML reports are generated

## Optimizing Your Code

### 1. Replace Star Imports
```diff
- import * as common from '@selfxyz/common';
+ import { API_URL } from '@selfxyz/common/constants';
+ import { hash } from '@selfxyz/common/utils';
```

### 2. Use Granular Imports
```diff
- import { API_URL, hash, countryCodes, buildSMT } from '@selfxyz/common';
+ import { API_URL, countryCodes } from '@selfxyz/common/constants';
+ import { hash } from '@selfxyz/common/utils';
```

### 3. Import Only What You Use
```diff
- import { generateCommitment, buildSMT, hash } from '@selfxyz/common/utils';
+ import { hash } from '@selfxyz/common/utils';  // Only import what you use
```

## Understanding Bundle Analysis

### Web Bundle Treemap
After running `yarn web:build`, open `dist/bundle-analysis.html` to see:
- Visual representation of your bundle
- Which modules are taking up space
- Tree shaking effectiveness by module

### React Native Bundle Reports
Bundle reports show:
- Total bundle size vs. thresholds
- Module-by-module breakdown
- Optimization opportunities

## Troubleshooting

### Tree Shaking Not Working?
1. Check `"sideEffects": false` in `package.json`
2. Use ESM imports (`import`), not CommonJS (`require`)
3. Avoid dynamic imports where possible
4. Check for circular dependencies

### Bundle Still Large?
1. Run `yarn analyze:tree-shaking:imports` to find star imports
2. Check the visual bundle analysis for large modules
3. Consider lazy loading for large features
4. Review vendor chunk sizes

### Different Results Between Platforms?
- React Native and Web use different bundlers
- Some optimizations only work on specific platforms
- Check platform-specific bundle configurations

## Examples

See the `/docs/examples/tree-shaking/` directory for:
- `level3-optimal-example.ts` - Shows Level 3 function-based imports (best)
- `level3-migration-guide.ts` - Migration guide from Level 2 to Level 3


## Further Reading

- [Tree Shaking Guide](https://webpack.js.org/guides/tree-shaking/)
- [ESM and Tree Shaking](https://developers.google.com/web/fundamentals/performance/optimizing-javascript/tree-shaking)
- [Vite Tree Shaking](https://vitejs.dev/guide/features.html#tree-shaking)
