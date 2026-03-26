import Foundation

enum BridgePreferences {
    static let apiBaseURLKey = "watchEcgBridge.apiBaseURL"
    static let patientIDKey = "watchEcgBridge.patientID"
    static let autoSyncEnabledKey = "watchEcgBridge.autoSyncEnabled"
    static let lastSyncedSourceRecordIDKey = "watchEcgBridge.lastSyncedSourceRecordID"

    static let defaultAPIBaseURL = "http://192.168.31.57:8090"
    static let defaultPatientID = "pat_local_001"
    static let defaultAutoSyncEnabled = true

    static func loadAutomaticSyncConfiguration(
        from defaults: UserDefaults = .standard,
    ) -> AutomaticSyncConfiguration {
        AutomaticSyncConfiguration(
            patientID: defaults.string(forKey: patientIDKey) ?? defaultPatientID,
            apiBaseURLText: defaults.string(forKey: apiBaseURLKey) ?? defaultAPIBaseURL,
            isEnabled: defaults.object(forKey: autoSyncEnabledKey) as? Bool ?? defaultAutoSyncEnabled,
        )
    }

    static func loadLastSyncedSourceRecordID(
        from defaults: UserDefaults = .standard,
    ) -> String {
        defaults.string(forKey: lastSyncedSourceRecordIDKey) ?? ""
    }

    static func saveLastSyncedSourceRecordID(
        _ sourceRecordID: String,
        to defaults: UserDefaults = .standard,
    ) {
        defaults.set(sourceRecordID, forKey: lastSyncedSourceRecordIDKey)
    }
}
