#import <React/RCTBridgeModule.h>
#import <React/RCTViewManager.h>

@interface RCT_EXTERN_MODULE(PassportOCRViewManager, RCTViewManager)
RCT_EXPORT_VIEW_PROPERTY(onPassportRead, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onError, RCTDirectEventBlock)

@end
