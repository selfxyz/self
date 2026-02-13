package xyz.self.testapp

import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.Button
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier

@Composable
actual fun PlatformTestButtons(
    state: ScanState,
    onStateChange: (ScanState) -> Unit,
) {
    Button(
        onClick = {
            onStateChange(state.copy(log = state.log + "iOS NFC not implemented yet\n"))
        },
        modifier = Modifier.fillMaxWidth(),
    ) {
        Text("Scan Passport (NFC) - iOS stub")
    }
}
