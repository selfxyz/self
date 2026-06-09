// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(SelfCrypto, NSObject)

RCT_EXTERN_METHOD(generateKey:(NSString *)keyRef
                  resolver:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)

RCT_EXTERN_METHOD(getPublicKey:(NSString *)keyRef
                  resolver:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)

RCT_EXTERN_METHOD(sign:(NSString *)keyRef
                  dataBase64:(NSString *)dataBase64
                  resolver:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)

@end
