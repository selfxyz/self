import analytics from '../../../src/utils/analytics';
import { getSegmentMock } from '../../__setup__/mockAnalytics';

// Get the segmentClient mock
const segmentMock = getSegmentMock();

describe('Analytics Error Handling', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should gracefully handle errors when tracking events', () => {
    // Mock Segment client's track to throw an error
    segmentMock.track.mockImplementationOnce(() => {
      throw new Error('Network error');
    });

    // Get analytics functions
    const { trackEvent } = analytics();

    // This should not throw despite the error in Segment
    expect(() => {
      trackEvent('Test Event', { testProp: 'value' });
    }).not.toThrow();

    // Verify that track was called
    expect(segmentMock.track).toHaveBeenCalledWith('Test Event', {
      testProp: 'value',
    });
  });

  it('should gracefully handle errors when tracking screen views', () => {
    // Mock Segment client's screen to throw an error
    segmentMock.screen.mockImplementationOnce(() => {
      throw new Error('Network error');
    });

    // Get analytics functions
    const { trackScreenView } = analytics();

    // This should not throw despite the error in Segment
    expect(() => {
      trackScreenView('Test Screen', { testProp: 'value' });
    }).not.toThrow();

    // Verify that screen was called
    expect(segmentMock.screen).toHaveBeenCalledWith('Test Screen', {
      testProp: 'value',
    });
  });

  it('should handle null properties when tracking events', () => {
    // Get analytics functions
    const { trackEvent } = analytics();

    // Call with null properties should not throw
    expect(() => {
      trackEvent('Test Event', undefined);
    }).not.toThrow();

    // Verify that track was called without properties
    expect(segmentMock.track).toHaveBeenCalledWith('Test Event');
  });

  it('should handle null properties when tracking screen views', () => {
    // Get analytics functions
    const { trackScreenView } = analytics();

    // Call with null properties should not throw
    expect(() => {
      trackScreenView('Test Screen', undefined);
    }).not.toThrow();

    // Verify that screen was called without properties
    expect(segmentMock.screen).toHaveBeenCalledWith('Test Screen');
  });

  it('should gracefully handle case when Segment client is not initialized', () => {
    // Temporarily mock the segmentClient to be null
    jest.mock('../../../src/Segment', () => ({
      createSegmentClient: jest.fn().mockReturnValue(null),
    }));

    // Re-require analytics to get the version with null client
    jest.resetModules();
    const freshAnalytics = require('../../../src/utils/analytics').default;

    // Get analytics functions
    const { trackEvent, trackScreenView } = freshAnalytics();

    // These should not throw despite null client
    expect(() => {
      trackEvent('Test Event', { testProp: 'value' });
    }).not.toThrow();

    expect(() => {
      trackScreenView('Test Screen', { testProp: 'value' });
    }).not.toThrow();

    // Reset the mock to not affect other tests
    jest.resetModules();
  });

  it('should clean function properties from tracked events', () => {
    // Get analytics functions
    const { trackEvent } = analytics();

    // Properties with a function
    const props = {
      normalProp: 'value',
      funcProp: () => 'result',
    };

    // Track event with these properties
    trackEvent('Test Event', props);

    // Verify that track was called with cleaned properties (no functions)
    expect(segmentMock.track).toHaveBeenCalledWith('Test Event', {
      normalProp: 'value',
    });
  });

  it('should clean function properties from params in tracked events', () => {
    // Get analytics functions
    const { trackEvent } = analytics();

    // Properties with nested params containing a function
    const props = {
      normalProp: 'value',
      params: {
        innerNormal: 123,
        innerFunc: () => 'result',
      },
    };

    // Track event with these properties
    trackEvent('Test Event', props);

    // Verify that track was called with cleaned properties (no functions in params)
    expect(segmentMock.track).toHaveBeenCalledWith('Test Event', {
      normalProp: 'value',
      params: {
        innerNormal: 123,
      },
    });
  });
});
