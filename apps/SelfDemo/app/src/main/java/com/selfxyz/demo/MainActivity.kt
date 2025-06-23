package com.selfxyz.demo

import android.app.PendingIntent
import android.content.Intent
import android.nfc.NfcAdapter
import android.nfc.Tag
import android.nfc.tech.IsoDep
import android.nfc.tech.Ndef
import android.nfc.tech.NfcA
import android.nfc.tech.NfcB
import android.nfc.tech.NfcF
import android.nfc.tech.NfcV
import android.nfc.tech.MifareClassic
import android.nfc.tech.MifareUltralight
import android.os.Bundle
import android.util.Base64
import android.util.Log
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.app.ActivityCompat
import com.selfxyz.demo.ui.theme.SelfDemoTheme
import java.io.IOException
import java.security.MessageDigest
import java.util.concurrent.CompletableFuture
import java.util.concurrent.TimeUnit

class MainActivity : ComponentActivity() {
    private lateinit var webView: WebView
    private lateinit var nfcAdapter: NfcAdapter
    private lateinit var pendingIntent: PendingIntent
    private var nfcReadFuture: CompletableFuture<String>? = null

    // This would be given to the self sdk from the app (ie minipage and stored in secure storage)
    private val appSecret = "your-secret-key-here"

    companion object {
        private const val TAG = "MainActivity"
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        // Initialize NFC
        nfcAdapter = NfcAdapter.getDefaultAdapter(this)
        if (nfcAdapter == null) {
            Toast.makeText(this, "NFC is not available on this device", Toast.LENGTH_LONG).show()
        }

        // Create pending intent for NFC
        val intent = Intent(this, javaClass).apply {
            addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
        }
        pendingIntent = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
        )

        setContent {
            SelfDemoTheme {
                Scaffold(modifier = Modifier.fillMaxSize()) { innerPadding ->
                    WebViewScreen(
                        modifier = Modifier.padding(innerPadding),
                        onWebViewCreated = { webView ->
                            this.webView = webView
                            setupWebView()
                        }
                    )
                }
            }
        }
    }

    private fun setupWebView() {
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = true
            allowContentAccess = true
            mixedContentMode = android.webkit.WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
        }

        // Add JavaScript interface
        webView.addJavascriptInterface(WebAppInterface(), "AndroidApp")

        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                // Inject the secret securely after page loads
                injectSecret()
            }
        }

        // Load the embedded.self.xyz website
        webView.loadUrl("https://embedded.self.xyz")
    }

    private fun injectSecret() {
        // TODO before sending secret to the app can we authenticate that it is legit?
        // OR maybe instead of injecting immediately it would be better to only request the secret when needed?
        val secretHash = appSecret
        val script = """

            if (window.selfApp) {
                window.selfApp.setSecret('$secretHash');
            } else {
                // Fallback: store in a global variable if the web app isn't ready
                window.selfAppSecret = '$secretHash';
            }
        """.trimIndent()

        webView.post {
            webView.evaluateJavascript(script, null)
        }
    }

    inner class WebAppInterface {
        @JavascriptInterface
        fun getPrivateKey(token: String) {
            // validate token? () and return privateKey / aka secret
        }

        @JavascriptInterface
        fun readNfcTag(): String {
            Log.d(TAG, "NFC read requested from web app")

            if (nfcAdapter == null || !nfcAdapter.isEnabled) {
                return "ERROR:NFC_NOT_AVAILABLE"
            }

            // Create a future to wait for NFC read result
            nfcReadFuture = CompletableFuture()

            // Enable NFC foreground dispatch
            runOnUiThread {
                nfcAdapter.enableForegroundDispatch(
                    this@MainActivity,
                    pendingIntent,
                    null,
                    null
                )
                Toast.makeText(this@MainActivity, "Please tap an NFC tag", Toast.LENGTH_SHORT).show()
            }

            return try {
                // Wait for NFC read result (with 30 second timeout)
                nfcReadFuture?.get(30, TimeUnit.SECONDS) ?: "ERROR:TIMEOUT"
            } catch (e: Exception) {
                Log.e(TAG, "Error reading NFC tag", e)
                "ERROR:${e.message}"
            } finally {
                // Disable NFC foreground dispatch
                runOnUiThread {
                    nfcAdapter.disableForegroundDispatch(this@MainActivity)
                }
                nfcReadFuture = null
            }
        }

        @JavascriptInterface
        fun getAppVersion(): String {
            return "1.0.0"
        }
    }

    override fun onResume() {
        super.onResume()
        if (nfcAdapter != null) {
            nfcAdapter.enableForegroundDispatch(this, pendingIntent, null, null)
        }
    }

    override fun onPause() {
        super.onPause()
        if (nfcAdapter != null) {
            nfcAdapter.disableForegroundDispatch(this)
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)

        if (NfcAdapter.ACTION_TECH_DISCOVERED == intent.action ||
            NfcAdapter.ACTION_TAG_DISCOVERED == intent.action ||
            NfcAdapter.ACTION_NDEF_DISCOVERED == intent.action) {

            val tag: Tag? = intent.getParcelableExtra(NfcAdapter.EXTRA_TAG)
            if (tag != null) {
                val nfcData = readNfcTagData(tag)
                nfcReadFuture?.complete(nfcData)
            } else {
                nfcReadFuture?.complete("ERROR:NO_TAG_DATA")
            }
        }
    }

    private fun readNfcTagData(tag: Tag): String {
        return try {
            val tagId = bytesToHex(tag.id)
            val techList = tag.techList

            var nfcData = "ID:$tagId"

            // Try to read NDEF data if available
            val ndef = Ndef.get(tag)
            if (ndef != null) {
                try {
                    ndef.connect()
                    val ndefMessage = ndef.ndefMessage
                    if (ndefMessage != null) {
                        for (i in 0 until ndefMessage.recordCount) {
                            val record = ndefMessage.getRecord(i)
                            val payload = String(record.payload)
                            nfcData += "|NDEF:$payload"
                        }
                    }
                    ndef.close()
                } catch (e: IOException) {
                    Log.w(TAG, "Error reading NDEF data", e)
                }
            }

            // Add technology information
            nfcData += "|TECH:${techList.joinToString(",")}"

            nfcData
        } catch (e: Exception) {
            Log.e(TAG, "Error reading NFC tag data", e)
            "ERROR:${e.message}"
        }
    }

    private fun bytesToHex(bytes: ByteArray): String {
        val hexArray = "0123456789ABCDEF".toCharArray()
        val hexChars = CharArray(bytes.size * 2)
        for (i in bytes.indices) {
            val v = bytes[i].toInt() and 0xFF
            hexChars[i * 2] = hexArray[v ushr 4]
            hexChars[i * 2 + 1] = hexArray[v and 0x0F]
        }
        return String(hexChars)
    }
}

@Composable
fun WebViewScreen(
    modifier: Modifier = Modifier,
    onWebViewCreated: (WebView) -> Unit
) {
    AndroidView(
        factory = { context ->
            WebView(context).apply {
                onWebViewCreated(this)
            }
        },
        modifier = modifier.fillMaxSize()
    )
}
