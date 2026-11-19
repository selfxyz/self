// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.core.bridge.fixtures

import xyz.self.sdk.core.bridge.EnvelopeCodec
import xyz.self.sdk.core.bridge.InboundMessage
import xyz.self.sdk.core.bridge.generated.BridgeProtocol
import xyz.self.sdk.core.bridge.generated.BridgeResponse
import java.util.UUID

/**
 * The part of native that exists before the router: the codec. It drops what BC 4.6 says to drop
 * and answers a request with a field at fault. Every other step is deferred, because a request
 * that parses needs the router and a handler.
 */
internal class CodecFixtureSubject : FixtureSubject {
    private val emitted = mutableListOf<String>()

    override fun send(body: String) {
        when (val message = EnvelopeCodec.decode(body)) {
            is InboundMessage.Dropped -> Unit
            is InboundMessage.InvalidRequest ->
                emitted +=
                    EnvelopeCodec.encode(
                        BridgeResponse(
                            version = BridgeProtocol.MAJOR,
                            id = UUID.randomUUID().toString(),
                            domain = message.domain ?: throw FixtureDeferredException("the router decides the domain of this answer"),
                            requestId = message.requestId,
                            success = false,
                            error = message.toError(),
                            timestamp = FixturePlaceholders.TIMESTAMP,
                        ),
                    )
            is InboundMessage.Request, is InboundMessage.Cancel -> throw FixtureDeferredException("a message that parses needs the router")
        }
    }

    override fun native(action: String): Unit = throw FixtureDeferredException("a native action needs the router")

    override fun advance(milliseconds: Long): Unit = throw FixtureDeferredException("the fake clock comes with the router")

    override fun drain(): List<String> = emitted.toList().also { emitted.clear() }
}
