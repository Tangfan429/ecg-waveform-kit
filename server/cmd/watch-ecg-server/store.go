package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"strings"
	"time"
)

const watchEcgSchema = `
CREATE TABLE IF NOT EXISTS watch_ecg_records (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  encounter_id TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL,
  source_record_id TEXT NOT NULL,
  recorded_at TEXT NOT NULL,
  recorded_at_unix INTEGER NOT NULL,
  sample_rate INTEGER NOT NULL,
  duration_seconds REAL NOT NULL,
  lead_mode TEXT NOT NULL,
  lead_name TEXT NOT NULL,
  waveform_json TEXT NOT NULL,
  summary_json TEXT NOT NULL,
  device_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (source, source_record_id)
);

CREATE INDEX IF NOT EXISTS idx_watch_ecg_records_patient_recorded_at
ON watch_ecg_records(patient_id, recorded_at_unix DESC);

CREATE INDEX IF NOT EXISTS idx_watch_ecg_records_recorded_at
ON watch_ecg_records(recorded_at_unix DESC);
`

const baseSelectQuery = `
SELECT
  id,
  patient_id,
  encounter_id,
  source,
  source_record_id,
  recorded_at,
  sample_rate,
  duration_seconds,
  lead_mode,
  lead_name,
  waveform_json,
  summary_json,
  device_json,
  created_at
FROM watch_ecg_records
`

type watchEcgStore struct {
	db *sql.DB
}

func newWatchEcgStore(db *sql.DB) *watchEcgStore {
	return &watchEcgStore{db: db}
}

func (s *watchEcgStore) initSchema(ctx context.Context) error {
	_, err := s.db.ExecContext(ctx, watchEcgSchema)
	return err
}

func (s *watchEcgStore) createRecord(ctx context.Context, input createWatchEcgRecordRequest) (watchEcgRecord, bool, error) {
	record, err := normalizeCreateRequest(input)
	if err != nil {
		return watchEcgRecord{}, false, err
	}

	existingRecord, err := s.getRecordBySourceKey(ctx, record.Source, record.SourceRecordID)
	if err == nil {
		existingRecord.Status = "stored"
		return existingRecord, false, nil
	}
	if err != nil && !errors.Is(err, errNotFound) {
		return watchEcgRecord{}, false, err
	}

	waveformJSON, err := json.Marshal(record.Waveform)
	if err != nil {
		return watchEcgRecord{}, false, err
	}

	summaryJSON, err := json.Marshal(record.Summary)
	if err != nil {
		return watchEcgRecord{}, false, err
	}

	deviceJSON, err := json.Marshal(record.Device)
	if err != nil {
		return watchEcgRecord{}, false, err
	}

	_, err = s.db.ExecContext(
		ctx,
		`INSERT INTO watch_ecg_records (
			id,
			patient_id,
			encounter_id,
			source,
			source_record_id,
			recorded_at,
			recorded_at_unix,
			sample_rate,
			duration_seconds,
			lead_mode,
			lead_name,
			waveform_json,
			summary_json,
			device_json,
			created_at,
			updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		record.ID,
		record.PatientID,
		record.EncounterID,
		record.Source,
		record.SourceRecordID,
		record.RecordedAt,
		mustParseRFC3339(record.RecordedAt).Unix(),
		record.SampleRate,
		record.Duration,
		record.LeadMode,
		record.LeadName,
		string(waveformJSON),
		string(summaryJSON),
		string(deviceJSON),
		record.IngestedAt,
		record.IngestedAt,
	)
	if err != nil {
		return watchEcgRecord{}, false, err
	}

	record.Status = "stored"
	return record, true, nil
}

func (s *watchEcgStore) getLatestRecord(ctx context.Context, patientID string) (watchEcgRecord, error) {
	query := baseSelectQuery + ` ORDER BY recorded_at_unix DESC, created_at DESC LIMIT 1`
	args := []any{}

	if patientID != "" {
		query = baseSelectQuery + ` WHERE patient_id = ? ORDER BY recorded_at_unix DESC, created_at DESC LIMIT 1`
		args = append(args, patientID)
	}

	return s.scanRecord(ctx, query, args...)
}

func (s *watchEcgStore) getRecordByID(ctx context.Context, recordID string) (watchEcgRecord, error) {
	if strings.TrimSpace(recordID) == "" {
		return watchEcgRecord{}, errNotFound
	}

	return s.scanRecord(ctx, baseSelectQuery+` WHERE id = ? LIMIT 1`, recordID)
}

func (s *watchEcgStore) getRecordBySourceKey(ctx context.Context, source, sourceRecordID string) (watchEcgRecord, error) {
	return s.scanRecord(
		ctx,
		baseSelectQuery+` WHERE source = ? AND source_record_id = ? LIMIT 1`,
		source,
		sourceRecordID,
	)
}

func (s *watchEcgStore) countRecords(ctx context.Context, patientID string) (int, error) {
	query := `SELECT COUNT(1) FROM watch_ecg_records`
	args := []any{}

	if patientID != "" {
		query += ` WHERE patient_id = ?`
		args = append(args, patientID)
	}

	var total int
	if err := s.db.QueryRowContext(ctx, query, args...).Scan(&total); err != nil {
		return 0, err
	}

	return total, nil
}

func (s *watchEcgStore) listRecordSummaries(ctx context.Context, patientID string, offset, limit int) ([]watchEcgRecordSummary, error) {
	query := `
SELECT
  id,
  patient_id,
  encounter_id,
  source,
  source_record_id,
  recorded_at,
  sample_rate,
  duration_seconds,
  lead_mode,
  lead_name,
  summary_json,
  device_json,
  created_at
FROM watch_ecg_records
`
	args := []any{}

	if patientID != "" {
		query += ` WHERE patient_id = ?`
		args = append(args, patientID)
	}

	query += ` ORDER BY recorded_at_unix DESC, created_at DESC LIMIT ? OFFSET ?`
	args = append(args, limit, offset)

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	records := make([]watchEcgRecordSummary, 0, limit)

	for rows.Next() {
		var record watchEcgRecordSummary
		var summaryJSON string
		var deviceJSON string

		if err := rows.Scan(
			&record.ID,
			&record.PatientID,
			&record.EncounterID,
			&record.Source,
			&record.SourceRecordID,
			&record.RecordedAt,
			&record.SampleRate,
			&record.Duration,
			&record.LeadMode,
			&record.LeadName,
			&summaryJSON,
			&deviceJSON,
			&record.IngestedAt,
		); err != nil {
			return nil, err
		}

		if err := json.Unmarshal([]byte(summaryJSON), &record.Summary); err != nil {
			return nil, err
		}
		if err := json.Unmarshal([]byte(deviceJSON), &record.Device); err != nil {
			return nil, err
		}

		record.Status = "stored"
		records = append(records, record)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return records, nil
}

func (s *watchEcgStore) deleteRecordByID(ctx context.Context, recordID string) (bool, error) {
	if strings.TrimSpace(recordID) == "" {
		return false, nil
	}

	result, err := s.db.ExecContext(ctx, `DELETE FROM watch_ecg_records WHERE id = ?`, recordID)
	if err != nil {
		return false, err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return false, err
	}

	return rowsAffected > 0, nil
}

func (s *watchEcgStore) scanRecord(ctx context.Context, query string, args ...any) (watchEcgRecord, error) {
	row := s.db.QueryRowContext(ctx, query, args...)

	var record watchEcgRecord
	var waveformJSON string
	var summaryJSON string
	var deviceJSON string

	err := row.Scan(
		&record.ID,
		&record.PatientID,
		&record.EncounterID,
		&record.Source,
		&record.SourceRecordID,
		&record.RecordedAt,
		&record.SampleRate,
		&record.Duration,
		&record.LeadMode,
		&record.LeadName,
		&waveformJSON,
		&summaryJSON,
		&deviceJSON,
		&record.IngestedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return watchEcgRecord{}, errNotFound
		}
		return watchEcgRecord{}, err
	}

	if err := json.Unmarshal([]byte(waveformJSON), &record.Waveform); err != nil {
		return watchEcgRecord{}, err
	}
	if err := json.Unmarshal([]byte(summaryJSON), &record.Summary); err != nil {
		return watchEcgRecord{}, err
	}
	if err := json.Unmarshal([]byte(deviceJSON), &record.Device); err != nil {
		return watchEcgRecord{}, err
	}

	record.Status = "stored"
	return record, nil
}

func normalizeCreateRequest(input createWatchEcgRecordRequest) (watchEcgRecord, error) {
	recordedAt, err := time.Parse(time.RFC3339, strings.TrimSpace(input.RecordedAt))
	if err != nil {
		return watchEcgRecord{}, fmt.Errorf("%w: recordedAt 必须是 RFC3339 时间格式", errValidationFailed)
	}

	patientID := strings.TrimSpace(input.PatientID)
	if patientID == "" {
		return watchEcgRecord{}, fmt.Errorf("%w: patientId 不能为空", errValidationFailed)
	}

	source := strings.TrimSpace(input.Source)
	if source != sourceAppleWatch {
		return watchEcgRecord{}, fmt.Errorf("%w: source 只支持 apple_watch", errValidationFailed)
	}

	sourceRecordID := strings.TrimSpace(input.SourceRecordID)
	if sourceRecordID == "" {
		return watchEcgRecord{}, fmt.Errorf("%w: sourceRecordId 不能为空", errValidationFailed)
	}

	if input.SampleRate <= 0 {
		return watchEcgRecord{}, fmt.Errorf("%w: sampleRate 必须大于 0", errValidationFailed)
	}

	if input.Duration <= 0 {
		return watchEcgRecord{}, fmt.Errorf("%w: duration 必须大于 0", errValidationFailed)
	}

	if strings.TrimSpace(input.LeadMode) != leadModeLeadI {
		return watchEcgRecord{}, fmt.Errorf("%w: leadMode 只支持 leadI", errValidationFailed)
	}

	if strings.TrimSpace(input.LeadName) != leadNameI {
		return watchEcgRecord{}, fmt.Errorf("%w: leadName 只支持 I", errValidationFailed)
	}

	if len(input.Waveform) == 0 {
		return watchEcgRecord{}, fmt.Errorf("%w: waveform 不能为空", errValidationFailed)
	}

	expectedDuration := float64(len(input.Waveform)) / float64(input.SampleRate)
	if math.Abs(expectedDuration-input.Duration) > 0.5 {
		return watchEcgRecord{}, fmt.Errorf("%w: duration 与 waveform/sampleRate 不匹配", errValidationFailed)
	}

	normalizedWaveform := make([]float64, 0, len(input.Waveform))
	for _, point := range input.Waveform {
		if math.IsNaN(point) || math.IsInf(point, 0) {
			return watchEcgRecord{}, fmt.Errorf("%w: waveform 含有非法数值", errValidationFailed)
		}
		normalizedWaveform = append(normalizedWaveform, point)
	}

	now := time.Now().UTC().Format(time.RFC3339)
	record := watchEcgRecord{
		ID:             newID("wecg"),
		PatientID:      patientID,
		EncounterID:    strings.TrimSpace(input.EncounterID),
		Source:         source,
		SourceRecordID: sourceRecordID,
		RecordedAt:     recordedAt.UTC().Format(time.RFC3339),
		SampleRate:     input.SampleRate,
		Duration:       roundDuration(input.Duration),
		LeadMode:       leadModeLeadI,
		LeadName:       leadNameI,
		Waveform:       normalizedWaveform,
		Summary:        cloneJSONObject(input.Summary),
		Device:         cloneJSONObject(input.Device),
		IngestedAt:     now,
		Status:         "stored",
	}

	if record.Summary == nil {
		record.Summary = map[string]any{}
	}
	if record.Device == nil {
		record.Device = map[string]any{}
	}

	return record, nil
}
