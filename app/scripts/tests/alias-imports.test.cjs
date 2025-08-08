#!/usr/bin/env node
const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');

const { Project, ScriptTarget, ModuleKind } = require('ts-morph');

const {
  runAliasImportsTransform,
  transformProjectToAliasImports,
} = require('../alias-imports.cjs');

function createTempDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'alias-imports-'));
  return dir;
}

function writeFileEnsured(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

describe('alias-imports transform', () => {
  let tempRoot;

  beforeEach(() => {
    tempRoot = createTempDir();
  });

  it('transforms relative TS import to @src alias', () => {
    // Arrange: fake app structure
    const appRoot = tempRoot;
    const srcDir = path.join(appRoot, 'src');
    const fileA = path.join(srcDir, 'utils', 'a.ts');
    const fileB = path.join(srcDir, 'components', 'b.ts');

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
    project.addSourceFilesAtPaths(path.join(srcDir, '**/*.{ts,tsx}'));

    // Act
    transformProjectToAliasImports(project, appRoot);

    // Assert
    const b = project.getSourceFileOrThrow(fileB);
    const imports = b.getImportDeclarations();
    assert.strictEqual(imports.length, 1);
    assert.strictEqual(imports[0].getModuleSpecifierValue(), '@src/utils/a');
  });

  it('transforms relative require to @src alias', () => {
    const appRoot = tempRoot;
    const srcDir = path.join(appRoot, 'src');
    const fileA = path.join(srcDir, 'utils', 'x.ts');
    const fileC = path.join(srcDir, 'lib', 'c.ts');

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
    project.addSourceFilesAtPaths(path.join(srcDir, '**/*.{ts,tsx}'));

    transformProjectToAliasImports(project, appRoot);

    const c = project.getSourceFileOrThrow(fileC);
    assert.ok(c.getText().includes("require('@src/utils/x')"));
  });

  it('ignores relative imports that resolve outside src', () => {
    const appRoot = tempRoot;
    const srcDir = path.join(appRoot, 'src');
    const siblingDir = path.join(appRoot, 'sibling');
    const fileSib = path.join(siblingDir, 's.ts');
    const fileInside = path.join(srcDir, 'feature', 'inside.ts');

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
    project.addSourceFilesAtPaths(path.join(srcDir, '**/*.{ts,tsx}'));

    transformProjectToAliasImports(project, appRoot);

    const inside = project.getSourceFileOrThrow(fileInside);
    const spec = inside.getImportDeclarations()[0].getModuleSpecifierValue();
    assert.strictEqual(spec, '../../sibling/s');
  });

  it('CLI runner executes without throwing on empty project', () => {
    const appRoot = tempRoot;
    const srcDir = path.join(appRoot, 'src');
    fs.mkdirSync(srcDir, { recursive: true });

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
});
