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