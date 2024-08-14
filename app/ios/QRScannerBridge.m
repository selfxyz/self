//
//  QRScannerBridge.m
//  OpenPassport
//
//  Created by Rémi Colin on 23/07/2024.
//

#import <Foundation/Foundation.h>
#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(QRScannerBridge, NSObject)

RCT_EXTERN_METHOD(scanQRCode:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)

@end
