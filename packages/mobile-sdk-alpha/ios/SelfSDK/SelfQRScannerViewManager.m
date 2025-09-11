// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

#import <React/RCTViewManager.h>

@interface RCT_EXTERN_MODULE(SelfQRScannerViewManager, RCTViewManager)

RCT_EXPORT_VIEW_PROPERTY(onQRData, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onError, RCTDirectEventBlock)

@end
