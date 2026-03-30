// SPDX-License-Identifier: BUSL-1.1
package xyz.self.testapp

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import xyz.self.sdk.api.SelfSdk
import xyz.self.sdk.api.SelfSdkCallback
import xyz.self.sdk.api.SelfSdkConfig
import xyz.self.sdk.api.SelfSdkException

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
        SelfSdk.launch(this, config)
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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TestAppScreen(
    resultText: String,
    onLaunch: (SelfSdkConfig) -> Unit
) {
    var environment by remember { mutableStateOf("staging") }
    var verificationId by remember { mutableStateOf("test-verification-123") }
    var userId by remember { mutableStateOf("0x0000000000000000000000000000000000000001") }
    var debugMode by remember { mutableStateOf(false) }
    var scope by remember { mutableStateOf("") }
    var disclosures by remember { mutableStateOf("full_name,dob") }
    var appName by remember { mutableStateOf("Self Test App") }
    var appEndpoint by remember { mutableStateOf("") }
    var resultType by remember { mutableStateOf("") }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp)
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Text("Self SDK Test", style = MaterialTheme.typography.headlineMedium)

        OutlinedTextField(
            value = environment,
            onValueChange = { environment = it },
            label = { Text("Environment (prod / staging)") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true
        )

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
            label = { Text("App Endpoint") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true
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
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Launch Verification")
        }

        Divider()

        Text("Result:", style = MaterialTheme.typography.titleMedium)
        Text(resultText, style = MaterialTheme.typography.bodyMedium)
    }
}
