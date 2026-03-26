import Foundation

struct AutomaticSyncConfiguration {
    let patientID: String
    let apiBaseURLText: String
    let isEnabled: Bool

    static let disabled = AutomaticSyncConfiguration(
        patientID: "",
        apiBaseURLText: "",
        isEnabled: false,
    )
}

@MainActor
final class BridgeViewModel: ObservableObject {
    static let shared = BridgeViewModel()

    @Published private(set) var latestRecord: ExtractedWatchEcgRecord?
    @Published private(set) var lastUpload: StoredWatchEcgRecordResponse?
    @Published private(set) var isAuthorizing = false
    @Published private(set) var isLoadingLatest = false
    @Published private(set) var isUploading = false
    @Published private(set) var statusMessage = "准备就绪。"
    @Published private(set) var errorMessage = ""
    @Published private(set) var healthKitDebugMessage = "未检查"
    @Published private(set) var automaticSyncStatusMessage = "自动同步未开启。"
    @Published private(set) var isAutomaticSyncActive = false

    private let healthKitService: HealthKitEcgService
    private let apiClient: WatchEcgAPIClient
    private let defaults: UserDefaults
    private var automaticSyncConfiguration = AutomaticSyncConfiguration.disabled
    private var lastSyncedSourceRecordID = ""
    private var hasBootstrapped = false

    init(
        healthKitService: HealthKitEcgService = HealthKitEcgService(),
        apiClient: WatchEcgAPIClient = WatchEcgAPIClient(),
        defaults: UserDefaults = .standard,
    ) {
        self.healthKitService = healthKitService
        self.apiClient = apiClient
        self.defaults = defaults
        self.lastSyncedSourceRecordID = BridgePreferences.loadLastSyncedSourceRecordID(from: defaults)
    }

    func bootstrap() async {
        let persistedConfiguration = BridgePreferences.loadAutomaticSyncConfiguration(from: defaults)
        automaticSyncConfiguration = persistedConfiguration
        lastSyncedSourceRecordID = BridgePreferences.loadLastSyncedSourceRecordID(from: defaults)

        if !hasBootstrapped {
            hasBootstrapped = true
            statusMessage = "正在初始化自动同步..."
        }

        await inspectHealthKitState()
        await refreshAutomaticSync()
    }

    func requestAuthorization() async {
        guard !isAuthorizing else {
            return
        }

        isAuthorizing = true
        errorMessage = ""
        statusMessage = "正在请求 HealthKit 读取权限..."

        defer {
            isAuthorizing = false
        }

        do {
            try await healthKitService.requestReadAuthorization()
            statusMessage = "HealthKit 已授权。"
        } catch {
            errorMessage = error.localizedDescription
            statusMessage = "HealthKit 授权失败。"
        }

        await inspectHealthKitState()
        await refreshAutomaticSync()
    }

    func loadLatestRecord() async {
        guard !isLoadingLatest else {
            return
        }

        isLoadingLatest = true
        errorMessage = ""
        statusMessage = "正在读取最新 ECG..."

        defer {
            isLoadingLatest = false
        }

        do {
            latestRecord = try await healthKitService.fetchLatestRecord()
            statusMessage = "已读取最新 ECG。"
        } catch {
            latestRecord = nil
            errorMessage = error.localizedDescription
            statusMessage = "读取 ECG 失败。"
        }
    }

    func uploadLatestRecord(patientID: String, apiBaseURLText: String) async {
        guard !isUploading else {
            return
        }

        let trimmedPatientID = patientID.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedPatientID.isEmpty else {
            errorMessage = "patientId 不能为空。"
            statusMessage = "请先填写 patientId。"
            return
        }

        isUploading = true
        errorMessage = ""
        statusMessage = "正在准备上传 ECG..."

        defer {
            isUploading = false
        }

        do {
            let record = try await resolveRecordForUpload()
            let response = try await upload(
                record: record,
                patientID: trimmedPatientID,
                apiBaseURLText: apiBaseURLText,
            )
            latestRecord = record
            lastUpload = response
            saveLastSyncedSourceRecordID(record.sourceRecordID)
            statusMessage = "上传成功，服务端状态：\(response.status ?? "stored")。"
        } catch {
            errorMessage = error.localizedDescription
            statusMessage = "上传失败。"
        }
    }

    func inspectHealthKitState() async {
        do {
            let debugInfo = try await healthKitService.inspectAuthorizationState()
            healthKitDebugMessage = "requestStatus=\(debugInfo.requestStatusLabel), NSHealthShareUsageDescription=\(debugInfo.usageDescriptionPresent ? "present" : "missing")"
        } catch {
            healthKitDebugMessage = "检查失败：\(error.localizedDescription)"
        }
    }

    func updateAutomaticSyncConfiguration(
        patientID: String,
        apiBaseURLText: String,
        isEnabled: Bool,
    ) async {
        automaticSyncConfiguration = AutomaticSyncConfiguration(
            patientID: patientID.trimmingCharacters(in: .whitespacesAndNewlines),
            apiBaseURLText: apiBaseURLText.trimmingCharacters(in: .whitespacesAndNewlines),
            isEnabled: isEnabled,
        )

        await refreshAutomaticSync()
    }

    private func resolveRecordForUpload() async throws -> ExtractedWatchEcgRecord {
        if let latestRecord {
            return latestRecord
        }

        let fetchedRecord = try await healthKitService.fetchLatestRecord()
        latestRecord = fetchedRecord
        return fetchedRecord
    }

    private func refreshAutomaticSync() async {
        if automaticSyncConfiguration.isEnabled {
            await enableAutomaticSyncIfNeeded()
            return
        }

        healthKitService.stopObservingLatestRecord()
        isAutomaticSyncActive = false
        automaticSyncStatusMessage = "自动同步未开启。"
    }

    private func enableAutomaticSyncIfNeeded() async {
        guard automaticSyncConfiguration.isEnabled else {
            return
        }

        do {
            try await healthKitService.startObservingLatestRecord { [weak self] result in
                guard let self else {
                    return
                }

                await self.handleObservedRecord(result)
            }

            isAutomaticSyncActive = true
            automaticSyncStatusMessage = "自动同步已开启，等待新的 Apple Watch ECG。"

            do {
                try await healthKitService.enableImmediateBackgroundDeliveryIfPossible()
                automaticSyncStatusMessage = "自动同步已开启，新的 Apple Watch ECG 会自动上传。"
            } catch {
                automaticSyncStatusMessage = "自动同步已开启，后台交付不可用：\(error.localizedDescription)"
            }
        } catch {
            isAutomaticSyncActive = false
            automaticSyncStatusMessage = "自动同步初始化失败：\(error.localizedDescription)"
        }
    }

    private func handleObservedRecord(_ result: Result<ExtractedWatchEcgRecord, WatchEcgObservationError>) async {
        switch result {
        case .success(let record):
            latestRecord = record

            guard automaticSyncConfiguration.isEnabled else {
                automaticSyncStatusMessage = "检测到新 ECG，但自动同步当前已关闭。"
                return
            }

            if record.sourceRecordID == lastSyncedSourceRecordID {
                automaticSyncStatusMessage = "收到重复 ECG，已跳过重复上传。"
                return
            }

            guard !automaticSyncConfiguration.patientID.isEmpty else {
                automaticSyncStatusMessage = "检测到新 ECG，但 patientId 为空，未自动上传。"
                return
            }

            do {
                isUploading = true
                errorMessage = ""
                statusMessage = "检测到新 ECG，正在自动上传..."

                let response = try await upload(
                    record: record,
                    patientID: automaticSyncConfiguration.patientID,
                    apiBaseURLText: automaticSyncConfiguration.apiBaseURLText,
                )

                lastUpload = response
                saveLastSyncedSourceRecordID(record.sourceRecordID)
                statusMessage = "自动同步成功。"
                automaticSyncStatusMessage = "新 ECG 已自动上传到本地 API。"
            } catch {
                errorMessage = error.localizedDescription
                statusMessage = "自动同步失败。"
                automaticSyncStatusMessage = "检测到新 ECG，但自动上传失败：\(error.localizedDescription)"
            }

            isUploading = false

        case .failure(let error):
            automaticSyncStatusMessage = "自动同步读取失败：\(error.localizedDescription)"
        }
    }

    private func upload(
        record: ExtractedWatchEcgRecord,
        patientID: String,
        apiBaseURLText: String,
    ) async throws -> StoredWatchEcgRecordResponse {
        let baseURL = try apiClient.makeBaseURL(from: apiBaseURLText)
        let payload = record.makeUploadPayload(patientID: patientID)
        return try await apiClient.upload(payload, baseURL: baseURL)
    }

    private func saveLastSyncedSourceRecordID(_ sourceRecordID: String) {
        lastSyncedSourceRecordID = sourceRecordID
        BridgePreferences.saveLastSyncedSourceRecordID(sourceRecordID, to: defaults)
    }
}
