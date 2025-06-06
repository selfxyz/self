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

RCT_EXTERN_METHOD(scanPassport:(NSString *)passportNumber
                  dateOfBirth:(NSString *)dateOfBirth
                  dateOfExpiry:(NSString *)dateOfExpiry
                  canNumber:(NSString *)canNumber
                  useCan:(NSNumber * _Nonnull)useCan
                  skipPACE:(NSNumber * _Nonnull)skipPACE
                  skipCA:(NSNumber * _Nonnull)skipCA
                  extendedMode:(NSNumber * _Nonnull)extendedMode
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

@end
