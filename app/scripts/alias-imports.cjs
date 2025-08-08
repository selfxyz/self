// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11
const path = require('node:path');
const { Project } = require('ts-morph');

const appRoot = path.resolve(__dirname, '..');
const srcDir = path.join(appRoot, 'src');

const project = new Project({
  tsConfigFilePath: path.join(appRoot, 'tsconfig.json'),
});

// Only rewrite TypeScript sources; JavaScript files don't resolve the @src alias.
for (const sourceFile of project.getSourceFiles('src/**/*.{ts,tsx}')) {
  const dir = path.dirname(sourceFile.getFilePath());
  for (const declaration of sourceFile.getImportDeclarations()) {
    const spec = declaration.getModuleSpecifierValue();
    if (!spec.startsWith('../')) continue;
    const abs = path.resolve(dir, spec);
    if (!abs.startsWith(srcDir)) continue;
    const rel = path.relative(srcDir, abs).replace(/\\/g, '/');
    const newSpec = rel ? `@src/${rel}` : '@src';
    declaration.setModuleSpecifier(newSpec);
  }
}

project.saveSync();
