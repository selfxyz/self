//
//  Prover.m
//  OpenPassport
//
//  Created by Florent on 13/01/2024.
//

#import <Foundation/Foundation.h>
#import "React/RCTBridgeModule.h"

@interface RCT_EXTERN_MODULE(Prover, NSObject)

RCT_EXTERN_METHOD(runProveAction:(NSString *)zkey_path
                  witness_calculator:(NSString *)witness_calculator
                  dat_file_path:(NSString *)dat_file_path
                  inputs:(NSDictionary *)inputs
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
+ (BOOL) requiresMainQueueSetup {
    return YES;
}

@end