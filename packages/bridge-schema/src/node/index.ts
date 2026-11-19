// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

export {
  type GenerateCliOptions,
  type GeneratedFile,
  type GenerationOptions,
  type GenerationReport,
  type GenerationTarget,
  generate,
  runGenerateCli,
} from './generate';
export { loadFixtures } from './loadFixtures';
export { loadSchemas } from './loadSchemas';
export { createFixtureTargets, FIXTURE_OUTPUT_DIRS } from './native/fixtures';
export { emitKotlin, type KotlinOptions } from './native/kotlin';
export {
  buildContractModel,
  type ContractModel,
  type ContractPlan,
  type TypePlan,
  type TypeRef,
} from './native/model';
export { CONTRACT_PLAN } from './native/plan';
export { emitSwift, type SwiftOptions } from './native/swift';
export {
  createNativeTargets,
  NATIVE_OUTPUT_DIRS,
  type NativeTargetOptions,
} from './native/targets';
export type { NativeConstants } from './native/text';
