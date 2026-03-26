package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"
)

type openAIChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type openAIChatCompletionRequest struct {
	Model       string              `json:"model"`
	Messages    []openAIChatMessage `json:"messages"`
	Temperature float64             `json:"temperature,omitempty"`
}

type openAIChatCompletionResponse struct {
	Choices []struct {
		Message struct {
			Content any `json:"content"`
		} `json:"message"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

type watchEcgAIClient struct {
	baseURL    string
	apiKey     string
	model      string
	provider   string
	timeout    time.Duration
	httpClient *http.Client
}

func newWatchEcgAIClientFromEnv() watchEcgAIClient {
	baseURL := strings.TrimSpace(os.Getenv("WATCH_ECG_AI_BASE_URL"))
	apiKey := strings.TrimSpace(os.Getenv("WATCH_ECG_AI_API_KEY"))
	model := strings.TrimSpace(os.Getenv("WATCH_ECG_AI_MODEL"))
	timeoutSeconds := parsePositiveInt(
		os.Getenv("WATCH_ECG_AI_TIMEOUT_SECONDS"),
		defaultAITimeoutSeconds,
		5,
		300,
	)

	provider := strings.TrimSpace(os.Getenv("WATCH_ECG_AI_PROVIDER"))
	if provider == "" {
		provider = "openai-compatible"
	}

	timeout := time.Duration(timeoutSeconds) * time.Second

	return watchEcgAIClient{
		baseURL:  baseURL,
		apiKey:   apiKey,
		model:    model,
		provider: provider,
		timeout:  timeout,
		httpClient: &http.Client{
			Timeout: timeout,
		},
	}
}

func (c watchEcgAIClient) isConfigured() bool {
	return c.baseURL != "" && c.apiKey != "" && c.model != ""
}

func (c watchEcgAIClient) analyzeRecord(ctx context.Context, record watchEcgRecord) (watchEcgAIResponse, error) {
	if !c.isConfigured() {
		return watchEcgAIResponse{}, errAIUnavailable
	}

	features := buildWaveformFeatureSummary(record)
	prompt := buildAIAnalysisPrompt(record, features)

	requestPayload := openAIChatCompletionRequest{
		Model: c.model,
		Messages: []openAIChatMessage{
			{
				Role:    "system",
				Content: "你是心电图辅助分析助手。你只能做辅助判断，不得给出确定诊断，不得替代医生。当前输入来自 Apple Watch Lead I 单导联 ECG，必须强调单导联局限性。输出必须是 JSON，不要输出代码块、不要输出额外说明。",
			},
			{
				Role:    "user",
				Content: prompt,
			},
		},
		Temperature: 0.2,
	}

	requestBody, err := json.Marshal(requestPayload)
	if err != nil {
		return watchEcgAIResponse{}, err
	}

	httpRequest, err := http.NewRequestWithContext(
		ctx,
		http.MethodPost,
		resolveAIChatCompletionsURL(c.baseURL),
		bytes.NewReader(requestBody),
	)
	if err != nil {
		return watchEcgAIResponse{}, err
	}

	httpRequest.Header.Set("Authorization", "Bearer "+c.apiKey)
	httpRequest.Header.Set("Content-Type", "application/json")
	httpRequest.Header.Set("Accept", "application/json")

	httpResponse, err := c.httpClient.Do(httpRequest)
	if err != nil {
		return watchEcgAIResponse{}, err
	}
	defer httpResponse.Body.Close()

	responseBody, err := io.ReadAll(io.LimitReader(httpResponse.Body, 2<<20))
	if err != nil {
		return watchEcgAIResponse{}, err
	}

	if httpResponse.StatusCode < http.StatusOK || httpResponse.StatusCode >= http.StatusMultipleChoices {
		var failurePayload openAIChatCompletionResponse
		if err := json.Unmarshal(responseBody, &failurePayload); err == nil && failurePayload.Error != nil && strings.TrimSpace(failurePayload.Error.Message) != "" {
			return watchEcgAIResponse{}, errors.New(strings.TrimSpace(failurePayload.Error.Message))
		}

		return watchEcgAIResponse{}, fmt.Errorf("上游模型接口返回 HTTP %d", httpResponse.StatusCode)
	}

	var completionPayload openAIChatCompletionResponse
	if err := json.Unmarshal(responseBody, &completionPayload); err != nil {
		return watchEcgAIResponse{}, err
	}

	if len(completionPayload.Choices) == 0 {
		return watchEcgAIResponse{}, errors.New("上游模型接口未返回可用结果")
	}

	rawText := strings.TrimSpace(extractMessageContent(completionPayload.Choices[0].Message.Content))
	analysis, parseErr := parseAIAnalysis(rawText)

	response := watchEcgAIResponse{
		RecordID:  record.ID,
		Provider:  c.provider,
		Model:     c.model,
		CreatedAt: time.Now().UTC().Format(time.RFC3339),
		Advisory:  "仅供辅助分析，不替代医生诊断；若伴胸痛、晕厥、持续心悸等症状，请立即线下就医。",
		Analysis:  analysis,
	}

	if parseErr != nil {
		response.RawText = rawText
	}

	return response, nil
}

func buildAIAnalysisPrompt(record watchEcgRecord, features waveformFeatureSummary) string {
	payload := map[string]any{
		"record": map[string]any{
			"id":             record.ID,
			"patientId":      record.PatientID,
			"recordedAt":     record.RecordedAt,
			"source":         record.Source,
			"leadMode":       record.LeadMode,
			"leadName":       record.LeadName,
			"sampleRate":     record.SampleRate,
			"duration":       record.Duration,
			"summary":        record.Summary,
			"device":         record.Device,
			"waveformPoints": len(record.Waveform),
		},
		"derivedFeatures": features,
	}

	payloadJSON, err := json.MarshalIndent(payload, "", "  ")
	if err != nil {
		payloadJSON = []byte("{}")
	}

	return fmt.Sprintf(
		`请基于下面这条 Apple Watch Lead I 单导联 ECG 数据做辅助分析。

规则：
1. 只能做辅助解读，不得给出确定诊断。
2. 必须明确说明这是单导联 Lead I，不能替代十二导联 ECG 或医生诊断。
3. 若波形质量、导联数量或特征不足，请明确写出局限性。
4. diagnosticSuggestions 只能写“可能提示/建议结合临床排查”的表述。
5. recommendedActions 只给出安全、稳妥的下一步建议。
6. 只输出一个 JSON 对象，字段必须完整：
{
  "summary": "一句话总结",
  "rhythmAssessment": "对节律的辅助判断",
  "riskLevel": "low|moderate|high|unknown",
  "keyFindings": ["重点发现1"],
  "diagnosticSuggestions": ["可能提示..."],
  "recommendedActions": ["建议..."],
  "limitations": "局限性说明"
}

输入数据：
%s`,
		string(payloadJSON),
	)
}

func parseAIAnalysis(rawText string) (watchEcgAIAnalysis, error) {
	normalizedText := normalizeAIResponseText(rawText)
	start := strings.Index(normalizedText, "{")
	end := strings.LastIndex(normalizedText, "}")

	if start < 0 || end <= start {
		return emptyAIAnalysis(), errors.New("模型未返回 JSON 结果")
	}

	jsonSegment := normalizedText[start : end+1]
	var analysis watchEcgAIAnalysis
	if err := json.Unmarshal([]byte(jsonSegment), &analysis); err != nil {
		return emptyAIAnalysis(), err
	}

	return normalizeAIAnalysis(analysis), nil
}

func normalizeAIResponseText(value string) string {
	trimmed := strings.TrimSpace(value)
	if !strings.HasPrefix(trimmed, "```") {
		return trimmed
	}

	trimmed = strings.TrimPrefix(trimmed, "```json")
	trimmed = strings.TrimPrefix(trimmed, "```JSON")
	trimmed = strings.TrimPrefix(trimmed, "```")
	trimmed = strings.TrimSuffix(trimmed, "```")
	return strings.TrimSpace(trimmed)
}

func normalizeAIAnalysis(input watchEcgAIAnalysis) watchEcgAIAnalysis {
	input.Summary = strings.TrimSpace(input.Summary)
	input.RhythmAssessment = strings.TrimSpace(input.RhythmAssessment)
	input.Limitations = strings.TrimSpace(input.Limitations)

	normalizedRiskLevel := strings.ToLower(strings.TrimSpace(input.RiskLevel))
	switch normalizedRiskLevel {
	case "low", "moderate", "high", "unknown":
		input.RiskLevel = normalizedRiskLevel
	default:
		input.RiskLevel = "unknown"
	}

	input.KeyFindings = normalizeStringSlice(input.KeyFindings)
	input.DiagnosticSuggestions = normalizeStringSlice(input.DiagnosticSuggestions)
	input.RecommendedActions = normalizeStringSlice(input.RecommendedActions)

	return input
}

func emptyAIAnalysis() watchEcgAIAnalysis {
	return watchEcgAIAnalysis{
		RiskLevel:             "unknown",
		KeyFindings:           []string{},
		DiagnosticSuggestions: []string{},
		RecommendedActions:    []string{},
	}
}

func normalizeStringSlice(values []string) []string {
	if len(values) == 0 {
		return []string{}
	}

	normalized := make([]string, 0, len(values))
	for _, value := range values {
		item := strings.TrimSpace(value)
		if item != "" {
			normalized = append(normalized, item)
		}
	}

	return normalized
}

func extractMessageContent(content any) string {
	switch value := content.(type) {
	case string:
		return value
	case []any:
		parts := make([]string, 0, len(value))
		for _, item := range value {
			switch typedItem := item.(type) {
			case map[string]any:
				textValue := strings.TrimSpace(fmt.Sprintf("%v", typedItem["text"]))
				if textValue != "" && textValue != "<nil>" {
					parts = append(parts, textValue)
				}
			default:
				textValue := strings.TrimSpace(fmt.Sprintf("%v", item))
				if textValue != "" && textValue != "<nil>" {
					parts = append(parts, textValue)
				}
			}
		}
		return strings.Join(parts, "\n")
	default:
		return strings.TrimSpace(fmt.Sprintf("%v", content))
	}
}

func resolveAIChatCompletionsURL(baseURL string) string {
	normalizedURL := strings.TrimRight(strings.TrimSpace(baseURL), "/")
	if strings.HasSuffix(normalizedURL, "/chat/completions") {
		return normalizedURL
	}
	if strings.HasSuffix(normalizedURL, "/v1") {
		return normalizedURL + "/chat/completions"
	}

	return normalizedURL + "/chat/completions"
}
