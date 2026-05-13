// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

const React = require('react');

const LottieViewMock = React.forwardRef((props, ref) =>
  React.createElement('mock-lottie-view', { ...props, ref }),
);

module.exports = LottieViewMock;
module.exports.default = LottieViewMock;
