import UIKit

@MainActor
final class BridgeAppDelegate: NSObject, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil,
    ) -> Bool {
        let sharedViewModel = BridgeViewModel.shared

        Task { [sharedViewModel] in
            await sharedViewModel.bootstrap()
        }

        return true
    }
}
