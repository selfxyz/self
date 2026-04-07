// SPDX-License-Identifier: BUSL-1.1

import Foundation

final class MessageRouter {
    private var handlers: [BridgeDomain: BridgeHandler] = [:]
    private let sendToWebView: (String) -> Void

    init(sendToWebView: @escaping (String) -> Void) {
        self.sendToWebView = sendToWebView
    }

    func register(handler: BridgeHandler) {
        handlers[handler.domain] = handler
    }

    func onMessageReceived(rawJson: String, isTrustedSource: Bool) {
        guard isTrustedSource else {
            return
        }

        guard let data = rawJson.data(using: .utf8) else {
            return
        }

        let request: BridgeRequest
        do {
            request = try JSONDecoder().decode(BridgeRequest.self, from: data)
        } catch {
            return
        }

        guard request.version == 1 else {
            let response = BridgeResponse.failure(
                request: request,
                code: "UNSUPPORTED_VERSION",
                message: "Protocol version \(request.version) is not supported"
            )
            sendResponse(response)
            return
        }

        guard let handler = handlers[request.domain] else {
            let response = BridgeResponse.failure(
                request: request,
                code: "UNKNOWN_DOMAIN",
                message: "No handler for domain: \(request.domain.rawValue)"
            )
            sendResponse(response)
            return
        }

        let params = request.params?.mapValues { $0.value }
        dispatchRequest(request, handler: handler, params: params)
    }

    private func dispatchRequest(_ request: BridgeRequest, handler: BridgeHandler, params: [String: Any]?) {
        Task {
            do {
                let result = try await handler.handle(method: request.method, params: params)
                let response = BridgeResponse.success(request: request, result: result)
                await MainActor.run { sendResponse(response) }
            } catch let error as BridgeHandlerError {
                let response = BridgeResponse.failure(
                    request: request,
                    code: error.code,
                    message: error.errorDescription ?? "Unknown error"
                )
                await MainActor.run { sendResponse(response) }
            } catch {
                let response = BridgeResponse.failure(
                    request: request,
                    code: "HANDLER_ERROR",
                    message: error.localizedDescription
                )
                await MainActor.run { sendResponse(response) }
            }
        }
    }

    func pushEvent(domain: BridgeDomain, event: String, data: Any?) {
        let eventDict: [String: Any] = [
            "type": "event",
            "version": 1,
            "domain": domain.rawValue,
            "event": event,
            "data": data as Any,
            "timestamp": Date().timeIntervalSince1970 * 1000
        ]

        guard let jsonData = try? JSONSerialization.data(withJSONObject: eventDict),
              let jsonStr = String(data: jsonData, encoding: .utf8) else {
            return
        }

        let escaped = escapeForJs(jsonStr)
        let js = "window.SelfNativeBridge._handleEvent('\(escaped)')"
        sendToWebView(js)
    }

    private func sendResponse(_ response: BridgeResponse) {
        guard let data = try? JSONEncoder().encode(response),
              let jsonStr = String(data: data, encoding: .utf8) else {
            return
        }

        let escaped = escapeForJs(jsonStr)
        let js = "window.SelfNativeBridge._handleResponse('\(escaped)')"
        sendToWebView(js)
    }

    private func escapeForJs(_ str: String) -> String {
        str.replacingOccurrences(of: "\\", with: "\\\\")
           .replacingOccurrences(of: "'", with: "\\'")
           .replacingOccurrences(of: "\n", with: "\\n")
           .replacingOccurrences(of: "\r", with: "\\r")
           .replacingOccurrences(of: "\u{2028}", with: "\\u2028")
           .replacingOccurrences(of: "\u{2029}", with: "\\u2029")
    }
}
