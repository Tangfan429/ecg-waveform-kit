import Foundation

enum WatchEcgAPIClientError: LocalizedError {
    case invalidBaseURL
    case invalidResponse
    case serverError(message: String)

    var errorDescription: String? {
        switch self {
        case .invalidBaseURL:
            return "API 地址不合法，请填写 http://你的Mac局域网IP:8090。"
        case .invalidResponse:
            return "服务端返回了无法解析的响应。"
        case .serverError(let message):
            return message
        }
    }
}

struct WatchEcgAPIClient {
    func makeBaseURL(from text: String) throws -> URL {
        let trimmedText = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard
            let url = URL(string: trimmedText),
            let scheme = url.scheme?.lowercased(),
            ["http", "https"].contains(scheme),
            url.host != nil
        else {
            throw WatchEcgAPIClientError.invalidBaseURL
        }

        return url
    }

    func upload(_ payload: WatchEcgUploadPayload, baseURL: URL) async throws -> StoredWatchEcgRecordResponse {
        let requestURL = try makeUploadURL(from: baseURL)
        var request = URLRequest(url: requestURL)
        request.httpMethod = "POST"
        request.timeoutInterval = 30
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.httpBody = try JSONEncoder().encode(payload)

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw WatchEcgAPIClientError.invalidResponse
        }

        if (200 ... 299).contains(httpResponse.statusCode) {
            return try JSONDecoder().decode(StoredWatchEcgRecordResponse.self, from: data)
        }

        if let apiError = try? JSONDecoder().decode(APIErrorEnvelope.self, from: data) {
            throw WatchEcgAPIClientError.serverError(message: apiError.error.message)
        }

        throw WatchEcgAPIClientError.serverError(
            message: "上传失败，HTTP \(httpResponse.statusCode)。",
        )
    }

    private func makeUploadURL(from baseURL: URL) throws -> URL {
        guard var components = URLComponents(url: baseURL, resolvingAgainstBaseURL: false) else {
            throw WatchEcgAPIClientError.invalidBaseURL
        }

        let normalizedPath = components.path.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        components.path = normalizedPath.isEmpty
            ? "/api/v1/watch-ecg/records"
            : "/\(normalizedPath)/api/v1/watch-ecg/records"

        guard let requestURL = components.url else {
            throw WatchEcgAPIClientError.invalidBaseURL
        }

        return requestURL
    }
}
