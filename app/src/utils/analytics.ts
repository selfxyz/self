import { createSegmentClient } from '../Segment';

const segmentClient = createSegmentClient();

function cleanParams(params: Record<string, any>) {
  const newParams = {};
  for (const key of Object.keys(params)) {
    if (typeof params[key] !== 'function') {
      (newParams as Record<string, any>)[key] = params[key];
    }
  }
  return newParams;
}

/*
  Records analytics events and screen views
  In development mode, events are logged to console instead of being sent to Segment
 */
const analytics = () => {
  function _track(
    type: 'event' | 'screen',
    eventName: string,
    properties?: Record<string, any>,
  ) {
    if (__DEV__) {
      console.log(`[DEV: Analytics ${type.toUpperCase()}]`, {
        name: eventName,
        properties: properties ? cleanParams(properties) : undefined,
      });
      return;
    }

    if (!segmentClient) {
      return;
    }
    const trackMethod = (e: string, p?: Record<string, any>) =>
      type === 'screen'
        ? segmentClient.screen(e, p)
        : segmentClient.track(e, p);

    if (!properties) {
      // you may need to remove the catch when debugging
      return trackMethod(eventName).catch(console.info);
    }

    if (properties.params) {
      const newParams = cleanParams(properties.params);
      properties.params = newParams;
    }
    // you may need to remove the catch when debugging
    trackMethod(eventName, properties).catch(console.info);
  }

  return {
    trackEvent: (eventName: string, properties?: Record<string, any>) => {
      _track('event', eventName, properties);
    },
    trackScreenView: (screenName: string, properties?: Record<string, any>) => {
      _track('screen', screenName, properties);
    },
    flush: () => {
      if (!__DEV__ && segmentClient) {
        segmentClient.flush();
      }
    },
  };
};

export default analytics;
