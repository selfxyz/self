//
//  SceneDelegate.h
//  OpenPassport App Clip
//
//  Created by turboblitz on 17/08/2024.
//

#import <UIKit/UIKit.h>

@interface SceneDelegate : UIResponder <UIWindowSceneDelegate>

@property (strong, nonatomic) UIWindow * window;
@property (strong, readwrite) NSString * initialLinkUrl;

@end
