// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11
const path = require('node:path');
const { Project, SyntaxKind } = require('ts-morph');

function determineAliasStrategy(dir, abs, baseDir, baseAlias) {
  // Always use base alias with path relative to baseDir (no special '@/' handling)
  const rel = path.relative(baseDir, abs).replace(/\\/g, '/');
  return rel ? `${baseAlias}/${rel}` : baseAlias;
}

function optimizeExistingSrcImport(spec) {
  // Convert @src/path/to/file to @/file if it's a same-directory import
  // This migration no longer shortens to '@/' because tooling can't resolve contextual '@/'
  if (!spec.startsWith('@src/')) return spec;
  return spec;
}

// Migrate legacy '@/File' (same-directory shorthand) to '@src/<relative-from-src>/<File>'
function migrateAtShorthand(spec, dir, srcDir) {
  if (!spec.startsWith('@/')) return spec;
  const fileBase = spec.slice(2); // remove '@/'
  // Compute path relative to src for the current directory, then append the fileBase
  const relFromSrcToCurrentDir = path.relative(srcDir, dir).replace(/\\/g, '/');
  const finalPath = relFromSrcToCurrentDir
    ? `@src/${relFromSrcToCurrentDir}/${fileBase}`
    : `@src/${fileBase}`;
  return finalPath;
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

      // Handle existing @src/ imports - keep as-is (no '@/' optimization)
      if (spec.startsWith('@src/')) {
        const optimized = optimizeExistingSrcImport(spec, dir, srcDir);
        if (optimized !== spec) {
          declaration.setModuleSpecifier(optimized);
        }
        continue;
      }

      // Handle legacy '@/File' shorthand and migrate it
      if (spec.startsWith('@/')) {
        const migrated = migrateAtShorthand(spec, dir, srcDir);
        if (migrated !== spec) {
          declaration.setModuleSpecifier(migrated);
        }
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
        baseAlias = '@src';
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

      // Handle existing @src/ exports - keep as-is
      if (spec.startsWith('@src/')) {
        const optimized = optimizeExistingSrcImport(spec, dir, srcDir);
        if (optimized !== spec) {
          declaration.setModuleSpecifier(optimized);
        }
        continue;
      }

      // Handle legacy '@/File' shorthand and migrate it
      if (spec.startsWith('@/')) {
        const migrated = migrateAtShorthand(spec, dir, srcDir);
        if (migrated !== spec) {
          declaration.setModuleSpecifier(migrated);
        }
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
        baseAlias = '@src';
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

      // Handle existing @src/ requires - keep as-is
      if (spec.startsWith('@src/')) {
        const optimized = optimizeExistingSrcImport(spec, dir, srcDir);
        if (optimized !== spec) {
          arg.setLiteralValue(optimized);
        }
        continue;
      }

      // Handle legacy '@/File' shorthand and migrate it
      if (spec.startsWith('@/')) {
        const migrated = migrateAtShorthand(spec, dir, srcDir);
        if (migrated !== spec) {
          arg.setLiteralValue(migrated);
        }
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
        baseAlias = '@src';
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
