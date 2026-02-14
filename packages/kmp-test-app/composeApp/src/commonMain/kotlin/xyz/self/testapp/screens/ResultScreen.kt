package xyz.self.testapp.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import kotlinx.serialization.json.Json
import xyz.self.testapp.models.VerificationFlowState
import xyz.self.testapp.viewmodels.VerificationViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ResultScreen(
    navController: NavController,
    viewModel: VerificationViewModel,
) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    val resultState =
        state as? VerificationFlowState.Result
            ?: VerificationFlowState.Result(success = false, errorMessage = "Unknown state")

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(if (resultState.success) "Success" else "Error") },
            )
        },
    ) { paddingValues ->
        Column(
            modifier =
                Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
                    .padding(16.dp)
                    .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            // Status Icon and Message
            Card(
                colors =
                    CardDefaults.cardColors(
                        containerColor =
                            if (resultState.success) {
                                MaterialTheme.colorScheme.primaryContainer
                            } else {
                                MaterialTheme.colorScheme.errorContainer
                            },
                    ),
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(16.dp),
                ) {
                    Icon(
                        imageVector = if (resultState.success) Icons.Default.CheckCircle else Icons.Default.Close,
                        contentDescription = null,
                        modifier = Modifier.size(48.dp),
                        tint =
                            if (resultState.success) {
                                MaterialTheme.colorScheme.primary
                            } else {
                                MaterialTheme.colorScheme.error
                            },
                    )
                    Column {
                        Text(
                            text = if (resultState.success) "Verification Successful" else "Verification Failed",
                            style = MaterialTheme.typography.titleLarge,
                        )
                        if (resultState.errorMessage != null) {
                            Text(
                                text = resultState.errorMessage,
                                style = MaterialTheme.typography.bodyMedium,
                            )
                        }
                    }
                }
            }

            // Logs Section
            if (resultState.logs.isNotEmpty()) {
                Text(
                    text = "Process Logs",
                    style = MaterialTheme.typography.titleMedium,
                )
                Card {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(4.dp),
                    ) {
                        resultState.logs.forEach { log ->
                            Text(
                                text = log,
                                style = MaterialTheme.typography.bodySmall,
                                fontFamily = FontFamily.Monospace,
                            )
                        }
                    }
                }
            }

            // JSON Result Section
            if (resultState.jsonResult != null) {
                Text(
                    text = "JSON Result",
                    style = MaterialTheme.typography.titleMedium,
                )
                Card {
                    val prettyJson =
                        try {
                            Json {
                                prettyPrint = true
                            }.encodeToString(
                                kotlinx.serialization.json.JsonElement
                                    .serializer(),
                                resultState.jsonResult,
                            )
                        } catch (e: Exception) {
                            resultState.jsonResult.toString()
                        }

                    SelectionContainer {
                        Text(
                            text = prettyJson,
                            style = MaterialTheme.typography.bodySmall,
                            fontFamily = FontFamily.Monospace,
                            modifier = Modifier.padding(16.dp),
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.weight(1f))

            // Action Buttons
            Button(
                onClick = {
                    viewModel.reset()
                    navController.navigate("passport_details") {
                        popUpTo("passport_details") { inclusive = true }
                    }
                },
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text("Start Over")
            }
        }
    }
}
