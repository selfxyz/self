#!/usr/bin/env node

import { execSync } from 'child_process';

async function migrateSDKCore() {
  console.log('🚀 Starting migration for @selfxyz/core...');

  console.log('📦 Installing new dependencies...');
  execSync(
    'yarn add -D @typescript-eslint/eslint-plugin @typescript-eslint/parser eslint eslint-import-resolver-typescript eslint-plugin-import eslint-plugin-simple-import-sort eslint-plugin-sort-exports sort-exports',
    { stdio: 'inherit' }
  );

  console.log('🔧 Adding .js extensions to imports...');
  try {
    execSync(
      "find . -name '*.ts' -not -path './node_modules/*' -not -path './dist/*' -not -path './typechain-types/*' -exec sed -i \"\" \"s/from '\\\.\\.\\/\([^']*\)'/from '..\/\\1.js'/g\" {} +",
      { stdio: 'inherit' }
    );
    execSync(
      "find . -name '*.ts' -not -path './node_modules/*' -not -path './dist/*' -not -path './typechain-types/*' -exec sed -i \"\" \"s/from '\\.\/\([^']*\)'/from './\\1.js'/g\" {} +",
      { stdio: 'inherit' }
    );
  } catch (error) {
    console.log('⚠️  Some files may already have .js extensions or no relative imports found');
  }

  console.log('✨ Running formatting and linting...');
  try {
    execSync('yarn nice', { stdio: 'inherit' });
  } catch (error) {
    console.log('⚠️  Some linting issues may need manual fixing');
  }

  console.log('✅ Migration completed for @selfxyz/core!');
  console.log('📋 Next steps:');
  console.log('   1. Review and fix any remaining linting issues');
  console.log('   2. Test the build: yarn build');
  console.log('   3. Test the types: yarn types');
  console.log('   4. Run tests if available');
}

migrateSDKCore().catch(console.error);
