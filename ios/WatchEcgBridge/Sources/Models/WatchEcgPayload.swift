import Foundation

struct WatchEcgUploadPayload: Encodable, Sendable {
    let patientId: String
    let encounterId: String?
    let source: String
    let sourceRecordId: String
    let recordedAt: String
    let sampleRate: Int
    let duration: Double
    let leadMode: String
    let leadName: String
    let waveform: [Double]
    let summary: Summary
    let device: Device

    struct Summary: Encodable, Sendable {
        let hr: Int?
        let classification: String?
    }

    struct Device: Encodable, Sendable {
        let name: String?
        let model: String?
        let manufacturer: String?
        let hardwareVersion: String?
        let softwareVersion: String?
    }
}

struct StoredWatchEcgRecordResponse: Decodable, Sendable {
    let id: String?
    let status: String?
    let recordedAt: String?
}

struct APIErrorEnvelope: Decodable, Sendable {
    let error: APIErrorBody
}

struct APIErrorBody: Decodable, Sendable {
    let code: String
    let message: String
    let requestId: String
}
