package xyz.self.testapp.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import xyz.self.testapp.models.VerificationFlowState
import xyz.self.testapp.viewmodels.VerificationViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MrzConfirmationScreen(
    navController: androidx.navigation.NavController,
    viewModel: VerificationViewModel,
) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    // Extract confirmation state data
    val confirmationState = state as? VerificationFlowState.MrzConfirmation
    val passportData = confirmationState?.passportData
    val rawMrzData = confirmationState?.rawMrzData

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Confirm MRZ Data") },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
            )
        },
    ) { paddingValues ->
        Column(
            modifier =
                Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
                    .verticalScroll(rememberScrollState())
                    .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            // Success indicator
            Card(
                colors =
                    CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.primaryContainer,
                    ),
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(
                        Icons.Default.CheckCircle,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(32.dp),
                    )
                    Column {
                        Text(
                            text = "MRZ Scanned Successfully",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                        )
                        Text(
                            text = "Please verify the information below",
                            style = MaterialTheme.typography.bodyMedium,
                        )
                    }
                }
            }

            // Scanned passport data
            Card {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    Text(
                        text = "Passport Information",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                    )

                    Divider()

                    DataField(
                        label = "Passport Number",
                        value = passportData?.passportNumber ?: "N/A",
                    )

                    DataField(
                        label = "Date of Birth",
                        value = formatDate(passportData?.dateOfBirth),
                    )

                    DataField(
                        label = "Date of Expiry",
                        value = formatDate(passportData?.dateOfExpiry),
                    )
                }
            }

            // Raw MRZ data (for debugging)
            if (rawMrzData != null) {
                Card(
                    colors =
                        CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.surfaceVariant,
                        ),
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        Text(
                            text = "Raw MRZ Data (Debug)",
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.Bold,
                        )
                        Text(
                            text = rawMrzData.toString(),
                            style = MaterialTheme.typography.bodySmall,
                            fontFamily = FontFamily.Monospace,
                            modifier =
                                Modifier
                                    .fillMaxWidth()
                                    .padding(top = 8.dp),
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.weight(1f))

            // Action buttons
            Column(
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Button(
                    onClick = {
                        viewModel.confirmMrzData()
                        navController.navigate("nfc_scan") {
                            popUpTo("mrz_scan") { inclusive = true }
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                    enabled = passportData?.isValid() == true,
                ) {
                    Icon(
                        Icons.Default.CheckCircle,
                        contentDescription = null,
                        modifier = Modifier.size(20.dp),
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Confirm & Continue to NFC")
                }

                OutlinedButton(
                    onClick = {
                        navController.popBackStack()
                    },
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text("Scan Again")
                }
            }
        }
    }
}

@Composable
private fun DataField(
    label: String,
    value: String,
) {
    Column(
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Text(
            text = value,
            style = MaterialTheme.typography.bodyLarge,
            fontWeight = FontWeight.Medium,
        )
    }
}

/**
 * Formats YYMMDD date string to a more readable format
 */
private fun formatDate(dateString: String?): String {
    if (dateString == null || dateString.length != 6) return dateString ?: "N/A"

    val year = dateString.substring(0, 2)
    val month = dateString.substring(2, 4)
    val day = dateString.substring(4, 6)

    // Assume 20xx for years 00-29, 19xx for years 30-99
    val fullYear = if (year.toInt() <= 29) "20$year" else "19$year"

    return "$day/$month/$fullYear"
}
