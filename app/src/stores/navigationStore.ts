import { useToastController } from '@tamagui/toast';
import { create } from 'zustand';

import { segmentClient } from '../../App';

interface NavigationState {
  toast: ReturnType<typeof useToastController>;
  trackEvent: (eventName: string, properties?: Record<string, any>) => void;
}

const useNavigationStore = create<NavigationState>(() => ({
  toast: null as unknown as ReturnType<typeof useToastController>,

  trackEvent: (eventName: string, properties?: Record<string, any>) => {
    if (segmentClient) {
      segmentClient.track(eventName, properties);
    }
  },
}));

export default useNavigationStore;
