// SPDX-License-Identifier: BUSL-1.1

import Foundation

enum BundledAssetPathResolver {
    static func resolveFileURL(for requestURL: URL, rootURL: URL) -> URL? {
        let rawPath = requestURL.path.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        let normalizedPath = rawPath.removingPercentEncoding ?? rawPath
        let relativePath = normalizedPath.isEmpty || !normalizedPath.contains(".") ? "index.html" : normalizedPath
        let fileURL = rootURL.appendingPathComponent(relativePath, isDirectory: false).standardized
        let standardizedRootURL = rootURL.standardizedFileURL
        let rootPath = standardizedRootURL.path.hasSuffix("/")
            ? standardizedRootURL.path
            : standardizedRootURL.path + "/"
        guard fileURL.path.hasPrefix(rootPath) || fileURL.path == standardizedRootURL.path else {
            return nil
        }
        return fileURL
    }
}
