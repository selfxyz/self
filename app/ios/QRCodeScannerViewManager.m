// SPDX-License-Identifier: BSL-1.1
// Copyright (c) 2025 Social Connect Labs, Inc.
//
// This file is licensed under the Business Source License 1.1 (BSL-1.1).
//
// Use of this software is governed by the Business Source License included in the LICENSE file.
//
// As of 2029-06-11, this file will be governed by the Apache License, Version 2.0.


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
@end