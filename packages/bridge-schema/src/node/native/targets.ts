// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { createStoragePolicy } from '../../storagePolicy';
import type { GenerationTarget } from '../generate';
import { emitKotlin } from './kotlin';
import { buildContractModel, type ContractPlan } from './model';
import { emitSwift } from './swift';
import type { NativeConstants } from './text';

/** Where the native types go, relative to the repository root. The generator owns each directory. */
export const NATIVE_OUTPUT_DIRS = {
  kotlin:
    'packages/native-sdk-android/src/main/kotlin/xyz/self/sdk/core/bridge/generated',
  swift: 'packages/native-sdk-ios/Sources/SelfSdk/Bridge/Generated',
} as const;

export interface NativeTargetOptions extends NativeConstants {
  readonly plan: ContractPlan;
}

export function createNativeTargets(
  options: NativeTargetOptions,
): GenerationTarget[] {
  // Throws for a table version or a pattern that a reader must not apply.
  createStoragePolicy(options.storagePolicy);

  return [
    {
      name: 'kotlin',
      ownedDirs: [NATIVE_OUTPUT_DIRS.kotlin],
      emit: schemas =>
        emitKotlin(buildContractModel(schemas, options.plan), options, {
          dir: NATIVE_OUTPUT_DIRS.kotlin,
          packageName: 'xyz.self.sdk.core.bridge.generated',
          jsonPackage: 'xyz.self.sdk.core.bridge',
        }),
    },
    {
      name: 'swift',
      ownedDirs: [NATIVE_OUTPUT_DIRS.swift],
      emit: schemas =>
        emitSwift(buildContractModel(schemas, options.plan), options, {
          dir: NATIVE_OUTPUT_DIRS.swift,
        }),
    },
  ];
}
