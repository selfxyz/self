package com.example.minipay

import android.os.Bundle
import android.text.method.ScrollingMovementMethod
import android.view.Gravity
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import xyz.self.sdk.android.SelfSdk
import xyz.self.sdk.android.SelfSdkCallback
import xyz.self.sdk.android.SelfSdkEnvironment
import xyz.self.sdk.android.SelfSdkError
import xyz.self.sdk.android.VerificationRequest
import xyz.self.sdk.android.VerificationResult

/**
 * Minimal Android demo app for validating SDK launch and WebView bridge behavior.
 */
class MiniPayActivity : AppCompatActivity() {

    private lateinit var logView: TextView
    private lateinit var devServerUrlInput: EditText

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(32, 32, 32, 32)
            gravity = Gravity.TOP
        }

        val title = TextView(this).apply {
            text = "Self SDK Android Demo"
            textSize = 20f
        }

        devServerUrlInput = EditText(this).apply {
            hint = "Dev server URL"
            setText("http://10.0.2.2:5173")
        }

        val launchButton = Button(this).apply {
            text = "Launch Self Verification"
            setOnClickListener { startVerification() }
        }

        logView = TextView(this).apply {
            text = "Event log:\n"
            movementMethod = ScrollingMovementMethod()
            isVerticalScrollBarEnabled = true
        }

        val logContainer = ScrollView(this).apply {
            addView(logView)
        }

        root.addView(title)
        root.addView(devServerUrlInput)
        root.addView(launchButton)
        root.addView(logContainer, LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            0,
            1f,
        ))

        setContentView(root)

        appendLog("Demo ready. Configure URL and tap launch.")
    }

    private fun startVerification() {
        val devUrl = devServerUrlInput.text.toString().trim().ifBlank { "http://10.0.2.2:5173" }
        appendLog("Launching SDK (devMode=true, url=$devUrl)")

        val selfSdk = SelfSdk.configure {
            appId = "minipay-demo"
            environment = SelfSdkEnvironment.DEVELOPMENT
            devMode = true
            devServerUrl = devUrl
        }

        selfSdk.launch(
            activity = this,
            request = VerificationRequest(
                scope = "identity",
                userId = "demo-user-123",
                callbackUrl = "https://example.invalid/callback",
                metadata = mapOf("source" to "minipay-android-demo"),
            ),
            callback = object : SelfSdkCallback {
                override fun onVerificationComplete(result: VerificationResult) {
                    runOnUiThread {
                        appendLog(
                            "onVerificationComplete: verificationId=${result.verificationId}, success=true"
                        )
                    }
                }

                override fun onVerificationFailed(error: SelfSdkError) {
                    runOnUiThread {
                        appendLog("onVerificationFailed: code=${error.code}, message=${error.message}")
                    }
                }

                override fun onDismissed() {
                    runOnUiThread {
                        appendLog("onDismissed")
                    }
                }
            },
        )
    }

    private fun appendLog(line: String) {
        logView.append("$line\n")
    }
}
