// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.testapp.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import kotlinx.coroutines.launch
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import xyz.self.sdk.api.SelfSdk
import xyz.self.sdk.api.SelfSdkCallback
import xyz.self.sdk.api.SelfEnvironment
import xyz.self.sdk.api.SelfSdkConfig
import xyz.self.sdk.api.SelfSdkError
import xyz.self.sdk.api.VerificationRequest
import xyz.self.sdk.api.VerificationResult

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SdkLaunchScreen(navController: NavController) {
    var useMockDocument by remember { mutableStateOf(true) }
    var userId by remember { mutableStateOf("d6e7f8a9-1b2c-4d3e-a5f6-789012345678") }
    var scope by remember { mutableStateOf("identity") }
    var verificationId by remember { mutableStateOf("example-verification-id") }
    var disclosures by remember { mutableStateOf("full_name,dob") }
    var appName by remember { mutableStateOf("Self Test App") }
    var appEndpoint by remember { mutableStateOf("") }
    var resultType by remember { mutableStateOf("") }
    var callbackStatus by remember { mutableStateOf("Idle") }
    var callbackPayload by remember { mutableStateOf<String?>(null) }
    var callbackError by remember { mutableStateOf<SelfSdkError?>(null) }

    val environment = if (useMockDocument) SelfEnvironment.STG else SelfEnvironment.PROD
    val coroutineScope = rememberCoroutineScope()
    val sdk = remember(environment, appName, appEndpoint) {
        SelfSdk.configure(
            SelfSdkConfig(
                environment = environment,
                debug = true,
                appName = appName.ifBlank { null },
                appEndpoint = appEndpoint.ifBlank { null },
            ),
        )
    }
    val json = remember { Json { prettyPrint = true } }

    Scaffold(
        topBar = { TopAppBar(title = { Text("SDK Public API Test") }) },
    ) { paddingValues ->
        Column(
            modifier =
                Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
                    .padding(16.dp)
                    .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text(
                text = "This button validates SelfSdk.configure(...).launch(...) end-to-end.",
                style = MaterialTheme.typography.bodyMedium,
            )

            Text("Document Mode", style = MaterialTheme.typography.labelMedium)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(0.dp),
            ) {
                val shape = RoundedCornerShape(8.dp)
                Button(
                    onClick = { useMockDocument = true },
                    modifier = Modifier.weight(1f),
                    shape = shape,
                    colors =
                        if (useMockDocument) {
                            ButtonDefaults.buttonColors()
                        } else {
                            ButtonDefaults.outlinedButtonColors()
                        },
                    border = if (!useMockDocument) BorderStroke(1.dp, MaterialTheme.colorScheme.outline) else null,
                ) {
                    Text("Mock Document")
                }
                Button(
                    onClick = { useMockDocument = false },
                    modifier = Modifier.weight(1f),
                    shape = shape,
                    colors =
                        if (!useMockDocument) {
                            ButtonDefaults.buttonColors()
                        } else {
                            ButtonDefaults.outlinedButtonColors()
                        },
                    border = if (useMockDocument) BorderStroke(1.dp, MaterialTheme.colorScheme.outline) else null,
                ) {
                    Text("Real Document")
                }
            }

            OutlinedTextField(
                value = userId,
                onValueChange = { userId = it },
                label = { Text("User ID") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
            )

            OutlinedTextField(
                value = scope,
                onValueChange = { scope = it },
                label = { Text("Scope") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
            )

            OutlinedTextField(
                value = verificationId,
                onValueChange = { verificationId = it },
                label = { Text("Verification ID") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
            )

            OutlinedTextField(
                value = disclosures,
                onValueChange = { disclosures = it },
                label = { Text("Disclosures (comma-separated)") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
            )

            OutlinedTextField(
                value = appName,
                onValueChange = { appName = it },
                label = { Text("App Name") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
            )

            OutlinedTextField(
                value = appEndpoint,
                onValueChange = { appEndpoint = it },
                label = { Text("App Endpoint") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
            )

            OutlinedTextField(
                value = resultType,
                onValueChange = { resultType = it },
                label = { Text("Result Type") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
            )

            Button(
                onClick = {
                    callbackStatus = "Launching verification..."
                    callbackPayload = null
                    callbackError = null

                    val request =
                        VerificationRequest(
                            userId = userId.ifBlank { null },
                            scope = scope.ifBlank { null },
                            verificationId = verificationId.ifBlank { null },
                            disclosures = disclosures.split(",").map { it.trim() }.filter { it.isNotEmpty() },
                            resultType = resultType.ifBlank { null },
                        )

                    sdk.launch(
                        request = request,
                        callback =
                            object : SelfSdkCallback {
                                override fun onSuccess(result: VerificationResult) {
                                    coroutineScope.launch {
                                        callbackStatus = "Success"
                                        callbackError = null
                                        callbackPayload =
                                            json.encodeToString(
                                                VerificationResult.serializer(),
                                                result,
                                            )
                                    }
                                }

                                override fun onFailure(error: SelfSdkError) {
                                    coroutineScope.launch {
                                        callbackStatus = "Failure"
                                        callbackError = error
                                        callbackPayload = null
                                    }
                                }

                                override fun onCancelled() {
                                    coroutineScope.launch {
                                        callbackStatus = "Cancelled"
                                        callbackError = null
                                        callbackPayload = null
                                    }
                                }
                            },
                    )
                },
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text("Launch Verification")
            }

            OutlinedButton(
                onClick = { navController.navigate("domain_smoke") },
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text("Run Domain Smoke Tests")
            }

            Spacer(modifier = Modifier.height(8.dp))

            Card(
                colors =
                    CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.secondaryContainer,
                    ),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Text("Callback Status: $callbackStatus")
                    if (callbackError != null) {
                        Text("Error Code: ${callbackError?.code}")
                        Text("Error Message: ${callbackError?.message}")
                    }
                    if (callbackPayload != null) {
                        Text(
                            text = callbackPayload!!,
                            style = MaterialTheme.typography.bodySmall,
                            fontFamily = FontFamily.Monospace,
                        )
                    }
                }
            }
        }
    }
}
