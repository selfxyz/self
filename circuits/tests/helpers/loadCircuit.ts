import fs from 'fs';
import { wasm as wasmTester } from 'circom_tester';

export async function loadCircuit(compiledDir: string, sourcePath: string, options?: any) {
  if (fs.existsSync(compiledDir)) {
    return wasmTester(compiledDir);
  }
  return wasmTester(sourcePath, options);
}
