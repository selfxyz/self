#!/usr/bin/env node
import { test, describe, expect, beforeAll, afterAll } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

// Resolve paths relative to this test file
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testDir = path.join(__dirname, 'fixtures');
const scriptPath = path.resolve(__dirname, '..', 'check-package-versions.mjs');

describe('check-package-versions', () => {
  beforeAll(async () => {
    // Create test fixtures directory
    await fs.mkdir(testDir, { recursive: true });
  });

  afterAll(async () => {
    // Cleanup
    await fs.rm(testDir, { recursive: true, force: true });
  });

  test('should pass when all versions are consistent', async () => {
    // Create consistent package.json files
    const consistentPkg = {
      name: 'test-package',
      version: '1.0.0',
      dependencies: {
        ethers: '^6.13.5',
        'node-forge': '^1.3.1',
        'poseidon-lite': '^0.3.0',
        snarkjs: '^0.7.5',
        react: '^18.3.1',
        'react-native': '0.76.9',
        '@tamagui/config': '1.126.14',
        '@tamagui/lucide-icons': '1.126.14',
        typescript: '^5.9.2',
        prettier: '^3.5.3',
        '@types/node': '^22.0.0',
      },
      engines: { node: '>=22 <23' },
    };

    await fs.mkdir(path.join(testDir, 'pkg1'), { recursive: true });
    await fs.mkdir(path.join(testDir, 'pkg2'), { recursive: true });

    await fs.writeFile(
      path.join(testDir, 'pkg1', 'package.json'),
      JSON.stringify(consistentPkg, null, 2),
    );
    await fs.writeFile(
      path.join(testDir, 'pkg2', 'package.json'),
      JSON.stringify(consistentPkg, null, 2),
    );

    // Run script in test directory
    const result = execSync(`node ${scriptPath}`, {
      cwd: testDir,
      encoding: 'utf8',
    });

    expect(result).toContain(
      '✅ All package versions are consistent across the monorepo!',
    );
  });

  test('should detect other package mismatches', async () => {
    await fs.mkdir(path.join(testDir, 'pkg1'), { recursive: true });
    await fs.mkdir(path.join(testDir, 'pkg2'), { recursive: true });

    const pkg1 = {
      dependencies: {
        prettier: '^3.5.3',
        typescript: '^5.9.2',
      },
    };
    const pkg2 = {
      dependencies: {
        prettier: '^3.3.3',
        typescript: '^5.8.0',
      },
    };

    await fs.writeFile(
      path.join(testDir, 'pkg1', 'package.json'),
      JSON.stringify(pkg1, null, 2),
    );
    await fs.writeFile(
      path.join(testDir, 'pkg2', 'package.json'),
      JSON.stringify(pkg2, null, 2),
    );

    try {
      execSync(`node ${scriptPath}`, {
        cwd: testDir,
        encoding: 'utf8',
      });
      expect.fail('Should have thrown an error');
    } catch (error) {
      expect(error.status).toBe(1);
      expect(error.stdout).toContain('📦 OTHER VERSION MISMATCHES:');
      expect(error.stdout).toContain('prettier:');
      expect(error.stdout).toContain('typescript:');
    }
  });

  test('should fail when critical packages have different versions', async () => {
    const pkg1 = {
      name: 'test-package-1',
      dependencies: {
        ethers: '^6.11.0',
        'node-forge': '^1.3.1',
      },
    };
    const pkg2 = {
      name: 'test-package-2',
      dependencies: {
        ethers: '^6.13.5',
        'node-forge': 'github:remicolin/forge',
      },
    };

    await fs.mkdir(path.join(testDir, 'pkg1'), { recursive: true });
    await fs.mkdir(path.join(testDir, 'pkg2'), { recursive: true });

    await fs.writeFile(
      path.join(testDir, 'pkg1', 'package.json'),
      JSON.stringify(pkg1, null, 2),
    );
    await fs.writeFile(
      path.join(testDir, 'pkg2', 'package.json'),
      JSON.stringify(pkg2, null, 2),
    );

    try {
      execSync(`node ${scriptPath}`, {
        cwd: testDir,
        encoding: 'utf8',
      });
      expect.fail('Should have thrown an error');
    } catch (error) {
      expect(error.status).toBe(1);
      expect(error.stdout).toContain('🚨 CRITICAL VERSION MISMATCHES:');
      expect(error.stdout).toContain('ethers:');
      expect(error.stdout).toContain('node-forge:');
    }
  });

  test('should detect workflow version mismatches', async () => {
    // Create workflow with different Node.js version
    const workflowContent = `
name: Test
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/setup-node@v4
        with:
          node-version: 20
    `;

    await fs.mkdir(path.join(testDir, '.github', 'workflows'), {
      recursive: true,
    });
    await fs.writeFile(
      path.join(testDir, '.github', 'workflows', 'test.yml'),
      workflowContent,
    );

    // Create package.json with Node 22 engine
    const pkg = {
      engines: { node: '>=22 <23' },
    };
    await fs.writeFile(
      path.join(testDir, 'package.json'),
      JSON.stringify(pkg, null, 2),
    );

    try {
      execSync(`node ${scriptPath}`, {
        cwd: testDir,
        encoding: 'utf8',
      });
      expect.fail('Should have thrown an error');
    } catch (error) {
      expect(error.status).toBe(1);
      expect(error.stdout).toContain('Expected: >=22 <23');
      expect(error.stdout).toContain('Found: 20');
    }
  });

  test('should detect React Native ecosystem inconsistencies', async () => {
    await fs.mkdir(path.join(testDir, 'pkg1'), { recursive: true });
    await fs.mkdir(path.join(testDir, 'pkg2'), { recursive: true });

    const pkg1 = {
      dependencies: {
        react: '^18.3.1',
        'react-native': '0.76.9',
      },
    };
    const pkg2 = {
      dependencies: {
        react: '^18.0.0',
        'react-native': '0.74.0',
      },
    };

    await fs.writeFile(
      path.join(testDir, 'pkg1', 'package.json'),
      JSON.stringify(pkg1, null, 2),
    );
    await fs.writeFile(
      path.join(testDir, 'pkg2', 'package.json'),
      JSON.stringify(pkg2, null, 2),
    );

    try {
      execSync(`node ${scriptPath}`, {
        cwd: testDir,
        encoding: 'utf8',
      });
      expect.fail('Should have thrown an error');
    } catch (error) {
      expect(error.status).toBe(1);
      expect(error.stdout).toContain('react:');
      expect(error.stdout).toContain('react-native:');
    }
  });

  test('should detect Tamagui version inconsistencies', async () => {
    await fs.mkdir(path.join(testDir, 'pkg1'), { recursive: true });
    await fs.mkdir(path.join(testDir, 'pkg2'), { recursive: true });

    const pkg1 = {
      dependencies: {
        '@tamagui/config': '1.126.14',
        '@tamagui/lucide-icons': '1.126.14',
      },
    };
    const pkg2 = {
      dependencies: {
        '@tamagui/config': '1.129.3',
        '@tamagui/lucide-icons': '1.129.3',
      },
    };

    await fs.writeFile(
      path.join(testDir, 'pkg1', 'package.json'),
      JSON.stringify(pkg1, null, 2),
    );
    await fs.writeFile(
      path.join(testDir, 'pkg2', 'package.json'),
      JSON.stringify(pkg2, null, 2),
    );

    try {
      execSync(`node ${scriptPath}`, {
        cwd: testDir,
        encoding: 'utf8',
      });
      expect.fail('Should have thrown an error');
    } catch (error) {
      expect(error.status).toBe(1);
      expect(error.stdout).toContain('@tamagui/config:');
      expect(error.stdout).toContain('@tamagui/lucide-icons:');
    }
  });

  test('should handle missing files gracefully', async () => {
    // Clean up any leftover files from previous tests
    await fs.rm(testDir, { recursive: true, force: true });
    await fs.mkdir(testDir, { recursive: true });

    // Empty directory should not crash
    const result = execSync(`node ${scriptPath}`, {
      cwd: testDir,
      encoding: 'utf8',
    });
    expect(result).toContain(
      '✅ All package versions are consistent across the monorepo!',
    );
  });

  test('should provide helpful fix instructions', async () => {
    await fs.mkdir(path.join(testDir, 'pkg1'), { recursive: true });
    await fs.mkdir(path.join(testDir, 'pkg2'), { recursive: true });

    const pkg1 = {
      dependencies: { ethers: '^6.11.0' },
    };
    const pkg2 = {
      dependencies: { ethers: '^6.13.5' },
    };

    await fs.writeFile(
      path.join(testDir, 'pkg1', 'package.json'),
      JSON.stringify(pkg1, null, 2),
    );
    await fs.writeFile(
      path.join(testDir, 'pkg2', 'package.json'),
      JSON.stringify(pkg2, null, 2),
    );

    try {
      execSync(`node ${scriptPath}`, {
        cwd: testDir,
        encoding: 'utf8',
      });
      expect.fail('Should have thrown an error');
    } catch (error) {
      expect(error.status).toBe(1);
      expect(error.stdout).toContain('📋 Mismatched Packages:');
      expect(error.stdout).toContain('🚨 Critical:');
      expect(error.stdout).toContain('• ethers:');
    }
  });
});
