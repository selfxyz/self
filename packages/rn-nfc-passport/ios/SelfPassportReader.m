// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

#import <React/RCTBridgeModule.h>

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

@end
