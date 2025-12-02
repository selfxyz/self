#!/usr/bin/env node
// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const { join, dirname } = require('node:path');
const os = require('node:os');
const {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
} = require('node:fs');

const { Project, ScriptTarget, ModuleKind } = require('ts-morph');

const {
  runAliasImportsTransform,
  transformProjectToAliasImports,
} = require('../alias-imports.cjs');

function createTempDir() {
  const dir = mkdtempSync(join(os.tmpdir(), 'alias-imports-'));
  return dir;
}

function writeFileEnsured(filePath, content) {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, content, 'utf8');
}

describe('alias-imports transform', () => {
  let tempRoot;

  beforeEach(() => {
    tempRoot = createTempDir();
  });

  it('transforms relative TS import to @src alias', () => {
    // Arrange: fake app structure
    const appRoot = tempRoot;
    const srcDir = join(appRoot, 'src');
    const fileA = join(srcDir, 'utils', 'a.ts');
    const fileB = join(srcDir, 'components', 'b.ts');

    writeFileEnsured(fileA, 'export const A = 1;\n');
    writeFileEnsured(
      fileB,
      "import { A } from '../utils/a';\nexport const B = A;\n",
    );

    const project = new Project({
      compilerOptions: {
        target: ScriptTarget.ES2022,
        module: ModuleKind.ESNext,
        baseUrl: appRoot,
      },
    });
    project.addSourceFilesAtPaths(join(srcDir, '**/*.{ts,tsx}'));

    // Act
    transformProjectToAliasImports(project, appRoot);

    // Assert
    const b = project.getSourceFileOrThrow(fileB);
    const imports = b.getImportDeclarations();
    assert.strictEqual(imports.length, 1);
    assert.strictEqual(imports[0].getModuleSpecifierValue(), '@/utils/a');
  });

  it('transforms relative require to @src alias', () => {
    const appRoot = tempRoot;
    const srcDir = join(appRoot, 'src');
    const fileA = join(srcDir, 'utils', 'x.ts');
    const fileC = join(srcDir, 'lib', 'c.ts');

    writeFileEnsured(fileA, 'module.exports = { X: 1 };\n');
    writeFileEnsured(
      fileC,
      "const x = require('../utils/x');\nexport const C = x;\n",
    );

    const project = new Project({
      compilerOptions: {
        target: ScriptTarget.ES2022,
        module: ModuleKind.CommonJS,
        baseUrl: appRoot,
      },
    });
    project.addSourceFilesAtPaths(join(srcDir, '**/*.{ts,tsx}'));

    transformProjectToAliasImports(project, appRoot);

    const c = project.getSourceFileOrThrow(fileC);
    assert.ok(c.getText().includes("require('@/utils/x')"));
  });

  it('transforms relative TS import in tests to @tests alias', () => {
    const appRoot = tempRoot;
    const testsSrcDir = join(appRoot, 'tests', 'src');
    const fileUtil = join(testsSrcDir, 'utils', 'helper.ts');
    const fileSpec = join(testsSrcDir, 'specs', 'feature.spec.ts');

    writeFileEnsured(fileUtil, 'export const helper = () => 42;\n');
    writeFileEnsured(
      fileSpec,
      "import { helper } from '../utils/helper';\nexport const answer = helper();\n",
    );

    const project = new Project({
      compilerOptions: {
        target: ScriptTarget.ES2022,
        module: ModuleKind.ESNext,
        baseUrl: appRoot,
      },
    });
    project.addSourceFilesAtPaths(join(testsSrcDir, '**/*.{ts,tsx}'));

    transformProjectToAliasImports(project, appRoot);

    const specFile = project.getSourceFileOrThrow(fileSpec);
    const imports = specFile.getImportDeclarations();
    assert.strictEqual(imports.length, 1);
    assert.strictEqual(
      imports[0].getModuleSpecifierValue(),
      '@tests/utils/helper',
    );
  });

  it('ignores relative imports that resolve outside src', () => {
    const appRoot = tempRoot;
    const srcDir = join(appRoot, 'src');
    const siblingDir = join(appRoot, 'sibling');
    const fileSib = join(siblingDir, 's.ts');
    const fileInside = join(srcDir, 'feature', 'inside.ts');

    writeFileEnsured(fileSib, 'export const S = 1;\n');
    writeFileEnsured(
      fileInside,
      "import { S } from '../../sibling/s';\nexport const I = S;\n",
    );

    const project = new Project({
      compilerOptions: {
        target: ScriptTarget.ES2022,
        module: ModuleKind.ESNext,
        baseUrl: appRoot,
      },
    });
    project.addSourceFilesAtPaths(join(srcDir, '**/*.{ts,tsx}'));

    transformProjectToAliasImports(project, appRoot);

    const inside = project.getSourceFileOrThrow(fileInside);
    const spec = inside.getImportDeclarations()[0].getModuleSpecifierValue();
    assert.strictEqual(spec, '../../sibling/s');
  });

  it('CLI runner executes without throwing on empty project', () => {
    const appRoot = tempRoot;
    const srcDir = join(appRoot, 'src');
    mkdirSync(srcDir, { recursive: true });

    const project = new Project({
      compilerOptions: {
        target: ScriptTarget.ES2022,
        module: ModuleKind.ESNext,
      },
    });

    assert.doesNotThrow(() => {
      runAliasImportsTransform({ appRoot, project, skipAddTests: true });
    });
  });

  it("transforms deep relative TS import '../../../src/...' to @src alias from tests", () => {
    const appRoot = tempRoot;
    const srcDir = join(appRoot, 'src');
    const testsSrcDir = join(appRoot, 'tests', 'src');
    const fileHaptic = join(srcDir, 'integrations', 'haptics.ts');
    const deepSpecDir = join(testsSrcDir, 'deep');
    const deepSpecFile = join(deepSpecDir, 'spec.ts');

    writeFileEnsured(fileHaptic, 'export const h = 1;\n');
    writeFileEnsured(
      deepSpecFile,
      "import { h } from '../../../src/integrations/haptics';\nexport const v = h;\n",
    );

    const project = new Project({
      compilerOptions: {
        target: ScriptTarget.ES2022,
        module: ModuleKind.ESNext,
        baseUrl: appRoot,
      },
    });
    project.addSourceFilesAtPaths(join(testsSrcDir, '**/*.{ts,tsx}'));

    transformProjectToAliasImports(project, appRoot);

    const specFile = project.getSourceFileOrThrow(deepSpecFile);
    const imports = specFile.getImportDeclarations();
    assert.strictEqual(imports.length, 1);
    assert.strictEqual(
      imports[0].getModuleSpecifierValue(),
      '@/integrations/haptics',
    );
  });

  it("transforms deep relative require '../../../src/...' to @src alias from tests", () => {
    const appRoot = tempRoot;
    const srcDir = join(appRoot, 'src');
    const testsSrcDir = join(appRoot, 'tests', 'src');
    const fileHaptic = join(srcDir, 'integrations', 'haptics.ts');
    const deepSpecDir = join(testsSrcDir, 'deep');
    const deepSpecFile = join(deepSpecDir, 'req.ts');

    writeFileEnsured(fileHaptic, 'module.exports = { h: 1 };\n');
    writeFileEnsured(
      deepSpecFile,
      "const h = require('../../../src/integrations/haptics');\nexport const v = h;\n",
    );

    const project = new Project({
      compilerOptions: {
        target: ScriptTarget.ES2022,
        module: ModuleKind.CommonJS,
        baseUrl: appRoot,
      },
    });
    project.addSourceFilesAtPaths(join(testsSrcDir, '**/*.{ts,tsx}'));

    transformProjectToAliasImports(project, appRoot);

    const specFile = project.getSourceFileOrThrow(deepSpecFile);
    assert.ok(specFile.getText().includes("require('@/integrations/haptics')"));
  });

  it('aliases export star re-exports with ../ from sibling directory', () => {
    const appRoot = tempRoot;
    const srcDir = join(appRoot, 'src');
    const fileA = join(srcDir, 'utils', 'a.ts');
    const fileIndex = join(srcDir, 'components', 'index.ts');

    writeFileEnsured(fileA, 'export const A = 1;\n');
    writeFileEnsured(fileIndex, "export * from '../utils/a';\n");

    const project = new Project({
      compilerOptions: {
        target: ScriptTarget.ES2022,
        module: ModuleKind.ESNext,
        baseUrl: appRoot,
      },
    });
    project.addSourceFilesAtPaths(join(srcDir, '**/*.{ts,tsx}'));

    transformProjectToAliasImports(project, appRoot);

    const indexFile = project.getSourceFileOrThrow(fileIndex);
    const exportDecl = indexFile.getExportDeclarations()[0];
    assert.strictEqual(exportDecl.getModuleSpecifierValue(), '@/utils/a');
  });

  it('aliases export named re-exports with ../ from sibling directory', () => {
    const appRoot = tempRoot;
    const srcDir = join(appRoot, 'src');
    const fileA = join(srcDir, 'utils', 'a.ts');
    const fileIndex = join(srcDir, 'components', 'index.ts');

    writeFileEnsured(fileA, 'export const A = 1;\n');
    writeFileEnsured(fileIndex, "export { A as AA } from '../utils/a';\n");

    const project = new Project({
      compilerOptions: {
        target: ScriptTarget.ES2022,
        module: ModuleKind.ESNext,
        baseUrl: appRoot,
      },
    });
    project.addSourceFilesAtPaths(join(srcDir, '**/*.{ts,tsx}'));

    transformProjectToAliasImports(project, appRoot);

    const indexFile = project.getSourceFileOrThrow(fileIndex);
    const exportDecl = indexFile.getExportDeclarations()[0];
    assert.strictEqual(exportDecl.getModuleSpecifierValue(), '@/utils/a');
  });

  it('aliases dynamic import() with relative specifier', () => {
    const appRoot = tempRoot;
    const srcDir = join(appRoot, 'src');
    const utils = join(srcDir, 'utils', 'lazy.ts');
    const feature = join(srcDir, 'feature', 'index.ts');

    writeFileEnsured(utils, 'export const lazy = 1;\n');
    writeFileEnsured(
      feature,
      "async function go(){ await import('../utils/lazy'); }\nexport { go };\n",
    );

    const project = new Project({
      compilerOptions: {
        target: ScriptTarget.ES2022,
        module: ModuleKind.ESNext,
        baseUrl: appRoot,
      },
    });
    project.addSourceFilesAtPaths(join(srcDir, '**/*.{ts,tsx}'));

    transformProjectToAliasImports(project, appRoot);

    const featureFile = project.getSourceFileOrThrow(feature);
    const text = featureFile.getText();
    assert.ok(text.includes("import('@/utils/lazy')"));
  });

  it('aliases jest.mock relative specifier', () => {
    const appRoot = tempRoot;
    const srcDir = join(appRoot, 'src');
    const utils = join(srcDir, 'utils', 'mod.ts');
    const feature = join(srcDir, 'feature', 'index.test.ts');

    writeFileEnsured(utils, 'export const v = 1;\n');
    writeFileEnsured(
      feature,
      "jest.mock('../utils/mod');\nimport { v } from '../utils/mod';\nexport const u = v;\n",
    );

    const project = new Project({
      compilerOptions: {
        target: ScriptTarget.ES2022,
        module: ModuleKind.ESNext,
        baseUrl: appRoot,
      },
    });
    project.addSourceFilesAtPaths(join(srcDir, '**/*.{ts,tsx}'));

    transformProjectToAliasImports(project, appRoot);

    const featureFile = project.getSourceFileOrThrow(feature);
    const text = featureFile.getText();
    assert.ok(text.includes("jest.mock('@/utils/mod')"));
  });

  it('aliases jest.doMock and jest.unmock relative specifiers', () => {
    const appRoot = tempRoot;
    const srcDir = join(appRoot, 'src');
    const utils = join(srcDir, 'utils', 'mod2.ts');
    const feature = join(srcDir, 'feature', 'index2.test.ts');

    writeFileEnsured(utils, 'export const v = 2;\n');
    writeFileEnsured(
      feature,
      "jest.doMock('../utils/mod2');\njest.unmock('../utils/mod2');\n",
    );

    const project = new Project({
      compilerOptions: {
        target: ScriptTarget.ES2022,
        module: ModuleKind.ESNext,
        baseUrl: appRoot,
      },
    });
    project.addSourceFilesAtPaths(join(srcDir, '**/*.{ts,tsx}'));

    transformProjectToAliasImports(project, appRoot);

    const featureFile = project.getSourceFileOrThrow(feature);
    const text = featureFile.getText();
    assert.ok(text.includes("jest.doMock('@/utils/mod2')"));
    assert.ok(text.includes("jest.unmock('@/utils/mod2')"));
  });

  it('aliases relative imports starting with ./', () => {
    const appRoot = tempRoot;
    const srcDir = join(appRoot, 'src');
    const utils = join(srcDir, 'utils', 'haptic', 'trigger.ts');
    const index = join(srcDir, 'utils', 'haptic', 'index.ts');

    writeFileEnsured(utils, 'export const triggerFeedback = () => {};\n');
    writeFileEnsured(
      index,
      "import { triggerFeedback } from './trigger';\nexport { triggerFeedback };\n",
    );

    const project = new Project({
      compilerOptions: {
        target: ScriptTarget.ES2022,
        module: ModuleKind.ESNext,
        baseUrl: appRoot,
      },
    });
    project.addSourceFilesAtPaths(join(srcDir, '**/*.{ts,tsx}'));

    transformProjectToAliasImports(project, appRoot);

    const indexFile = project.getSourceFileOrThrow(index);
    const importDecl = indexFile.getImportDeclarations()[0];
    // Same-directory imports are migrated to @/<relative-from-src>/<file>
    assert.strictEqual(
      importDecl.getModuleSpecifierValue(),
      '@/utils/haptic/trigger',
    );
  });

  describe('Migration functionality', () => {
    it('migrates @src/ import to @/', () => {
      const appRoot = tempRoot;
      const srcDir = join(appRoot, 'src');
      const fileA = join(srcDir, 'components', 'Button.tsx');
      const fileB = join(srcDir, 'utils', 'colors.ts');

      writeFileEnsured(
        fileA,
        'export const Button = () => <div>Button</div>;\n',
      );
      writeFileEnsured(
        fileB,
        "import { Button } from '@src/components/Button';\nexport const colors = { primary: '#007AFF' };\n",
      );

      // Simulate the migration: replace @src/ with @/
      const content = readFileSync(fileB, 'utf8');
      const migratedContent = content.replace(/@src\//g, '@/');
      writeFileSync(fileB, migratedContent, 'utf8');

      // Verify the migration worked
      const finalContent = readFileSync(fileB, 'utf8');
      assert.ok(finalContent.includes("from '@/components/Button'"));
      assert.ok(!finalContent.includes('@src/'));
    });

    it('migrates @src/ export to @/', () => {
      const appRoot = tempRoot;
      const srcDir = join(appRoot, 'src');
      const fileA = join(srcDir, 'components', 'Button.tsx');
      const fileIndex = join(srcDir, 'components', 'index.ts');

      writeFileEnsured(
        fileA,
        'export const Button = () => <div>Button</div>;\n',
      );
      writeFileEnsured(
        fileIndex,
        "export { Button } from '@src/components/Button';\n",
      );

      // Simulate the migration: replace @src/ with @/
      const content = readFileSync(fileIndex, 'utf8');
      const migratedContent = content.replace(/@src\//g, '@/');
      writeFileSync(fileIndex, migratedContent, 'utf8');

      // Verify the migration worked
      const finalContent = readFileSync(fileIndex, 'utf8');
      assert.ok(finalContent.includes("from '@/components/Button'"));
      assert.ok(!finalContent.includes('@src/'));
    });

    it('migrates @src/ require to @/', () => {
      const appRoot = tempRoot;
      const srcDir = join(appRoot, 'src');
      const fileA = join(srcDir, 'utils', 'colors.ts');
      const fileB = join(srcDir, 'components', 'Theme.tsx');

      writeFileEnsured(
        fileA,
        'export const colors = { primary: "#007AFF" };\n',
      );
      writeFileEnsured(
        fileB,
        "const colors = require('@src/utils/colors');\nexport const Theme = () => <div>Theme</div>;\n",
      );

      // Simulate the migration: replace @src/ with @/
      const content = readFileSync(fileB, 'utf8');
      const migratedContent = content.replace(/@src\//g, '@/');
      writeFileSync(fileB, migratedContent, 'utf8');

      // Verify the migration worked
      const finalContent = readFileSync(fileB, 'utf8');
      assert.ok(finalContent.includes("require('@/utils/colors')"));
      assert.ok(!finalContent.includes('@src/'));
    });

    it('preserves full paths (no aggressive optimization)', () => {
      const appRoot = tempRoot;
      const srcDir = join(appRoot, 'src');
      const fileA = join(srcDir, 'components', 'buttons', 'Button.tsx');
      const fileB = join(srcDir, 'screens', 'Home.tsx');

      writeFileEnsured(
        fileA,
        'export const Button = () => <div>Button</div>;\n',
      );
      writeFileEnsured(
        fileB,
        "import { Button } from '@src/components/buttons/Button';\nexport const Home = () => <Button />;\n",
      );

      // Simulate the migration: replace @src/ with @/
      const content = readFileSync(fileB, 'utf8');
      const migratedContent = content.replace(/@src\//g, '@/');
      writeFileSync(fileB, migratedContent, 'utf8');

      // Verify the migration preserved the full path
      const finalContent = readFileSync(fileB, 'utf8');
      assert.ok(finalContent.includes("from '@/components/buttons/Button'"));
      assert.ok(!finalContent.includes("from '@/Button'"));
      assert.ok(!finalContent.includes('@src/'));
    });

    it('migrates multiple @src/ imports in same file', () => {
      const appRoot = tempRoot;
      const srcDir = join(appRoot, 'src');
      const fileA = join(srcDir, 'utils', 'colors.ts');
      const fileB = join(srcDir, 'utils', 'dateFormatter.ts');
      const fileC = join(srcDir, 'screens', 'Home.tsx');

      writeFileEnsured(
        fileA,
        'export const colors = { primary: "#007AFF" };\n',
      );
      writeFileEnsured(
        fileB,
        'export const formatDate = (date: Date) => date.toISOString();\n',
      );
      writeFileEnsured(
        fileC,
        "import { Button } from '@src/components/buttons/Button';\nimport { colors } from '@src/utils/colors';\nimport { formatDate } from '@src/utils/dateFormatter';\nexport const Home = () => <Button />;\n",
      );

      // Simulate the migration: replace @src/ with @/
      const content = readFileSync(fileC, 'utf8');
      const migratedContent = content.replace(/@src\//g, '@/');
      writeFileSync(fileC, migratedContent, 'utf8');

      // Verify all imports were migrated
      const finalContent = readFileSync(fileC, 'utf8');
      assert.ok(finalContent.includes("from '@/components/buttons/Button'"));
      assert.ok(finalContent.includes("from '@/utils/colors'"));
      assert.ok(finalContent.includes("from '@/utils/dateFormatter'"));
      assert.ok(!finalContent.includes('@src/'));
    });
  });
});
