import { createSegmentClient } from '../Segment';

const segmentClient = createSegmentClient();

function cleanParams(params: Record<string, unknown>): Record<string, unknown> {
  const newParams = {};
  for (const key of Object.keys(params)) {
    if (typeof params[key] !== 'function') {
      (newParams as Record<string, unknown>)[key] = params[key];
    }
  }
  return newParams;
}

type AnalyticsMethods = {
  trackEvent: (
    eventName: string,
    properties?: Record<string, unknown>,
  ) => Promise<void>;
  trackScreenView: (
    screenName: string,
    properties?: Record<string, unknown>,
  ) => Promise<void>;
};

/*
  Recoreds analytics events and screen views
 */
const analytics = (): AnalyticsMethods => {
  function _track(
    type: 'event' | 'screen',
    eventName: string,
    properties?: Record<string, unknown>,
  ): Promise<void> | undefined {
    if (!segmentClient) {
      return;
    }
    const trackMethod = (e: string, p?: Record<string, unknown>) =>
      type === 'screen'
        ? segmentClient.screen(e, p)
        : segmentClient.track(e, p);

    if (!properties) {
      // you may need to remove the catch when debugging
      return trackMethod(eventName).catch(console.info);
    }

    if (Object.keys(properties).length > 0) {
      const newParams = cleanParams(properties);
      properties = newParams;
    }
    // you may need to remove the catch when debugging
    trackMethod(eventName, properties).catch(console.info);
  }

  return {
    trackEvent: async (
      eventName: string,
      properties?: Record<string, unknown>,
    ): Promise<void> => {
      await _track('event', eventName, properties);
    },
    trackScreenView: async (
      screenName: string,
      properties?: Record<string, unknown>,
    ): Promise<void> => {
      await _track('screen', screenName, properties);
    },
  };
};

export default analytics;
