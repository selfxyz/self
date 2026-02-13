#!/usr/bin/env node
import { promises as fs } from 'fs';
import path from 'path';

const ROOT_DIR = process.cwd();
const ROOT_PACKAGE_JSON_PATH = path.join(ROOT_DIR, 'package.json');
const OUTPUT_JSON_PATH = path.join(
  ROOT_DIR,
  'docs',
  'maintenance',
  'cruft-baseline.json',
);
const OUTPUT_MARKDOWN_PATH = path.join(
  ROOT_DIR,
  'docs',
  'maintenance',
  'cruft-baseline.md',
);

const IGNORED_DIRECTORIES = new Set([
  '.git',
  '.gradle',
  '.next',
  '.yarn',
  'android',
  'artifacts',
  'build',
  'cache',
  'Carthage',
  'coverage',
  'DerivedData',
  'dist',
  'ios',
  'node_modules',
  'out',
  'Pods',
  'vendor',
]);

const SOURCE_EXTENSIONS = new Set([
  '.cjs',
  '.circom',
  '.css',
  '.go',
  '.h',
  '.hpp',
  '.java',
  '.js',
  '.jsx',
  '.kt',
  '.kts',
  '.mjs',
  '.noir',
  '.py',
  '.rb',
  '.rs',
  '.sh',
  '.sol',
  '.swift',
  '.ts',
  '.tsx',
  '.vue',
]);

function sortObjectKeys(obj = {}) {
  const sortedEntries = Object.entries(obj).sort(([a], [b]) =>
    a.localeCompare(b),
  );
  return Object.fromEntries(sortedEntries);
}

function wildcardToRegex(segment) {
  const escaped = segment
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '[^/]*');
  return new RegExp(`^${escaped}$`);
}

async function expandWorkspacePattern(rootDir, pattern) {
  const segments = pattern.split('/').filter(Boolean);

  async function walkSegments(currentDir, segmentIndex) {
    if (segmentIndex >= segments.length) {
      return [currentDir];
    }

    const currentSegment = segments[segmentIndex];
    const hasWildcard = currentSegment.includes('*');

    if (!hasWildcard) {
      const nextDir = path.join(currentDir, currentSegment);
      try {
        const stat = await fs.stat(nextDir);
        if (!stat.isDirectory()) return [];
      } catch {
        return [];
      }
      return walkSegments(nextDir, segmentIndex + 1);
    }

    const matcher = wildcardToRegex(currentSegment);
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    const matches = entries
      .filter(entry => entry.isDirectory() && matcher.test(entry.name))
      .map(entry => path.join(currentDir, entry.name));

    const expanded = await Promise.all(
      matches.map(matchedDir => walkSegments(matchedDir, segmentIndex + 1)),
    );

    return expanded.flat();
  }

  return walkSegments(rootDir, 0);
}

async function getWorkspaceDirectories(rootDir, workspacePatterns) {
  const allMatches = await Promise.all(
    workspacePatterns.map(pattern => expandWorkspacePattern(rootDir, pattern)),
  );

  const candidateDirs = [...new Set(allMatches.flat())];
  const workspaceDirs = [];

  for (const dir of candidateDirs) {
    const packageJsonPath = path.join(dir, 'package.json');
    try {
      await fs.access(packageJsonPath);
      workspaceDirs.push(dir);
    } catch {
      // Skip directories without package.json.
    }
  }

  return workspaceDirs.sort((a, b) => a.localeCompare(b));
}

async function collectSourceFileCounts(workspaceDir) {
  const extensionCounts = {};

  async function walk(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        if (IGNORED_DIRECTORIES.has(entry.name)) continue;
        await walk(fullPath);
        continue;
      }

      if (!entry.isFile()) continue;

      const extension = path.extname(entry.name).toLowerCase();
      if (!SOURCE_EXTENSIONS.has(extension)) continue;

      extensionCounts[extension] = (extensionCounts[extension] || 0) + 1;
    }
  }

  await walk(workspaceDir);

  const sortedExtensionCounts = sortObjectKeys(extensionCounts);
  const totalSourceFiles = Object.values(sortedExtensionCounts).reduce(
    (sum, count) => sum + count,
    0,
  );

  return { extensionCounts: sortedExtensionCounts, totalSourceFiles };
}

function buildMarkdownReport(report) {
  const lines = [];
  const topLargest = [...report.workspaces]
    .sort((a, b) => b.sourceFiles.total - a.sourceFiles.total)
    .slice(0, 10);

  const noTestScript = report.workspaces.filter(
    workspace => !workspace.scripts.includes('test'),
  );

  const averageDeps =
    report.workspaces.reduce((sum, ws) => sum + ws.dependencyCount.total, 0) /
    Math.max(report.workspaces.length, 1);

  const variance =
    report.workspaces.reduce(
      (sum, ws) => sum + (ws.dependencyCount.total - averageDeps) ** 2,
      0,
    ) / Math.max(report.workspaces.length, 1);

  const standardDeviation = Math.sqrt(variance);
  const unusualThreshold = Math.max(
    50,
    Math.round(averageDeps + standardDeviation),
  );

  const unusuallyLargeDeps = report.workspaces.filter(
    workspace => workspace.dependencyCount.total >= unusualThreshold,
  );

  lines.push('# Cruft Baseline Snapshot');
  lines.push('');
  lines.push(
    'Generated from `package.json` workspaces. This file is intended as an immutable baseline for cleanup PRs.',
  );
  lines.push('');

  lines.push('## Top 10 largest workspaces by source-file count');
  lines.push('');
  for (const workspace of topLargest) {
    lines.push(
      `- \`${workspace.path}\` (${workspace.sourceFiles.total} source files, ${workspace.dependencyCount.total} deps)`,
    );
  }

  lines.push('');
  lines.push('## Workspaces with no `test` script');
  lines.push('');
  if (noTestScript.length === 0) {
    lines.push('- None');
  } else {
    for (const workspace of noTestScript) {
      lines.push(`- \`${workspace.path}\``);
    }
  }

  lines.push('');
  lines.push('## Workspaces with unusually large dependency sets');
  lines.push('');
  lines.push(
    `- Threshold: >= ${unusualThreshold} total dependencies (mean + 1σ, minimum 50).`,
  );
  if (unusuallyLargeDeps.length === 0) {
    lines.push('- None');
  } else {
    for (const workspace of unusuallyLargeDeps) {
      lines.push(
        `- \`${workspace.path}\`: ${workspace.dependencyCount.total} total (${workspace.dependencyCount.dependencies} deps, ${workspace.dependencyCount.devDependencies} devDeps, ${workspace.dependencyCount.peerDependencies} peerDeps)`,
      );
    }
  }

  lines.push('');

  return `${lines.join('\n')}\n`;
}

async function main() {
  const rootPackageJson = JSON.parse(
    await fs.readFile(ROOT_PACKAGE_JSON_PATH, 'utf8'),
  );
  const workspacePatterns = rootPackageJson.workspaces?.packages;

  if (!Array.isArray(workspacePatterns) || workspacePatterns.length === 0) {
    throw new Error('Root package.json does not define workspaces.packages.');
  }

  const workspaceDirs = await getWorkspaceDirectories(
    ROOT_DIR,
    workspacePatterns,
  );

  const workspaces = [];
  for (const workspaceDir of workspaceDirs) {
    const packageJsonPath = path.join(workspaceDir, 'package.json');
    const packageData = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
    const relativePath = path.relative(ROOT_DIR, workspaceDir) || '.';
    const sourceFiles = await collectSourceFileCounts(workspaceDir);

    const dependencies = sortObjectKeys(packageData.dependencies || {});
    const devDependencies = sortObjectKeys(packageData.devDependencies || {});
    const peerDependencies = sortObjectKeys(packageData.peerDependencies || {});

    workspaces.push({
      name: packageData.name || relativePath,
      path: relativePath,
      dependencies,
      devDependencies,
      peerDependencies,
      dependencyCount: {
        dependencies: Object.keys(dependencies).length,
        devDependencies: Object.keys(devDependencies).length,
        peerDependencies: Object.keys(peerDependencies).length,
        total:
          Object.keys(dependencies).length +
          Object.keys(devDependencies).length +
          Object.keys(peerDependencies).length,
      },
      scripts: Object.keys(packageData.scripts || {}).sort((a, b) =>
        a.localeCompare(b),
      ),
      sourceFiles: {
        byExtension: sourceFiles.extensionCounts,
        total: sourceFiles.totalSourceFiles,
      },
    });
  }

  const report = {
    workspacePatterns,
    workspaceCount: workspaces.length,
    workspaces,
  };

  const markdown = buildMarkdownReport(report);

  await fs.mkdir(path.dirname(OUTPUT_JSON_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(OUTPUT_MARKDOWN_PATH, markdown);

  console.log(`Wrote ${path.relative(ROOT_DIR, OUTPUT_JSON_PATH)}`);
  console.log(`Wrote ${path.relative(ROOT_DIR, OUTPUT_MARKDOWN_PATH)}`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
