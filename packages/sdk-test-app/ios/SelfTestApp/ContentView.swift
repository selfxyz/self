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
    @AppStorage("environment") private var environment = "staging"
    @AppStorage("verificationId") private var verificationId = "example-verification-id"
    @AppStorage("userId") private var userId = "test-user-456"
    @AppStorage("debugMode") private var debugMode = false
    @AppStorage("scope") private var scope = ""
    @AppStorage("disclosures") private var disclosures = "full_name,dob"
    @AppStorage("appName") private var appName = "Self Test App"
    @AppStorage("appEndpoint") private var appEndpoint = ""
    @AppStorage("resultType") private var resultType = ""
    @State private var resultText = "No result yet"
    @State private var showVerification = false

    private let environmentOptions = ["staging", "prod"]

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    Group {
                        Text("Environment")
                            .font(.caption)
                        Picker("Environment", selection: $environment) {
                            ForEach(environmentOptions, id: \.self) { option in
                                Text(option).tag(option)
                            }
                        }
                        .pickerStyle(.segmented)

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

                        Text("App Endpoint (required)")
                            .font(.caption)
                            .foregroundColor(appEndpoint.isEmpty ? .red : .secondary)
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
                    .disabled(appEndpoint.trimmingCharacters(in: .whitespaces).isEmpty)

                    Divider()

                    HStack {
                        Text("Result:")
                            .font(.headline)
                        Spacer()
                        Button("Copy") {
                            UIPasteboard.general.string = resultText
                        }
                        .font(.caption)
                    }

                    Text(resultText)
                        .font(.system(.body, design: .monospaced))
                        .foregroundColor(.secondary)
                        .textSelection(.enabled)
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
                        resultType: resultType.isEmpty ? nil : resultType,
                        secureStorageProvider: KeychainStorageProvider()
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
