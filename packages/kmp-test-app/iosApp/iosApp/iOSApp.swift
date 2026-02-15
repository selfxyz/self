import SwiftUI

@main
struct iOSApp: App {
    init() {
        // Register MRZ camera factory
        MrzCameraFactoryImpl.register()
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
