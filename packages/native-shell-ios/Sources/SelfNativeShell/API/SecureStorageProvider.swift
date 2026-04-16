// SPDX-License-Identifier: BUSL-1.1

import Foundation

public protocol SecureStorageProvider: AnyObject {
    func get(key: String) throws -> String?
    func set(key: String, value: String) throws
    func remove(key: String) throws
}
