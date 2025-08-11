import fs from 'fs';
import path from 'path';

// Move type declarations to correct locations
const srcIndexTypes = 'dist/esm/src/index.d.ts';
const destIndexTypes = 'dist/esm/index.d.ts';
const srcTestingDir = 'dist/esm/src/testing';
const destTestingDir = 'dist/esm/testing';

// Copy main index.d.ts
if (fs.existsSync(srcIndexTypes)) {
  fs.copyFileSync(srcIndexTypes, destIndexTypes);
  console.log('✓ Copied index.d.ts');
}

// Copy testing directory
if (fs.existsSync(srcTestingDir)) {
  fs.cpSync(srcTestingDir, destTestingDir, { recursive: true });
  console.log('✓ Copied testing types');
}

// Clean up intermediate directories
const srcDir = 'dist/esm/src';
const testsDir = 'dist/esm/tests';
if (fs.existsSync(srcDir)) {
  fs.rmSync(srcDir, { recursive: true, force: true });
  console.log('✓ Cleaned up src directory');
}
if (fs.existsSync(testsDir)) {
  fs.rmSync(testsDir, { recursive: true, force: true });
  console.log('✓ Cleaned up tests directory');
}

console.log('Type declarations organized successfully!');
