// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.core.bridge

import xyz.self.sdk.core.bridge.generated.BridgeDomain
import xyz.self.sdk.core.bridge.generated.BridgeError
import xyz.self.sdk.core.bridge.generated.BridgeErrorCode
import xyz.self.sdk.core.bridge.generated.BridgeErrorDetails
import xyz.self.sdk.core.bridge.generated.BridgeErrorOrigin
import xyz.self.sdk.core.bridge.generated.BridgeEvent
import xyz.self.sdk.core.bridge.generated.BridgeProtocol
import xyz.self.sdk.core.bridge.generated.BridgeRequest
import xyz.self.sdk.core.bridge.generated.BridgeResponse
import xyz.self.sdk.core.bridge.generated.BridgeUnsupportedReason
import java.util.UUID

/** One request a handler works on. Every method is safe to call from any thread. */
internal interface BridgeCall {
    val requestId: String
    val domain: String
    val method: String
    val params: Map<String, JsonValue>

    /** Sends an event that carries this request's id. False, and nothing sent, once the request is ending or answered. */
    fun emit(
        event: String,
        data: Map<String, JsonValue> = emptyMap(),
    ): Boolean

    /** Answers the request. False when it was already answered. */
    fun succeed(data: JsonValue? = null): Boolean

    /** Answers the request with the error of [error] (see [toBridgeError]). False when it was already answered. */
    fun fail(error: Throwable): Boolean

    /**
     * Stops the work and releases the hardware. The router runs it once, on a cancel or a native
     * timeout, and then waits up to [BridgeMethodRules.STOP_DEADLINE_MS] for the handler to answer.
     * Registered after the request ended, it runs at once. With none, the request ends at once.
     */
    fun onStop(action: () -> Unit)
}

internal fun interface BridgeMethodHandler {
    fun handle(call: BridgeCall)
}

/**
 * Routes the bridge messages of one page (BC 6, 7). Each request gets exactly one response. [emit]
 * gets the JSON text of each response and event, in order, and must not block.
 */
internal class BridgeRouter(
    private val emit: (String) -> Unit,
    private val clock: BridgeClock,
    private val createId: () -> String = { UUID.randomUUID().toString() },
) {
    private val lock = Any()
    private val domains = mutableMapOf<String, Map<String, BridgeMethodHandler>>()
    private val unavailable = mutableMapOf<String, BridgeUnsupportedReason>()
    private val pending = LinkedHashMap<String, PendingCall>()

    fun register(
        domain: String,
        methods: Map<String, BridgeMethodHandler>,
    ): Unit =
        synchronized(lock) {
            unavailable.remove(domain)
            domains[domain] = methods.toMap()
        }

    /** A domain this build or device can never serve: each request gets `UNSUPPORTED` with [reason]. */
    fun registerUnavailable(
        domain: String,
        reason: BridgeUnsupportedReason,
    ): Unit =
        synchronized(lock) {
            require(reason == BridgeUnsupportedReason.NO_MODULE || reason == BridgeUnsupportedReason.NO_HARDWARE)
            domains.remove(domain)
            unavailable[domain] = reason
        }

    /** A message body from a trusted main-frame page. */
    fun receive(body: String) {
        when (val message = EnvelopeCodec.decode(body)) {
            is InboundMessage.Dropped -> Unit
            is InboundMessage.InvalidRequest -> answerInvalid(message)
            is InboundMessage.Request -> accept(message.request)
            is InboundMessage.Cancel -> cancel(message.cancel.requestId)
        }
    }

    /** BC 6.3: stops the scan that runs in [domain], for `nfc.cancelScan` and `camera.stopCamera`. */
    fun cancelActiveScan(domain: String) {
        val scans = synchronized(lock) { pending.values.filter { it.domain == domain && it.isExclusive } }
        scans.forEach { end(it, BridgeErrorCode.CANCELLED) }
    }

    /** BC 6.3: the host closed the flow. Every pending request ends with `CANCELLED`. */
    fun cancelAll() {
        synchronized(lock) { pending.values.toList() }.forEach { end(it, BridgeErrorCode.CANCELLED) }
    }

    /** BC 6.3, BC-Q36: the page navigated away. Every pending request stops, and nothing more is sent for it. */
    fun pageChanged() {
        val stops =
            synchronized(lock) {
                pending.values.toList().also { pending.clear() }.mapNotNull { call ->
                    call.timer?.cancel()
                    call.ending = BridgeErrorCode.CANCELLED
                    call.answered = true
                    call.stopAction
                }
            }
        stops.forEach(::runQuietly)
    }

    private fun accept(request: BridgeRequest) {
        val handler: BridgeMethodHandler
        val call: PendingCall
        val cancelled: List<PendingCall>
        synchronized(lock) {
            refusal(request)?.let {
                send(response(request.domain, request.id, it))
                return
            }
            handler = domains.getValue(request.domain).getValue(request.method)
            call = PendingCall(request, request.qualifiedMethod in BridgeMethodRules.exclusive)
            pending[request.id] = call
            nativeTimeoutMs(request)?.takeIf { it > 0 }?.let { delay ->
                call.timer = clock.schedule(delay) { end(call, BridgeErrorCode.TIMEOUT) }
            }
            cancelled = if (request.isDismiss) pending.values.filter { it !== call } else emptyList()
        }
        cancelled.forEach { end(it, BridgeErrorCode.CANCELLED) }
        try {
            handler.handle(call)
        } catch (failure: Exception) {
            call.fail(failure)
        }
    }

    /** The error a request gets before any handler runs, in the order of BC 5.1, 6.4, 7.3. */
    private fun refusal(request: BridgeRequest): BridgeError? {
        val methods = domains[request.domain]
        return when {
            request.version != BridgeProtocol.MAJOR && !request.isDismiss -> unsupportedVersion()
            request.id in pending -> invalidParams("id", "A request with this id is already pending")
            methods == null ->
                unsupported(unavailable[request.domain] ?: BridgeUnsupportedReason.UNKNOWN_DOMAIN, "No ${request.domain} domain")
            request.method !in methods -> unsupported(BridgeUnsupportedReason.UNKNOWN_METHOD, "No ${request.qualifiedMethod} method")
            !hasValidTimeout(request) -> invalidParams("timeoutMs", "timeoutMs must be a whole number of 0 or more")
            request.qualifiedMethod in BridgeMethodRules.exclusive &&
                pending.values.any { it.domain == request.domain && it.isExclusive } ->
                BridgeError(BridgeErrorCode.BUSY, "A scan already runs in ${request.domain}")
            else -> null
        }
    }

    private fun answerInvalid(message: InboundMessage.InvalidRequest) {
        val dismiss = message.domain == BridgeDomain.LIFECYCLE.wire && message.method == DISMISS
        val error =
            if (message.version != null &&
                message.version != BridgeProtocol.MAJOR &&
                !dismiss
            ) {
                unsupportedVersion()
            } else {
                message.toError()
            }
        synchronized(lock) { send(response(message.domain ?: BridgeDomain.LIFECYCLE.wire, message.requestId, error)) }
    }

    private fun cancel(requestId: String) {
        val call = synchronized(lock) { pending[requestId]?.takeIf { it.ending == null } } ?: return
        end(call, BridgeErrorCode.CANCELLED)
    }

    /** Ends [call] with [code]: the handler gets [BridgeMethodRules.STOP_DEADLINE_MS] to stop before the router answers. */
    private fun end(
        call: PendingCall,
        code: BridgeErrorCode,
    ) {
        val stop: () -> Unit
        synchronized(lock) {
            if (call.answered || call.ending != null) return
            call.ending = code
            call.timer?.cancel()
            stop =
                call.stopAction ?: run {
                    answer(call, ended(code))
                    return
                }
            call.timer = clock.schedule(BridgeMethodRules.STOP_DEADLINE_MS) { synchronized(lock) { answerEnding(call) } }
        }
        try {
            stop()
        } catch (_: Exception) {
            synchronized(lock) { answerEnding(call) }
        }
    }

    private fun complete(
        call: PendingCall,
        data: JsonValue?,
        error: BridgeError?,
    ): Boolean =
        synchronized(lock) {
            when {
                call.answered -> false
                call.ending != null -> answerEnding(call)
                else -> answer(call, error, data)
            }
        }

    private fun answerEnding(call: PendingCall): Boolean = !call.answered && answer(call, ended(call.ending!!))

    private fun answer(
        call: PendingCall,
        error: BridgeError?,
        data: JsonValue? = null,
    ): Boolean {
        call.answered = true
        call.timer?.cancel()
        if (pending[call.requestId] === call) pending.remove(call.requestId)
        val text =
            try {
                EnvelopeCodec.encode(response(call.domain, call.requestId, error, data))
            } catch (_: IllegalArgumentException) {
                EnvelopeCodec.encode(
                    response(call.domain, call.requestId, BridgeError(BridgeErrorCode.INTERNAL_ERROR, "The result is not valid JSON")),
                )
            }
        emit(text)
        return true
    }

    private fun emitEvent(
        call: PendingCall,
        event: String,
        data: Map<String, JsonValue>,
    ): Boolean =
        synchronized(lock) {
            if (call.answered || call.ending != null) return false
            val message = BridgeEvent(BridgeProtocol.MAJOR, createId(), call.domain, event, call.requestId, data, now())
            val text =
                try {
                    EnvelopeCodec.encode(message)
                } catch (_: IllegalArgumentException) {
                    return false
                }
            emit(text)
            true
        }

    private fun registerStop(
        call: PendingCall,
        action: () -> Unit,
    ) {
        val runNow =
            synchronized(lock) {
                if (call.stopAction != null) return
                call.stopAction = action
                call.answered && call.ending != null
            }
        if (runNow) runQuietly(action)
    }

    private fun send(response: BridgeResponse) = emit(EnvelopeCodec.encode(response))

    private fun response(
        domain: String,
        requestId: String,
        error: BridgeError?,
        data: JsonValue? = null,
    ) = BridgeResponse(BridgeProtocol.MAJOR, createId(), domain, requestId, error == null, data.takeIf { error == null }, error, now())

    private fun now(): Double = clock.now().toDouble()

    private fun runQuietly(action: () -> Unit) {
        try {
            action()
        } catch (_: Exception) {
            // The request is already answered. A stop that throws cannot change that.
        }
    }

    private inner class PendingCall(
        private val request: BridgeRequest,
        val isExclusive: Boolean,
    ) : BridgeCall {
        override val requestId get() = request.id
        override val domain get() = request.domain
        override val method get() = request.method
        override val params get() = request.params

        // Guarded by the router lock.
        var timer: BridgeTimer? = null
        var ending: BridgeErrorCode? = null
        var answered = false
        var stopAction: (() -> Unit)? = null

        override fun emit(
            event: String,
            data: Map<String, JsonValue>,
        ) = emitEvent(this, event, data)

        override fun succeed(data: JsonValue?) = complete(this, data, null)

        override fun fail(error: Throwable) = complete(this, null, error.toBridgeError())

        override fun onStop(action: () -> Unit) = registerStop(this, action)
    }

    private companion object {
        const val DISMISS = "dismiss"

        val BridgeRequest.qualifiedMethod get() = "$domain.$method"
        val BridgeRequest.isDismiss get() = domain == BridgeDomain.LIFECYCLE.wire && method == DISMISS

        fun ended(code: BridgeErrorCode) =
            BridgeError(
                code,
                if (code == BridgeErrorCode.TIMEOUT) "The native timeout ended" else "The request was cancelled",
                BridgeErrorDetails(origin = BridgeErrorOrigin.NATIVE),
            )

        fun unsupportedVersion() =
            BridgeError(
                BridgeErrorCode.UNSUPPORTED_VERSION,
                "Native serves protocol major ${BridgeProtocol.MAJOR} only",
                BridgeErrorDetails(supported = listOf(BridgeProtocol.MAJOR)),
            )

        fun unsupported(
            reason: BridgeUnsupportedReason,
            message: String,
        ) = BridgeError(BridgeErrorCode.UNSUPPORTED, message, BridgeErrorDetails(reason = reason.wire))

        fun invalidParams(
            field: String,
            message: String,
        ) = BridgeError(BridgeErrorCode.INVALID_PARAMS, message, BridgeErrorDetails(field = field))

        fun hasValidTimeout(request: BridgeRequest): Boolean =
            request.qualifiedMethod !in BridgeMethodRules.nativeTimeoutDefaults || nativeTimeoutMs(request) != null

        /** BC 6.2: `params.timeoutMs` of a native-owned method, its default when absent, null when invalid. */
        fun nativeTimeoutMs(request: BridgeRequest): Long? {
            val default = BridgeMethodRules.nativeTimeoutDefaults[request.qualifiedMethod] ?: return 0
            return when (val value = request.params["timeoutMs"]) {
                null, JsonNull -> default
                is JsonNumber -> JsonText.wholeNumber(value.value)?.takeIf { it >= 0 }
                else -> null
            }
        }
    }
}

/** BC 6.2 and 6.4 as data. */
internal object BridgeMethodRules {
    /** BC 6.3: a cancelled request is answered within this time. A native timeout uses the same limit. */
    const val STOP_DEADLINE_MS = 2_000L

    /** The methods whose timeout native owns, with the default of `params.timeoutMs`. 0 means no timeout. */
    val nativeTimeoutDefaults: Map<String, Long> = mapOf("nfc.scanPassport" to 120_000L, "camera.scanMRZ" to 0L)

    /** A second one of these while one runs in the same domain gets `BUSY`. */
    val exclusive: Set<String> = setOf("nfc.scanPassport", "camera.scanMRZ")
}
