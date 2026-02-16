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
            try? fileManager.createDirectory(at: dir, withIntermediateDirectories: true, attributes: [
                .protectionKey: FileProtectionType.completeUntilFirstUserAuthentication
            ])
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
        return readFile(name: "doc_\(id)")
    }

    public func save(id: String, document: String) {
        writeFile(name: "doc_\(id)", content: document)
    }

    public func delete(id: String) {
        let fileURL = documentsDir.appendingPathComponent("doc_\(id)")
        try? fileManager.removeItem(at: fileURL)
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
