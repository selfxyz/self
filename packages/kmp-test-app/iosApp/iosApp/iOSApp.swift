import SwiftUI

@main
struct iOSApp: App {
    init() {
        MrzCameraFactoryImpl.register()
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
