# OpenPassport Commons

Constants and utils used in multiple OpenPassport subdirectories.

## Package Structure

This package includes granular export files (e.g., `src/utils/hash/sha.ts`, `src/utils/circuits/dsc-inputs.ts`) that re-export specific functions from their original modules. These enable fine-grained imports for better tree-shaking optimization in consuming applications.

**Note**: Source files use explicit `.js` extensions in internal imports. TypeScript's
`nodenext` module setting requires file extensions for ESM, so dropping them
would cause type-check failures.
