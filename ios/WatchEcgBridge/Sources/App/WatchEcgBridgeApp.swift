import SwiftUI

@main
@MainActor
struct WatchEcgBridgeApp: App {
    @UIApplicationDelegateAdaptor(BridgeAppDelegate.self)
    private var appDelegate

    @StateObject
    private var viewModel = BridgeViewModel.shared

    var body: some Scene {
        WindowGroup {
            ContentView(viewModel: viewModel)
        }
    }
}
