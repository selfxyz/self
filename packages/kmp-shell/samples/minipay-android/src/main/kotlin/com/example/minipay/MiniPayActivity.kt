package com.example.minipay

import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import xyz.self.sdk.android.*

/**
 * Example MiniPay integration showing how to launch Self SDK verification.
 */
class MiniPayActivity : AppCompatActivity() {

    // Configure the Self SDK once
    private val selfSdk = SelfSdk.configure {
        appId = "minipay-celo"
        environment = SelfSdkEnvironment.PRODUCTION
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // ... set up your MiniPay UI ...

        // When user taps "Verify Identity":
        // startVerification()
    }

    /**
     * Launch the Self verification flow.
     * The SDK handles the full UI — scanning, NFC, proof generation.
     */
    fun startVerification() {
        val celoAddress = "0x..." // User's Celo address

        selfSdk.launch(
            activity = this,
            request = VerificationRequest(
                scope = "identity",
                userId = celoAddress,
                callbackUrl = "https://api.minipay.com/self/callback",
                metadata = mapOf(
                    "app" to "minipay",
                    "chain" to "celo",
                ),
            ),
            callback = object : SelfSdkCallback {
                override fun onVerificationComplete(result: VerificationResult) {
                    // Verification succeeded!
                    // result.userId — the verified user ID
                    // result.verificationId — unique verification ID
                    // result.proof — the ZK proof
                    // result.claims — verified claims (age, nationality, etc.)

                    runOnUiThread {
                        Toast.makeText(
                            this@MiniPayActivity,
                            "Verified! ID: ${result.verificationId}",
                            Toast.LENGTH_SHORT,
                        ).show()
                    }

                    // Send proof to your backend for on-chain verification
                    // sendProofToBackend(result.proof, result.verificationId)
                }

                override fun onVerificationFailed(error: SelfSdkError) {
                    runOnUiThread {
                        Toast.makeText(
                            this@MiniPayActivity,
                            "Verification failed: ${error.message}",
                            Toast.LENGTH_SHORT,
                        ).show()
                    }
                }

                override fun onDismissed() {
                    // User dismissed the SDK without completing
                    // No action needed — they can try again later
                }
            },
        )
    }
}
