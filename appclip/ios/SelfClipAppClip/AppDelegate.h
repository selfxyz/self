//
//  AppDelegate.h
//  SelfClip
//
//  Created by Self Builder on 4/29/25.
//

#import <React/RCTBridgeDelegate.h>
#import <UIKit/UIKit.h>

// Work around architecture compatibility issues
#ifdef __arm64__
#define ARM64_ARCHITECTURE
#endif

@interface AppDelegate : UIResponder <UIApplicationDelegate, RCTBridgeDelegate>

// Add window property for backward compatibility with RCTRedBox
@property (nonatomic, strong) UIWindow *window;

@end
