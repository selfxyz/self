import { JsonMap } from '@segment/analytics-react-native';

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
  trackEvent: (eventName: string, properties?: Record<string, unknown>) => void;
  trackScreenView: (
    screenName: string,
    properties?: Record<string, unknown>,
  ) => void;
};

/*
  Recoreds analytics events and screen views
 */
const analytics = (): AnalyticsMethods => {
  function _track(
    type: 'event' | 'screen',
    eventName: string,
    properties?: Record<string, unknown>,
  ): void {
    if (!segmentClient) {
      return;
    }
    const trackMethod = (
      e: string,
      p?: Record<string, unknown>,
    ): Promise<void> =>
      type === 'screen'
        ? segmentClient.screen(e, p as JsonMap)
        : segmentClient.track(e, p as JsonMap);

    if (!properties) {
      // you may need to remove the catch when debugging
      trackMethod(eventName).catch(console.info);
    } else if (Object.keys(properties).length > 0) {
      const newParams = cleanParams(properties);
      properties = newParams;
    }
    // you may need to remove the catch when debugging
    trackMethod(eventName, properties).catch(console.info);
  }

  return {
    trackEvent: (
      eventName: string,
      properties?: Record<string, unknown>,
    ): void => {
      _track('event', eventName, properties);
    },
    trackScreenView: (
      screenName: string,
      properties?: Record<string, unknown>,
    ): void => {
      _track('screen', screenName, properties);
    },
  };
};

export default analytics;
