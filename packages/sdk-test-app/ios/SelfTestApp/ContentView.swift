// SPDX-License-Identifier: BUSL-1.1

import SwiftUI
import SelfNativeShell

class VerificationCallback: SelfSdkCallback {
    var onResult: ((String) -> Void)?

    func onSuccess(result: [String: Any]) {
        onResult?("SUCCESS\n\(result)")
    }

    func onFailure(error: Error) {
        onResult?("FAILURE\n\(error.localizedDescription)")
    }

    func onCancelled() {
        onResult?("CANCELLED")
    }
}

struct ContentView: View {
    @State private var teeUrl = "https://58a0-49-204-25-56.ngrok-free.app"
    @State private var verificationId = "test-verification-123"
    @State private var userId = "test-user-456"
    @State private var debugMode = false
    @State private var resultText = "No result yet"
    @State private var showVerification = false

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    Group {
                        Text("TEE URL")
                            .font(.caption)
                        TextField("TEE URL", text: $teeUrl)
                            .textFieldStyle(.roundedBorder)

                        Text("Verification ID")
                            .font(.caption)
                        TextField("Verification ID", text: $verificationId)
                            .textFieldStyle(.roundedBorder)

                        Text("User ID")
                            .font(.caption)
                        TextField("User ID", text: $userId)
                            .textFieldStyle(.roundedBorder)
                    }

                    Toggle("Debug mode (localhost:5173)", isOn: $debugMode)

                    Button(action: { showVerification = true }) {
                        Text("Launch Verification")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)

                    Divider()

                    Text("Result:")
                        .font(.headline)
                    Text(resultText)
                        .font(.body)
                        .foregroundColor(.secondary)
                }
                .padding(24)
            }
            .navigationTitle("Self SDK Test")
            .sheet(isPresented: $showVerification) {
                VerificationView(
                    config: SelfSdkConfig(
                        teeUrl: teeUrl,
                        verificationId: verificationId,
                        userId: userId,
                        isDebugMode: debugMode
                    ),
                    onResult: { result in
                        resultText = result
                        showVerification = false
                    }
                )
            }
        }
    }
}

struct VerificationView: UIViewControllerRepresentable {
    let config: SelfSdkConfig
    let onResult: (String) -> Void

    class Coordinator {
        let callback = VerificationCallback()
    }

    func makeCoordinator() -> Coordinator { Coordinator() }

    func makeUIViewController(context: Context) -> UIViewController {
        context.coordinator.callback.onResult = onResult
        return SelfSdk.createViewController(config: config, callback: context.coordinator.callback)
    }

    func updateUIViewController(_ uiViewController: UIViewController, context: Context) {}
}
