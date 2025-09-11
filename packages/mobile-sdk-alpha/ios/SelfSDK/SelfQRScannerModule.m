// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(SelfQRScannerModule, NSObject)

RCT_EXTERN_METHOD(startScanning:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
