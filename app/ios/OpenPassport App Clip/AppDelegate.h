//
//  AppDelegate.h
//  OpenPassport App Clip
//
//  Created by turboblitz on 17/08/2024.
//

#import <UIKit/UIKit.h>
#import <CoreData/CoreData.h>

@interface AppDelegate : UIResponder <UIApplicationDelegate>

@property (readonly, strong) NSPersistentContainer *persistentContainer;

- (void)saveContext;


@end

