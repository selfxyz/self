import { useEffect } from 'react';
import { Platform } from 'react-native';
import { EndpointType } from '../../../../common/src/utils/appType';

import { registerDeviceToken, setupNotifications } from '../../utils/notifications/notificationService';
import { useProvingStore } from '../../utils/proving/provingMachine';

interface NotificationHandlerProps {
  sessionId?: string;
  endpointType?: EndpointType;
}

/**
 * NotificationHandler component
 * This component handles setting up notification listeners and performing device token registration.
 * It should be included high in the component tree where the app needs to handle notifications.
 */
const NotificationHandler: React.FC<NotificationHandlerProps> = ({
  sessionId,
  endpointType = 'https',
}) => {
  const fcmToken = useProvingStore(state => state.fcmToken);
  const storeSessionId = useProvingStore(state => state.uuid);
  const effectiveSessionId = sessionId || storeSessionId;

  useEffect(() => {
    // Set up notification handlers
    const unsubscribe = setupNotifications();

    // Clean up listeners
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  // Register device token when we have both session ID and FCM token
  useEffect(() => {
    if (effectiveSessionId && fcmToken) {
      console.log(
        `Registering device token for session: ${effectiveSessionId.substring(0, 6)}...`,
        `Platform: ${Platform.OS}`,
      );
      registerDeviceToken(effectiveSessionId, endpointType, fcmToken);
    }
  }, [effectiveSessionId, fcmToken, endpointType]);

  // This is a headless component that doesn't render anything
  return null;
};

export default NotificationHandler;
