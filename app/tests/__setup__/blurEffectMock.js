// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// react-native-blur-effect peers react-native@^0.66.4 and is consumed via
// @selfxyz/euclid's BlurView. With pnpm's hoisted linker plus two workspace
// RN versions (app 0.77.0, others 0.76.9), pnpm peer-resolves blur-effect
// twice and nests a second react-native install inside it. The nested copy
// bypasses jest's react-native preset mocks and trips
// TurboModuleRegistry.getEnforcing('PlatformConstants'). Mocking the module
// keeps tests off that nested code path; the blur is visual-only and not
// exercised in unit tests.
module.exports = {
  BlurView: 'BlurView',
};
