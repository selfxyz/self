// SPDX-License-Identifier: BUSL-1.1
package xyz.self.testapp

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import xyz.self.sdk.api.SelfSdk
import xyz.self.sdk.api.SelfSdkCallback
import xyz.self.sdk.api.SelfSdkConfig
import xyz.self.sdk.api.SelfSdkException
import xyz.self.sdk.api.SelfSdkLaunchConfig

class MainActivity : ComponentActivity() {

    private var resultText by mutableStateOf("No result yet")

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    TestAppScreen(
                        resultText = resultText,
                        onLaunch = { config -> launchVerification(config) }
                    )
                }
            }
        }
    }

    private fun launchVerification(config: SelfSdkConfig) {
        resultText = "Launching..."
        val launchConfig = SelfSdkLaunchConfig(
            config = config,
            secureStorageProvider = EncryptedPrefsStorageProvider(this),
        )
        SelfSdk.launch(this, launchConfig)
    }

    @Deprecated("Use Activity Result API for newer apps")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        SelfSdk.handleResult(requestCode, resultCode, data, object : SelfSdkCallback {
            override fun onSuccess(resultJson: String) {
                resultText = "SUCCESS\n${resultJson}"
            }

            override fun onFailure(error: SelfSdkException) {
                resultText = "FAILURE\n${error.message}"
            }

            override fun onCancelled() {
                resultText = "CANCELLED"
            }
        })
    }
}

private const val PREFS_NAME = "self_test_app_prefs"
private const val KEY_ENVIRONMENT = "environment"
private const val KEY_VERIFICATION_ID = "verificationId"
private const val KEY_USER_ID = "userId"
private const val KEY_DEBUG_MODE = "debugMode"
private const val KEY_SCOPE = "scope"
private const val KEY_DISCLOSURES = "disclosures"
private const val KEY_APP_NAME = "appName"
private const val KEY_APP_ENDPOINT = "appEndpoint"
private const val KEY_RESULT_TYPE = "resultType"

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TestAppScreen(
    resultText: String,
    onLaunch: (SelfSdkConfig) -> Unit
) {
    val context = LocalContext.current
    val prefs = remember { context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE) }

    val environmentOptions = listOf("staging", "prod")

    var environment by remember { mutableStateOf(prefs.getString(KEY_ENVIRONMENT, "staging") ?: "staging") }
    var verificationId by remember { mutableStateOf(prefs.getString(KEY_VERIFICATION_ID, "example-verification-id") ?: "") }
    var userId by remember { mutableStateOf(prefs.getString(KEY_USER_ID, "0x0000000000000000000000000000000000000001") ?: "") }
    var debugMode by remember { mutableStateOf(prefs.getBoolean(KEY_DEBUG_MODE, false)) }
    var scope by remember { mutableStateOf(prefs.getString(KEY_SCOPE, "") ?: "") }
    var disclosures by remember { mutableStateOf(prefs.getString(KEY_DISCLOSURES, "full_name,dob") ?: "") }
    var appName by remember { mutableStateOf(prefs.getString(KEY_APP_NAME, "Self Test App") ?: "") }
    var appEndpoint by remember { mutableStateOf(prefs.getString(KEY_APP_ENDPOINT, "") ?: "") }
    var resultType by remember { mutableStateOf(prefs.getString(KEY_RESULT_TYPE, "") ?: "") }
    var environmentExpanded by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp)
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Text("Self SDK Test", style = MaterialTheme.typography.headlineMedium)

        ExposedDropdownMenuBox(
            expanded = environmentExpanded,
            onExpandedChange = { environmentExpanded = it }
        ) {
            OutlinedTextField(
                value = environment,
                onValueChange = {},
                readOnly = true,
                label = { Text("Environment") },
                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = environmentExpanded) },
                modifier = Modifier.fillMaxWidth().menuAnchor()
            )
            ExposedDropdownMenu(
                expanded = environmentExpanded,
                onDismissRequest = { environmentExpanded = false }
            ) {
                environmentOptions.forEach { option ->
                    DropdownMenuItem(
                        text = { Text(option) },
                        onClick = {
                            environment = option
                            environmentExpanded = false
                        }
                    )
                }
            }
        }

        OutlinedTextField(
            value = verificationId,
            onValueChange = { verificationId = it },
            label = { Text("Verification ID") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true
        )

        OutlinedTextField(
            value = userId,
            onValueChange = { userId = it },
            label = { Text("User ID") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true
        )

        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Switch(checked = debugMode, onCheckedChange = { debugMode = it })
            Text("Debug mode (localhost:5173)")
        }

        Text("Verification Config", style = MaterialTheme.typography.titleSmall)

        OutlinedTextField(
            value = scope,
            onValueChange = { scope = it },
            label = { Text("Scope") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true
        )

        OutlinedTextField(
            value = disclosures,
            onValueChange = { disclosures = it },
            label = { Text("Disclosures (comma-separated)") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true
        )

        OutlinedTextField(
            value = appName,
            onValueChange = { appName = it },
            label = { Text("App Name") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true
        )

        OutlinedTextField(
            value = appEndpoint,
            onValueChange = { appEndpoint = it },
            label = { Text("App Endpoint (required)") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            isError = appEndpoint.isBlank()
        )

        OutlinedTextField(
            value = resultType,
            onValueChange = { resultType = it },
            label = { Text("Result Type") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true
        )

        Button(
            onClick = {
                prefs.edit()
                    .putString(KEY_ENVIRONMENT, environment)
                    .putString(KEY_VERIFICATION_ID, verificationId)
                    .putString(KEY_USER_ID, userId)
                    .putBoolean(KEY_DEBUG_MODE, debugMode)
                    .putString(KEY_SCOPE, scope)
                    .putString(KEY_DISCLOSURES, disclosures)
                    .putString(KEY_APP_NAME, appName)
                    .putString(KEY_APP_ENDPOINT, appEndpoint)
                    .putString(KEY_RESULT_TYPE, resultType)
                    .apply()

                onLaunch(
                    SelfSdkConfig(
                        verificationId = verificationId,
                        userId = userId,
                        environment = environment,
                        isDebugMode = debugMode,
                        scope = scope.ifBlank { null },
                        disclosures = disclosures.ifBlank { null }?.split(",")?.map { it.trim() }?.filter { it.isNotEmpty() },
                        appName = appName.ifBlank { null },
                        appEndpoint = appEndpoint.ifBlank { null },
                        resultType = resultType.ifBlank { null },
                    )
                )
            },
            modifier = Modifier.fillMaxWidth(),
            enabled = appEndpoint.isNotBlank()
        ) {
            Text("Launch Verification")
        }

        Divider()

        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Result:", style = MaterialTheme.typography.titleMedium)
            TextButton(onClick = {
                val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                clipboard.setPrimaryClip(ClipData.newPlainText("SDK Result", resultText))
                Toast.makeText(context, "Copied to clipboard", Toast.LENGTH_SHORT).show()
            }) {
                Text("Copy")
            }
        }
        SelectionContainer {
            Text(
                resultText,
                style = MaterialTheme.typography.bodyMedium.copy(fontFamily = FontFamily.Monospace)
            )
        }
    }
}
