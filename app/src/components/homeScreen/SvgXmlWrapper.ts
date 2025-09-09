// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { Platform } from 'react-native';

// Platform-specific dynamic import
if (Platform.OS === 'web') {
  // Web platform - use DOMPurify sanitized version
  const webModule = require('@/components/homeScreen/SvgXmlWrapper.web');
  module.exports = webModule;
} else {
  // Native platforms - use react-native-svg directly
  const nativeModule = require('@/components/homeScreen/SvgXmlWrapper.native');
  module.exports = nativeModule;
}
