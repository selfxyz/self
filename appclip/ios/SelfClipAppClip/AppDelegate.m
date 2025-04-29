//
//  AppDelegate.m
//  SelfClip
//
//  Created by Justin Hernandez on 4/29/25.
//

#import "AppDelegate.h"

@interface AppDelegate ()

@end

@implementation AppDelegate

// Add getter for the window property that redirects to the main scene's window
- (UIWindow *)window {
    // For pre-iOS 13 compatibility and RCTRedBox error display
    UIScene *scene = [[UIApplication sharedApplication] connectedScenes].allObjects.firstObject;
    if ([scene isKindOfClass:[UIWindowScene class]]) {
        UIWindowScene *windowScene = (UIWindowScene *)scene;
        id<UIWindowSceneDelegate> delegate = windowScene.delegate;
        if ([delegate respondsToSelector:@selector(window)]) {
            return [delegate window];
        }
    }
    return nil;
}

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions {
    // Override point for customization after application launch.
    return YES;
}


#pragma mark - UISceneSession lifecycle


- (UISceneConfiguration *)application:(UIApplication *)application configurationForConnectingSceneSession:(UISceneSession *)connectingSceneSession options:(UISceneConnectionOptions *)options {
    // Called when a new scene session is being created.
    // Use this method to select a configuration to create the new scene with.
    return [[UISceneConfiguration alloc] initWithName:@"Default Configuration" sessionRole:connectingSceneSession.role];
}


- (void)application:(UIApplication *)application didDiscardSceneSessions:(NSSet<UISceneSession *> *)sceneSessions {
    // Called when the user discards a scene session.
    // If any sessions were discarded while the application was not running, this will be called shortly after application:didFinishLaunchingWithOptions.
    // Use this method to release any resources that were specific to the discarded scenes, as they will not return.
}


@end
