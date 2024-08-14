//
//  MRZScannerModule.m
//  OpenPassport
//
//  Created by Rémi Colin on 27/02/2024.
//

#import <Foundation/Foundation.h>
#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(MRZScannerModule, NSObject)

RCT_EXTERN_METHOD(startScanning:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(stopScanning:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)

@end
