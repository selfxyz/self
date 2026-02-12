// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import UIKit

/// Main entry point for the Self SDK on iOS.
///
/// Usage:
/// ```swift
/// let selfSdk = SelfSdk.configure {
///     $0.appId = "your-app-id"
///     $0.environment = .production
/// }
///
/// selfSdk.launch(
///     from: self,
///     request: .init(scope: "identity", userId: "user-123")
/// ) { result in
///     switch result {
///     case .verified(let verification):
///         print("Verified: \(verification.userId)")
///     case .failed(let error):
///         print("Failed: \(error.message)")
///     case .dismissed:
///         print("User dismissed")
///     }
/// }
/// ```
public class SelfSdk {

    private let config: SelfSdkConfig

    private init(config: SelfSdkConfig) {
        self.config = config
    }

    /// Configure and create a SelfSdk instance.
    public static func configure(_ block: (inout SelfSdkConfig) -> Void) -> SelfSdk {
        var config = SelfSdkConfig()
        block(&config)
        assert(!config.appId.isEmpty, "appId must not be empty")
        return SelfSdk(config: config)
    }

    /// Launch the Self verification flow.
    public func launch(
        from viewController: UIViewController,
        request: SelfVerificationRequest,
        completion: @escaping (SelfSdkResult) -> Void
    ) {
        let sdkVC = SelfSDKViewController()
        sdkVC.devMode = config.devMode
        if let devUrl = config.devServerUrl {
            sdkVC.devServerUrl = devUrl
        }
        sdkVC.modalPresentationStyle = .fullScreen

        // Register native bridge handlers
        sdkVC.registerHandler(SelfNfcBridge(router: NativeMessageRouter { js in
            DispatchQueue.main.async { /* JS eval handled by ViewController */ }
        }))
        sdkVC.registerHandler(BiometricBridge())
        sdkVC.registerHandler(SecureStorageBridge())
        sdkVC.registerHandler(CryptoBridge())

        // Wire result callbacks
        sdkVC.onResult = { result in
            completion(.verified(SelfVerification(
                userId: result.userId,
                verificationId: result.verificationId,
                proof: result.proof,
                claims: result.claims
            )))
        }
        sdkVC.onDismiss = {
            completion(.dismissed)
        }

        viewController.present(sdkVC, animated: true)
    }
}

// MARK: - Configuration

/// SDK configuration.
public struct SelfSdkConfig {
    public var appId: String = ""
    public var environment: SelfSdkEnvironment = .production
    public var theme: SelfSdkTheme = SelfSdkTheme()
    public var features: [String: Bool] = [:]
    public var locale: String?
    public var devMode: Bool = false
    public var devServerUrl: String?
}

/// SDK environment.
public enum SelfSdkEnvironment {
    case production
    case staging
    case development
}

/// Theme customization.
public struct SelfSdkTheme {
    public var primaryColor: String = "#000000"
    public var backgroundColor: String = "#FFFFFF"
    public var accentColor: String = "#FFFBEB"

    public init() {}
}

// MARK: - Request & Result

/// Verification request parameters.
public struct SelfVerificationRequest {
    public let scope: String
    public let userId: String?
    public let callbackUrl: String?
    public let metadata: [String: String]

    public init(
        scope: String,
        userId: String? = nil,
        callbackUrl: String? = nil,
        metadata: [String: String] = [:]
    ) {
        self.scope = scope
        self.userId = userId
        self.callbackUrl = callbackUrl
        self.metadata = metadata
    }
}

/// SDK result.
public enum SelfSdkResult {
    case verified(SelfVerification)
    case failed(SelfSdkError)
    case dismissed
}

/// Successful verification data.
public struct SelfVerification {
    public let userId: String?
    public let verificationId: String?
    public let proof: Any?
    public let claims: [String: Any]?
}

/// SDK error.
public struct SelfSdkError: Error {
    public let code: String
    public let message: String
}
