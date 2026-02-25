# Testing

## Framework Map

| Package         | Framework              | Command                     |
|-----------------|------------------------|-----------------------------|
| `app/`          | Jest + babel-jest      | `yarn test`                 |
| `packages/*`    | Vitest                 | `yarn test`                 |
| `common/`       | Vitest                 | `yarn test`                 |
| `contracts/`    | Hardhat (Mocha + Chai) | `yarn hardhat test`         |
| `circuits/`     | ts-mocha + circom_tester | `yarn test`               |
| `app/` E2E      | Detox                  | `yarn test:e2e:ios/android` |
| `scripts/`      | Node.js native `--test`| `node --test scripts/tests/*.cjs` |

## Test File Locations

```
app/
├── tests/                    # Main test directory
│   ├── __setup__/           # Mocks (SVG, images, @env)
│   ├── e2e/                 # Detox end-to-end tests
│   └── src/                 # Test utilities (@tests/ alias)
├── src/**/__tests__/        # Co-located unit tests
└── src/**/*.test.ts         # Co-located test files

packages/*/
└── src/**/*.test.ts         # Co-located with source
```

## Test File Patterns

- `**/__tests__/**/*.{js,jsx,ts,tsx,cjs}`
- `**/?(*.)+(spec|test).{js,jsx,ts,tsx,cjs}`

## Required Mocks (App / Jest)

| Mock | Purpose |
|------|---------|
| `tests/__setup__/svgMock.js` | SVG imports return empty component |
| `tests/__setup__/imageMock.js` | Image imports return dummy value |
| `tests/__setup__/@env.js` | Environment variables |

Path aliases are mapped in `jest.config.cjs`:
- `@/` → `<rootDir>/src/`
- `@tests/` → `<rootDir>/tests/src/`
- `@selfxyz/mobile-sdk-alpha` → dist CJS builds

## SDK Resolution in Tests

The app's Jest config maps `@selfxyz/mobile-sdk-alpha` imports to the **built dist output** (not source). You must build the SDK before running app tests that depend on it.

## DOs

- DO use Jest for the `app/` package and Vitest for library packages
- DO co-locate tests near source files (`__tests__/` directory or `.test.ts` suffix)
- DO use ES `import` statements for React and React Native in tests
- DO build SDK packages before running app tests that depend on them
- DO use the mock files in `tests/__setup__/` for SVG, images, and env vars
- DO use the `@tests/` path alias for shared test utilities

## DON'Ts

- DON'T use `require('react')` or `require('react-native')` in test files — causes OOM in CI
- DON'T mix Jest and Vitest in the same package
- DON'T skip mocking native modules (NFC, keychain, biometrics) — they don't exist in test env
- DON'T put Detox E2E tests in the Jest test match patterns (they're excluded)
- DON'T import SDK source directly in app tests — use the package name (resolved via dist)
