# Metro Bundler Workspace Resolution Guide

This document explains the Metro bundler dependency resolution in the Self monorepo and provides modern solutions that eliminate manual symlink management.

## 🚨 The Legacy Problem

Metro bundler in React Native historically had challenges resolving workspace packages and their sub-path exports in monorepos. This manifested as:

```
error Unable to resolve module @selfxyz/common/utils
error Unable to resolve module @selfxyz/mobile-sdk-alpha/constants/analytics
error Unable to resolve module js-sha1
```

**Legacy Root Cause:**
Metro's `extraNodeModules` proxy used **direct file system resolution** instead of Node.js module resolution, which:

1. **Bypassed package.json exports** - Metro looked for `/common/utils` directory instead of checking package exports
2. **Ignored workspace dependencies** - Dependencies in workspace packages weren't automatically available to consuming apps
3. **Failed on sub-path imports** - Package exports like `@selfxyz/common/utils` didn't resolve properly

## ✅ The Modern Solution

**Metro 0.82+ eliminates the need for manual symlink management** through native workspace capabilities:

### 1. Modern Metro Configuration

Updated Metro configurations use native resolver capabilities:

```javascript
// metro.config.js - Modern approach for Metro 0.82+
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = {
  projectRoot,

  watchFolders: [
    workspaceRoot, // Watch entire workspace root
    path.resolve(workspaceRoot, 'common'),
    path.resolve(workspaceRoot, 'packages/mobile-sdk-alpha'),
  ],

  resolver: {
    // Enable automatic workspace package resolution
    enableGlobalPackages: true,

    // Handle subpath exports (@selfxyz/common/constants)
    unstable_enablePackageExports: true,

    // Enable native symlink support (optional)
    unstable_enableSymlinks: true,

    // Define search order for node modules
    nodeModulesPaths: [
      path.resolve(projectRoot, 'node_modules'),
      path.resolve(workspaceRoot, 'node_modules'),
    ],

    // Support package exports with conditions
    unstable_conditionNames: ['require', 'react-native'],
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
```

**Key Benefits:**
- ✅ **No manual symlinks required** - `enableGlobalPackages` automatically discovers workspace packages
- ✅ **Native subpath support** - `unstable_enablePackageExports` handles complex import patterns
- ✅ **Seamless TypeScript integration** - Works with existing path mappings
- ✅ **Production-ready** - Battle-tested resolver capabilities

### 2. Enhanced Package Exports

Workspace packages use comprehensive exports configuration:

```json
// packages/mobile-sdk-alpha/package.json
{
  "exports": {
    ".": {
      "types": "./dist/esm/index.d.ts",
      "react-native": "./dist/esm/index.js",
      "import": "./dist/esm/index.js",
      "require": "./dist/cjs/index.cjs"
    },
    "./constants/analytics": {
      "types": "./dist/esm/constants/analytics.d.ts",
      "react-native": "./dist/esm/constants/analytics.js",
      "import": "./dist/esm/constants/analytics.js",
      "require": "./dist/cjs/constants/analytics.cjs"
    }
  }
}
```

### 3. Legacy Symlink Script (Deprecated)

⚠️ **The manual symlink approach is now deprecated** but maintained for compatibility:

```bash
# Legacy approach - no longer needed with modern Metro
yarn setup:metro-workspace
```

**Migration Path:**
1. Update Metro configuration to use modern resolver
2. Verify package exports are properly configured
3. Test that workspace packages resolve without symlinks
4. Remove manual symlink dependencies

## 🎯 Results with Modern Configuration

### Main App (`@selfxyz/mobile-app`)
- ✅ **Zero manual symlinks** - Metro resolves workspace packages natively
- ✅ **All subpath imports work** - `@selfxyz/common/utils`, `@selfxyz/mobile-sdk-alpha/constants/analytics`
- ✅ **Bundle size optimized** - No duplicate package resolution
- ✅ **TypeScript integration** - Seamless path mapping compatibility

### Demo App (`mobile-sdk-demo`)
- ✅ **Automatic workspace resolution** - No configuration needed beyond Metro setup
- ✅ **React Native condition support** - Platform-specific package exports
- ✅ **Development experience** - Hot reloading works with workspace changes

## 🔧 Modern Usage

### No Setup Required
```bash
# Just build your packages and start Metro
yarn build
yarn start
```

### Development Workflow
```bash
# Watch mode for shared packages
yarn workspace @selfxyz/common build:watch
yarn workspace @selfxyz/mobile-sdk-alpha build:watch

# Start your React Native app
yarn workspace @selfxyz/mobile-app start
```

### When Packages Change
```bash
# Rebuild affected packages
yarn build:deps

# Metro automatically picks up changes through watchFolders
```

## 🏗️ Technical Implementation

### Modern Metro Resolver Flow
1. **enableGlobalPackages** - Metro discovers any package.json with name in project root
2. **unstable_enablePackageExports** - Respects package.json exports field for subpath resolution
3. **nodeModulesPaths** - Fallback to traditional node_modules resolution
4. **watchFolders** - Hot reloading when workspace packages change

### Package Export Resolution
```javascript
// Import: @selfxyz/common/constants
// Metro resolves via package.json exports:
{
  "./constants": {
    "react-native": "./dist/esm/src/constants/index.js",
    "import": "./dist/esm/src/constants/index.js"
  }
}
```

### ❌ Legacy Patterns (Avoid)
```javascript
// Bypasses package.json exports
extraNodeModules: {
  '@selfxyz/common': path.resolve(commonPath, 'src'),
}

// Manual symlink management
yarn setup:metro-workspace
```

### ✅ Modern Patterns
```javascript
// Native workspace resolution
resolver: {
  enableGlobalPackages: true,
  unstable_enablePackageExports: true,
  unstable_conditionNames: ['require', 'react-native'],
}
```

## 🔄 Migration from Legacy Setup

### Step 1: Update Metro Configuration
Replace manual symlink-based config with modern resolver options.

### Step 2: Verify Package Exports
Ensure all workspace packages have proper exports fields in package.json.

### Step 3: Test Resolution
```bash
# Clean any existing symlinks
rm -rf app/node_modules/@selfxyz
rm -rf packages/mobile-sdk-demo/node_modules/@selfxyz

# Build packages
yarn build

# Test Metro resolution
yarn workspace @selfxyz/mobile-app start --reset-cache
```

### Step 4: Legacy Cleanup ✅ COMPLETED
All legacy symlink management has been removed:
- ✅ Removed `scripts/setup-metro-workspace.js`
- ✅ Removed `yarn setup:metro-workspace` command
- ✅ All manual symlinks eliminated from the codebase

**The modern Metro configuration handles everything automatically!**

## 🆘 Modern Troubleshooting

### "Module not found" errors
1. **Check package exports**: Verify the subpath exists in package.json exports
2. **Rebuild packages**: `yarn build` to ensure dist files exist
3. **Clear Metro cache**: `yarn start --reset-cache`
4. **Verify workspace**: Check package.json has correct name field

### Performance Optimization
- Use `watchFolders` for specific packages rather than entire monorepo
- Implement proper `sideEffects` configuration for tree shaking
- Use `unstable_conditionNames` for platform-specific resolution

### Advanced Configuration
For complex monorepos, consider:
- `@rnx-kit/metro-resolver-symlinks` for enterprise features
- Custom `resolveRequest` functions for special cases
- Multiple Metro configurations for different build targets

## 📚 Modern References

- [Metro Package Exports](https://metrobundler.dev/docs/package-exports) - Native subpath support
- [Metro Workspace Resolution](https://metrobundler.dev/docs/resolution#workspace-support) - enableGlobalPackages documentation
- [React Native 0.76+ Metro](https://reactnative.dev/docs/metro) - Latest Metro integration
- [Node.js Package Exports](https://nodejs.org/api/packages.html#exports) - Package exports specification
