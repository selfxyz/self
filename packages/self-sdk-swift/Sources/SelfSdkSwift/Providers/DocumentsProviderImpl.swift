// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import Foundation

/// Swift implementation of DocumentsProvider using FileManager with encrypted storage.
/// Stores documents in Application Support/xyz.self.sdk/documents/.
public class DocumentsProviderImpl: NSObject {

    private let fileManager = FileManager.default
    private lazy var documentsDir: URL = {
        let appSupport = fileManager.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
        let dir = appSupport.appendingPathComponent("xyz.self.sdk/documents", isDirectory: true)

        if !fileManager.fileExists(atPath: dir.path) {
            do {
                try fileManager.createDirectory(at: dir, withIntermediateDirectories: true, attributes: [
                    .protectionKey: FileProtectionType.completeUntilFirstUserAuthentication
                ])
            } catch {
                NSLog("SelfSDK-Documents: Failed to create documents directory: %@", error.localizedDescription)
            }
        }

        return dir
    }()

    public override init() {
        super.init()
    }

    public func loadCatalog() -> String? {
        return readFile(name: "__catalog__")
    }

    public func saveCatalog(data: String) {
        writeFile(name: "__catalog__", content: data)
    }

    public func loadById(id: String) -> String? {
        let sanitized = Self.sanitizeId(id)
        return readFile(name: "doc_\(sanitized)")
    }

    public func save(id: String, document: String) {
        let sanitized = Self.sanitizeId(id)
        writeFile(name: "doc_\(sanitized)", content: document)
    }

    public func delete(id: String) {
        let sanitized = Self.sanitizeId(id)
        let fileURL = documentsDir.appendingPathComponent("doc_\(sanitized)")
        try? fileManager.removeItem(at: fileURL)
    }

    /// Sanitize document ID to prevent path traversal attacks.
    /// Strips path separators, parent directory references, and null bytes.
    private static func sanitizeId(_ id: String) -> String {
        return id
            .replacingOccurrences(of: "..", with: "")
            .replacingOccurrences(of: "/", with: "")
            .replacingOccurrences(of: "\\", with: "")
            .replacingOccurrences(of: "\0", with: "")
    }

    // MARK: - Private helpers

    private func readFile(name: String) -> String? {
        let fileURL = documentsDir.appendingPathComponent(name)
        guard fileManager.fileExists(atPath: fileURL.path) else { return nil }
        return try? String(contentsOf: fileURL, encoding: .utf8)
    }

    private func writeFile(name: String, content: String) {
        let fileURL = documentsDir.appendingPathComponent(name)
        try? content.write(to: fileURL, atomically: true, encoding: .utf8)
    }
}
