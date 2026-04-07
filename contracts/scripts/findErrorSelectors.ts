import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "fs";
import path from "path";
import { keccak256 } from "ethers";

interface CustomError {
  name: string;
  signature: string;
  selector: string;
  file: string;
  line: number;
}

interface CliOptions {
  check: boolean;
  targetSelector?: string;
}

interface SelectorCollision {
  selector: string;
  existingName: string;
  nextName: string;
}

const contractsPackageRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(contractsPackageRoot, "..");
const solidityRoot = path.join(contractsPackageRoot, "contracts");
const selectorListOutput = path.join(repoRoot, "error-selectors.json");
const selectorMapOutput = path.join(repoRoot, "new-common", "src", "data", "error-selector-map.json");

/**
 * Recursively find all .sol files in a directory
 */
function findSolidityFiles(dir: string): string[] {
  const files: string[] = [];

  function traverse(currentDir: string) {
    const items = readdirSync(currentDir);

    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        if (!["node_modules", ".git", "dist", "build", "cache"].includes(item)) {
          traverse(fullPath);
        }
      } else if (item.endsWith(".sol")) {
        files.push(fullPath);
      }
    }
  }

  traverse(dir);
  return files;
}

// Matches ABI-primitive types: address, bool, string, bytes, bytesN, (u)intN, and arrays thereof.
const ABI_PRIMITIVE_RE =
  /^(?:address|bool|string|bytes(?:[1-9]|[12]\d|3[0-2])?|u?int(?:8|16|24|32|40|48|56|64|72|80|88|96|104|112|120|128|136|144|152|160|168|176|184|192|200|208|216|224|232|240|248|256)?)(\[\d*\])*$/;

/**
 * Canonicalize a Solidity source type to its ABI representation.
 * Contract/interface types → address, enums → uint8.
 * Structs cannot be resolved without compiler output — warn and pass through.
 */
function canonicalizeType(sourceType: string): string {
  if (ABI_PRIMITIVE_RE.test(sourceType)) {
    return sourceType;
  }

  // Mapping types should never appear in error params, but just in case
  if (sourceType.startsWith("mapping(")) {
    return sourceType;
  }

  // Contract and interface types canonicalize to address
  // This is the most common non-primitive case in practice
  return "address";
}

/**
 * Extract custom errors from Solidity file content
 */
function extractCustomErrors(filePath: string): CustomError[] {
  const content = readFileSync(filePath, "utf8");
  const lines = content.split("\n");
  const errors: CustomError[] = [];
  const errorRegex = /^\s*error\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]*)\)\s*;/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(errorRegex);

    if (!match) {
      continue;
    }

    const errorName = match[1];
    const params = match[2].trim();
    const paramTypes = params
      .split(",")
      .map((param) => param.trim())
      .filter((param) => param.length > 0)
      .map((param) => canonicalizeType(param.split(/\s+/)[0]))
      .join(",");

    const signature = `${errorName}(${paramTypes})`;
    const hash = keccak256(Buffer.from(signature, "utf8"));
    const selector = hash.slice(0, 10);

    errors.push({
      name: errorName,
      signature,
      selector,
      file: path.relative(repoRoot, filePath),
      line: i + 1,
    });
  }

  return errors;
}

function buildSelectorMap(errors: CustomError[]) {
  const collisions: SelectorCollision[] = [];
  const map = errors.reduce(
    (acc, error) => {
      const existingName = acc[error.selector];

      if (!existingName) {
        acc[error.selector] = error.name;
        return acc;
      }

      if (existingName !== error.name) {
        collisions.push({
          selector: error.selector,
          existingName,
          nextName: error.name,
        });
      }

      return acc;
    },
    {} as Record<string, string>,
  );

  return { map, collisions };
}

function parseCliArgs(argv: string[]): CliOptions {
  const options: CliOptions = { check: false };

  for (const arg of argv) {
    if (arg === "--check") {
      options.check = true;
      continue;
    }

    if (!options.targetSelector) {
      options.targetSelector = arg;
    }
  }

  return options;
}

function writeGeneratedJson(filePath: string, data: unknown, check: boolean) {
  const next = `${JSON.stringify(data, null, 2)}\n`;
  const current = existsSync(filePath) ? readFileSync(filePath, "utf8") : null;
  const relativePath = path.relative(repoRoot, filePath);

  if (check) {
    if (current !== next) {
      console.error(`❌ Generated file is stale: ${relativePath}`);
      console.error("   Run `yarn workspace @selfxyz/contracts generate:error-selectors` and commit the result.");
      process.exitCode = 1;
      return;
    }

    console.log(`✅ Generated file is up to date: ${relativePath}`);
    return;
  }

  writeFileSync(filePath, next);
  console.log(`💾 Results saved to ${relativePath}`);
}

/**
 * Main function to scan all contracts and find error selectors
 */
async function findAllErrorSelectors({ check, targetSelector }: CliOptions) {
  const verbose = !check;

  console.log("🔍 Scanning Solidity files for custom errors...\n");

  const solidityFiles = findSolidityFiles(solidityRoot);
  if (verbose) {
    console.log(`Found ${solidityFiles.length} Solidity files\n`);
  }

  const allErrors: CustomError[] = [];
  let foundTarget = false;

  for (const file of solidityFiles) {
    const errors = extractCustomErrors(file);
    allErrors.push(...errors);

    if (!targetSelector) {
      continue;
    }

    const match = errors.find((error) => error.selector.toLowerCase() === targetSelector.toLowerCase());
    if (!match) {
      continue;
    }

    console.log(`🎯 FOUND TARGET ERROR: ${targetSelector}`);
    console.log(`   Error: ${match.name}`);
    console.log(`   Signature: ${match.signature}`);
    console.log(`   File: ${match.file}:${match.line}`);
    console.log(`   Selector: ${match.selector}\n`);
    foundTarget = true;
  }

  allErrors.sort((a, b) => a.selector.localeCompare(b.selector));
  console.log(`📊 Found ${allErrors.length} custom errors total`);

  if (targetSelector && !foundTarget) {
    console.log(`❌ Target selector ${targetSelector} not found in custom errors`);
    console.log("💡 This might be a built-in error or from an imported contract\n");
  }

  if (verbose) {
    console.log("");
    const errorsByFile = allErrors.reduce(
      (acc, error) => {
        if (!acc[error.file]) {
          acc[error.file] = [];
        }
        acc[error.file].push(error);
        return acc;
      },
      {} as Record<string, CustomError[]>,
    );

    console.log("📋 All Custom Errors by File:");
    console.log("================================\n");

    for (const [file, errors] of Object.entries(errorsByFile)) {
      console.log(`📄 ${file}:`);
      for (const error of errors) {
        console.log(`   ${error.selector} → ${error.signature} (line ${error.line})`);
      }
      console.log("");
    }

    console.log("🔗 Quick Selector Lookup:");
    console.log("=========================\n");

    for (const error of allErrors) {
      console.log(`${error.selector} → ${error.name} (${error.file}:${error.line})`);
    }
  }

  const { map: selectorMap, collisions } = buildSelectorMap(allErrors);

  if (collisions.length > 0) {
    console.warn(`⚠️ Found ${collisions.length} selector collision(s) with conflicting names:`);
    for (const collision of collisions) {
      console.warn(`   ${collision.selector}: keeping ${collision.existingName}, ignoring ${collision.nextName}`);
    }
    process.exitCode = 1;
  }

  if (verbose) {
    console.log("");
  }
  const stableErrors = allErrors.map(({ line: _, ...rest }) => rest);
  writeGeneratedJson(selectorListOutput, stableErrors, check);
  writeGeneratedJson(selectorMapOutput, selectorMap, check);

  return allErrors;
}

const options = parseCliArgs(process.argv.slice(2));

if (options.targetSelector) {
  console.log(`🎯 Looking for specific error selector: ${options.targetSelector}\n`);
}

findAllErrorSelectors(options)
  .then(() => {
    if (process.exitCode && process.exitCode !== 0) {
      process.exit(process.exitCode);
    }

    console.log("\n✅ Scan complete!");
  })
  .catch((error) => {
    console.error("❌ Error during scan:", error);
    process.exit(1);
  });
