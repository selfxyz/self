import type { ModalOptions, ModalResult } from './src/modal.js';
import { openModal } from './src/modal.js';
import { SelfVerifyElement } from './src/self-verify-element.js';
import type { PresetConfig, PresetName } from './src/utils/presets.js';
import { PRESETS, resolvePreset } from './src/utils/presets.js';
import type { VerificationStepValue } from './src/utils/websocket.js';
import { VerificationStep } from './src/utils/websocket.js';

export type { ModalOptions, ModalResult, PresetConfig, PresetName, VerificationStepValue };

export { openModal, PRESETS, resolvePreset, SelfVerifyElement, VerificationStep };

// Register the custom element
if (typeof customElements !== 'undefined' && !customElements.get('self-verify')) {
  customElements.define('self-verify', SelfVerifyElement);
}

// Global API for programmatic modal usage
export const SelfVerify = {
  open: openModal,
  Element: SelfVerifyElement,
  Presets: PRESETS,
  Steps: VerificationStep,
};
