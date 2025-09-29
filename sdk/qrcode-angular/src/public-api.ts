/*
 * Public API Surface of @selfxyz/qrcode-angular
 */

// Components
export * from './lib/components/self-qrcode/self-qrcode.component';
export * from './lib/components/led/led.component';

// Services
export * from './lib/services/websocket.service';

// Utils
export * from './lib/utils/utils';
export * from './lib/utils/styles';
export type { WebAppInfo } from './lib/utils/websocket';

// Providers
export { provideSelfLottie } from './lib/providers';

// Re-export types from common
export {
  type SelfAppDisclosureConfig,
  getUniversalLink,
  countryCodes,
  SelfAppBuilder,
  type Country3LetterCode,
  type SelfApp,
} from './lib/common';
