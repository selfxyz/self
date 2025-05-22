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

const flushPolicies = [new StartupFlushPolicy(), new BackgroundFlushPolicy()];

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

  const client = createClient({
    writeKey: SEGMENT_KEY,
    trackAppLifecycleEvents: true,
    trackDeepLinks: true,
    debug: true,
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
