// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import Foundation
import WebKit

final class BundledWebViewSchemeHandler: NSObject, WKURLSchemeHandler {
    private let bundle: Bundle
    private let resourceRoot: String

    init(bundle: Bundle, resourceRoot: String) {
        self.bundle = bundle
        self.resourceRoot = resourceRoot
        super.init()
    }

    func webView(_ webView: WKWebView, start urlSchemeTask: any WKURLSchemeTask) {
        guard let requestURL = urlSchemeTask.request.url else {
            urlSchemeTask.didFailWithError(BundledWebViewSchemeError.invalidURL)
            return
        }

        guard let fileURL = resolveFileURL(for: requestURL) else {
            urlSchemeTask.didFailWithError(BundledWebViewSchemeError.fileNotFound)
            return
        }

        do {
            let data = try Data(contentsOf: fileURL)
            let response = URLResponse(
                url: requestURL,
                mimeType: mimeType(for: fileURL.pathExtension),
                expectedContentLength: data.count,
                textEncodingName: fileURL.pathExtension == "html" || fileURL.pathExtension == "css" || fileURL.pathExtension == "js" ? "utf-8" : nil
            )
            urlSchemeTask.didReceive(response)
            urlSchemeTask.didReceive(data)
            urlSchemeTask.didFinish()
        } catch {
            urlSchemeTask.didFailWithError(error)
        }
    }

    func webView(_ webView: WKWebView, stop urlSchemeTask: any WKURLSchemeTask) {}

    private func resolveFileURL(for requestURL: URL) -> URL? {
        let normalizedPath = requestURL.path.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        let assetPath = normalizedPath.isEmpty ? "index.html" : normalizedPath
        let hasFileExtension = (assetPath as NSString).pathExtension.isEmpty == false

        if hasFileExtension, let exactMatch = bundle.url(forResource: assetPath, withExtension: nil, subdirectory: resourceRoot) {
            return exactMatch
        }

        if !hasFileExtension {
            return bundle.url(forResource: "index", withExtension: "html", subdirectory: resourceRoot)
        }

        return nil
    }

    private func mimeType(for pathExtension: String) -> String {
        switch pathExtension {
        case "html":
            return "text/html"
        case "css":
            return "text/css"
        case "js":
            return "application/javascript"
        case "json":
            return "application/json"
        case "svg":
            return "image/svg+xml"
        case "png":
            return "image/png"
        case "jpg", "jpeg":
            return "image/jpeg"
        case "woff":
            return "font/woff"
        case "woff2":
            return "font/woff2"
        case "otf":
            return "font/otf"
        case "ttf":
            return "font/ttf"
        case "wav":
            return "audio/wav"
        default:
            return "application/octet-stream"
        }
    }
}

private enum BundledWebViewSchemeError: Error {
    case invalidURL
    case fileNotFound
}
