// SPDX-License-Identifier: BUSL-1.1

package xyz.self.sdk.api

import android.app.Activity
import android.content.Intent
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import xyz.self.sdk.webview.SelfVerificationActivity
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

@RunWith(RobolectricTestRunner::class)
class SelfSdkHandleResultTest {
    @Test
    fun `RESULT_OK calls onSuccess with result data`() {
        val intent = Intent().putExtra(SelfVerificationActivity.EXTRA_RESULT_DATA, """{"verified":true}""")
        val callback = RecordingCallback()

        SelfSdk.handleResult(
            requestCode = SelfSdk.REQUEST_CODE_VERIFICATION,
            resultCode = Activity.RESULT_OK,
            data = intent,
            callback = callback,
        )

        assertEquals("""{"verified":true}""", callback.successResult)
        assertFalse(callback.cancelledCalled)
        assertFalse(callback.failureCalled)
    }

    @Test
    fun `RESULT_OK with null data falls back to empty json`() {
        val callback = RecordingCallback()

        SelfSdk.handleResult(
            requestCode = SelfSdk.REQUEST_CODE_VERIFICATION,
            resultCode = Activity.RESULT_OK,
            data = null,
            callback = callback,
        )

        assertEquals("{}", callback.successResult)
    }

    @Test
    fun `RESULT_OK with intent missing extra falls back to empty json`() {
        val callback = RecordingCallback()

        SelfSdk.handleResult(
            requestCode = SelfSdk.REQUEST_CODE_VERIFICATION,
            resultCode = Activity.RESULT_OK,
            data = Intent(),
            callback = callback,
        )

        assertEquals("{}", callback.successResult)
    }

    @Test
    fun `RESULT_CANCELED calls onCancelled`() {
        val callback = RecordingCallback()

        SelfSdk.handleResult(
            requestCode = SelfSdk.REQUEST_CODE_VERIFICATION,
            resultCode = Activity.RESULT_CANCELED,
            data = null,
            callback = callback,
        )

        assertTrue(callback.cancelledCalled)
        assertFalse(callback.failureCalled)
    }

    @Test
    fun `RESULT_FIRST_USER calls onFailure with result data`() {
        val intent = Intent().putExtra(SelfVerificationActivity.EXTRA_RESULT_DATA, "timeout")
        val callback = RecordingCallback()

        SelfSdk.handleResult(
            requestCode = SelfSdk.REQUEST_CODE_VERIFICATION,
            resultCode = Activity.RESULT_FIRST_USER,
            data = intent,
            callback = callback,
        )

        assertTrue(callback.failureCalled)
        assertEquals("timeout", callback.failureError?.message)
    }

    @Test
    fun `RESULT_FIRST_USER with null data uses default message`() {
        val callback = RecordingCallback()

        SelfSdk.handleResult(
            requestCode = SelfSdk.REQUEST_CODE_VERIFICATION,
            resultCode = Activity.RESULT_FIRST_USER,
            data = null,
            callback = callback,
        )

        assertTrue(callback.failureCalled)
        assertEquals("Verification failed", callback.failureError?.message)
    }

    @Test
    fun `unknown result code calls onFailure with code in message`() {
        val callback = RecordingCallback()

        SelfSdk.handleResult(
            requestCode = SelfSdk.REQUEST_CODE_VERIFICATION,
            resultCode = 42,
            data = null,
            callback = callback,
        )

        assertTrue(callback.failureCalled)
        assertTrue(callback.failureError?.message?.contains("42") == true)
    }

    @Test
    fun `mismatched requestCode triggers no callback`() {
        val callback = RecordingCallback()

        SelfSdk.handleResult(
            requestCode = 9999,
            resultCode = Activity.RESULT_OK,
            data = Intent().putExtra(SelfVerificationActivity.EXTRA_RESULT_DATA, "data"),
            callback = callback,
        )

        assertFalse(callback.failureCalled)
        assertFalse(callback.cancelledCalled)
        assertEquals(null, callback.successResult)
    }

    @Test
    fun `custom expectedRequestCode matches correctly`() {
        val callback = RecordingCallback()

        SelfSdk.handleResult(
            requestCode = 7777,
            resultCode = Activity.RESULT_OK,
            data = Intent().putExtra(SelfVerificationActivity.EXTRA_RESULT_DATA, """{"ok":true}"""),
            callback = callback,
            expectedRequestCode = 7777,
        )

        assertEquals("""{"ok":true}""", callback.successResult)
    }

    private class RecordingCallback : SelfSdkCallback {
        var successResult: String? = null
        var failureError: SelfSdkException? = null
        var cancelledCalled = false
        val failureCalled get() = failureError != null

        override fun onSuccess(resultJson: String) {
            successResult = resultJson
        }

        override fun onFailure(error: SelfSdkException) {
            failureError = error
        }

        override fun onCancelled() {
            cancelledCalled = true
        }
    }
}
