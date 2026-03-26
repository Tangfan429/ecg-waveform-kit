package main

import "errors"

const (
	defaultAddr                = "0.0.0.0:8090"
	defaultDBPath              = "./data/watch-ecg.db"
	defaultHistoryPage         = 1
	defaultHistoryPageSize     = 12
	defaultAITimeoutSeconds    = 45
	defaultWaveformPreviewSize = 256
	sourceAppleWatch           = "apple_watch"
	leadModeLeadI              = "leadI"
	leadNameI                  = "I"
)

var (
	errNotFound         = errors.New("watch ecg record not found")
	errValidationFailed = errors.New("watch ecg validation failed")
	errAIUnavailable    = errors.New("watch ecg ai gateway not configured")
)

type watchEcgRecord struct {
	ID             string         `json:"id"`
	PatientID      string         `json:"patientId"`
	EncounterID    string         `json:"encounterId,omitempty"`
	Source         string         `json:"source"`
	SourceRecordID string         `json:"sourceRecordId"`
	RecordedAt     string         `json:"recordedAt"`
	SampleRate     int            `json:"sampleRate"`
	Duration       float64        `json:"duration"`
	LeadMode       string         `json:"leadMode"`
	LeadName       string         `json:"leadName"`
	Waveform       []float64      `json:"waveform,omitempty"`
	Summary        map[string]any `json:"summary,omitempty"`
	Device         map[string]any `json:"device,omitempty"`
	IngestedAt     string         `json:"ingestedAt,omitempty"`
	Status         string         `json:"status,omitempty"`
}

type watchEcgRecordSummary struct {
	ID             string         `json:"id"`
	PatientID      string         `json:"patientId"`
	EncounterID    string         `json:"encounterId,omitempty"`
	Source         string         `json:"source"`
	SourceRecordID string         `json:"sourceRecordId"`
	RecordedAt     string         `json:"recordedAt"`
	SampleRate     int            `json:"sampleRate"`
	Duration       float64        `json:"duration"`
	LeadMode       string         `json:"leadMode"`
	LeadName       string         `json:"leadName"`
	Summary        map[string]any `json:"summary,omitempty"`
	Device         map[string]any `json:"device,omitempty"`
	IngestedAt     string         `json:"ingestedAt,omitempty"`
	Status         string         `json:"status,omitempty"`
}

type watchEcgRecordListResponse struct {
	Items    []watchEcgRecordSummary `json:"items"`
	Page     int                     `json:"page"`
	PageSize int                     `json:"pageSize"`
	Total    int                     `json:"total"`
}

type createWatchEcgRecordRequest struct {
	PatientID      string         `json:"patientId"`
	EncounterID    string         `json:"encounterId"`
	Source         string         `json:"source"`
	SourceRecordID string         `json:"sourceRecordId"`
	RecordedAt     string         `json:"recordedAt"`
	SampleRate     int            `json:"sampleRate"`
	Duration       float64        `json:"duration"`
	LeadMode       string         `json:"leadMode"`
	LeadName       string         `json:"leadName"`
	Waveform       []float64      `json:"waveform"`
	Summary        map[string]any `json:"summary"`
	Device         map[string]any `json:"device"`
}

type watchEcgDeleteResponse struct {
	ID        string `json:"id"`
	Status    string `json:"status"`
	DeletedAt string `json:"deletedAt"`
}

type watchEcgAIAnalysis struct {
	Summary               string   `json:"summary"`
	RhythmAssessment      string   `json:"rhythmAssessment"`
	RiskLevel             string   `json:"riskLevel"`
	KeyFindings           []string `json:"keyFindings"`
	DiagnosticSuggestions []string `json:"diagnosticSuggestions"`
	RecommendedActions    []string `json:"recommendedActions"`
	Limitations           string   `json:"limitations"`
}

type watchEcgAIResponse struct {
	RecordID  string             `json:"recordId"`
	Provider  string             `json:"provider"`
	Model     string             `json:"model"`
	CreatedAt string             `json:"createdAt"`
	Advisory  string             `json:"advisory"`
	Analysis  watchEcgAIAnalysis `json:"analysis"`
	RawText   string             `json:"rawText,omitempty"`
}

type waveformFeatureSummary struct {
	PointCount       int       `json:"pointCount"`
	SampleRate       int       `json:"sampleRate"`
	DurationSeconds  float64   `json:"durationSeconds"`
	Min              float64   `json:"min"`
	Max              float64   `json:"max"`
	Mean             float64   `json:"mean"`
	StdDev           float64   `json:"stdDev"`
	AmplitudeRange   float64   `json:"amplitudeRange"`
	EstimatedHR      float64   `json:"estimatedHeartRate"`
	RPeakCount       int       `json:"rPeakCount"`
	RPeakPositionsMs []float64 `json:"rPeakPositionsMs"`
	RRIntervalsMs    []float64 `json:"rrIntervalsMs"`
	RRMeanMs         float64   `json:"rrMeanMs"`
	RRStdMs          float64   `json:"rrStdMs"`
	WaveformPreview  []float64 `json:"waveformPreview"`
}

type errorEnvelope struct {
	Error apiError `json:"error"`
}

type apiError struct {
	Code      string `json:"code"`
	Message   string `json:"message"`
	RequestID string `json:"requestId"`
}
