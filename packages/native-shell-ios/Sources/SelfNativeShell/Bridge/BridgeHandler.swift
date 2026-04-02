// SPDX-License-Identifier: BUSL-1.1

import Foundation

protocol BridgeHandler {
    var domain: BridgeDomain { get }
    func handle(method: String, params: [String: Any]?) async throws -> Any?
}

enum BridgeHandlerError: Error, LocalizedError {
    case unknownMethod(String)
    case missingParam(String)
    case operationFailed(String)

    var errorDescription: String? {
        switch self {
        case .unknownMethod(let method): return "Unknown method: \(method)"
        case .missingParam(let param): return "Missing parameter: \(param)"
        case .operationFailed(let reason): return reason
        }
    }

    var code: String {
        switch self {
        case .unknownMethod: return "UNKNOWN_METHOD"
        case .missingParam: return "MISSING_PARAM"
        case .operationFailed: return "OPERATION_FAILED"
        }
    }
}
