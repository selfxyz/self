// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

const path = require('node:path');
const { Project, SyntaxKind } = require('ts-morph');

function determineAliasStrategy(dir, abs, baseDir, baseAlias) {
  const rel = path.relative(baseDir, abs).replace(/\\/g, '/');
  return rel ? `${baseAlias}/${rel}` : baseAlias;
}

function transformProjectToAliasImports(project, appRootPath) {
  const srcDir = path.join(appRootPath, 'src');
  const testsDir = path.join(appRootPath, 'tests', 'src');

  const sourceFiles = project.getSourceFiles();
  for (const sourceFile of sourceFiles) {
    const dir = path.dirname(sourceFile.getFilePath());

    // Handle import declarations
    for (const declaration of sourceFile.getImportDeclarations()) {
      const spec = declaration.getModuleSpecifierValue();

      // Skip existing alias imports
      if (spec.startsWith('@/') || spec.startsWith('@tests/')) {
        continue;
      }

      // Handle relative imports
      if (!spec.startsWith('./') && !spec.startsWith('../')) continue;
      const abs = path.resolve(dir, spec);
      let baseDir = null;
      let baseAlias = null;

      // Determine containment safely using path.relative to avoid startsWith false positives
      const relFromSrc = path.relative(srcDir, abs);
      if (!relFromSrc.startsWith('..') && !path.isAbsolute(relFromSrc)) {
        baseDir = srcDir;
        baseAlias = '@';
      } else {
        const relFromTests = path.relative(testsDir, abs);
        if (!relFromTests.startsWith('..') && !path.isAbsolute(relFromTests)) {
          baseDir = testsDir;
          baseAlias = '@tests';
        } else {
          continue;
        }
      }

      const newSpec = determineAliasStrategy(dir, abs, baseDir, baseAlias);
      declaration.setModuleSpecifier(newSpec);
    }

    // Handle export declarations like: export * from '../x' or export {A} from '../x'
    for (const declaration of sourceFile.getExportDeclarations()) {
      const spec = declaration.getModuleSpecifierValue();
      if (!spec) continue;

      // Skip existing alias exports
      if (spec.startsWith('@/') || spec.startsWith('@tests/')) {
        continue;
      }

      // Handle relative exports
      if (!spec.startsWith('./') && !spec.startsWith('../')) continue;
      const abs = path.resolve(dir, spec);
      let baseDir = null;
      let baseAlias = null;

      const relFromSrc = path.relative(srcDir, abs);
      if (!relFromSrc.startsWith('..') && !path.isAbsolute(relFromSrc)) {
        baseDir = srcDir;
        baseAlias = '@';
      } else {
        const relFromTests = path.relative(testsDir, abs);
        if (!relFromTests.startsWith('..') && !path.isAbsolute(relFromTests)) {
          baseDir = testsDir;
          baseAlias = '@tests';
        } else {
          continue;
        }
      }

      const newSpec = determineAliasStrategy(dir, abs, baseDir, baseAlias);
      declaration.setModuleSpecifier(newSpec);
    }

    // Handle require() calls
    const requireCalls = sourceFile.getDescendantsOfKind(
      SyntaxKind.CallExpression,
    );
    for (const call of requireCalls) {
      const expression = call.getExpression();
      const exprText = expression.getText();
      const isRequire = exprText === 'require';
      const isDynamicImport = exprText === 'import';
      const isJestMock =
        exprText === 'jest.mock' ||
        exprText === 'jest.doMock' ||
        exprText === 'jest.unmock';
      if (!isRequire && !isDynamicImport && !isJestMock) continue;

      const args = call.getArguments();
      if (args.length === 0) continue;

      const arg = args[0];
      if (arg.getKind() !== SyntaxKind.StringLiteral) continue;

      const spec = arg.getLiteralValue();

      // Skip existing alias requires
      if (spec.startsWith('@/') || spec.startsWith('@tests/')) {
        continue;
      }

      // Handle relative requires
      if (!spec.startsWith('./') && !spec.startsWith('../')) continue;

      const abs = path.resolve(dir, spec);
      let baseDir = null;
      let baseAlias = null;

      // Determine containment safely using path.relative to avoid startsWith false positives
      const relFromSrc = path.relative(srcDir, abs);
      if (!relFromSrc.startsWith('..') && !path.isAbsolute(relFromSrc)) {
        baseDir = srcDir;
        baseAlias = '@';
      } else {
        const relFromTests = path.relative(testsDir, abs);
        if (!relFromTests.startsWith('..') && !path.isAbsolute(relFromTests)) {
          baseDir = testsDir;
          baseAlias = '@tests';
        } else {
          continue;
        }
      }

      const newSpec = determineAliasStrategy(dir, abs, baseDir, baseAlias);
      arg.setLiteralValue(newSpec);
    }
  }
}

function runAliasImportsTransform(options = {}) {
  const appRoot = options.appRoot || path.resolve(__dirname, '..');
  const project =
    options.project ||
    new Project({ tsConfigFilePath: path.join(appRoot, 'tsconfig.json') });

  // Include test files since they're excluded in tsconfig
  if (!options.skipAddTests) {
    project.addSourceFilesAtPaths(['tests/**/*.{ts,tsx}']);
  }

  transformProjectToAliasImports(project, appRoot);
  project.saveSync();
  return project;
}

if (require.main === module) {
  runAliasImportsTransform();
}

module.exports = { runAliasImportsTransform, transformProjectToAliasImports };
