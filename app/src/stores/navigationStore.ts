import { useToastController } from '@tamagui/toast';
import { create } from 'zustand';

import { segmentClient } from '../../App';
import {
  IsZkeyDownloading,
  ShowWarningModalProps,
} from '../utils/zkeyDownload';

interface NavigationState {
  isZkeyDownloading: IsZkeyDownloading;
  showWarningModal: ShowWarningModalProps;
  hideData: boolean;
  toast: ReturnType<typeof useToastController>;
  selectedTab: string;
  setSelectedTab: (tab: string) => void;
  showRegistrationErrorSheet: boolean;
  registrationErrorMessage: string;
  setToast: (toast: ReturnType<typeof useToastController>) => void;
  update: (patch: any) => void;
  nfcSheetIsOpen: boolean;
  setNfcSheetIsOpen: (isOpen: boolean) => void;
  zkeyDownloadedPercentage: number;
  setZkeyDownloadedPercentage: (percentage: number) => void;
  trackEvent: (eventName: string, properties?: Record<string, any>) => void;
  trackNavigation: (tab: string) => void;
}

const useNavigationStore = create<NavigationState>((set, get) => ({
  zkeyDownloadedPercentage: 0,
  setZkeyDownloadedPercentage: (percentage: number) =>
    set({ zkeyDownloadedPercentage: percentage }),
  isZkeyDownloading: {
    prove_rsa_65537_sha1: false,
    prove_rsa_65537_sha256: false,
    prove_rsapss_65537_sha256: false,
    vc_and_disclose: false,
  },
  showWarningModal: {
    show: false,
    circuit: '',
    size: 0,
  },
  hideData: false,

  showRegistrationErrorSheet: false,
  registrationErrorMessage: '',

  toast: null as unknown as ReturnType<typeof useToastController>,

  selectedTab: 'scan',

  setToast: toast => set({ toast }),

  setSelectedTab: (tab: string) => {
    const { trackNavigation } = get();
    trackNavigation(tab);
  },

  update: patch => {
    set({
      ...get(),
      ...patch,
    });
  },
  nfcSheetIsOpen: false,
  setNfcSheetIsOpen: isOpen => set({ nfcSheetIsOpen: isOpen }),

  trackEvent: (eventName: string, properties?: Record<string, any>) => {
    if (segmentClient) {
      segmentClient.track(eventName, properties);
    }
  },

  trackNavigation: (tab: string) => {
    if (segmentClient) {
      segmentClient.track('Navigation Change', {
        tab,
      });
    }
    set({ selectedTab: tab });
  },
}));

export default useNavigationStore;
