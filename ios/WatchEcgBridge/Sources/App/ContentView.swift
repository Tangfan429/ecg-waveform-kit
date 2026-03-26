import SwiftUI

@MainActor
struct ContentView: View {
    @AppStorage(BridgePreferences.apiBaseURLKey)
    private var apiBaseURLText = BridgePreferences.defaultAPIBaseURL

    @AppStorage(BridgePreferences.patientIDKey)
    private var patientID = BridgePreferences.defaultPatientID

    @AppStorage(BridgePreferences.autoSyncEnabledKey)
    private var autoSyncEnabled = BridgePreferences.defaultAutoSyncEnabled

    @StateObject
    private var viewModel: BridgeViewModel

    init(viewModel: BridgeViewModel = .shared) {
        _viewModel = StateObject(wrappedValue: viewModel)
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    heroCard
                    configurationCard
                    actionsCard
                    statusCard

                    if let latestRecord = viewModel.latestRecord {
                        latestRecordCard(record: latestRecord)
                    }

                    if let lastUpload = viewModel.lastUpload {
                        lastUploadCard(upload: lastUpload)
                    }

                    tipsCard
                }
                .padding(20)
            }
            .navigationTitle("Watch ECG Bridge")
            .navigationBarTitleDisplayMode(.large)
            .background(Color(.systemGroupedBackground))
            .task {
                await viewModel.bootstrap()
            }
            .task(id: syncConfigurationID) {
                await viewModel.updateAutomaticSyncConfiguration(
                    patientID: patientID,
                    apiBaseURLText: apiBaseURLText,
                    isEnabled: autoSyncEnabled,
                )
            }
        }
    }

    private var syncConfigurationID: String {
        "\(patientID)|\(apiBaseURLText)|\(autoSyncEnabled)"
    }

    private var heroCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Apple Watch ECG")
                .font(.headline)
                .foregroundStyle(.secondary)

            Text("自动同步桥接")
                .font(.system(size: 32, weight: .bold, design: .rounded))

            Text("测完一条 ECG 后，iPhone 会读取 HealthKit 里的最新记录，并自动上传到本地 Go 服务。")
                .font(.subheadline)
                .foregroundStyle(.secondary)

            HStack(spacing: 10) {
                statusChip(
                    title: autoSyncEnabled ? "自动同步已开" : "自动同步已关",
                    tint: autoSyncEnabled ? .green : .gray,
                )
                statusChip(
                    title: viewModel.isAutomaticSyncActive ? "监听中" : "未监听",
                    tint: viewModel.isAutomaticSyncActive ? .blue : .orange,
                )
            }
        }
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            LinearGradient(
                colors: [
                    Color(red: 0.10, green: 0.34, blue: 0.82),
                    Color(red: 0.05, green: 0.12, blue: 0.33),
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing,
            )
        )
        .foregroundStyle(.white)
        .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
    }

    private var configurationCard: some View {
        cardContainer(title: "连接配置", subtitle: "配置 名字、本地服务地址与自动同步开关。") {
            VStack(spacing: 16) {
                labeledField(title: "name") {
                    TextField("testname", text: $patientID)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .textFieldStyle(.roundedBorder)
                }

                labeledField(title: "API 地址") {
                    TextField("http://局域网IP:8090", text: $apiBaseURLText)
                        .keyboardType(.URL)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .textFieldStyle(.roundedBorder)
                }

                Toggle(isOn: $autoSyncEnabled) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("自动同步新 ECG")
                            .font(.subheadline.weight(.semibold))
                        Text("开启后，新的 Apple Watch ECG 会在检测到时自动上传。")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                }

                Text("先启动服务")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
    }

    private var actionsCard: some View {
        cardContainer(title: "手动操作", subtitle: "自动同步开启后一般不需要手动上传，下面这些按钮主要用于调试。") {
            VStack(spacing: 12) {
                primaryButton(
                    title: "请求 HealthKit 权限",
                    subtitle: "首次安装后先完成 ECG 读取授权",
                    isBusy: viewModel.isAuthorizing,
                    tint: .blue,
                ) {
                    requestAuthorization()
                }
                .disabled(viewModel.isAuthorizing)

                primaryButton(
                    title: "读取最新 ECG",
                    subtitle: "立即检查健康 App 里的最新 ECG 记录",
                    isBusy: viewModel.isLoadingLatest,
                    tint: .indigo,
                ) {
                    loadLatestRecord()
                }
                .disabled(viewModel.isLoadingLatest)

                primaryButton(
                    title: "立即上传到本地 API",
                    subtitle: "把当前最新 ECG 直接推到服务",
                    isBusy: viewModel.isUploading,
                    tint: .green,
                ) {
                    uploadLatestRecord()
                }
                .disabled(viewModel.isUploading)
            }
        }
    }

    private func requestAuthorization() {
        let viewModel = viewModel

        Task { @MainActor [viewModel] in
            await viewModel.requestAuthorization()
        }
    }

    private func loadLatestRecord() {
        let viewModel = viewModel

        Task { @MainActor [viewModel] in
            await viewModel.loadLatestRecord()
        }
    }

    private func uploadLatestRecord() {
        let viewModel = viewModel
        let patientID = patientID
        let apiBaseURLText = apiBaseURLText

        Task { @MainActor [viewModel, patientID, apiBaseURLText] in
            await viewModel.uploadLatestRecord(
                patientID: patientID,
                apiBaseURLText: apiBaseURLText,
            )
        }
    }

    private var statusCard: some View {
        cardContainer(title: "当前状态", subtitle: "优先看自动同步状态，其次看 HealthKit 与上传结果。") {
            VStack(spacing: 12) {
                keyValueRow(title: "自动同步", value: viewModel.automaticSyncStatusMessage)
                keyValueRow(title: "桥接状态", value: viewModel.statusMessage)
                keyValueRow(title: "HealthKit", value: viewModel.healthKitDebugMessage)

                if !viewModel.errorMessage.isEmpty {
                    keyValueRow(title: "错误", value: viewModel.errorMessage, valueColor: .red)
                }
            }
        }
    }

    private func latestRecordCard(record: ExtractedWatchEcgRecord) -> some View {
        cardContainer(title: "最近一次 ECG", subtitle: "这是当前 iPhone 从 HealthKit 读取到的最新 Apple Watch ECG。") {
            VStack(spacing: 12) {
                keyValueRow(title: "recordId", value: record.sourceRecordID)
                keyValueRow(title: "记录时间", value: record.recordedAtLabel)
                keyValueRow(title: "分类", value: record.classificationLabel)
                keyValueRow(title: "心率", value: record.heartRateLabel)
                keyValueRow(title: "采样率", value: "\(record.sampleRate) Hz")
                keyValueRow(title: "时长", value: record.durationLabel)
                keyValueRow(title: "点数", value: "\(record.waveform.count)")
            }
        }
    }

    private func lastUploadCard(upload: StoredWatchEcgRecordResponse) -> some View {
        cardContainer(title: "最近一次上传", subtitle: "这里展示最后一次上传到 Go 服务后的服务端反馈。") {
            VStack(spacing: 12) {
                keyValueRow(title: "服务端 ID", value: upload.id ?? "--")
                keyValueRow(title: "状态", value: upload.status ?? "stored")
                keyValueRow(title: "recordedAt", value: upload.recordedAt ?? "--")
            }
        }
    }

    private var tipsCard: some View {
        cardContainer(title: "运行提示", subtitle: "这些条件会直接影响自动同步是否稳定。") {
            VStack(alignment: .leading, spacing: 10) {
                tipLine("Apple Watch ECG 必须已经同步到这台 iPhone 的健康 App。")
                tipLine("首次运行要允许健康数据读取和本地网络访问。")
                tipLine("上传失败时先检查防火墙、局域网 IP 和 服务监听地址。")
                tipLine("想让新 ECG 自动上传，桥接 App 至少要启动过一次，并保持不要被手动强杀。")
                tipLine("真正的 Apple Watch ECG 不能边测边直播，当前实现是测后自动同步。")
            }
        }
    }

    private func cardContainer<Content: View>(
        title: String,
        subtitle: String,
        @ViewBuilder content: () -> Content,
    ) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            VStack(alignment: .leading, spacing: 6) {
                Text(title)
                    .font(.title3.weight(.semibold))
                Text(subtitle)
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }

            content()
        }
        .padding(18)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
    }

    private func labeledField<Content: View>(
        title: String,
        @ViewBuilder content: () -> Content,
    ) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.subheadline.weight(.semibold))
            content()
        }
    }

    private func statusChip(title: String, tint: Color) -> some View {
        Text(title)
            .font(.footnote.weight(.semibold))
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(tint.opacity(0.18))
            .clipShape(Capsule())
    }

    private func primaryButton(
        title: String,
        subtitle: String,
        isBusy: Bool,
        tint: Color,
        action: @escaping () -> Void,
    ) -> some View {
        Button(action: action) {
            HStack(spacing: 14) {
                ZStack {
                    Circle()
                        .fill(tint.opacity(0.16))
                        .frame(width: 42, height: 42)

                    if isBusy {
                        ProgressView()
                            .tint(tint)
                    } else {
                        Image(systemName: "arrow.up.heart.fill")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundStyle(tint)
                    }
                }

                VStack(alignment: .leading, spacing: 4) {
                    Text(title)
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(.primary)
                    Text(subtitle)
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .font(.caption.weight(.bold))
                    .foregroundStyle(.tertiary)
            }
            .padding(14)
            .background(Color(.tertiarySystemGroupedBackground))
            .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        }
        .buttonStyle(.plain)
    }

    private func keyValueRow(
        title: String,
        value: String,
        valueColor: Color = .primary,
    ) -> some View {
        VStack(spacing: 10) {
            HStack(alignment: .top, spacing: 16) {
                Text(title)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.secondary)
                    .frame(width: 80, alignment: .leading)

                Text(value)
                    .font(.subheadline)
                    .foregroundStyle(valueColor)
                    .frame(maxWidth: .infinity, alignment: .trailing)
                    .multilineTextAlignment(.trailing)
            }

            Divider()
        }
    }

    private func tipLine(_ text: String) -> some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: "checkmark.circle.fill")
                .foregroundStyle(.blue)
                .padding(.top, 2)
            Text(text)
                .font(.footnote)
                .foregroundStyle(.secondary)
        }
    }
}

#Preview {
    ContentView()
}
