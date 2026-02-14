package xyz.self.testapp

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import xyz.self.testapp.viewmodels.VerificationViewModel

/**
 * iOS implementation: MRZ scan screen
 * iOS is not currently supported for this test app
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
actual fun MrzScanScreen(
    navController: NavController,
    viewModel: VerificationViewModel,
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("MRZ Scan") },
            )
        },
    ) { paddingValues ->
        Column(
            modifier =
                Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
                    .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Text(
                text = "iOS Not Supported",
                style = MaterialTheme.typography.headlineSmall,
            )
        }
    }
}

/**
 * iOS implementation: NFC scan screen
 * iOS is not currently supported for this test app
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
actual fun NfcScanScreen(
    navController: NavController,
    viewModel: VerificationViewModel,
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("NFC Scan") },
            )
        },
    ) { paddingValues ->
        Column(
            modifier =
                Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
                    .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Text(
                text = "iOS Not Supported",
                style = MaterialTheme.typography.headlineSmall,
            )
        }
    }
}
