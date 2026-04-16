// SPDX-License-Identifier: BUSL-1.1

import Foundation

enum RemoteNavigationPolicy {
    private static let allowedSubframeHosts: Set<String> = ["verify.didit.me"]

    static func makeEntryURL(baseURL: URL?, queryParams: String) -> URL? {
        guard let baseURL else { return nil }
        guard var components = URLComponents(url: baseURL, resolvingAgainstBaseURL: false) else {
            return nil
        }

        let basePath = components.path.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        components.path = "/" + [basePath, "tunnel", "tour", "1"].filter { !$0.isEmpty }.joined(separator: "/")
        components.percentEncodedQuery = queryParams.isEmpty ? nil : queryParams
        return components.url
    }

    static func isAllowedMainFrameNavigation(
        url: URL,
        remoteWebAppBaseURL: URL?,
        isDebugMode: Bool
    ) -> Bool {
        if isDebugMode {
            return url.scheme == "http" &&
                url.host == "localhost" &&
                resolvedPort(for: url) == 5173
        }

        guard let remoteWebAppBaseURL,
              remoteWebAppBaseURL.scheme == "https",
              remoteWebAppBaseURL.host != nil else {
            return false
        }

        return url.scheme == remoteWebAppBaseURL.scheme &&
            url.host == remoteWebAppBaseURL.host &&
            resolvedPort(for: url) == resolvedPort(for: remoteWebAppBaseURL)
    }

    static func isAllowedSubframeNavigation(
        url: URL,
        remoteWebAppBaseURL: URL?,
        isDebugMode: Bool
    ) -> Bool {
        if isAllowedMainFrameNavigation(url: url, remoteWebAppBaseURL: remoteWebAppBaseURL, isDebugMode: isDebugMode) {
            return true
        }
        guard url.scheme == "https", let host = url.host else {
            return false
        }
        let port = resolvedPort(for: url)
        return allowedSubframeHosts.contains(host) && port == 443
    }

    static func resolvedPort(for url: URL) -> Int {
        if let port = url.port {
            return port
        }
        switch url.scheme {
        case "https":
            return 443
        case "http":
            return 80
        default:
            return -1
        }
    }
}
