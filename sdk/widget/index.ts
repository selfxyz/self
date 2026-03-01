import type { ModalOptions, ModalResult } from './src/modal.js';
import { openModal } from './src/modal.js';
import { SelfVerifyElement } from './src/self-verify-element.js';
import type { PresetConfig, PresetName } from './src/utils/presets.js';
import { PRESETS, resolvePreset } from './src/utils/presets.js';
import type { VerificationStepValue } from './src/utils/websocket.js';
import { VerificationStep } from './src/utils/websocket.js';
import type { VerifyTokenResult } from './src/verify-client.js';
import { verifyToken } from './src/verify-client.js';

export type { ModalOptions, ModalResult, PresetConfig, PresetName, VerificationStepValue, VerifyTokenResult };

export { openModal, PRESETS, resolvePreset, SelfVerifyElement, VerificationStep, verifyToken };

// Register the custom element
if (typeof customElements !== 'undefined' && !customElements.get('self-verify')) {
  customElements.define('self-verify', SelfVerifyElement);
}

// Global API for programmatic modal usage and token verification
export const SelfVerify = {
  open: openModal,
  verifyToken,
  Element: SelfVerifyElement,
  Presets: PRESETS,
  Steps: VerificationStep,
};
