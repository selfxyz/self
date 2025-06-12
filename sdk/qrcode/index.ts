import SelfQRcodeWrapper, {
  SelfQRcode,
  SelfApp,
  SelfAppBuilder,
} from './components/SelfQRcode.js';
import { WebAppInfo } from './utils/websocket.js';
import { countries } from '@selfxyz/common/constants/countries';

export default SelfQRcodeWrapper;
export { SelfQRcodeWrapper, SelfQRcode, SelfApp, SelfAppBuilder, countries };

export type { WebAppInfo };
