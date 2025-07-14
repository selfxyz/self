// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

//
//  QRCodeScannerViewManager.m
//  OpenPassport
//
//  Created by Rémi Colin on 07/02/2025.
//

#import <Foundation/Foundation.h>
#import <React/RCTViewManager.h>

@interface RCT_EXTERN_MODULE(QRCodeScannerViewManager, RCTViewManager)
RCT_EXPORT_VIEW_PROPERTY(onQRData, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(isMounted, BOOL)
@end
