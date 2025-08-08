// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11
const path = require('node:path');
const { Project, SyntaxKind } = require('ts-morph');

function transformProjectToAliasImports(project, appRootPath) {
  const srcDir = path.join(appRootPath, 'src');

  const sourceFiles = project.getSourceFiles();
  for (const sourceFile of sourceFiles) {
    const dir = path.dirname(sourceFile.getFilePath());

    // Handle import declarations
    for (const declaration of sourceFile.getImportDeclarations()) {
      const spec = declaration.getModuleSpecifierValue();
      if (!spec.startsWith('../')) continue;
      const abs = path.resolve(dir, spec);
      if (!abs.startsWith(srcDir)) continue;
      const rel = path.relative(srcDir, abs).replace(/\\/g, '/');
      const newSpec = rel ? `@src/${rel}` : '@src';
      declaration.setModuleSpecifier(newSpec);
    }

    // Handle require() calls
    const requireCalls = sourceFile.getDescendantsOfKind(
      SyntaxKind.CallExpression,
    );
    for (const call of requireCalls) {
      const expression = call.getExpression();
      if (expression.getText() !== 'require') continue;

      const args = call.getArguments();
      if (args.length === 0) continue;

      const arg = args[0];
      if (arg.getKind() !== SyntaxKind.StringLiteral) continue;

      const spec = arg.getLiteralValue();
      if (!spec.startsWith('../')) continue;

      const abs = path.resolve(dir, spec);
      if (!abs.startsWith(srcDir)) continue;

      const rel = path.relative(srcDir, abs).replace(/\\/g, '/');
      const newSpec = rel ? `@src/${rel}` : '@src';
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
