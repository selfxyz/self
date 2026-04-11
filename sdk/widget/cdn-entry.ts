/**
 * CDN entry point — exports are assigned directly to the IIFE global name.
 * This avoids double-nesting (window.SelfVerify.SelfVerify) that happens
 * when the main index.ts named exports are wrapped in an IIFE.
 */
export { openModal as open } from './src/modal.js';
export { SelfVerifyElement as Element } from './src/self-verify-element.js';
export { PRESETS as Presets } from './src/utils/presets.js';
export { VerificationStep as Steps } from './src/utils/websocket.js';
export { verifyToken } from './src/verify-client.js';

// Register the custom element
import { SelfVerifyElement } from './src/self-verify-element.js';
if (typeof customElements !== 'undefined' && !customElements.get('self-verify')) {
  customElements.define('self-verify', SelfVerifyElement);
}
