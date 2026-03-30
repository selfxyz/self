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
    @State private var environment = "staging"
    @State private var verificationId = "test-verification-123"
    @State private var userId = "test-user-456"
    @State private var debugMode = false
    @State private var scope = ""
    @State private var disclosures = "full_name,dob"
    @State private var appName = "Self Test App"
    @State private var appEndpoint = ""
    @State private var resultType = ""
    @State private var resultText = "No result yet"
    @State private var showVerification = false

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    Group {
                        Text("Environment (prod / staging)")
                            .font(.caption)
                        TextField("Environment", text: $environment)
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

                    Group {
                        Text("Verification Config")
                            .font(.headline)

                        Text("Scope")
                            .font(.caption)
                        TextField("Scope", text: $scope)
                            .textFieldStyle(.roundedBorder)

                        Text("Disclosures (comma-separated)")
                            .font(.caption)
                        TextField("Disclosures", text: $disclosures)
                            .textFieldStyle(.roundedBorder)

                        Text("App Name")
                            .font(.caption)
                        TextField("App Name", text: $appName)
                            .textFieldStyle(.roundedBorder)

                        Text("App Endpoint")
                            .font(.caption)
                        TextField("App Endpoint", text: $appEndpoint)
                            .textFieldStyle(.roundedBorder)

                        Text("Result Type")
                            .font(.caption)
                        TextField("Result Type", text: $resultType)
                            .textFieldStyle(.roundedBorder)
                    }

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
                        verificationId: verificationId,
                        userId: userId,
                        environment: environment,
                        isDebugMode: debugMode,
                        scope: scope.isEmpty ? nil : scope,
                        disclosures: disclosures.isEmpty ? nil : disclosures.split(separator: ",").map { String($0).trimmingCharacters(in: .whitespaces) },
                        appName: appName.isEmpty ? nil : appName,
                        appEndpoint: appEndpoint.isEmpty ? nil : appEndpoint,
                        resultType: resultType.isEmpty ? nil : resultType
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
