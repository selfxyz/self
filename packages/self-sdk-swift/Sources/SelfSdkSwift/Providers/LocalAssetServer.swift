// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import Foundation
import Network

final class LocalAssetServer {
    private let bundle: Bundle
    private let resourceRoot: String
    private var listener: NWListener?
    private(set) var port: UInt16 = 0

    init(bundle: Bundle, resourceRoot: String) {
        self.bundle = bundle
        self.resourceRoot = resourceRoot
    }

    func start() throws {
        let params = NWParameters.tcp
        params.requiredLocalEndpoint = NWEndpoint.hostPort(host: .ipv4(.loopback), port: .any)
        let listener = try NWListener(using: params)

        listener.newConnectionHandler = { [weak self] connection in
            self?.handleConnection(connection)
        }

        let ready = DispatchSemaphore(value: 0)
        var startError: Error?

        listener.stateUpdateHandler = { state in
            switch state {
            case .ready:
                ready.signal()
            case .failed(let error):
                startError = error
                ready.signal()
            default:
                break
            }
        }

        listener.start(queue: .global(qos: .userInitiated))
        ready.wait()

        if let error = startError { throw error }

        guard let listenerPort = listener.port else {
            throw LocalAssetServerError.portUnavailable
        }
        self.port = listenerPort.rawValue
        self.listener = listener
    }

    func stop() {
        listener?.cancel()
        listener = nil
        port = 0
    }

    // MARK: - Connection handling

    private func handleConnection(_ connection: NWConnection) {
        connection.start(queue: .global(qos: .userInitiated))
        receiveHTTPRequest(on: connection)
    }

    private func receiveHTTPRequest(on connection: NWConnection) {
        connection.receive(minimumIncompleteLength: 1, maximumLength: 8192) { [weak self] data, _, _, error in
            guard let self, let data, error == nil else {
                connection.cancel()
                return
            }

            let requestLine = String(data: data, encoding: .utf8)?
                .components(separatedBy: "\r\n").first ?? ""
            let parts = requestLine.components(separatedBy: " ")
            let rawPath = parts.count >= 2 ? parts[1] : "/"
            let path = rawPath.components(separatedBy: "?").first ?? rawPath

            let responseData = self.buildResponse(for: path)
            connection.send(content: responseData, completion: .contentProcessed { _ in
                connection.cancel()
            })
        }
    }

    private func buildResponse(for path: String) -> Data {
        let normalizedPath = path.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        let assetPath = normalizedPath.isEmpty ? "index.html" : normalizedPath
        let hasExtension = !(assetPath as NSString).pathExtension.isEmpty

        var fileURL: URL?
        if hasExtension {
            fileURL = bundle.url(forResource: assetPath, withExtension: nil, subdirectory: resourceRoot)
        }
        if fileURL == nil && !hasExtension {
            fileURL = bundle.url(forResource: "index", withExtension: "html", subdirectory: resourceRoot)
        }

        guard let resolvedURL = fileURL, let body = try? Data(contentsOf: resolvedURL) else {
            return httpResponse(status: "404 Not Found", contentType: "text/plain", body: Data("Not Found".utf8))
        }

        let ext = (resolvedURL.pathExtension).lowercased()
        return httpResponse(status: "200 OK", contentType: mimeType(for: ext), body: body)
    }

    private func httpResponse(status: String, contentType: String, body: Data) -> Data {
        let header = [
            "HTTP/1.1 \(status)",
            "Content-Type: \(contentType)",
            "Content-Length: \(body.count)",
            "Connection: close",
            "Access-Control-Allow-Origin: *",
            "",
            "",
        ].joined(separator: "\r\n")
        return Data(header.utf8) + body
    }

    private func mimeType(for ext: String) -> String {
        switch ext {
        case "html": return "text/html; charset=utf-8"
        case "css": return "text/css; charset=utf-8"
        case "js": return "application/javascript; charset=utf-8"
        case "json": return "application/json"
        case "svg": return "image/svg+xml"
        case "png": return "image/png"
        case "jpg", "jpeg": return "image/jpeg"
        case "woff": return "font/woff"
        case "woff2": return "font/woff2"
        case "otf": return "font/otf"
        case "ttf": return "font/ttf"
        case "wav": return "audio/wav"
        default: return "application/octet-stream"
        }
    }
}

enum LocalAssetServerError: Error {
    case portUnavailable
}
