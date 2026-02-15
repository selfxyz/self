import SwiftUI

@main
struct iOSApp: App {
    init() {
        MrzCameraFactoryImpl.register()
        NfcScanFactoryImpl.register()
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
