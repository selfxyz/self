#!/usr/bin/env node

// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

/**
 * Tests for the license header checker script
 */

import { strict as assert } from 'assert';
import { existsSync, rmSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import the functions we want to test
// We'll need to modify the main script to export functions for testing
const SCRIPT_PATH = path.join(__dirname, '..', 'check-license-headers.mjs');

const LICENSE_HEADER =
  '// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11';

// Test utilities
class TestFileSystem {
  constructor() {
    this.tempDir = path.join(__dirname, 'temp-test-files');
    this.cleanup();
    mkdirSync(this.tempDir, { recursive: true });
  }

  cleanup() {
    if (existsSync(this.tempDir)) {
      rmSync(this.tempDir, { recursive: true, force: true });
    }
  }

  writeFile(relativePath, content) {
    const fullPath = path.join(this.tempDir, relativePath);
    const dir = path.dirname(fullPath);
    mkdirSync(dir, { recursive: true });
    writeFileSync(fullPath, content, 'utf8');
    return fullPath;
  }

  readFile(relativePath) {
    const fullPath = path.join(this.tempDir, relativePath);
    return readFileSync(fullPath, 'utf8');
  }

  exists(relativePath) {
    const fullPath = path.join(this.tempDir, relativePath);
    return existsSync(fullPath);
  }
}

// Test runner
class TestRunner {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  test(name, fn) {
    this.tests.push({ name, fn });
  }

  async run() {
    console.log(`🧪 Running ${this.tests.length} tests...\n`);

    for (const { name, fn } of this.tests) {
      try {
        await fn();
        console.log(`✅ ${name}`);
        this.passed++;
      } catch (error) {
        console.error(`❌ ${name}`);
        console.error(`   ${error.message}`);
        if (error.stack) {
          console.error(`   ${error.stack.split('\n').slice(1, 3).join('\n')}`);
        }
        this.failed++;
      }
    }

    console.log(
      `\n📊 Test Results: ${this.passed} passed, ${this.failed} failed`,
    );

    if (this.failed > 0) {
      process.exit(1);
    }
  }
}

// Helper to run the script and capture output
function runScript(args, cwd = null) {
  try {
    const result = execSync(`node ${SCRIPT_PATH} ${args}`, {
      cwd: cwd || process.cwd(),
      encoding: 'utf8',
      stdio: 'pipe',
    });
    return { stdout: result, stderr: '', exitCode: 0 };
  } catch (error) {
    return {
      stdout: error.stdout || '',
      stderr: error.stderr || '',
      exitCode: error.status || 1,
    };
  }
}

// Tests
const runner = new TestRunner();
let testFs;

runner.test(
  'should detect files with correct license header and newline',
  () => {
    testFs = new TestFileSystem();

    const content = `${LICENSE_HEADER}

export const example = 'test';
`;

    testFs.writeFile('good-file.ts', content);

    const result = runScript('--check', testFs.tempDir);
    assert.strictEqual(result.exitCode, 0);
    assert(
      result.stdout.includes('All license headers are properly formatted'),
    );

    testFs.cleanup();
  },
);

runner.test('should detect missing newline after license header', () => {
  testFs = new TestFileSystem();

  const content = `${LICENSE_HEADER}
export const example = 'test';
`;

  testFs.writeFile('bad-newline.ts', content);

  const result = runScript('--check', testFs.tempDir);
  assert.strictEqual(result.exitCode, 1);
  assert(result.stdout.includes('Missing newline after license header'));

  testFs.cleanup();
});

runner.test(
  'should detect missing license header when --require flag is used',
  () => {
    testFs = new TestFileSystem();

    const content = `export const example = 'test';
`;

    testFs.writeFile('no-header.ts', content);

    const result = runScript('--check --require', testFs.tempDir);
    assert.strictEqual(result.exitCode, 1);
    assert(result.stdout.includes('Missing or incorrect license header'));

    testFs.cleanup();
  },
);

runner.test(
  'should ignore files without headers when --require flag is not used',
  () => {
    testFs = new TestFileSystem();

    const content = `export const example = 'test';
`;

    testFs.writeFile('no-header.ts', content);

    const result = runScript('--check', testFs.tempDir);
    assert.strictEqual(result.exitCode, 0);
    assert(
      result.stdout.includes('All license headers are properly formatted'),
    );

    testFs.cleanup();
  },
);

runner.test('should fix missing newline after license header', () => {
  testFs = new TestFileSystem();

  const originalContent = `${LICENSE_HEADER}
export const example = 'test';
`;

  const expectedContent = `${LICENSE_HEADER}

export const example = 'test';
`;

  testFs.writeFile('fix-newline.ts', originalContent);

  const result = runScript('--fix', testFs.tempDir);
  assert.strictEqual(result.exitCode, 0);
  assert(result.stdout.includes('Fixed 1 files'));

  const fixedContent = testFs.readFile('fix-newline.ts');
  assert.strictEqual(fixedContent, expectedContent);

  testFs.cleanup();
});

runner.test('should handle files with shebang', () => {
  testFs = new TestFileSystem();

  const content = `#!/usr/bin/env node

${LICENSE_HEADER}

export const example = 'test';
`;

  testFs.writeFile('shebang-file.mjs', content);

  const result = runScript('--check', testFs.tempDir);
  assert.strictEqual(result.exitCode, 0);
  assert(result.stdout.includes('All license headers are properly formatted'));

  testFs.cleanup();
});

runner.test('should handle files with leading blank lines', () => {
  testFs = new TestFileSystem();

  const content = `

${LICENSE_HEADER}

export const example = 'test';
`;

  testFs.writeFile('blank-lines.ts', content);

  const result = runScript('--check', testFs.tempDir);
  assert.strictEqual(result.exitCode, 0);
  assert(result.stdout.includes('All license headers are properly formatted'));

  testFs.cleanup();
});

runner.test('should process multiple file types', () => {
  testFs = new TestFileSystem();

  const goodContent = `${LICENSE_HEADER}

export const example = 'test';
`;

  testFs.writeFile('test.ts', goodContent);
  testFs.writeFile('test.tsx', goodContent);
  testFs.writeFile('test.js', goodContent);
  testFs.writeFile('test.jsx', goodContent);
  testFs.writeFile('test.mjs', goodContent);
  testFs.writeFile('test.cjs', goodContent);

  const result = runScript('--check', testFs.tempDir);
  assert.strictEqual(result.exitCode, 0);
  assert(result.stdout.includes('All license headers are properly formatted'));

  testFs.cleanup();
});

runner.test('should skip excluded directories', () => {
  testFs = new TestFileSystem();

  const goodContent = `${LICENSE_HEADER}

export const example = 'test';
`;

  const badContent = `export const example = 'test';
`;

  // Good file in main directory
  testFs.writeFile('good.ts', goodContent);

  // Bad files in excluded directories (should be ignored)
  testFs.writeFile('node_modules/bad.ts', badContent);
  testFs.writeFile('dist/bad.ts', badContent);
  testFs.writeFile('build/bad.ts', badContent);
  testFs.writeFile('.git/bad.ts', badContent);

  const result = runScript('--check', testFs.tempDir);
  assert.strictEqual(result.exitCode, 0);
  assert(result.stdout.includes('All license headers are properly formatted'));

  testFs.cleanup();
});

runner.test('should handle incorrect license header content', () => {
  testFs = new TestFileSystem();

  const content = `// SPDX-License-Identifier: MIT

export const example = 'test';
`;

  testFs.writeFile('wrong-header.ts', content);

  const result = runScript('--check --require', testFs.tempDir);
  assert.strictEqual(result.exitCode, 1);
  assert(result.stdout.includes('Missing or incorrect license header'));

  testFs.cleanup();
});

runner.test('should report multiple issues', () => {
  testFs = new TestFileSystem();

  const missingNewline = `${LICENSE_HEADER}
export const example = 'test';
`;

  const missingHeader = `export const example = 'test';
`;

  testFs.writeFile('missing-newline.ts', missingNewline);
  testFs.writeFile('missing-header.ts', missingHeader);

  const result = runScript('--check --require', testFs.tempDir);
  assert.strictEqual(result.exitCode, 1);
  assert(result.stdout.includes('Found 2 files with license header issues'));
  assert(result.stdout.includes('Missing newline after license header'));
  assert(result.stdout.includes('Missing or incorrect license header'));

  testFs.cleanup();
});

runner.test('should handle empty files', () => {
  testFs = new TestFileSystem();

  testFs.writeFile('empty.ts', '');

  const result = runScript('--check', testFs.tempDir);
  assert.strictEqual(result.exitCode, 0);
  assert(result.stdout.includes('All license headers are properly formatted'));

  testFs.cleanup();
});

runner.test('should not modify files that do not need fixing', () => {
  testFs = new TestFileSystem();

  const goodContent = `${LICENSE_HEADER}

export const example = 'test';
`;

  testFs.writeFile('good-file.ts', goodContent);

  const result = runScript('--fix', testFs.tempDir);
  assert.strictEqual(result.exitCode, 0);
  assert(result.stdout.includes('Fixed 0 files'));

  const unchangedContent = testFs.readFile('good-file.ts');
  assert.strictEqual(unchangedContent, goodContent);

  testFs.cleanup();
});

// Run all tests
runner.run().catch(console.error);
