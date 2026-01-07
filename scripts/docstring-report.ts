import path from 'node:path';
import process from 'node:process';
import fs from 'node:fs/promises';
import { glob } from 'node:fs/promises';
import * as ts from 'typescript';

interface CliOptions {
  patterns: string[];
  writeReport?: string;
  label?: string;
  includeDetails: boolean;
}

interface ExportEntry {
  localName: string;
  kinds: Set<string>;
  exportedAs: Set<string>;
  documented: boolean;
  exported: boolean;
}

interface FileExportSummary {
  filePath: string;
  relativePath: string;
  totalExports: number;
  documentedExports: number;
  coverage: number;
  missing: string[];
}

interface JsonReport {
  generatedAt: string;
  label?: string;
  totals: {
    exports: number;
    documented: number;
    undocumented: number;
    coverage: number;
  };
  undocumentedTotal: number;
  undocumentedSampled: number;
  undocumented: UndocumentedEntry[];
  files?: JsonReportFile[];
}

interface JsonReportFile {
  file: string;
  exports: number;
  documented: number;
  undocumented: number;
  coverage: number;
  missing: string[];
}

interface UndocumentedEntry {
  file: string;
  symbol: string;
}

const DEFAULT_PATTERNS = [
  'app/src/**/*.{ts,tsx}',
  'packages/mobile-sdk-alpha/src/**/*.{ts,tsx}',
];

async function main(): Promise<void> {
  try {
    const options = parseArgs(process.argv.slice(2));
    const root = process.cwd();
    const files = await resolveFiles(options.patterns, root);

    if (files.length === 0) {
      console.log('No source files matched the provided patterns.');
      if (options.writeReport) {
        await writeJsonReport(options.writeReport, {
          generatedAt: new Date().toISOString(),
          label: options.label,
          totals: { exports: 0, documented: 0, undocumented: 0, coverage: 100 },
          undocumentedTotal: 0,
          undocumentedSampled: 0,
          undocumented: [],
        });
      }
      return;
    }

    const summaries: FileExportSummary[] = [];
    const failedFiles: Array<{ path: string; error: string }> = [];

    for (const filePath of files) {
      try {
        const summary = await analyzeFile(filePath, root);
        if (summary.totalExports > 0) {
          summaries.push(summary);
        }
      } catch (error) {
        const relativePath = path.relative(root, filePath);
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        failedFiles.push({ path: relativePath, error: errorMessage });
        console.error(`Failed to analyze ${relativePath}: ${errorMessage}`);
      }
    }

    if (summaries.length === 0) {
      console.log('No exported declarations were found in the selected files.');
      if (options.writeReport) {
        await writeJsonReport(options.writeReport, {
          generatedAt: new Date().toISOString(),
          label: options.label,
          totals: { exports: 0, documented: 0, undocumented: 0, coverage: 100 },
          undocumentedTotal: 0,
          undocumentedSampled: 0,
          undocumented: [],
        });
      }
      return;
    }

    summaries.sort((a, b) => {
      if (a.coverage === b.coverage) {
        return a.relativePath.localeCompare(b.relativePath);
      }
      return a.coverage - b.coverage;
    });

    const totalExports = summaries.reduce(
      (sum, file) => sum + file.totalExports,
      0,
    );
    const documentedExports = summaries.reduce(
      (sum, file) => sum + file.documentedExports,
      0,
    );
    const overallCoverage =
      totalExports === 0 ? 1 : documentedExports / totalExports;

    printTable(summaries, options.label);
    printSummary(totalExports, documentedExports, overallCoverage);
    printUndocumentedHighlights(summaries);

    if (failedFiles.length > 0) {
      console.log();
      console.log(`Failed to analyze ${failedFiles.length} file(s):`);
      for (const failure of failedFiles) {
        console.log(`  ${failure.path}: ${failure.error}`);
      }
    }

    if (options.writeReport) {
      const missingEntries = summaries.flatMap(file =>
        file.missing.map<UndocumentedEntry>(symbol => ({
          file: file.relativePath,
          symbol,
        })),
      );
      const maxUndocumentedEntries = options.includeDetails
        ? missingEntries.length
        : Math.min(50, missingEntries.length);
      const files = options.includeDetails
        ? summaries
            .filter(file => file.missing.length > 0)
            .map<JsonReportFile>(file => ({
              file: file.relativePath,
              exports: file.totalExports,
              documented: file.documentedExports,
              undocumented: file.totalExports - file.documentedExports,
              coverage: Number((file.coverage * 100).toFixed(2)),
              missing: file.missing,
            }))
        : undefined;
      const report: JsonReport = {
        generatedAt: new Date().toISOString(),
        label: options.label,
        totals: {
          exports: totalExports,
          documented: documentedExports,
          undocumented: totalExports - documentedExports,
          coverage: Number((overallCoverage * 100).toFixed(2)),
        },
        undocumentedTotal: missingEntries.length,
        undocumentedSampled: maxUndocumentedEntries,
        undocumented: missingEntries.slice(0, maxUndocumentedEntries),
        ...(files ? { files } : {}),
      };

      await writeJsonReport(options.writeReport, report);
    }
  } catch (error) {
    console.error('Failed to generate docstring report.');
    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(error);
    }
    process.exitCode = 1;
  }
}

function parseArgs(args: string[]): CliOptions {
  const patterns: string[] = [];
  let writeReport: string | undefined;
  let label: string | undefined;
  let includeDetails = false;

  const expectValue = (flag: string, value: string | undefined): string => {
    if (!value) {
      throw new Error(`Missing value for ${flag}`);
    }
    return value;
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    }

    if (arg === '--write-report' || arg.startsWith('--write-report=')) {
      if (arg.includes('=')) {
        writeReport = arg.split('=')[1] ?? '';
        if (!writeReport) {
          throw new Error('Missing value for --write-report');
        }
      } else {
        index += 1;
        writeReport = expectValue('--write-report', args[index]);
      }
      continue;
    }

    if (arg === '--label' || arg.startsWith('--label=')) {
      if (arg.includes('=')) {
        label = arg.split('=')[1] ?? '';
      } else {
        index += 1;
        label = expectValue('--label', args[index]);
      }
      continue;
    }

    if (arg.startsWith('--')) {
      if (arg === '--details') {
        includeDetails = true;
        continue;
      }
      throw new Error(`Unknown option: ${arg}`);
    }

    patterns.push(arg);
  }

  if (patterns.length === 0) {
    patterns.push(...DEFAULT_PATTERNS);
  }

  return { patterns, writeReport, label, includeDetails };
}

function printUsage(): void {
  const usage = `Usage: docstring-report [pattern ...] [--write-report <path>] [--label <name>] [--details]

Examples:
  yarn tsx scripts/docstring-report.ts
  yarn tsx scripts/docstring-report.ts \"app/src/**/*.{ts,tsx}\"
  yarn tsx scripts/docstring-report.ts \"app/src/**/*.{ts,tsx}\" --label \"Mobile App\" --write-report docs/coverage/app.json --details`;
  console.log(usage);
}

async function resolveFiles(
  patterns: string[],
  root: string,
): Promise<string[]> {
  const files = new Set<string>();

  for (const pattern of patterns) {
    for await (const match of glob(pattern, {
      cwd: root,
      // Exclude dotfiles and dot-directories
      exclude: (name: string) => path.basename(name).startsWith('.'),
    })) {
      const resolved = path.resolve(root, String(match));

      // Skip directories (glob may return them despite file extension patterns)
      try {
        const stat = await fs.stat(resolved);
        if (stat.isDirectory()) {
          continue;
        }
      } catch {
        // File doesn't exist or can't be accessed, skip it
        continue;
      }

      if (shouldIncludeFile(resolved, root)) {
        files.add(resolved);
      }
    }
  }

  return Array.from(files).sort();
}

function shouldIncludeFile(filePath: string, root: string): boolean {
  const relative = path.relative(root, filePath).replace(/\\/g, '/');

  if (relative.endsWith('.d.ts') || relative.endsWith('.d.tsx')) {
    return false;
  }

  if (/\.test\.[tj]sx?$/.test(relative) || /\.spec\.[tj]sx?$/.test(relative)) {
    return false;
  }

  if (/\.stories\.[tj]sx?$/.test(relative)) {
    return false;
  }

  if (relative.includes('/__tests__/')) {
    return false;
  }

  return true;
}

async function analyzeFile(
  filePath: string,
  root: string,
): Promise<FileExportSummary> {
  const content = await fs.readFile(filePath, 'utf8');
  const scriptKind = filePath.endsWith('.tsx')
    ? ts.ScriptKind.TSX
    : ts.ScriptKind.TS;

  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true,
    scriptKind,
  );

  const entries = new Map<string, ExportEntry>();
  const exportSpecifiers: Array<{ localName: string; exportedAs: string }> = [];
  const exportDefaultStatements: ts.ExportAssignment[] = [];
  const exportedDeclarations: Array<{
    statement: ts.Statement;
    hasDefault: boolean;
  }> = [];

  // First pass: Collect all declarations with their documentation status
  for (const statement of sourceFile.statements) {
    if (ts.isExportDeclaration(statement)) {
      // Collect export specifiers for second pass
      if (
        !statement.moduleSpecifier &&
        statement.exportClause &&
        ts.isNamedExports(statement.exportClause)
      ) {
        for (const element of statement.exportClause.elements) {
          const localName = element.propertyName
            ? element.propertyName.text
            : element.name.text;
          const exportedAs = element.name.text;
          exportSpecifiers.push({ localName, exportedAs });
        }
      }
      continue;
    }

    if (ts.isExportAssignment(statement)) {
      if (!statement.isExportEquals) {
        exportDefaultStatements.push(statement);
      }
      continue;
    }

    if (ts.isVariableStatement(statement)) {
      const exported = hasExportModifier(statement.modifiers);
      const statementDoc = hasDocComment(statement, sourceFile);

      for (const declaration of statement.declarationList.declarations) {
        // Extract all binding identifiers (handles destructuring)
        const identifiers = getBindingIdentifiers(declaration);
        if (identifiers.length === 0) {
          continue;
        }

        const declarationDoc = hasDocComment(declaration, sourceFile);

        for (const name of identifiers) {
          const entry = ensureEntry(entries, name);
          entry.kinds.add('variable');
          entry.documented ||= statementDoc || declarationDoc;
        }

        if (exported) {
          exportedDeclarations.push({ statement, hasDefault: false });
        }
      }
      continue;
    }

    if (
      ts.isFunctionDeclaration(statement) ||
      ts.isClassDeclaration(statement) ||
      ts.isInterfaceDeclaration(statement) ||
      ts.isTypeAliasDeclaration(statement) ||
      ts.isEnumDeclaration(statement) ||
      ts.isModuleDeclaration(statement)
    ) {
      const name = getDeclarationName(statement, sourceFile);
      const hasExport = hasExportModifier(statement.modifiers);
      const hasDefault = hasDefaultModifier(statement.modifiers);

      // For anonymous default exports (e.g., export default function() {}),
      // use "default" as the name so they're tracked in coverage
      const effectiveName = !name && hasExport && hasDefault ? 'default' : name;

      if (!effectiveName) {
        continue;
      }

      const entry = ensureEntry(entries, effectiveName);
      entry.kinds.add(getKindLabel(statement));
      entry.documented ||= hasDocComment(statement, sourceFile);

      if (hasExport) {
        exportedDeclarations.push({ statement, hasDefault });
      }
      continue;
    }
  }

  // Second pass: Process all exports now that all declarations are collected
  // Process inline exported declarations
  for (const { statement, hasDefault } of exportedDeclarations) {
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        // Extract all binding identifiers (handles destructuring)
        const identifiers = getBindingIdentifiers(declaration);

        for (const name of identifiers) {
          const entry = entries.get(name);
          if (entry) {
            entry.exported = true;
            entry.exportedAs.add(name);
          }
        }
      }
    } else {
      const name = getDeclarationName(statement, sourceFile);

      // For anonymous default exports, use "default" as the name
      const effectiveName = !name && hasDefault ? 'default' : name;

      if (!effectiveName) {
        continue;
      }

      const entry = entries.get(effectiveName);
      if (entry) {
        entry.exported = true;
        // For inline default exports (export default function foo), add "default" not the name
        const exportName = hasDefault ? 'default' : effectiveName;
        entry.exportedAs.add(exportName);
      }
    }
  }

  // Process export specifiers (export { Foo, Bar })
  for (const specifier of exportSpecifiers) {
    const entry = entries.get(specifier.localName);
    if (entry) {
      entry.exported = true;
      entry.exportedAs.add(specifier.exportedAs);
    }
  }

  // Process export default statements (export default Foo)
  for (const statement of exportDefaultStatements) {
    const entry = ensureEntry(entries, 'default');
    entry.exported = true;
    entry.kinds.add('default');
    entry.exportedAs.add('default');

    // Check if the export statement itself is documented
    entry.documented ||= hasDocComment(statement, sourceFile);

    // If exporting an identifier (export default Foo), inherit documentation from the referenced declaration
    if (ts.isIdentifier(statement.expression)) {
      const referencedName = statement.expression.text;
      const referencedEntry = entries.get(referencedName);
      if (referencedEntry?.documented) {
        entry.documented = true;
      }
    }
  }

  const relativePath = path.relative(root, filePath).replace(/\\/g, '/');
  const exportedEntries = Array.from(entries.values()).filter(
    entry => entry.exported,
  );
  const documentedEntries = exportedEntries.filter(entry => entry.documented);

  const missing = exportedEntries
    .filter(entry => !entry.documented)
    .map(entry => formatMissingName(entry));

  return {
    filePath,
    relativePath,
    totalExports: exportedEntries.length,
    documentedExports: documentedEntries.length,
    coverage:
      exportedEntries.length === 0
        ? 1
        : documentedEntries.length / exportedEntries.length,
    missing,
  };
}

function ensureEntry(map: Map<string, ExportEntry>, key: string): ExportEntry {
  const existing = map.get(key);
  if (existing) {
    return existing;
  }

  const entry: ExportEntry = {
    localName: key,
    kinds: new Set<string>(),
    exportedAs: new Set<string>(),
    documented: false,
    exported: false,
  };

  map.set(key, entry);
  return entry;
}

function hasExportModifier(
  modifiers: ts.NodeArray<ts.Modifier> | undefined,
): boolean {
  return Boolean(
    modifiers?.some(
      modifier =>
        modifier.kind === ts.SyntaxKind.ExportKeyword ||
        modifier.kind === ts.SyntaxKind.DefaultKeyword,
    ),
  );
}

function hasDefaultModifier(
  modifiers: ts.NodeArray<ts.Modifier> | undefined,
): boolean {
  return Boolean(
    modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.DefaultKeyword),
  );
}

function getDeclarationName(
  node: ts.Node,
  sourceFile: ts.SourceFile,
): string | undefined {
  if ('name' in node && node.name) {
    const nameNode = (node as ts.Node & { name?: ts.Node }).name as
      | ts.Node
      | undefined;
    if (!nameNode) {
      return undefined;
    }

    if (
      ts.isIdentifier(nameNode) ||
      ts.isStringLiteralLike(nameNode) ||
      ts.isNumericLiteral(nameNode)
    ) {
      return nameNode.text;
    }

    return nameNode.getText(sourceFile).trim();
  }

  if (ts.isModuleDeclaration(node)) {
    return node.name.text;
  }

  if (ts.isExportAssignment(node)) {
    return 'default';
  }

  return undefined;
}

/**
 * Extract all binding identifiers from a declaration.
 * Handles destructuring patterns like { a, b } and [x, y].
 */
function getBindingIdentifiers(declaration: ts.VariableDeclaration): string[] {
  const identifiers: string[] = [];

  function collectIdentifiers(name: ts.BindingName): void {
    if (ts.isIdentifier(name)) {
      identifiers.push(name.text);
    } else if (ts.isObjectBindingPattern(name)) {
      for (const element of name.elements) {
        collectIdentifiers(element.name);
      }
    } else if (ts.isArrayBindingPattern(name)) {
      for (const element of name.elements) {
        if (ts.isBindingElement(element)) {
          collectIdentifiers(element.name);
        }
      }
    }
  }

  collectIdentifiers(declaration.name);
  return identifiers;
}

function getKindLabel(node: ts.Node): string {
  if (ts.isFunctionDeclaration(node)) {
    return 'function';
  }
  if (ts.isClassDeclaration(node)) {
    return 'class';
  }
  if (ts.isInterfaceDeclaration(node)) {
    return 'interface';
  }
  if (ts.isTypeAliasDeclaration(node)) {
    return 'type';
  }
  if (ts.isEnumDeclaration(node)) {
    return 'enum';
  }
  if (ts.isModuleDeclaration(node)) {
    return 'namespace';
  }
  return 'declaration';
}

function hasDocComment(node: ts.Node, sourceFile: ts.SourceFile): boolean {
  const jsDocNodes = (node as ts.Node & { jsDoc?: readonly ts.JSDoc[] }).jsDoc;
  if (jsDocNodes && jsDocNodes.length > 0) {
    return true;
  }

  const jsDocRanges = ts.getJSDocCommentRanges(node, sourceFile.text);
  if (jsDocRanges && jsDocRanges.length > 0) {
    return true;
  }

  const leadingRanges = ts.getLeadingCommentRanges(
    sourceFile.text,
    node.getFullStart(),
  );
  if (leadingRanges) {
    return leadingRanges.some(range =>
      sourceFile.text.slice(range.pos, range.end).startsWith('/**'),
    );
  }

  return false;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

function printTable(summaries: FileExportSummary[], label?: string): void {
  const title = label ? `Docstring coverage (${label})` : 'Docstring coverage';
  console.log(title);
  console.log('='.repeat(title.length));

  const headers = ['File', 'Exports', 'With Docs', 'Coverage', 'Missing'];
  const rows = summaries.map(summary => [
    summary.relativePath,
    summary.totalExports.toString(),
    summary.documentedExports.toString(),
    formatPercent(summary.coverage),
    summary.missing.join(', '),
  ]);

  const widths = headers.map((header, columnIndex) => {
    const columnValues = rows.map(row => row[columnIndex]);
    const maxContentLength = columnValues.reduce(
      (max, value) => Math.max(max, value.length),
      header.length,
    );
    const maxWidth =
      columnIndex === 0
        ? Math.min(70, Math.max(20, maxContentLength))
        : maxContentLength;
    return maxWidth;
  });

  const formatRow = (values: string[]): string =>
    values
      .map((value, index) => {
        const width = widths[index];
        const trimmed =
          index === 0 && value.length > width
            ? `…${value.slice(value.length - width + 1)}`
            : value;
        return trimmed.padEnd(width, ' ');
      })
      .join('  ');

  console.log(formatRow(headers));
  console.log(
    formatRow(
      widths.map(width => '-'.repeat(Math.max(3, Math.min(width, 80)))),
    ),
  );
  rows.forEach(row => console.log(formatRow(row)));
}

function printSummary(
  total: number,
  documented: number,
  coverage: number,
): void {
  console.log();
  if (total === 0) {
    console.log('Overall coverage: 100.00% (0/0 exported declarations)');
    return;
  }
  console.log(
    `Overall coverage: ${formatPercent(coverage)} (${documented}/${total} exported declarations documented)`,
  );
}

function printUndocumentedHighlights(summaries: FileExportSummary[]): void {
  const missingEntries: Array<{ file: string; names: string[] }> = [];
  for (const summary of summaries) {
    if (summary.missing.length > 0) {
      missingEntries.push({
        file: summary.relativePath,
        names: summary.missing,
      });
    }
  }

  if (missingEntries.length === 0) {
    console.log('All exported declarations include TSDoc comments.');
    return;
  }

  console.log();
  console.log('Undocumented exports:');
  for (const entry of missingEntries) {
    console.log(`  ${entry.file}`);
    for (const name of entry.names) {
      console.log(`    - ${name}`);
    }
  }
}

function formatMissingName(entry: ExportEntry): string {
  const exportedNames = Array.from(entry.exportedAs);
  if (exportedNames.length === 0) {
    return entry.localName;
  }

  const aliasList = exportedNames.filter(
    name => name !== entry.localName && name !== 'default',
  );
  if (exportedNames.includes('default')) {
    if (aliasList.length > 0) {
      return `default (local: ${entry.localName}, aliases: ${aliasList.join(', ')})`;
    }
    if (entry.localName !== 'default') {
      return `default (local: ${entry.localName})`;
    }
    return 'default export';
  }

  if (aliasList.length > 0) {
    return `${aliasList.join(', ')} (local: ${entry.localName})`;
  }

  return entry.localName;
}

async function writeJsonReport(
  targetPath: string,
  report: JsonReport,
): Promise<void> {
  const resolvedPath = path.resolve(process.cwd(), targetPath);
  await fs.mkdir(path.dirname(resolvedPath), { recursive: true });
  await fs.writeFile(
    resolvedPath,
    `${JSON.stringify(report, null, 2)}\n`,
    'utf8',
  );
  console.log(
    `\nSaved coverage snapshot to ${path.relative(process.cwd(), resolvedPath)}`,
  );
}

void main();
