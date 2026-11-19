// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

/// What one message body from the web is (BC 4.6).
enum InboundMessage: Equatable, Sendable {
    case request(BridgeRequest)
    case cancel(BridgeCancel)
    case invalidRequest(InvalidRequest)
    /// Native sends no response. The reason is for a debug log.
    case dropped(DropReason)
}

/// A request with a readable id and a required field that is missing, `null` or of the wrong type.
/// Native answers it with `error`. `version`, `domain` and `method` hold what could be read, so the
/// answer can copy the domain and the version rule of BC 5 can still apply.
struct InvalidRequest: Equatable, Sendable {
    var requestId: String
    /// The first field at fault, in the order version, domain, method, params, timestamp.
    var field: String
    var version: Int?
    var domain: String?
    var method: String?

    var error: BridgeError {
        BridgeError(
            code: .invalidParams,
            message: "The request field \"\(field)\" is missing or has the wrong type",
            details: BridgeErrorDetails(field: field)
        )
    }
}

enum DropReason: Equatable, Sendable {
    case notJSON
    case notAnObject
    /// No `id`, or an `id` that is not a non-empty string.
    case noReadableId
    /// `type` is not `request` or `cancel`.
    case notARequestOrCancel
    /// A cancel with a required field that is missing or of the wrong type. A cancel has no response.
    case invalidCancel
}

enum EnvelopeEncodingError: Error, Equatable {
    /// A response has an error when success is false, and only then.
    case successAndErrorDisagree
    /// The message holds a number that is not finite.
    case numberNotFinite
}

/// Reads a message body from the web and writes the messages native sends (BC 4). It applies the
/// rules of BC 4.1 and 4.6 that need no state: an unknown field is ignored, and `null` is the same
/// as absent. It does not check that native serves the version, the domain or the method.
enum EnvelopeCodec {
    static func decode(_ body: String) -> InboundMessage {
        guard let parsed = try? JSONText.parse(body) else { return .dropped(.notJSON) }
        guard case .object(let fields) = parsed else { return .dropped(.notAnObject) }
        guard let id = text(fields["id"]) else { return .dropped(.noReadableId) }
        switch text(fields["type"]) {
        case BridgeMessageType.request.rawValue: return decodeRequest(id: id, fields)
        case BridgeMessageType.cancel.rawValue: return decodeCancel(id: id, fields)
        default: return .dropped(.notARequestOrCancel)
        }
    }

    static func encode(_ response: BridgeResponse) throws -> String {
        guard response.success == (response.error == nil) else {
            throw EnvelopeEncodingError.successAndErrorDisagree
        }
        var fields = envelope(.response, response.version, response.id, response.domain, response.timestamp)
        fields["requestId"] = .string(response.requestId)
        fields["success"] = .bool(response.success)
        if let data = response.data, data != .null { fields["data"] = data }
        if let error = response.error { fields["error"] = errorValue(error) }
        return try write(fields)
    }

    static func encode(_ event: BridgeEvent) throws -> String {
        var fields = envelope(.event, event.version, event.id, event.domain, event.timestamp)
        fields["event"] = .string(event.event)
        if let requestId = event.requestId { fields["requestId"] = .string(requestId) }
        fields["data"] = .object(event.data)
        return try write(fields)
    }

    private static func decodeRequest(id: String, _ fields: [String: JSONValue]) -> InboundMessage {
        let version = wholeNumber(fields["version"])
        let domain = text(fields["domain"])
        let method = text(fields["method"])

        func invalid(_ field: String) -> InboundMessage {
            .invalidRequest(
                InvalidRequest(requestId: id, field: field, version: version, domain: domain, method: method)
            )
        }
        guard let version else { return invalid("version") }
        guard let domain else { return invalid("domain") }
        guard let method else { return invalid("method") }
        guard case .object(let params) = fields["params"] else { return invalid("params") }
        guard case .number(let timestamp) = fields["timestamp"] else { return invalid("timestamp") }
        return .request(
            BridgeRequest(
                version: version, id: id, domain: domain, method: method, params: params, timestamp: timestamp
            )
        )
    }

    private static func decodeCancel(id: String, _ fields: [String: JSONValue]) -> InboundMessage {
        guard let version = wholeNumber(fields["version"]),
            let domain = text(fields["domain"]),
            let requestId = text(fields["requestId"]),
            case .number(let timestamp) = fields["timestamp"]
        else { return .dropped(.invalidCancel) }
        return .cancel(
            BridgeCancel(
                version: version,
                id: id,
                domain: domain,
                requestId: requestId,
                // For logs only, so a value outside the list reads as absent.
                reason: text(fields["reason"]).flatMap(BridgeCancelReason.init(rawValue:)),
                timestamp: timestamp
            )
        )
    }

    private static func envelope(
        _ type: BridgeMessageType, _ version: Int, _ id: String, _ domain: String, _ timestamp: Double
    ) -> [String: JSONValue] {
        [
            "type": .string(type.rawValue),
            "version": .number(Double(version)),
            "id": .string(id),
            "domain": .string(domain),
            "timestamp": .number(timestamp)
        ]
    }

    private static func errorValue(_ error: BridgeError) -> JSONValue {
        var fields: [String: JSONValue] = ["code": .string(error.code.rawValue), "message": .string(error.message)]
        if let details = error.details.map(detailsFields), !details.isEmpty { fields["details"] = .object(details) }
        return .object(fields)
    }

    private static func detailsFields(_ details: BridgeErrorDetails) -> [String: JSONValue] {
        var fields: [String: JSONValue] = [:]
        if let reason = details.reason { fields["reason"] = .string(reason) }
        if let field = details.field { fields["field"] = .string(field) }
        if let supported = details.supported { fields["supported"] = .array(supported.map { .number(Double($0)) }) }
        if let origin = details.origin { fields["origin"] = .string(origin.rawValue) }
        if let permission = details.permission { fields["permission"] = .string(permission) }
        if let canAskAgain = details.canAskAgain { fields["canAskAgain"] = .bool(canAskAgain) }
        return fields
    }

    private static func write(_ fields: [String: JSONValue]) throws -> String {
        do {
            return try JSONText.write(.object(fields))
        } catch {
            throw EnvelopeEncodingError.numberNotFinite
        }
    }

    /// A non-empty string. Absent, `null`, another type and the empty string all read as nil.
    private static func text(_ value: JSONValue?) -> String? {
        guard case .string(let string) = value, !string.isEmpty else { return nil }
        return string
    }

    private static func wholeNumber(_ value: JSONValue?) -> Int? {
        guard case .number(let number) = value else { return nil }
        return JSONText.wholeNumber(number)
    }
}
