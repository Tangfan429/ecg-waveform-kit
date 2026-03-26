@preconcurrency import HealthKit
import Foundation

struct LeadISample: Sendable {
    let elapsedSeconds: Double
    let millivolts: Double
}

struct HealthKitAuthorizationDebugInfo: Sendable {
    let requestStatusLabel: String
    let usageDescriptionPresent: Bool
}

struct ExtractedWatchEcgRecord: Sendable {
    let sourceRecordID: String
    let recordedAt: Date
    let sampleRate: Int
    let duration: Double
    let waveform: [Double]
    let heartRate: Int?
    let classificationCode: String?
    let device: WatchEcgUploadPayload.Device

    var recordedAtLabel: String {
        recordedAt.formatted(date: .abbreviated, time: .standard)
    }

    var classificationLabel: String {
        switch classificationCode {
        case "sinus_rhythm":
            return "窦性心律"
        case "atrial_fibrillation":
            return "房颤提示"
        case "high_heart_rate":
            return "心率过快"
        case "low_heart_rate":
            return "心率过慢"
        case "poor_recording":
            return "记录质量欠佳"
        case "inconclusive":
            return "结果不确定"
        case .some(let code):
            return code
        case .none:
            return "--"
        }
    }

    var heartRateLabel: String {
        guard let heartRate else {
            return "--"
        }

        return "\(heartRate) bpm"
    }

    var durationLabel: String {
        String(format: "%.3f s", duration)
    }

    func makeUploadPayload(patientID: String) -> WatchEcgUploadPayload {
        WatchEcgUploadPayload(
            patientId: patientID,
            encounterId: nil,
            source: "apple_watch",
            sourceRecordId: sourceRecordID,
            recordedAt: ISO8601DateFormatter().string(from: recordedAt),
            sampleRate: sampleRate,
            duration: duration,
            leadMode: "leadI",
            leadName: "I",
            waveform: waveform,
            summary: .init(
                hr: heartRate,
                classification: classificationCode,
            ),
            device: device,
        )
    }
}

enum HealthKitEcgServiceError: LocalizedError {
    case healthDataUnavailable
    case authorizationDenied
    case electrocardiogramUnavailable
    case waveformUnavailable
    case unsupportedQueryResult
    case backgroundDeliveryUnavailable

    var errorDescription: String? {
        switch self {
        case .healthDataUnavailable:
            return "当前设备不支持 HealthKit 心电数据。"
        case .authorizationDenied:
            return "没有获得 ECG 读取权限。"
        case .electrocardiogramUnavailable:
            return "健康 App 中没有可读取的 ECG 记录。"
        case .waveformUnavailable:
            return "这条 ECG 没有可用的 Lead I 波形点。"
        case .unsupportedQueryResult:
            return "遇到了当前版本未处理的 ECG 查询结果。"
        case .backgroundDeliveryUnavailable:
            return "后台自动同步没有启用，当前仅支持前台自动同步。"
        }
    }
}

struct WatchEcgObservationError: LocalizedError, Sendable {
    private let message: String

    init(_ error: any Error) {
        message = error.localizedDescription
    }

    var errorDescription: String? {
        message
    }
}

private struct ObserverQueryCompletion: @unchecked Sendable {
    let call: () -> Void

    func finish() {
        call()
    }
}

final class HealthKitEcgService: @unchecked Sendable {
    private let healthStore: HKHealthStore
    private var observerQuery: HKObserverQuery?

    init(healthStore: HKHealthStore = HKHealthStore()) {
        self.healthStore = healthStore
    }

    func requestReadAuthorization() async throws {
        guard HKHealthStore.isHealthDataAvailable() else {
            throw HealthKitEcgServiceError.healthDataUnavailable
        }

        let electrocardiogramType = HKObjectType.electrocardiogramType()

        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            healthStore.requestAuthorization(
                toShare: nil,
                read: Set([electrocardiogramType]),
            ) { success, error in
                if let error {
                    continuation.resume(throwing: error)
                    return
                }

                if success {
                    continuation.resume()
                    return
                }

                continuation.resume(throwing: HealthKitEcgServiceError.authorizationDenied)
            }
        }
    }

    func inspectAuthorizationState() async throws -> HealthKitAuthorizationDebugInfo {
        guard HKHealthStore.isHealthDataAvailable() else {
            throw HealthKitEcgServiceError.healthDataUnavailable
        }

        let electrocardiogramType = HKObjectType.electrocardiogramType()

        let requestStatus = try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<HKAuthorizationRequestStatus, Error>) in
            healthStore.getRequestStatusForAuthorization(
                toShare: [],
                read: Set([electrocardiogramType]),
            ) { status, error in
                if let error {
                    continuation.resume(throwing: error)
                    return
                }

                continuation.resume(returning: status)
            }
        }

        return HealthKitAuthorizationDebugInfo(
            requestStatusLabel: mapRequestStatus(requestStatus),
            usageDescriptionPresent: Bundle.main.object(forInfoDictionaryKey: "NSHealthShareUsageDescription") != nil,
        )
    }

    func startObservingLatestRecord(
        onRecord: @escaping @MainActor @Sendable (Result<ExtractedWatchEcgRecord, WatchEcgObservationError>) async -> Void,
    ) async throws {
        guard HKHealthStore.isHealthDataAvailable() else {
            throw HealthKitEcgServiceError.healthDataUnavailable
        }

        if observerQuery != nil {
            return
        }

        let electrocardiogramType = HKObjectType.electrocardiogramType()
        let query = HKObserverQuery(sampleType: electrocardiogramType, predicate: nil) { [weak self, onRecord] _, completionHandler, error in
            let completion = ObserverQueryCompletion(call: completionHandler)
            let observationError = error.map(WatchEcgObservationError.init)

            Task { [weak self, onRecord] in
                defer {
                    completion.finish()
                }

                if let observationError {
                    await onRecord(.failure(observationError))
                    return
                }

                guard let self else {
                    return
                }

                do {
                    let record = try await self.fetchLatestRecord()
                    await onRecord(.success(record))
                } catch {
                    await onRecord(.failure(WatchEcgObservationError(error)))
                }
            }
        }

        observerQuery = query
        healthStore.execute(query)
    }

    func stopObservingLatestRecord() {
        guard let observerQuery else {
            return
        }

        healthStore.stop(observerQuery)
        self.observerQuery = nil
    }

    func enableImmediateBackgroundDeliveryIfPossible() async throws {
        guard HKHealthStore.isHealthDataAvailable() else {
            throw HealthKitEcgServiceError.healthDataUnavailable
        }

        let electrocardiogramType = HKObjectType.electrocardiogramType()

        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            healthStore.enableBackgroundDelivery(
                for: electrocardiogramType,
                frequency: .immediate,
            ) { success, error in
                if let error {
                    continuation.resume(throwing: error)
                    return
                }

                if success {
                    continuation.resume()
                    return
                }

                continuation.resume(throwing: HealthKitEcgServiceError.backgroundDeliveryUnavailable)
            }
        }
    }

    func fetchLatestRecord() async throws -> ExtractedWatchEcgRecord {
        let electrocardiogram = try await fetchLatestElectrocardiogram()
        let samples = try await fetchLeadISamples(for: electrocardiogram)

        guard !samples.isEmpty else {
            throw HealthKitEcgServiceError.waveformUnavailable
        }

        let waveform = samples.map(\.millivolts)
        let sampleRate = estimateSampleRate(from: samples)
        let duration = roundToMilliseconds(Double(waveform.count) / Double(sampleRate))
        let averageHeartRate = electrocardiogram.averageHeartRate?.doubleValue(for: heartRateUnit)
        let heartRate = averageHeartRate.map { Int($0.rounded()) }

        return ExtractedWatchEcgRecord(
            sourceRecordID: electrocardiogram.uuid.uuidString,
            recordedAt: electrocardiogram.endDate,
            sampleRate: sampleRate,
            duration: duration,
            waveform: waveform,
            heartRate: heartRate,
            classificationCode: mapClassification(electrocardiogram.classification),
            device: makeDevicePayload(from: electrocardiogram.device),
        )
    }

    private func fetchLatestElectrocardiogram() async throws -> HKElectrocardiogram {
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<HKElectrocardiogram, Error>) in
            let query = HKSampleQuery(
                sampleType: HKObjectType.electrocardiogramType(),
                predicate: nil,
                limit: 1,
                sortDescriptors: [NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)],
            ) { _, samples, error in
                if let error {
                    continuation.resume(throwing: error)
                    return
                }

                guard let electrocardiogram = samples?.first as? HKElectrocardiogram else {
                    continuation.resume(throwing: HealthKitEcgServiceError.electrocardiogramUnavailable)
                    return
                }

                continuation.resume(returning: electrocardiogram)
            }

            healthStore.execute(query)
        }
    }

    private func fetchLeadISamples(for electrocardiogram: HKElectrocardiogram) async throws -> [LeadISample] {
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<[LeadISample], Error>) in
            var collected: [LeadISample] = []
            let query = HKElectrocardiogramQuery(electrocardiogram) { _, result in
                switch result {
                case .measurement(let measurement):
                    guard let quantity = measurement.quantity(for: .appleWatchSimilarToLeadI) else {
                        return
                    }

                    let millivolts = quantity.doubleValue(for: self.voltageUnit)
                    collected.append(
                        LeadISample(
                            elapsedSeconds: measurement.timeSinceSampleStart,
                            millivolts: millivolts,
                        )
                    )

                case .done:
                    continuation.resume(returning: collected)

                case .error(let error):
                    continuation.resume(throwing: error)

                @unknown default:
                    continuation.resume(throwing: HealthKitEcgServiceError.unsupportedQueryResult)
                }
            }

            healthStore.execute(query)
        }
    }

    private func estimateSampleRate(from samples: [LeadISample]) -> Int {
        guard samples.count >= 2 else {
            return 512
        }

        let deltas = zip(samples, samples.dropFirst())
            .map { max(0, $1.elapsedSeconds - $0.elapsedSeconds) }
            .filter { $0 > 0 }

        guard let firstDelta = deltas.first, firstDelta > 0 else {
            return 512
        }

        return max(1, Int((1.0 / firstDelta).rounded()))
    }

    private func makeDevicePayload(from device: HKDevice?) -> WatchEcgUploadPayload.Device {
        WatchEcgUploadPayload.Device(
            name: device?.name,
            model: device?.model,
            manufacturer: device?.manufacturer,
            hardwareVersion: device?.hardwareVersion,
            softwareVersion: device?.softwareVersion,
        )
    }

    private func mapClassification(_ classification: HKElectrocardiogram.Classification) -> String? {
        switch classification {
        case .sinusRhythm:
            return "sinus_rhythm"
        case .atrialFibrillation:
            return "atrial_fibrillation"
        case .inconclusiveHighHeartRate:
            return "high_heart_rate"
        case .inconclusiveLowHeartRate:
            return "low_heart_rate"
        case .inconclusivePoorReading:
            return "poor_recording"
        case .inconclusiveOther:
            return "inconclusive"
        case .unrecognized:
            return "inconclusive"
        case .notSet:
            return nil
        @unknown default:
            return "inconclusive"
        }
    }

    private func mapRequestStatus(_ status: HKAuthorizationRequestStatus) -> String {
        switch status {
        case .unknown:
            return "unknown"
        case .shouldRequest:
            return "shouldRequest"
        case .unnecessary:
            return "unnecessary"
        @unknown default:
            return "unknownFutureCase"
        }
    }

    private func roundToMilliseconds(_ value: Double) -> Double {
        (value * 1000).rounded() / 1000
    }

    private var heartRateUnit: HKUnit {
        HKUnit.count().unitDivided(by: .minute())
    }

    private var voltageUnit: HKUnit {
        HKUnit.voltUnit(with: .milli)
    }
}
