// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

#import <Foundation/Foundation.h>
#import "React/RCTBridgeModule.h"

@interface RCT_EXTERN_MODULE(PassportReader, NSObject)

RCT_EXTERN_METHOD(scanPassport:(NSString *)passportNumber
                  dateOfBirth:(NSString *)dateOfBirth
                  dateOfExpiry:(NSString *)dateOfExpiry
                  canNumber:(NSString *)canNumber
                  useCan:(NSNumber * _Nonnull)useCan
                  skipPACE:(NSNumber * _Nonnull)skipPACE
                  skipCA:(NSNumber * _Nonnull)skipCA
                  extendedMode:(NSNumber * _Nonnull)extendedMode
                  usePacePolling:(NSNumber * _Nonnull)usePacePolling
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

@end
