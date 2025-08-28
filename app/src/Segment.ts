// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { SEGMENT_KEY } from '@env';
import type { SegmentEvent } from '@segment/analytics-react-native';
import {
  BackgroundFlushPolicy,
  createClient,
  EventPlugin,
  PluginType,
  StartupFlushPolicy,
} from '@segment/analytics-react-native';

import '@ethersproject/shims';

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

  const flushPolicies = [new BackgroundFlushPolicy(), new StartupFlushPolicy()];

  const client = createClient({
    writeKey: SEGMENT_KEY,
    trackAppLifecycleEvents: true,
    trackDeepLinks: true,
    debug: __DEV__,
    collectDeviceId: false,
    flushAt: 20, // Flush every 20 events
    flushInterval: 20000, // Flush every 20 seconds
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
