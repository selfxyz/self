//  SPDX-License-Identifier: BUSL-1.1
//  Copyright (c) 2025 Social Connect Labs, Inc.
//
//  This file is licensed under the Business Source License 1.1 (BUSL-1.1).
//
//  Use of this software is governed by the Business Source License included in the LICENSE file.
//
//  As of 2029-06-11, this file will be governed by the Apache License, Version 2.0.

import '@ethersproject/shims';

import { SEGMENT_KEY } from '@env';
import {
  BackgroundFlushPolicy,
  createClient,
  EventPlugin,
  PluginType,
  SegmentEvent,
  StartupFlushPolicy,
} from '@segment/analytics-react-native';

let segmentClient: ReturnType<typeof createClient> | null = null;

class DisableTrackingPlugin extends EventPlugin {
  type = PluginType.before;

  execute(event: SegmentEvent): SegmentEvent {
    // Ensure context exists
    if (!event.context) {
      event.context = {};
    }

    // Ensure device context exists
    if (!event.context.device) {
      event.context.device = {};
    }

    // Force tracking related fields to be disabled
    event.context.device.adTrackingEnabled = false;
    event.context.device.advertisingId = undefined;
    event.context.device.trackingStatus = 'not-authorized';
    event.context.device.id = undefined;

    return event;
  }
}

export const createSegmentClient = () => {
  if (!SEGMENT_KEY) {
    return null;
  }

  if (segmentClient) {
    return segmentClient;
  }

  const flushPolicies = [new StartupFlushPolicy(), new BackgroundFlushPolicy()];

  const client = createClient({
    writeKey: SEGMENT_KEY,
    trackAppLifecycleEvents: true,
    trackDeepLinks: true,
    debug: __DEV__,
    collectDeviceId: false,
    defaultSettings: {
      integrations: {
        'Segment.io': {
          apiKey: SEGMENT_KEY,
        },
      },
    },
    flushPolicies,
  });

  client.add({ plugin: new DisableTrackingPlugin() });
  segmentClient = client;

  return client;
};
