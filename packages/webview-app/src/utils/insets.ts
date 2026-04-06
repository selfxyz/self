import { createSafeAreaProps } from '@selfxyz/euclid';

/**
 * Safe area props for the WebView context.
 * In a native shell, these would come from the OS safe area APIs.
 * For browser preview, we use small fixed values for visual padding.
 */
export const WEB_SAFE_AREA = createSafeAreaProps({ top: 0, bottom: 16 });
