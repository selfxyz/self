// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

//
//  PassportReader.m
//  OpenPassport
//
//  Created by Y E on 27/07/2023.
//

#import <Foundation/Foundation.h>
#import "React/RCTBridgeModule.h"

@interface RCT_EXTERN_MODULE(PassportReader, NSObject)

RCT_EXTERN_METHOD(configure:(NSString *)token
                  enableDebugLogs:(BOOL)enableDebugLogs)

RCT_EXTERN_METHOD(trackEvent:(NSString *)name
                  properties:(NSDictionary *)properties)

RCT_EXTERN_METHOD(flush)

RCT_EXTERN_METHOD(scanPassport:(NSString *)passportNumber
                  dateOfBirth:(NSString *)dateOfBirth
                  dateOfExpiry:(NSString *)dateOfExpiry
                  canNumber:(NSString *)canNumber
                  useCan:(NSNumber * _Nonnull)useCan
                  skipPACE:(NSNumber * _Nonnull)skipPACE
                  skipCA:(NSNumber * _Nonnull)skipCA
                  extendedMode:(NSNumber * _Nonnull)extendedMode
                  usePacePolling:(NSNumber * _Nonnull)usePacePolling
                  sessionId:(NSString *)sessionId
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

@end
