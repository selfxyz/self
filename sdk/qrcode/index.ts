import SelfQRcodeWrapper, {
  SelfQRcode,
  SelfAppBuilder,
} from './components/SelfQRcode.js';
import type { SelfApp } from './components/SelfQRcode.js';
import { WebAppInfo } from './utils/websocket.js';
import { countries } from '@selfxyz/common/constants/countries';

export default SelfQRcodeWrapper;
export { SelfQRcodeWrapper, SelfQRcode, SelfAppBuilder, countries };
export type { SelfApp };

export type { WebAppInfo };
