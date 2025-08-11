# Test Utilities

## Environment-Gated Recompile

The test suite now supports environment-gated recompilation to improve development experience and CI resilience.

### Usage

By default, tests run with `recompile: false` for fast execution. To enable recompilation, set the environment variable:

```bash
# Enable recompilation for all tests
CIRCOM_RECOMPILE=1 npm test

# Or for specific test files
CIRCOM_RECOMPILE=1 npm run test-register
```

### Configuration

The recompile behavior is controlled by the `CIRCOM_RECOMPILE` environment variable:

- `CIRCOM_RECOMPILE=1` - Forces recompilation of circuits
- `CIRCOM_RECOMPILE` unset or any other value - Skips recompilation (default)

### Benefits

1. **Fast CI**: Default behavior skips recompilation for faster CI runs
2. **Developer Flexibility**: Developers can force recompilation when needed
3. **Missing Artifact Recovery**: Automatically rebuilds when build artifacts are missing
4. **Consistent Behavior**: All test files use the same recompile logic

### Implementation

The recompile logic is centralized in `wasm-tester-config.ts`:

```typescript
export const RECOMPILE = process.env.CIRCOM_RECOMPILE === '1';

export function wasmOptions(outputPath: string) {
  return {
    output: outputPath,
    recompile: RECOMPILE
  };
}
```

All test files now use `process.env.CIRCOM_RECOMPILE === '1'` instead of hardcoded `false` values.
