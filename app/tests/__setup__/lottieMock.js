// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';

const LottieViewMock = React.forwardRef(function LottieViewMock(props, ref) {
  return React.createElement('mock-lottie-view', { ...props, ref });
});

export default LottieViewMock;
