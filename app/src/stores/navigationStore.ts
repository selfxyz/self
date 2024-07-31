import { create } from 'zustand'
import { IsZkeyDownloading, ShowWarningModalProps } from '../utils/zkeyDownload';
import { Steps } from '../utils/utils';
import { useToastController } from '@tamagui/toast';
import { AppType } from '../../../common/src/utils/appType';

interface NavigationState {
  step: number
  isZkeyDownloading: IsZkeyDownloading
  showWarningModal: ShowWarningModalProps
  hideData: boolean
  toast: ReturnType<typeof useToastController>
  selectedTab: string
  setSelectedTab: (tab: string) => void
  selectedApp: AppType | null
  setSelectedApp: (app: AppType | null) => void
  showRegistrationErrorSheet: boolean
  registrationErrorMessage: string
  setToast: (toast: ReturnType<typeof useToastController>) => void;
  setStep: (step: number) => void
  update: (patch: any) => void
  nfcSheetIsOpen: boolean
  setNfcSheetIsOpen: (isOpen: boolean) => void
}

const useNavigationStore = create<NavigationState>((set, get) => ({
  step: Steps.MRZ_SCAN,
  isZkeyDownloading: {
    register_sha256WithRSAEncryption_65537: false,
    disclose: false,
  },
  showWarningModal: {
    show: false,
    circuit: "",
    size: 0,
  },
  hideData: false,

  showRegistrationErrorSheet: false,
  registrationErrorMessage: "",

  toast: null as unknown as ReturnType<typeof useToastController>,

  selectedTab: "scan",
  selectedApp: null,

  setToast: (toast) => set({ toast }),
  setSelectedApp: (app) => set({ selectedApp: app }),

  setStep: (step) => set({ step }),
  setSelectedTab: (tab) => set({ selectedTab: tab }),

  update: (patch) => {
    set({
      ...get(),
      ...patch,
    });
  },
  nfcSheetIsOpen: false,
  setNfcSheetIsOpen: (isOpen) => set({ nfcSheetIsOpen: isOpen }),
}))

export default useNavigationStore