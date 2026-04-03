import { readdirSync, statSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { keccak256 } from "ethers";

interface CustomError {
  name: string;
  signature: string;
  selector: string;
  file: string;
  line: number;
}

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
        // Skip node_modules, .git, and other common directories
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

/**
 * Extract custom errors from Solidity file content
 */
function extractCustomErrors(filePath: string): CustomError[] {
  const content = readFileSync(filePath, "utf8");
  const lines = content.split("\n");
  const errors: CustomError[] = [];

  // Regex to match custom error declarations
  // Matches: error ErrorName(type1 param1, type2 param2, ...);
  const errorRegex = /^\s*error\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]*)\)\s*;/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(errorRegex);

    if (match) {
      const errorName = match[1];
      const params = match[2].trim();

      // Clean up parameters - remove parameter names, keep only types
      const paramTypes = params
        .split(",")
        .map((param) => param.trim())
        .filter((param) => param.length > 0)
        .map((param) => {
          // Extract type from "type name" or "type"
          const parts = param.split(/\s+/);
          return parts[0]; // First part is the type
        })
        .join(",");

      const signature = `${errorName}(${paramTypes})`;
      const hash = keccak256(Buffer.from(signature, "utf8"));
      const selector = hash.slice(0, 10); // First 4 bytes (8 hex chars + 0x)

      errors.push({
        name: errorName,
        signature,
        selector,
        file: path.relative(process.cwd(), filePath),
        line: i + 1,
      });
    }
  }

  return errors;
}

/**
 * Main function to scan all contracts and find error selectors
 */
async function findAllErrorSelectors(targetSelector?: string) {
  console.log("🔍 Scanning Solidity files for custom errors...\n");

  const contractsDir = path.join(process.cwd(), "contracts");
  const solidityFiles = findSolidityFiles(contractsDir);

  console.log(`Found ${solidityFiles.length} Solidity files\n`);

  const allErrors: CustomError[] = [];
  let foundTarget = false;

  for (const file of solidityFiles) {
    const errors = extractCustomErrors(file);
    allErrors.push(...errors);

    // Check if we found the target selector
    if (targetSelector) {
      const match = errors.find((error) => error.selector.toLowerCase() === targetSelector.toLowerCase());
      if (match) {
        console.log(`🎯 FOUND TARGET ERROR: ${targetSelector}`);
        console.log(`   Error: ${match.name}`);
        console.log(`   Signature: ${match.signature}`);
        console.log(`   File: ${match.file}:${match.line}`);
        console.log(`   Selector: ${match.selector}\n`);
        foundTarget = true;
      }
    }
  }

  // Sort errors by selector for easy lookup
  allErrors.sort((a, b) => a.selector.localeCompare(b.selector));

  console.log(`📊 Found ${allErrors.length} custom errors total\n`);

  if (targetSelector && !foundTarget) {
    console.log(`❌ Target selector ${targetSelector} not found in custom errors`);
    console.log(`💡 This might be a built-in error or from an imported contract\n`);
  }

  // Group errors by file for better organization
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

  // Generate a quick lookup table
  console.log("🔗 Quick Selector Lookup:");
  console.log("=========================\n");

  for (const error of allErrors) {
    console.log(`${error.selector} → ${error.name} (${error.file}:${error.line})`);
  }

  // Save detailed results (existing behaviour)
  const detailedOutputFile = "error-selectors.json";
  writeFileSync(detailedOutputFile, JSON.stringify(allErrors, null, 2));
  console.log(`\n💾 Detailed results saved to ${detailedOutputFile}`);

  // Save deduplicated selector → name map for use in new-common
  const selectorMap: Record<string, string> = {};
  for (const error of allErrors) {
    if (!selectorMap[error.selector]) {
      selectorMap[error.selector] = error.name;
    }
  }
  const mapOutputFile = path.resolve(
    path.dirname(new URL(import.meta.url).pathname),
    "../../new-common/src/data/error-selector-map.json",
  );
  writeFileSync(mapOutputFile, JSON.stringify(selectorMap, null, 2));
  console.log(`💾 Selector map saved to ${mapOutputFile}`);

  return allErrors;
}

// CLI interface
const targetSelector = process.argv[2];

if (targetSelector) {
  console.log(`🎯 Looking for specific error selector: ${targetSelector}\n`);
}

findAllErrorSelectors(targetSelector)
  .then(() => {
    console.log("\n✅ Scan complete!");
  })
  .catch((error) => {
    console.error("❌ Error during scan:", error);
    process.exit(1);
  });
