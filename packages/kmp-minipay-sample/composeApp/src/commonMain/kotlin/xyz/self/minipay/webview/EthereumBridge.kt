// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.minipay.webview

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement

object ProviderErrorCodes {
    const val UNKNOWN_METHOD = 4200
    const val INVALID_PARAMS = -32602
    const val INTERNAL_ERROR = -32603
}

@Serializable
data class ProviderError(
    val code: Int,
    val message: String,
    val data: JsonElement? = null,
)

@Serializable
data class ProviderRequest(
    val id: String,
    val method: String,
    val params: JsonElement? = null,
)

@Serializable
data class ProviderResponse(
    val id: String,
    val result: JsonElement? = null,
    val error: ProviderError? = null,
)

typealias MethodHandler = (params: JsonElement?) -> Result<JsonElement?>


class BridgeMethodException(
    val providerError: ProviderError,
) : Exception(providerError.message)

class MethodRegistry {
    private val handlers = mutableMapOf<String, MethodHandler>()

    fun registerMethod(
        name: String,
        handler: MethodHandler,
    ) {
        handlers[name] = handler
    }

    fun dispatch(request: ProviderRequest): ProviderResponse {
        val handler =
            handlers[request.method]
                ?: return request.errorResponse(
                    ProviderError(
                        code = ProviderErrorCodes.UNKNOWN_METHOD,
                        message = "Unsupported method: ${request.method}",
                    ),
                )

        return handler(request.params)
            .fold(
                onSuccess = { result -> ProviderResponse(id = request.id, result = result) },
                onFailure = { throwable ->
                    val providerError =
                        if (throwable is BridgeMethodException) {
                            throwable.providerError
                        } else {
                            ProviderError(
                                code = ProviderErrorCodes.INTERNAL_ERROR,
                                message = throwable.message ?: "Internal error",
                            )
                        }
                    request.errorResponse(providerError)
                },
            )
    }

    private fun ProviderRequest.errorResponse(error: ProviderError): ProviderResponse =
        ProviderResponse(id = id, error = error)
}

const val ETHEREUM_BRIDGE_CHANNEL = "SelfEthereumBridge"

const val ETHEREUM_BRIDGE_STUB =
    """
    (() => {
      if (window.ethereum && window.ethereum.__selfBridgeReady) {
        return;
      }

      const pending = new Map();
      let nextRequestId = 1;

      const rejectWithProviderError = (reject, error) => {
        reject({
          code: error?.code ?? -32603,
          message: error?.message ?? 'Internal error',
          data: error?.data ?? null,
        });
      };

      window.__selfEthereumResolve = (responseJson) => {
        let response;
        try {
          response = JSON.parse(responseJson);
        } catch (_error) {
          return;
        }

        const entry = pending.get(response.id);
        if (!entry) {
          return;
        }

        pending.delete(response.id);

        if (response.error) {
          rejectWithProviderError(entry.reject, response.error);
          return;
        }

        entry.resolve(response.result ?? null);
      };

      const sendToNative = (payload) => {
        if (window.webkit?.messageHandlers?.SelfEthereumBridge) {
          window.webkit.messageHandlers.SelfEthereumBridge.postMessage(payload);
          return;
        }

        if (window.SelfEthereumBridge?.postMessage) {
          window.SelfEthereumBridge.postMessage(payload);
          return;
        }

        throw new Error('Native bridge is unavailable');
      };

      window.ethereum = {
        __selfBridgeReady: true,
        request({ method, params } = {}) {
          return new Promise((resolve, reject) => {
            if (!method || typeof method !== 'string') {
              rejectWithProviderError(reject, {
                code: -32602,
                message: 'Invalid params: method must be a string',
              });
              return;
            }

            const id = String(nextRequestId++);
            pending.set(id, { resolve, reject });

            try {
              sendToNative(JSON.stringify({ id, method, params: params ?? null }));
            } catch (error) {
              pending.delete(id);
              rejectWithProviderError(reject, {
                code: -32603,
                message: error?.message || 'Failed to call native bridge',
              });
            }
          });
        },
      };
    })();
    """

const val BRIDGE_DEMO_HTML =
    """
    <!doctype html>
    <html>
      <head>
        <meta charset=\"utf-8\" />
        <meta name=\"viewport\" content=\"width=device-width,initial-scale=1\" />
        <title>MiniPay Bridge PoC</title>
      </head>
      <body style=\"font-family: sans-serif; padding: 16px;\">
        <h2>MiniPay Bridge PoC</h2>
        <p>Uses <code>window.ethereum.request</code> through native bridge.</p>
        <button onclick=\"runEcho()\">demo_echo</button>
        <button onclick=\"runReject()\">demo_reject</button>
        <button onclick=\"runUnknown()\">foo (unknown)</button>
        <button onclick=\"runConcurrent()\">concurrent demo</button>
        <pre id=\"output\" style=\"margin-top: 16px; white-space: pre-wrap;\"></pre>

        <script>
          const output = document.getElementById('output');
          const log = (label, value) => {
            output.textContent += `${'$'}{label}: ${'$'}{JSON.stringify(value)}\\n`;
          };

          async function runEcho() {
            try {
              const result = await window.ethereum.request({
                method: 'demo_echo',
                params: { from: 'html', time: Date.now() },
              });
              log('demo_echo resolved', result);
            } catch (error) {
              log('demo_echo rejected', error);
            }
          }

          async function runReject() {
            try {
              const result = await window.ethereum.request({ method: 'demo_reject' });
              log('demo_reject resolved', result);
            } catch (error) {
              log('demo_reject rejected', error);
            }
          }

          async function runUnknown() {
            try {
              const result = await window.ethereum.request({ method: 'foo' });
              log('foo resolved', result);
            } catch (error) {
              log('foo rejected', error);
            }
          }

          async function runConcurrent() {
            const [echo, unknown] = await Promise.allSettled([
              window.ethereum.request({ method: 'demo_echo', params: { mode: 'parallel' } }),
              window.ethereum.request({ method: 'foo' }),
            ]);
            log('concurrent demo_echo', echo);
            log('concurrent foo', unknown);
          }
        </script>
      </body>
    </html>
    """
