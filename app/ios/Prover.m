//
//  Prover.m
//  ProofOfPassport
//
//  Created by Florent on 13/01/2024.
//

#import <Foundation/Foundation.h>
#import "React/RCTBridgeModule.h"

@interface RCT_EXTERN_MODULE(Prover, NSObject)

RCT_EXTERN_METHOD(downloadZkey:(NSString *)urlString
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
                  
RCT_EXTERN_METHOD(runProveAction:(NSDictionary *)inputs
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

+ (BOOL) requiresMainQueueSetup {
    return YES;
}

@end