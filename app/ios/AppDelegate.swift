import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import Firebase
import FirebaseCore
import FirebaseMessaging
import UserNotifications
import RCTLinkingManager
import AnalyticsReactNative

@main
class AppDelegate: UIResponder, UIApplicationDelegate, UNUserNotificationCenterDelegate, MessagingDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    
    // Check if app was launched from a notification
    if let notificationOption = launchOptions?[.remoteNotification] as? [String: Any] {
      // Handle initial notification data
      handleNotificationData(notificationOption)
    }

    // Initialize Firebase
    FirebaseApp.configure()

    // Set up notifications
    setupNotifications(application: application)

    // Set up React Native
    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)

    factory.startReactNative(
      withModuleName: "OpenPassport",
      in: window,
      launchOptions: launchOptions
    )
    window?.makeKeyAndVisible()

    return true
  }

  func setupNotifications(application: UIApplication) {
    // Set notification delegate and messaging delegate
    let center = UNUserNotificationCenter.current()
    center.delegate = self
    Messaging.messaging().delegate = self

    // Check current authorization status first
    UNUserNotificationCenter.current().getNotificationSettings { settings in
      switch settings.authorizationStatus {
      case .notDetermined:
        // Request notification permissions
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { granted, error in
          if let error = error {
            print("Error requesting notification permissions: \(error)")
            // Consider analytics or user feedback
          } else if granted {
            DispatchQueue.main.async {
              application.registerForRemoteNotifications()
            }
          }
        }
      case .authorized:
        DispatchQueue.main.async {
          application.registerForRemoteNotifications()
        }
      case .denied, .provisional, .ephemeral:
        print("Notifications not authorized: \(settings.authorizationStatus)")
      @unknown default:
        break
      }
    }
  }

  // MARK: - Push Notification Methods

  func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
    // Convert device token to hex string and log
    let tokenString = deviceToken.map { String(format: "%02X", $0) }.joined()
    print("APNs device token: \(tokenString)")

    // Set APNs token for Firebase Messaging
    Messaging.messaging().apnsToken = deviceToken
  }

  func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
    print("Failed to register for remote notifications: \(error)")
  }

  // MARK: - URL Scheme Handling

  func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
    // Validate URL scheme
    guard let scheme = url.scheme else { return false }

    // Replace with your actual URL schemes
    let validSchemes = ["openpassport", "openpassport-auth"]

    if validSchemes.contains(scheme.lowercased()) {
      // TODO: Parse and handle the URL
      // Consider using a URL router or deep linking library
      return true
    }

    return false
  }

  // MARK: - UNUserNotificationCenterDelegate

  func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification, withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
    // Handle notification when app is in foreground
    completionHandler([.alert, .badge, .sound])
  }

  func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse, withCompletionHandler completionHandler: @escaping () -> Void) {
    // Extract and handle notification data
    let userInfo = response.notification.request.content.userInfo

    // Send to React Native for handling
    NotificationCenter.default.post(
      name: Notification.Name("NotificationTapped"),
      object: nil,
      userInfo: userInfo
    )
    completionHandler()
  }

  // MARK: - MessagingDelegate

  func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
    print("Firebase registration token: \(String(describing: fcmToken))")

    // If needed, send the token to your server
    let dataDict: [String: String] = ["token": fcmToken ?? ""]
    NotificationCenter.default.post(name: Notification.Name("FCMToken"), object: nil, userInfo: dataDict)
  }

  // MARK: - App Lifecycle

  func applicationWillResignActive(_ application: UIApplication) {
    // Sent when the application is about to move from active to inactive state.
  }

  func applicationDidEnterBackground(_ application: UIApplication) {
    // Use this method to release shared resources, save user data, invalidate timers, etc.
  }

  func applicationWillEnterForeground(_ application: UIApplication) {
    // Called as part of the transition from the background to the active state.
  }

  func applicationDidBecomeActive(_ application: UIApplication) {
    // Restart any tasks that were paused (or not yet started) while the application was inactive.
  }

  func applicationWillTerminate(_ application: UIApplication) {
    // Called when the application is about to terminate.
  }

  // MARK: - Deep Link Continuation

  func application(_ application: UIApplication, continueUserActivity userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
    return RCTLinkingManager.application(application, continueUserActivity: userActivity, restorationHandler: restorationHandler)
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
