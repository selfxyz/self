// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import type { Config } from '../types/public';

export const defaultConfig: Required<Config> = {
  endpoints: { api: '', teeWs: '', artifactsCdn: '' },
  timeouts: { httpMs: 30000, wsMs: 60000, scanMs: 60000, proofMs: 120000 },
  features: {},
  tlsPinning: { enabled: false },
};
