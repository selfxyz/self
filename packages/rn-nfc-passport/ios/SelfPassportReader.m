// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

#import <React/RCTBridgeModule.h>

// Registered only when the SelfSdkNfc xcframework is vendored — SELF_NFC_AVAILABLE is defined by
// the podspec only then. Without it the module is not registered, so
// NativeModules.SelfPassportReader is absent and the JS capability reports NFC unavailable rather
// than advertising a reader whose every scan rejects.
#if SELF_NFC_AVAILABLE
@interface RCT_EXTERN_MODULE(SelfPassportReader, NSObject)

RCT_EXTERN_METHOD(scanPassport:(NSString *)passportNumber
                  dateOfBirth:(NSString *)dateOfBirth
                  dateOfExpiry:(NSString *)dateOfExpiry
                  canNumber:(NSString *)canNumber
                  useCan:(BOOL)useCan
                  skipPACE:(BOOL)skipPACE
                  skipCA:(BOOL)skipCA
                  extendedMode:(BOOL)extendedMode
                  usePacePolling:(BOOL)usePacePolling
                  sessionId:(NSString *)sessionId
                  resolver:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)

RCT_EXTERN_METHOD(cancelScan:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)

@end
#endif
