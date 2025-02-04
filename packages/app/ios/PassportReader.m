//
//  PassportReader.m
//  OpenPassport
//
//  Created by Y E on 27/07/2023.
//

#import <Foundation/Foundation.h>
#import "React/RCTBridgeModule.h"

@interface RCT_EXTERN_MODULE(PassportReader, NSObject)

RCT_EXTERN_METHOD(scanPassport:(NSString *)passportNumber
                  dateOfBirth:(NSString *)dateOfBirth
                  dateOfExpiry:(NSString *)dateOfExpiry
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

@end
