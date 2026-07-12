// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// readable-stream@2 (via the crypto -> crypto-browserify alias) reads
// `process` at module-evaluation time, so this must be the first import
// in main.tsx.
import process from 'process';

globalThis.process ??= process;
