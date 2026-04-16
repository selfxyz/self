// SPDX-License-Identifier: BUSL-1.1

package xyz.self.sdk.handlers

import android.app.Activity
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.JsonPrimitive
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import xyz.self.sdk.bridge.BridgeHandlerException
import xyz.self.sdk.webview.SelfVerificationActivity
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNotNull
import kotlin.test.assertNull

@OptIn(ExperimentalCoroutinesApi::class)
@RunWith(RobolectricTestRunner::class)
class LifecycleHandlerTest {
    @Test
    fun `dismiss sets cancelled result and finishes activity`() =
        runTest {
            val activity = Robolectric.buildActivity(Activity::class.java).setup().get()
            val handler = LifecycleHandler(activity)

            handler.handle("dismiss", emptyMap())

            val shadow = shadowOf(activity)
            assertEquals(Activity.RESULT_CANCELED, shadow.resultCode)
            assertEquals(true, activity.isFinishing)
        }

    @Test
    fun `setResult success sets ok result with payload`() =
        runTest {
            val activity = Robolectric.buildActivity(Activity::class.java).setup().get()
            val handler = LifecycleHandler(activity)

            handler.handle(
                "setResult",
                mapOf(
                    "success" to JsonPrimitive(true),
                    "verificationId" to JsonPrimitive("ver_123"),
                ),
            )

            val shadow = shadowOf(activity)
            assertEquals(Activity.RESULT_OK, shadow.resultCode)
            assertEquals(true, activity.isFinishing)
            val resultIntent = shadow.resultIntent
            assertNotNull(resultIntent)
            val resultJson = resultIntent.getStringExtra(SelfVerificationActivity.EXTRA_RESULT_DATA)
            assertNotNull(resultJson)
            assertEquals(true, resultJson.contains("\"success\":true"))
            assertEquals(true, resultJson.contains("\"verificationId\":\"ver_123\""))
        }

    @Test
    fun `setResult failure sets first user result`() =
        runTest {
            val activity = Robolectric.buildActivity(Activity::class.java).setup().get()
            val handler = LifecycleHandler(activity)

            handler.handle(
                "setResult",
                mapOf(
                    "success" to JsonPrimitive(false),
                    "error" to JsonPrimitive("denied"),
                ),
            )

            val shadow = shadowOf(activity)
            assertEquals(Activity.RESULT_FIRST_USER, shadow.resultCode)
            assertEquals(true, activity.isFinishing)
        }

    @Test
    fun `ready returns null and does not finish activity`() =
        runTest {
            val activity = Robolectric.buildActivity(Activity::class.java).setup().get()
            val handler = LifecycleHandler(activity)

            val result = handler.handle("ready", emptyMap())

            assertNull(result)
            assertEquals(false, activity.isFinishing)
        }

    @Test
    fun `unknown method raises bridge error`() =
        runTest {
            val activity = Robolectric.buildActivity(Activity::class.java).setup().get()
            val handler = LifecycleHandler(activity)

            val error =
                assertFailsWith<BridgeHandlerException> {
                    handler.handle("unknown", emptyMap())
                }

            assertEquals("METHOD_NOT_FOUND", error.code)
        }
}
