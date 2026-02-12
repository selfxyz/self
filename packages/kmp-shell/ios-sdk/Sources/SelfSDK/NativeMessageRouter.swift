// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import Foundation

/// Protocol that native bridge handlers must conform to.
public protocol NativeBridgeHandler: AnyObject {
    /// The domain this handler services (e.g. "nfc", "biometrics").
    var domain: String { get }

    /// Handle an incoming request from the WebView.
    func handle(
        method: String,
        params: [String: Any],
        completion: @escaping (Result<Any?, BridgeHandlerError>) -> Void
    )
}

/// Error type for bridge handler failures.
public struct BridgeHandlerError: Error {
    public let code: String
    public let message: String
    public let details: [String: Any]?

    public init(code: String, message: String, details: [String: Any]? = nil) {
        self.code = code
        self.message = message
        self.details = details
    }
}

/// Routes incoming bridge messages from the WebView to registered handlers
/// and sends responses back via JavaScript evaluation.
public class NativeMessageRouter {

    private let sendToWebView: (String) -> Void
    private var handlers: [String: NativeBridgeHandler] = [:]
    private let queue = DispatchQueue(label: "xyz.self.sdk.bridge", qos: .userInitiated)

    public init(sendToWebView: @escaping (String) -> Void) {
        self.sendToWebView = sendToWebView
    }

    /// Register a handler for a domain.
    public func register(_ handler: NativeBridgeHandler) {
        handlers[handler.domain] = handler
    }

    /// Unregister a handler for a domain.
    public func unregister(domain: String) {
        handlers.removeValue(forKey: domain)
    }

    /// Called when a raw JSON message arrives from the WebView.
    public func onMessageReceived(_ rawJson: String) {
        guard let data = rawJson.data(using: .utf8),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let type = json["type"] as? String,
              type == "request",
              let requestId = json["id"] as? String,
              let domain = json["domain"] as? String,
              let method = json["method"] as? String,
              let params = json["params"] as? [String: Any]
        else {
            return
        }

        guard let handler = handlers[domain] else {
            sendResponse(
                requestId: requestId,
                domain: domain,
                success: false,
                error: ["code": "DOMAIN_NOT_REGISTERED", "message": "No handler for domain: \(domain)"]
            )
            return
        }

        queue.async { [weak self] in
            handler.handle(method: method, params: params) { result in
                switch result {
                case .success(let data):
                    self?.sendResponse(requestId: requestId, domain: domain, success: true, data: data)
                case .failure(let error):
                    var errorDict: [String: Any] = [
                        "code": error.code,
                        "message": error.message,
                    ]
                    if let details = error.details {
                        errorDict["details"] = details
                    }
                    self?.sendResponse(requestId: requestId, domain: domain, success: false, error: errorDict)
                }
            }
        }
    }

    /// Push an unsolicited event to the WebView.
    public func pushEvent(domain: String, event: String, data: [String: Any]) {
        let eventDict: [String: Any] = [
            "type": "event",
            "version": 1,
            "id": UUID().uuidString.lowercased(),
            "domain": domain,
            "event": event,
            "data": data,
            "timestamp": Int(Date().timeIntervalSince1970 * 1000),
        ]

        guard let jsonData = try? JSONSerialization.data(withJSONObject: eventDict),
              let jsonString = String(data: jsonData, encoding: .utf8)
        else {
            return
        }

        let js = "window.SelfNativeBridge._handleEvent(\(Self.escapeForJs(jsonString)))"
        sendToWebView(js)
    }

    // MARK: - Private

    private func sendResponse(
        requestId: String,
        domain: String,
        success: Bool,
        data: Any? = nil,
        error: [String: Any]? = nil
    ) {
        var responseDict: [String: Any] = [
            "type": "response",
            "version": 1,
            "id": UUID().uuidString.lowercased(),
            "domain": domain,
            "requestId": requestId,
            "success": success,
            "timestamp": Int(Date().timeIntervalSince1970 * 1000),
        ]

        if let data = data {
            responseDict["data"] = data
        }
        if let error = error {
            responseDict["error"] = error
        }

        guard let jsonData = try? JSONSerialization.data(withJSONObject: responseDict),
              let jsonString = String(data: jsonData, encoding: .utf8)
        else {
            return
        }

        let js = "window.SelfNativeBridge._handleResponse(\(Self.escapeForJs(jsonString)))"
        sendToWebView(js)
    }

    static func escapeForJs(_ json: String) -> String {
        let escaped = json
            .replacingOccurrences(of: "\\", with: "\\\\")
            .replacingOccurrences(of: "'", with: "\\'")
            .replacingOccurrences(of: "\n", with: "\\n")
            .replacingOccurrences(of: "\r", with: "\\r")
        return "'\(escaped)'"
    }
}
