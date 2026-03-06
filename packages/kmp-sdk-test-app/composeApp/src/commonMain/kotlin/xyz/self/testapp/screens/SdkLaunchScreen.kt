// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.testapp.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
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
import xyz.self.sdk.api.SelfSdkConfig
import xyz.self.sdk.api.SelfSdkError
import xyz.self.sdk.api.VerificationRequest
import xyz.self.sdk.api.VerificationResult

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SdkLaunchScreen(navController: NavController) {
    var userId by remember { mutableStateOf("test-user") }
    var scope by remember { mutableStateOf("identity") }
    var callbackStatus by remember { mutableStateOf("Idle") }
    var callbackPayload by remember { mutableStateOf<String?>(null) }
    var callbackError by remember { mutableStateOf<SelfSdkError?>(null) }

    val coroutineScope = rememberCoroutineScope()
    val sdk = remember { SelfSdk.configure(SelfSdkConfig(debug = true)) }
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

            Button(
                onClick = {
                    callbackStatus = "Launching verification..."
                    callbackPayload = null
                    callbackError = null

                    val request =
                        VerificationRequest(
                            userId = userId.ifBlank { null },
                            scope = scope.ifBlank { null },
                            disclosures = listOf("name", "nationality", "date_of_birth"),
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
                onClick = { navController.navigate("passport_details") },
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text("Open Manual MRZ/NFC Flow")
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
