//
//  AppDelegate.h
//  OpenPassport App Clip
//
//  Created by turboblitz on 17/08/2024.
//

#import <React/RCTBridgeDelegate.h>
#import <UIKit/UIKit.h>
#import <CoreData/CoreData.h>

@interface AppDelegate : UIResponder <UIApplicationDelegate, RCTBridgeDelegate>

@property (nonatomic, strong) UIWindow *window;

@property (readonly, strong) NSPersistentContainer *persistentContainer;

- (void)saveContext;


@end

