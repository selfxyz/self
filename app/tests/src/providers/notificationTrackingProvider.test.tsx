// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import type { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import { render, waitFor } from '@testing-library/react-native';

import { navigationRef } from '@/navigation';
import { NotificationTrackingProvider } from '@/providers/notificationTrackingProvider';
import * as analytics from '@/services/analytics';

// Mock Firebase messaging
const mockOnNotificationOpenedApp = jest.fn();
const mockGetInitialNotification = jest.fn();

jest.mock('@react-native-firebase/messaging', () => {
  return jest.fn(() => ({
    onNotificationOpenedApp: mockOnNotificationOpenedApp,
    getInitialNotification: mockGetInitialNotification,
  }));
});

// Mock navigation
jest.mock('@/navigation', () => ({
  navigationRef: {
    isReady: jest.fn(),
    navigate: jest.fn(),
  },
}));

// Mock analytics
jest.mock('@/services/analytics', () => ({
  trackEvent: jest.fn(),
}));

// Mock analytics constants
jest.mock('@selfxyz/mobile-sdk-alpha/constants/analytics', () => ({
  NotificationEvents: {
    BACKGROUND_NOTIFICATION_OPENED: 'BACKGROUND_NOTIFICATION_OPENED',
    COLD_START_NOTIFICATION_OPENED: 'COLD_START_NOTIFICATION_OPENED',
  },
}));

const mockNavigationRef = navigationRef as jest.Mocked<typeof navigationRef>;

describe('NotificationTrackingProvider', () => {
  const mockUserId = '19f21362-856a-4606-88e1-fa306036978f';

  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigationRef.isReady.mockReturnValue(true);
  });

  it('should render children without errors', () => {
    mockGetInitialNotification.mockResolvedValue(null);

    const { getByTestId } = render(
      <NotificationTrackingProvider>
        <mock-text testID="child">Test Child</mock-text>
      </NotificationTrackingProvider>,
    );

    expect(getByTestId('child')).toHaveTextContent('Test Child');
  });

  describe('Background notification (onNotificationOpenedApp)', () => {
    it('should navigate to KYCVerified when notification type is kyc_result and status is approved', async () => {
      let notificationHandler:
        | ((message: FirebaseMessagingTypes.RemoteMessage) => void)
        | null = null;

      mockOnNotificationOpenedApp.mockImplementation(handler => {
        notificationHandler = handler;
        return jest.fn(); // Return unsubscribe function
      });

      mockGetInitialNotification.mockResolvedValue(null);

      render(
        <NotificationTrackingProvider>
          <mock-text testID="child">Test</mock-text>
        </NotificationTrackingProvider>,
      );

      expect(mockOnNotificationOpenedApp).toHaveBeenCalled();

      // Simulate notification tap
      const remoteMessage = {
        messageId: 'test-message-id',
        data: {
          type: 'kyc_result',
          status: 'approved',
          user_id: mockUserId,
        },
      } as FirebaseMessagingTypes.RemoteMessage;

      if (notificationHandler) {
        notificationHandler(remoteMessage);
      }

      await waitFor(() => {
        expect(analytics.trackEvent).toHaveBeenCalledWith(
          'BACKGROUND_NOTIFICATION_OPENED',
          {
            messageId: 'test-message-id',
            type: 'kyc_result',
            actionId: undefined,
          },
        );

        expect(mockNavigationRef.navigate).toHaveBeenCalledWith('KYCVerified', {
          status: 'approved',
          userId: mockUserId,
        });
      });
    });

    it('should navigate to CountryPicker when status is retry', async () => {
      let notificationHandler:
        | ((message: FirebaseMessagingTypes.RemoteMessage) => void)
        | null = null;

      mockOnNotificationOpenedApp.mockImplementation(handler => {
        notificationHandler = handler;
        return jest.fn();
      });

      mockGetInitialNotification.mockResolvedValue(null);

      render(
        <NotificationTrackingProvider>
          <mock-text testID="child">Test</mock-text>
        </NotificationTrackingProvider>,
      );

      const remoteMessage = {
        messageId: 'test-message-id',
        data: {
          type: 'kyc_result',
          status: 'retry',
          user_id: mockUserId,
        },
      } as FirebaseMessagingTypes.RemoteMessage;

      if (notificationHandler) {
        notificationHandler(remoteMessage);
      }

      await waitFor(() => {
        expect(analytics.trackEvent).toHaveBeenCalled();
      });

      expect(mockNavigationRef.navigate).toHaveBeenCalledWith('CountryPicker');
    });

    it('should navigate to KycFailure when status is rejected', async () => {
      let notificationHandler:
        | ((message: FirebaseMessagingTypes.RemoteMessage) => void)
        | null = null;

      mockOnNotificationOpenedApp.mockImplementation(handler => {
        notificationHandler = handler;
        return jest.fn();
      });

      mockGetInitialNotification.mockResolvedValue(null);

      render(
        <NotificationTrackingProvider>
          <mock-text testID="child">Test</mock-text>
        </NotificationTrackingProvider>,
      );

      const remoteMessage = {
        messageId: 'test-message-id',
        data: {
          type: 'kyc_result',
          status: 'rejected',
          user_id: mockUserId,
        },
      } as FirebaseMessagingTypes.RemoteMessage;

      if (notificationHandler) {
        notificationHandler(remoteMessage);
      }

      await waitFor(() => {
        expect(analytics.trackEvent).toHaveBeenCalled();
      });

      expect(mockNavigationRef.navigate).toHaveBeenCalledWith('KycFailure', {
        canRetry: false,
      });
    });

    it('should handle missing notification data gracefully', async () => {
      let notificationHandler:
        | ((message: FirebaseMessagingTypes.RemoteMessage) => void)
        | null = null;

      mockOnNotificationOpenedApp.mockImplementation(handler => {
        notificationHandler = handler;
        return jest.fn();
      });

      mockGetInitialNotification.mockResolvedValue(null);

      render(
        <NotificationTrackingProvider>
          <mock-text testID="child">Test</mock-text>
        </NotificationTrackingProvider>,
      );

      const remoteMessage = {
        messageId: 'test-message-id',
        data: undefined,
      } as FirebaseMessagingTypes.RemoteMessage;

      if (notificationHandler) {
        notificationHandler(remoteMessage);
      }

      await waitFor(() => {
        expect(analytics.trackEvent).toHaveBeenCalled();
      });

      // Should not navigate when data is missing
      expect(mockNavigationRef.navigate).not.toHaveBeenCalled();
    });

    it('should not navigate when navigation is not ready', async () => {
      mockNavigationRef.isReady.mockReturnValue(false);

      let notificationHandler:
        | ((message: FirebaseMessagingTypes.RemoteMessage) => void)
        | null = null;

      mockOnNotificationOpenedApp.mockImplementation(handler => {
        notificationHandler = handler;
        return jest.fn();
      });

      mockGetInitialNotification.mockResolvedValue(null);

      render(
        <NotificationTrackingProvider>
          <mock-text testID="child">Test</mock-text>
        </NotificationTrackingProvider>,
      );

      const remoteMessage = {
        messageId: 'test-message-id',
        data: {
          type: 'kyc_result',
          status: 'approved',
          user_id: mockUserId,
        },
      } as FirebaseMessagingTypes.RemoteMessage;

      if (notificationHandler) {
        notificationHandler(remoteMessage);
      }

      await waitFor(() => {
        expect(analytics.trackEvent).toHaveBeenCalled();
      });

      // Should not navigate when navigationRef is not ready
      expect(mockNavigationRef.navigate).not.toHaveBeenCalled();
    });
  });

  describe('Cold start notification (getInitialNotification)', () => {
    it('should navigate to KYCVerified when notification type is kyc_result and status is approved', async () => {
      mockOnNotificationOpenedApp.mockReturnValue(jest.fn());

      const remoteMessage = {
        messageId: 'test-message-id',
        data: {
          type: 'kyc_result',
          status: 'approved',
          user_id: mockUserId,
        },
      } as FirebaseMessagingTypes.RemoteMessage;

      mockGetInitialNotification.mockResolvedValue(remoteMessage);

      render(
        <NotificationTrackingProvider>
          <mock-text testID="child">Test</mock-text>
        </NotificationTrackingProvider>,
      );

      await waitFor(() => {
        expect(analytics.trackEvent).toHaveBeenCalledWith(
          'COLD_START_NOTIFICATION_OPENED',
          {
            messageId: 'test-message-id',
            type: 'kyc_result',
            actionId: undefined,
          },
        );

        expect(mockNavigationRef.navigate).toHaveBeenCalledWith('KYCVerified', {
          status: 'approved',
          userId: mockUserId,
        });
      });
    });

    it('should not navigate when getInitialNotification returns null', async () => {
      mockOnNotificationOpenedApp.mockReturnValue(jest.fn());
      mockGetInitialNotification.mockResolvedValue(null);

      render(
        <NotificationTrackingProvider>
          <mock-text testID="child">Test</mock-text>
        </NotificationTrackingProvider>,
      );

      await waitFor(() => {
        expect(mockGetInitialNotification).toHaveBeenCalled();
      });

      // Should not track or navigate when there's no initial notification
      expect(analytics.trackEvent).not.toHaveBeenCalledWith(
        'COLD_START_NOTIFICATION_OPENED',
        expect.anything(),
      );
      expect(mockNavigationRef.navigate).not.toHaveBeenCalled();
    });

    it('should navigate to CountryPicker when status is retry on cold start', async () => {
      mockOnNotificationOpenedApp.mockReturnValue(jest.fn());

      const remoteMessage = {
        messageId: 'test-message-id',
        data: {
          type: 'kyc_result',
          status: 'retry',
          user_id: mockUserId,
        },
      } as FirebaseMessagingTypes.RemoteMessage;

      mockGetInitialNotification.mockResolvedValue(remoteMessage);

      render(
        <NotificationTrackingProvider>
          <mock-text testID="child">Test</mock-text>
        </NotificationTrackingProvider>,
      );

      await waitFor(() => {
        expect(analytics.trackEvent).toHaveBeenCalledWith(
          'COLD_START_NOTIFICATION_OPENED',
          expect.anything(),
        );
      });

      expect(mockNavigationRef.navigate).toHaveBeenCalledWith('CountryPicker');
    });

    it('should queue navigation when navigationRef is not ready on cold start', async () => {
      // Start with navigation not ready
      mockNavigationRef.isReady.mockReturnValue(false);
      mockOnNotificationOpenedApp.mockReturnValue(jest.fn());

      const remoteMessage = {
        messageId: 'test-message-id',
        data: {
          type: 'kyc_result',
          status: 'approved',
          user_id: mockUserId,
        },
      } as FirebaseMessagingTypes.RemoteMessage;

      mockGetInitialNotification.mockResolvedValue(remoteMessage);

      render(
        <NotificationTrackingProvider>
          <mock-text testID="child">Test</mock-text>
        </NotificationTrackingProvider>,
      );

      // Wait for initial notification to be processed
      await waitFor(() => {
        expect(analytics.trackEvent).toHaveBeenCalledWith(
          'COLD_START_NOTIFICATION_OPENED',
          expect.anything(),
        );
      });

      // Navigation should not have been called yet
      expect(mockNavigationRef.navigate).not.toHaveBeenCalled();

      // Simulate navigation becoming ready
      mockNavigationRef.isReady.mockReturnValue(true);

      // Wait for the polling interval to detect navigation is ready
      await waitFor(
        () => {
          expect(mockNavigationRef.navigate).toHaveBeenCalledWith(
            'KYCVerified',
            {
              status: 'approved',
              userId: mockUserId,
            },
          );
        },
        { timeout: 2000 },
      );
    });

    it('should process pending navigation immediately if navigation becomes ready', async () => {
      // Start with navigation not ready
      mockNavigationRef.isReady.mockReturnValue(false);
      mockOnNotificationOpenedApp.mockReturnValue(jest.fn());

      const remoteMessage = {
        messageId: 'test-message-id',
        data: {
          type: 'kyc_result',
          status: 'approved',
          user_id: mockUserId,
        },
      } as FirebaseMessagingTypes.RemoteMessage;

      mockGetInitialNotification.mockResolvedValue(remoteMessage);

      const { rerender } = render(
        <NotificationTrackingProvider>
          <mock-text testID="child">Test</mock-text>
        </NotificationTrackingProvider>,
      );

      // Wait for initial notification to be processed
      await waitFor(() => {
        expect(analytics.trackEvent).toHaveBeenCalledWith(
          'COLD_START_NOTIFICATION_OPENED',
          expect.anything(),
        );
      });

      // Navigation should not have been called yet
      expect(mockNavigationRef.navigate).not.toHaveBeenCalled();

      // Make navigation ready
      mockNavigationRef.isReady.mockReturnValue(true);

      // Trigger a re-render to simulate React's update cycle
      rerender(
        <NotificationTrackingProvider>
          <mock-text testID="child">Test</mock-text>
        </NotificationTrackingProvider>,
      );

      // Navigation should be called after navigation becomes ready
      await waitFor(
        () => {
          expect(mockNavigationRef.navigate).toHaveBeenCalledWith(
            'KYCVerified',
            {
              status: 'approved',
              userId: mockUserId,
            },
          );
        },
        { timeout: 2000 },
      );
    });

    it('should not queue navigation for non-KYC notifications when navigation is not ready', async () => {
      mockNavigationRef.isReady.mockReturnValue(false);
      mockOnNotificationOpenedApp.mockReturnValue(jest.fn());

      const remoteMessage = {
        messageId: 'test-message-id',
        data: {
          type: 'other_notification',
          status: 'some_status',
        },
      } as FirebaseMessagingTypes.RemoteMessage;

      mockGetInitialNotification.mockResolvedValue(remoteMessage);

      render(
        <NotificationTrackingProvider>
          <mock-text testID="child">Test</mock-text>
        </NotificationTrackingProvider>,
      );

      await waitFor(() => {
        expect(analytics.trackEvent).toHaveBeenCalledWith(
          'COLD_START_NOTIFICATION_OPENED',
          expect.anything(),
        );
      });

      // Make navigation ready
      mockNavigationRef.isReady.mockReturnValue(true);

      // Wait a bit to ensure no navigation happens
      await new Promise(resolve => setTimeout(resolve, 300));

      // Should not navigate for non-KYC notifications
      expect(mockNavigationRef.navigate).not.toHaveBeenCalled();
    });
  });
});
