import path from 'path';

// Environment-gated recompile flag for wasm_tester
export const RECOMPILE = process.env.CIRCOM_RECOMPILE === '1';

/**
 * Helper function to create wasm_tester options with consistent recompile behavior
 * @param outputPath - The output path for the circuit build
 * @returns wasm_tester options object
 */
export function wasmOptions(outputPath: string) {
  return {
    output: outputPath,
    recompile: RECOMPILE
  };
}

/**
 * Helper function to create wasm_tester options with include paths
 * @param outputPath - The output path for the circuit build
 * @param includePaths - Additional include paths for the circuit
 * @returns wasm_tester options object
 */
export function wasmOptionsWithInclude(outputPath: string, includePaths: string[] = []) {
  return {
    include: includePaths,
    output: outputPath,
    recompile: RECOMPILE
  };
}
