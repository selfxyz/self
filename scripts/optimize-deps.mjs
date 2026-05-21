import { rm, readdir } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

async function main() {
  const nodeModulesDirs = [];

  await collectNodeModules(repoRoot, nodeModulesDirs);

  if (nodeModulesDirs.length === 0) {
    console.log('No node_modules directories found to remove.');
  } else {
    console.log(`Removing ${nodeModulesDirs.length} node_modules directories...`);
    for (const dir of nodeModulesDirs) {
      console.log(`- ${path.relative(repoRoot, dir) || '.'}`);
      await rm(dir, { recursive: true, force: true });
    }
  }

  const env = {
    ...process.env,
    // Root-level dependency refresh should not rewrite native app files.
    SKIP_RN_SDK_TEST_APP_PODS: '1',
  };

  await run('pnpm', ['install'], env);
  await run('pnpm', ['dedupe'], env);
}

async function collectNodeModules(dir, results) {
  let entries;

  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return;
    }
    throw error;
  }

  for (const entry of entries) {
    if (entry.name === 'node_modules' && entry.isDirectory()) {
      results.push(path.join(dir, entry.name));
      continue;
    }

    if (!entry.isDirectory() || entry.isSymbolicLink()) {
      continue;
    }

    if (entry.name === '.git') {
      continue;
    }

    await collectNodeModules(path.join(dir, entry.name), results);
  }
}

function run(command, args, env = process.env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
      stdio: 'inherit',
      shell: false,
      env,
    });

    child.on('error', reject);
    child.on('exit', code => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
    });
  });
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
