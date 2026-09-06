// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

const isAvailableAsync = jest.fn(async () => true);
const requestReview = jest.fn(async () => undefined);
const hasAction = jest.fn(async () => false);
const storeUrl = jest.fn(() => null);

module.exports = { isAvailableAsync, requestReview, hasAction, storeUrl };
