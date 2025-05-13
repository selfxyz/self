import { render } from '@testing-library/react-native';
import React from 'react';

import PassportCameraTrouble from '../../../../src/screens/passport/PassportCameraTroubleScreen';
import PassportNFCTrouble from '../../../../src/screens/passport/PassportNFCTroubleScreen';
import {
  clearAnalyticsMocks,
  wasEventTrackedWithProps,
} from '../../../__setup__/mockAnalytics';

// Mock the navigation hook
jest.mock('../../../../src/hooks/useHapticNavigation', () => {
  return jest.fn().mockImplementation(() => jest.fn());
});

describe('Passport Trouble Screens', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    clearAnalyticsMocks();
  });

  describe('PassportCameraTroubleScreen', () => {
    it('should track camera troubleshooting view event on mount', () => {
      // Render the component
      render(<PassportCameraTrouble />);

      // Verify event was tracked with correct properties
      expect(
        wasEventTrackedWithProps('Passport Troubleshooting Viewed', {
          trouble_type: 'camera',
          flow_stage: 'camera_scanning',
        }),
      ).toBe(true);
    });
  });

  describe('PassportNFCTroubleScreen', () => {
    it('should track NFC troubleshooting view event on mount', () => {
      // Render the component
      render(<PassportNFCTrouble />);

      // Verify event was tracked with correct properties
      expect(
        wasEventTrackedWithProps('Passport Troubleshooting Viewed', {
          trouble_type: 'nfc',
          flow_stage: 'nfc_scanning',
        }),
      ).toBe(true);
    });
  });
});
