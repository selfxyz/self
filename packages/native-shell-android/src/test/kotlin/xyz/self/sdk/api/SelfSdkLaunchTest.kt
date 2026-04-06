// SPDX-License-Identifier: BUSL-1.1

package xyz.self.sdk.api

import android.app.Activity
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import xyz.self.sdk.webview.SelfVerificationActivity
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertSame
import kotlin.test.assertTrue

@RunWith(RobolectricTestRunner::class)
class SelfSdkLaunchTest {
    @Test
    fun `launch sets secureStorageProvider on SelfSdk`() {
        val activity = Robolectric.buildActivity(Activity::class.java).setup().get()
        val provider = FakeStorageProvider()
        val launchConfig =
            SelfSdkLaunchConfig(
                config = minimalConfig(),
                secureStorageProvider = provider,
            )

        SelfSdk.launch(activity, launchConfig)

        assertSame(provider, SelfSdk.secureStorageProvider)
    }

    @Test
    fun `launch starts activity with required extras`() {
        val activity = Robolectric.buildActivity(Activity::class.java).setup().get()
        val config =
            SelfSdkConfig(
                verificationId = "ver_abc",
                userId = "user_xyz",
                environment = "staging",
                isDebugMode = true,
                version = 2,
            )
        val launchConfig = SelfSdkLaunchConfig(config = config, secureStorageProvider = FakeStorageProvider())

        SelfSdk.launch(activity, launchConfig)

        val shadow = shadowOf(activity)
        val intent = shadow.nextStartedActivityForResult.intent

        assertEquals("staging", intent.getStringExtra(SelfVerificationActivity.EXTRA_ENVIRONMENT))
        assertEquals("ver_abc", intent.getStringExtra(SelfVerificationActivity.EXTRA_VERIFICATION_ID))
        assertEquals("user_xyz", intent.getStringExtra(SelfVerificationActivity.EXTRA_USER_ID))
        assertTrue(intent.getBooleanExtra(SelfVerificationActivity.EXTRA_DEBUG_MODE, false))
        assertEquals(2, intent.getIntExtra(SelfVerificationActivity.EXTRA_VERSION, -1))
    }

    @Test
    fun `launch includes optional extras when set`() {
        val activity = Robolectric.buildActivity(Activity::class.java).setup().get()
        val config =
            SelfSdkConfig(
                verificationId = "ver_1",
                userId = "user_1",
                scope = "identity",
                disclosures = listOf("name", "dob"),
                appName = "TestApp",
                appEndpoint = "https://example.com",
                resultType = "jwt",
                excludedCountries = listOf("XX", "YY"),
                endpointType = "rest",
                userIdType = "wallet",
                chainID = 137,
                userDefinedData = "custom_data",
                selfDefinedData = "self_data",
            )
        val launchConfig = SelfSdkLaunchConfig(config = config, secureStorageProvider = FakeStorageProvider())

        SelfSdk.launch(activity, launchConfig)

        val shadow = shadowOf(activity)
        val intent = shadow.nextStartedActivityForResult.intent

        assertEquals("identity", intent.getStringExtra(SelfVerificationActivity.EXTRA_SCOPE))
        assertEquals(arrayListOf("name", "dob"), intent.getStringArrayListExtra(SelfVerificationActivity.EXTRA_DISCLOSURES))
        assertEquals("TestApp", intent.getStringExtra(SelfVerificationActivity.EXTRA_APP_NAME))
        assertEquals("https://example.com", intent.getStringExtra(SelfVerificationActivity.EXTRA_APP_ENDPOINT))
        assertEquals("jwt", intent.getStringExtra(SelfVerificationActivity.EXTRA_RESULT_TYPE))
        assertEquals(arrayListOf("XX", "YY"), intent.getStringArrayListExtra(SelfVerificationActivity.EXTRA_EXCLUDED_COUNTRIES))
        assertEquals("rest", intent.getStringExtra(SelfVerificationActivity.EXTRA_ENDPOINT_TYPE))
        assertEquals("wallet", intent.getStringExtra(SelfVerificationActivity.EXTRA_USER_ID_TYPE))
        assertEquals(137, intent.getIntExtra(SelfVerificationActivity.EXTRA_CHAIN_ID, -1))
        assertEquals("custom_data", intent.getStringExtra(SelfVerificationActivity.EXTRA_USER_DEFINED_DATA))
        assertEquals("self_data", intent.getStringExtra(SelfVerificationActivity.EXTRA_SELF_DEFINED_DATA))
    }

    @Test
    fun `launch omits optional extras when null`() {
        val activity = Robolectric.buildActivity(Activity::class.java).setup().get()
        val launchConfig =
            SelfSdkLaunchConfig(
                config = minimalConfig(),
                secureStorageProvider = FakeStorageProvider(),
            )

        SelfSdk.launch(activity, launchConfig)

        val shadow = shadowOf(activity)
        val intent = shadow.nextStartedActivityForResult.intent

        assertNull(intent.getStringExtra(SelfVerificationActivity.EXTRA_SCOPE))
        assertNull(intent.getStringArrayListExtra(SelfVerificationActivity.EXTRA_DISCLOSURES))
        assertNull(intent.getStringExtra(SelfVerificationActivity.EXTRA_APP_NAME))
        assertNull(intent.getStringExtra(SelfVerificationActivity.EXTRA_APP_ENDPOINT))
        assertNull(intent.getStringExtra(SelfVerificationActivity.EXTRA_RESULT_TYPE))
        assertNull(intent.getStringArrayListExtra(SelfVerificationActivity.EXTRA_EXCLUDED_COUNTRIES))
        assertNull(intent.getStringExtra(SelfVerificationActivity.EXTRA_ENDPOINT_TYPE))
        assertNull(intent.getStringExtra(SelfVerificationActivity.EXTRA_USER_ID_TYPE))
        assertNull(intent.getStringExtra(SelfVerificationActivity.EXTRA_USER_DEFINED_DATA))
        assertNull(intent.getStringExtra(SelfVerificationActivity.EXTRA_SELF_DEFINED_DATA))
    }

    @Test
    fun `launch uses default request code`() {
        val activity = Robolectric.buildActivity(Activity::class.java).setup().get()
        val launchConfig =
            SelfSdkLaunchConfig(
                config = minimalConfig(),
                secureStorageProvider = FakeStorageProvider(),
            )

        SelfSdk.launch(activity, launchConfig)

        val shadow = shadowOf(activity)
        val started = shadow.nextStartedActivityForResult
        assertEquals(SelfSdk.REQUEST_CODE_VERIFICATION, started.requestCode)
    }

    @Test
    fun `launch forwards custom request code`() {
        val activity = Robolectric.buildActivity(Activity::class.java).setup().get()
        val launchConfig =
            SelfSdkLaunchConfig(
                config = minimalConfig(),
                secureStorageProvider = FakeStorageProvider(),
            )

        SelfSdk.launch(activity, launchConfig, requestCode = 1234)

        val shadow = shadowOf(activity)
        val started = shadow.nextStartedActivityForResult
        assertEquals(1234, started.requestCode)
    }

    private fun minimalConfig() =
        SelfSdkConfig(
            verificationId = "ver_min",
            userId = "user_min",
        )

    private class FakeStorageProvider : SecureStorageProvider {
        override fun get(key: String): String? = null

        override fun set(
            key: String,
            value: String,
        ) = Unit

        override fun remove(key: String) = Unit
    }
}
