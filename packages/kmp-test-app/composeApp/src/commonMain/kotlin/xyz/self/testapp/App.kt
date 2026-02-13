package xyz.self.testapp

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
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import xyz.self.testapp.theme.SelfTestTheme

data class ScanState(
    val passportNumber: String = "",
    val dateOfBirth: String = "",
    val dateOfExpiry: String = "",
    val log: String = "Ready\n",
    val isScanning: Boolean = false,
)

@Composable
fun App() {
    SelfTestTheme {
        Scaffold { innerPadding ->
            var state by remember { mutableStateOf(ScanState()) }

            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding)
                    .padding(horizontal = 24.dp, vertical = 16.dp)
                    .verticalScroll(rememberScrollState()),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text(
                    text = "Self KMP Test App",
                    style = MaterialTheme.typography.headlineSmall,
                )

                Spacer(modifier = Modifier.height(16.dp))

                OutlinedTextField(
                    value = state.passportNumber,
                    onValueChange = { state = state.copy(passportNumber = it) },
                    label = { Text("Passport Number") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                )

                Spacer(modifier = Modifier.height(8.dp))

                OutlinedTextField(
                    value = state.dateOfBirth,
                    onValueChange = { state = state.copy(dateOfBirth = it) },
                    label = { Text("Date of Birth (YYMMDD)") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                )

                Spacer(modifier = Modifier.height(8.dp))

                OutlinedTextField(
                    value = state.dateOfExpiry,
                    onValueChange = { state = state.copy(dateOfExpiry = it) },
                    label = { Text("Date of Expiry (YYMMDD)") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                )

                Spacer(modifier = Modifier.height(16.dp))

                PlatformTestButtons(
                    state = state,
                    onStateChange = { state = it },
                )

                Spacer(modifier = Modifier.height(16.dp))

                Text(
                    text = "Log:",
                    style = MaterialTheme.typography.titleSmall,
                    modifier = Modifier.fillMaxWidth(),
                )

                Spacer(modifier = Modifier.height(4.dp))

                Text(
                    text = state.log,
                    style = MaterialTheme.typography.bodySmall,
                    modifier = Modifier.fillMaxWidth(),
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

@Composable
expect fun PlatformTestButtons(
    state: ScanState,
    onStateChange: (ScanState) -> Unit,
)
