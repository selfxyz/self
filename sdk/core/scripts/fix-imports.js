import { readdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';

async function fixImports() {
  const typechainDir = join(process.cwd(), 'src', 'typechain-types');

  // Read all files in the typechain-types directory
  const files = await readdir(typechainDir);

  for (const file of files) {
    if (file.endsWith('.ts')) {
      const filePath = join(typechainDir, file);
      const content = await readFile(filePath, 'utf-8');

      // Add .js extension to all relative imports
      const modifiedContent = content.replace(
        /from ['"](\.\/[^'"]+)['"]/g,
        'from "$1.js"'
      );

      await writeFile(filePath, modifiedContent);
    }
  }
}

fixImports().catch(console.error);
