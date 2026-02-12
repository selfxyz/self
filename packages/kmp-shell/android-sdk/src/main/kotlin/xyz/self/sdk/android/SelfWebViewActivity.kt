// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1

package xyz.self.sdk.android

import android.content.Context
import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import xyz.self.sdk.bridge.BridgeHandler

/**
 * Standalone Activity that wraps [SelfWebViewFragment] for easy launching.
 *
 * Use [createIntent] to build a launch intent, then start the activity.
 * After the activity is created, access the fragment via [getFragment] to
 * register additional [BridgeHandler]s.
 */
class SelfWebViewActivity : AppCompatActivity() {

    private var fragment: SelfWebViewFragment? = null

    companion object {
        private const val EXTRA_DEV_MODE = "dev_mode"
        private const val EXTRA_DEV_URL = "dev_url"

        /**
         * Create an [Intent] to launch the Self WebView activity.
         *
         * @param context The context to create the intent from.
         * @param devMode When true, loads from the dev server instead of bundled assets.
         * @param devServerUrl Custom dev server URL (defaults to emulator localhost).
         */
        fun createIntent(
            context: Context,
            devMode: Boolean = false,
            devServerUrl: String? = null,
        ): Intent {
            return Intent(context, SelfWebViewActivity::class.java).apply {
                putExtra(EXTRA_DEV_MODE, devMode)
                devServerUrl?.let { putExtra(EXTRA_DEV_URL, it) }
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        if (savedInstanceState == null) {
            fragment = SelfWebViewFragment.newInstance(
                devMode = intent.getBooleanExtra(EXTRA_DEV_MODE, false),
                devServerUrl = intent.getStringExtra(EXTRA_DEV_URL),
            )
            supportFragmentManager.beginTransaction()
                .replace(android.R.id.content, fragment!!)
                .commit()
        } else {
            // Restore fragment reference after configuration change
            fragment = supportFragmentManager
                .findFragmentById(android.R.id.content) as? SelfWebViewFragment
        }
    }

    /**
     * Returns the hosted [SelfWebViewFragment], or null if the activity
     * has not yet been created.
     */
    fun getFragment(): SelfWebViewFragment? = fragment
}
