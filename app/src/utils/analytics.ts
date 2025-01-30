import { segmentClient } from '../../App';

// TODO eventName to enum
export function trackEvent(
  eventName: string,
  properties?: Record<string, any>,
) {
  if (segmentClient) {
    segmentClient.track(eventName, properties);
  }
}
