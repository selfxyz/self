import { create } from 'zustand'
import { IsZkeyDownloading, ShowWarningModalProps } from '../utils/zkeyDownload';
import { Steps } from '../utils/utils';
import { useToastController } from '@tamagui/toast';
import { AppType } from '../utils/appType';

interface NavigationState {
  step: number
  isZkeyDownloading: IsZkeyDownloading
  showWarningModal: ShowWarningModalProps
  hideData: boolean
  toast: ReturnType<typeof useToastController> | null
  selectedTab: string
  selectedApp: AppType | null
  setToast: (toast: ReturnType<typeof useToastController>) => void;
  setStep: (step: number) => void
  update: (patch: any) => void
}

const useNavigationStore = create<NavigationState>((set, get) => ({
  step: Steps.MRZ_SCAN,
  isZkeyDownloading: {
    register_sha256WithRSAEncryption_65537: false,
    disclose: false,
    proof_of_passport: false,
  },
  showWarningModal: {
    show: false,
    circuit: "",
    size: 0,
  },
  hideData: false,

  toast: null,

  selectedTab: "camera",
  selectedApp: null,

  setToast: (toast) => set({ toast }),

  setStep: (step) => set({ step }),

  update: (patch) => {
    set({
      ...get(),
      ...patch,
    });
  },
}))

export default useNavigationStore