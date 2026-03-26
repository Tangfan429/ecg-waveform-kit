# Watch ECG Bridge

这是给当前仓库配套的最小 iOS 桥接 App。

作用只有一件事：

1. 从 HealthKit 读取最近一条 Apple Watch ECG。
2. 提取 `Lead I` 波形点。
3. 自动或手动上传到当前仓库的本地 Go 接口。

## 运行前提

- macOS 已安装 Xcode
- iPhone 已和 Apple Watch 配对
- 健康 App 中已经存在 Apple Watch ECG 记录
- Mac 与 iPhone 在同一个局域网

## 本地后端

先在 Mac 上启动当前仓库的 Go 服务，并对局域网开放：

```bash
cd /Users/b022mc/project/ecg-waveform-kit/server
WATCH_ECG_ADDR=0.0.0.0:8090 go run ./cmd/watch-ecg-server
```

查看 Mac 当前局域网 IP：

```bash
ipconfig getifaddr en0
```

如果没有输出，再试：

```bash
ipconfig getifaddr en1
```

## 生成 Xcode 工程

在本目录执行：

```bash
xcodegen
```

会生成：

```text
WatchEcgBridge.xcodeproj
```

## Xcode 内需要做的事

1. 打开 `WatchEcgBridge.xcodeproj`
2. 选中 target `WatchEcgBridge`
3. 在 `Signing & Capabilities` 里选择你的 `Personal Team`
4. 确认 `HealthKit` capability 已启用
5. 把 iPhone 连到 Mac
6. 按提示开启 iPhone 的 `Developer Mode`
7. 运行到真机

## App 内操作顺序

1. 填 `patientId`
2. 填 `http://你的Mac局域网IP:8090`
3. 点“请求 HealthKit 权限”
4. 打开“自动同步新 ECG”
5. 点一次“请求 HealthKit 权限”
6. 保持 App 至少启动过一次，不要从多任务列表手动强杀

之后在 Apple Watch 上新生成一条 ECG，只要它同步进 iPhone 健康 App，桥接 App 就会自动上传到本地 Go 服务。

如果需要调试，也可以继续用：

- “读取最新 ECG”
- “立即上传到本地 API”

上传成功后，当前 Vue 项目切到 `Apple Watch API` 数据源就会联动显示。

## 注意

- iPhone 不能访问 `127.0.0.1:8090`，必须访问 Mac 的局域网 IP。
- 如果想让新 ECG 自动上传，Go 服务建议监听 `0.0.0.0:8090`，而不是只监听 `127.0.0.1`。
- iOS 被用户手动强杀后，HealthKit 后台交付不会继续唤醒这个桥接 App；需要重新打开一次。
- 现在 `Info.plist` 里为了本地调试，放开了 HTTP 明文访问。后续如果要正式分发，建议改成 HTTPS。
- 当前桥接只上传最新一条 ECG，且只取 `Lead I`。
