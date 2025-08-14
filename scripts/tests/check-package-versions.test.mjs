#!/usr/bin/env node
import { test, describe, expect, beforeAll, afterAll } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Test fixtures
const testDir = path.join(process.cwd(), 'scripts', 'tests', 'fixtures');
const scriptPath = path.join(
  process.cwd(),
  '..',
  '..',
  'scripts',
  'check-package-versions.mjs',
);

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
        typescript: '^5.9.2',
        ethers: '^6.13.5',
        'node-forge': '^1.3.1',
      },
      devDependencies: {
        '@types/node': '^22.0.0',
        eslint: '^8.57.0',
      },
      packageManager: 'yarn@4.6.0',
      engines: { node: '>=22 <23' },
      license: 'MIT',
      type: 'module',
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

    expect(result).toContain('✅ All package versions are consistent');
  });

  test('should fail when critical packages have different versions', async () => {
    const pkg1 = {
      name: 'test-package-1',
      dependencies: {
        ethers: '^6.11.0',
        'node-forge': '^1.3.1',
      },
      packageManager: 'yarn@4.6.0',
    };
    const pkg2 = {
      name: 'test-package-2',
      dependencies: {
        ethers: '^6.13.5',
        'node-forge': 'github:remicolin/forge',
      },
      packageManager: 'yarn@4.6.0',
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
      execSync('node ${scriptPath}', {
        cwd: testDir,
        encoding: 'utf8',
      });
      expect.fail('Should have thrown an error');
    } catch (error) {
      expect(error.status).toBe(1);
      expect(error.stdout).toContain('CRITICAL: ethers has multiple versions');
      expect(error.stdout).toContain(
        'CRITICAL: node-forge has multiple versions',
      );
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
      packageManager: 'yarn@4.6.0',
    };
    await fs.writeFile(
      path.join(testDir, 'package.json'),
      JSON.stringify(pkg, null, 2),
    );

    try {
      execSync('node ${scriptPath}', {
        cwd: testDir,
        encoding: 'utf8',
      });
      expect.fail('Should have thrown an error');
    } catch (error) {
      expect(error.status).toBe(1);
      expect(error.stdout).toContain('Workflow Node.js version mismatch');
    }
  });

  test('should detect metadata inconsistencies', async () => {
    const pkg1 = {
      name: '@selfxyz/test1',
      license: 'MIT',
      author: 'Self Team',
      type: 'module',
    };
    const pkg2 = {
      name: '@selfxyz/test2',
      license: 'APLv2',
      author: 'Different Author',
      type: 'commonjs',
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
      execSync('node ${scriptPath}', {
        cwd: testDir,
        encoding: 'utf8',
      });
      expect.fail('Should have thrown an error');
    } catch (error) {
      expect(error.status).toBe(1);
      expect(error.stdout).toContain('License inconsistency detected');
    }
  });

  test('should detect script inconsistencies', async () => {
    const pkg1 = {
      scripts: {
        build: 'tsup',
        test: 'jest',
      },
    };
    const pkg2 = {
      scripts: {
        build: 'tsc',
        test: 'vitest',
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
      execSync('node ${scriptPath}', {
        cwd: testDir,
        encoding: 'utf8',
      });
      expect.fail('Should have thrown an error');
    } catch (error) {
      expect(error.status).toBe(1);
      expect(error.stdout).toContain('Scripts - build mismatches');
      expect(error.stdout).toContain('Scripts - test mismatches');
    }
  });

  test('should detect export inconsistencies', async () => {
    const pkg1 = {
      main: './dist/index.js',
      module: './dist/index.mjs',
      types: './dist/index.d.ts',
    };
    const pkg2 = {
      main: './lib/index.js',
      module: './lib/index.mjs',
      types: './lib/index.d.ts',
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
      execSync('node ${scriptPath}', {
        cwd: testDir,
        encoding: 'utf8',
      });
      expect.fail('Should have thrown an error');
    } catch (error) {
      expect(error.status).toBe(1);
      expect(error.stdout).toContain('Exports - main mismatches');
      expect(error.stdout).toContain('Exports - module mismatches');
      expect(error.stdout).toContain('Exports - types mismatches');
    }
  });

  test('should detect workspace dependency inconsistencies', async () => {
    const pkg1 = {
      dependencies: {
        '@selfxyz/common': 'workspace:^',
      },
    };
    const pkg2 = {
      dependencies: {
        '@selfxyz/common': 'workspace:*',
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
      execSync('node ${scriptPath}', {
        cwd: testDir,
        encoding: 'utf8',
      });
      expect.fail('Should have thrown an error');
    } catch (error) {
      expect(error.status).toBe(1);
      expect(error.stdout).toContain(
        'Workspace Dependencies - @selfxyz/common mismatches',
      );
    }
  });

  test('should detect TypeScript config inconsistencies', async () => {
    const tsConfig1 = {
      extends: '@react-native/typescript-config/tsconfig.json',
      compilerOptions: {
        target: 'es2020',
        module: 'esnext',
      },
    };
    const tsConfig2 = {
      extends: '@tsconfig/node18/tsconfig.json',
      compilerOptions: {
        target: 'es2018',
        module: 'commonjs',
      },
    };

    await fs.writeFile(
      path.join(testDir, 'pkg1', 'tsconfig.json'),
      JSON.stringify(tsConfig1, null, 2),
    );
    await fs.writeFile(
      path.join(testDir, 'pkg2', 'tsconfig.json'),
      JSON.stringify(tsConfig2, null, 2),
    );

    // Create minimal package.json files
    await fs.writeFile(
      path.join(testDir, 'pkg1', 'package.json'),
      JSON.stringify({ name: 'pkg1' }, null, 2),
    );
    await fs.writeFile(
      path.join(testDir, 'pkg2', 'package.json'),
      JSON.stringify({ name: 'pkg2' }, null, 2),
    );

    try {
      execSync('node ${scriptPath}', {
        cwd: testDir,
        encoding: 'utf8',
      });
      expect.fail('Should have thrown an error');
    } catch (error) {
      expect(error.status).toBe(1);
      expect(error.stdout).toContain(
        'TypeScript Config - tsconfig.extends mismatches',
      );
      expect(error.stdout).toContain(
        'TypeScript Config - tsconfig.target mismatches',
      );
      expect(error.stdout).toContain(
        'TypeScript Config - tsconfig.module mismatches',
      );
    }
  });

  test('should handle missing files gracefully', async () => {
    // Empty directory should not crash
    const result = execSync('node ${scriptPath}', {
      cwd: testDir,
      encoding: 'utf8',
    });
    expect(result).toContain('✅ All package versions are consistent');
  });

  test('should detect React Native ecosystem inconsistencies', async () => {
    const pkg1 = {
      dependencies: {
        react: '^18.3.1',
        'react-native': '0.75.4',
      },
      devDependencies: {
        '@react-native/babel-preset': '0.75.4',
      },
    };
    const pkg2 = {
      dependencies: {
        react: '^18.0.0',
        'react-native': '0.74.0',
      },
      devDependencies: {
        '@react-native/babel-preset': '0.74.0',
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
      execSync('node ${scriptPath}', {
        cwd: testDir,
        encoding: 'utf8',
      });
      expect.fail('Should have thrown an error');
    } catch (error) {
      expect(error.status).toBe(1);
      expect(error.stdout).toContain('Dependencies - react mismatches');
      expect(error.stdout).toContain('Dependencies - react-native mismatches');
      expect(error.stdout).toContain(
        'Dependencies - @react-native/babel-preset mismatches',
      );
    }
  });

  test('should detect Tamagui version inconsistencies', async () => {
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
      execSync('node ${scriptPath}', {
        cwd: testDir,
        encoding: 'utf8',
      });
      expect.fail('Should have thrown an error');
    } catch (error) {
      expect(error.status).toBe(1);
      expect(error.stdout).toContain(
        'Dependencies - @tamagui/config mismatches',
      );
      expect(error.stdout).toContain(
        'Dependencies - @tamagui/lucide-icons mismatches',
      );
    }
  });

  test('should provide helpful summary and recommendations', async () => {
    const pkg1 = {
      dependencies: { ethers: '^6.11.0' },
      engines: { node: '>=22 <23' },
    };
    const pkg2 = {
      dependencies: { ethers: '^6.13.5' },
      engines: { node: '>=20 <21' },
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
      execSync('node ${scriptPath}', {
        cwd: testDir,
        encoding: 'utf8',
      });
      expect.fail('Should have thrown an error');
    } catch (error) {
      expect(error.status).toBe(1);
      expect(error.stdout).toContain(
        'PACKAGE VERSION CONSISTENCY CHECK SUMMARY',
      );
      expect(error.stdout).toContain('Found');
      expect(error.stdout).toContain('category(ies) with version mismatches');
      expect(error.stdout).toContain('Recommendations:');
      expect(error.stdout).toContain('Standardize critical package versions');
    }
  });
});
