import UIKit
import React

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {

    window = UIWindow(frame: UIScreen.main.bounds)

    let bridge = RCTBridge(
      delegate: self,
      launchOptions: launchOptions
    )

    let rootView = RCTRootView(
      bridge: bridge,
      moduleName: "SelfDemoApp",
      initialProperties: nil
    )

    let rootViewController = UIViewController()
    rootViewController.view = rootView

    window?.rootViewController = rootViewController
    window?.makeKeyAndVisible()

    return true
  }
}

extension AppDelegate: RCTBridgeDelegate {
  func sourceURL(for bridge: RCTBridge) -> URL? {
#if DEBUG
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
