import * as Segment from '@segment/analytics-react-native';

// Access the mock implementation of Segment client
export const getSegmentMock = () => {
  const createClientMock = Segment.createClient as jest.Mock;
  return (
    createClientMock.mock.results[0]?.value || {
      track: jest.fn(),
      screen: jest.fn(),
    }
  );
};

// Clear all mocks between tests
export const clearAnalyticsMocks = () => {
  const segmentMock = getSegmentMock();
  segmentMock.track.mockClear();
  segmentMock.screen.mockClear();
};

// Helper function to find a tracked event by name in all tracked calls
export const findTrackedEvent = (eventName: string) => {
  const segmentMock = getSegmentMock();
  return segmentMock.track.mock.calls.find(call => call[0] === eventName);
};

// Helper function to find a screen view by name in all tracked calls
export const findScreenView = (screenName: string) => {
  const segmentMock = getSegmentMock();
  return segmentMock.screen.mock.calls.find(call => call[0] === screenName);
};

// Check if an event was tracked with specific properties
export const wasEventTrackedWithProps = (
  eventName: string,
  expectedProps?: Record<string, any>,
) => {
  const trackedEvent = findTrackedEvent(eventName);

  if (!trackedEvent) {
    return false;
  }

  if (!expectedProps) {
    return true;
  }

  const eventProps = trackedEvent[1] || {};

  // Check if all expected properties exist with expected values
  return Object.entries(expectedProps).every(
    ([key, value]) => eventProps[key] === value,
  );
};

// Get all tracked events (names only)
export const getAllTrackedEventNames = () => {
  const segmentMock = getSegmentMock();
  return segmentMock.track.mock.calls.map(call => call[0]);
};

// Get all tracked screen views (names only)
export const getAllTrackedScreenNames = () => {
  const segmentMock = getSegmentMock();
  return segmentMock.screen.mock.calls.map(call => call[0]);
};
