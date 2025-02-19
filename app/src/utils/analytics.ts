import { createSegmentClient } from '../Segment';

const segmentClient = createSegmentClient();

function cleanParams(properties: Record<string, any>) {
  const newParams = {};
  if (!properties.params) {
    return newParams;
  }
  for (const key of Object.keys(properties.params)) {
    if (typeof properties.params[key] !== 'function') {
      (newParams as Record<string, any>)[key] = properties.params[key];
    }
  }
  return newParams;
}

/*
  Recoreds analytics events and screen views
 */
const analytics = () => {
  function _track(
    type: 'event' | 'screen',
    eventName: string,
    properties?: Record<string, any>,
  ) {
    if (!segmentClient) {
      return;
    }
    const trackMethod =
      type === 'screen' ? segmentClient.screen : segmentClient.track;

    if (!properties) {
      return trackMethod(eventName);
    }

    if (properties.params) {
      const newParams = cleanParams(properties.params);
      properties.params = newParams;
    }
    trackMethod(eventName, properties);
  }

  return {
    trackEvent: (eventName: string, properties?: Record<string, any>) => {
      _track('event', eventName, properties);
    },
    trackScreenView: (screenName: string, properties?: Record<string, any>) => {
      _track('screen', screenName, properties);
    },
  };
};

export default analytics;
