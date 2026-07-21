// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

#import <React/RCTBridgeModule.h>

// Register the module only when the SelfSdkOcr binary is vendored (podspec defines
// SELF_OCR_AVAILABLE). ObjC has no `canImport`, so without this guard the module would register in
// a stub build and JS isAvailable() would report true even though every scan rejects NOT_AVAILABLE.
// The Swift side self-guards via `#if canImport(SelfSdkOcr)`.
#if SELF_OCR_AVAILABLE

@interface RCT_EXTERN_MODULE(SelfMRZScannerModule, NSObject)

RCT_EXTERN_METHOD(startScanning:(NSDictionary *)options
                  resolver:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)

RCT_EXTERN_METHOD(stopScanning:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)

@end

#endif
