package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"math"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

func ensureDBPath(dbPath string) (string, error) {
	absolutePath, err := filepath.Abs(dbPath)
	if err != nil {
		return "", err
	}

	if err := os.MkdirAll(filepath.Dir(absolutePath), 0o755); err != nil {
		return "", err
	}

	return absolutePath, nil
}

func applySQLitePragmas(db *sql.DB) error {
	pragmas := []string{
		"PRAGMA journal_mode = WAL;",
		"PRAGMA synchronous = NORMAL;",
		"PRAGMA foreign_keys = ON;",
	}

	for _, statement := range pragmas {
		if _, err := db.Exec(statement); err != nil {
			return err
		}
	}

	return nil
}

func roundDuration(value float64) float64 {
	return math.Round(value*1000) / 1000
}

func roundFloat(value float64, precision int) float64 {
	if precision < 0 {
		return value
	}

	multiplier := math.Pow(10, float64(precision))
	return math.Round(value*multiplier) / multiplier
}

func cloneJSONObject(input map[string]any) map[string]any {
	if len(input) == 0 {
		return map[string]any{}
	}

	cloned := make(map[string]any, len(input))
	for key, value := range input {
		cloned[key] = value
	}

	return cloned
}

func mustParseRFC3339(value string) time.Time {
	parsed, err := time.Parse(time.RFC3339, value)
	if err != nil {
		return time.Now().UTC()
	}

	return parsed
}

func parsePositiveInt(value string, fallback, minimum, maximum int) int {
	parsedValue, err := strconv.Atoi(strings.TrimSpace(value))
	if err != nil {
		return fallback
	}

	if parsedValue < minimum {
		return minimum
	}
	if maximum > 0 && parsedValue > maximum {
		return maximum
	}

	return parsedValue
}

func resolveHistoryPageSize(pageSizeValue, limitValue string) int {
	if strings.TrimSpace(pageSizeValue) != "" {
		return parsePositiveInt(pageSizeValue, defaultHistoryPageSize, 1, 100)
	}

	if strings.TrimSpace(limitValue) != "" {
		return parsePositiveInt(limitValue, defaultHistoryPageSize, 1, 100)
	}

	return defaultHistoryPageSize
}

func calculateTotalPages(total, pageSize int) int {
	if total <= 0 || pageSize <= 0 {
		return 0
	}

	return int(math.Ceil(float64(total) / float64(pageSize)))
}

func meanOfFloatSlice(values []float64) float64 {
	if len(values) == 0 {
		return 0
	}

	sum := 0.0
	for _, value := range values {
		sum += value
	}

	return sum / float64(len(values))
}

func stdDevOfFloatSlice(values []float64, mean float64) float64 {
	if len(values) == 0 {
		return 0
	}

	sum := 0.0
	for _, value := range values {
		diff := value - mean
		sum += diff * diff
	}

	return math.Sqrt(sum / float64(len(values)))
}

func truncateFloatSlice(values []float64, limit int) []float64 {
	if len(values) == 0 {
		return []float64{}
	}
	if limit <= 0 || len(values) <= limit {
		copiedValues := make([]float64, len(values))
		copy(copiedValues, values)
		return copiedValues
	}

	copiedValues := make([]float64, limit)
	copy(copiedValues, values[:limit])
	return copiedValues
}

func maxInt(left, right int) int {
	if left > right {
		return left
	}

	return right
}

func writeJSON(w http.ResponseWriter, statusCode int, payload any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(statusCode)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeAPIError(w http.ResponseWriter, statusCode int, requestID, code, message string) {
	writeJSON(w, statusCode, errorEnvelope{
		Error: apiError{
			Code:      code,
			Message:   message,
			RequestID: requestID,
		},
	})
}

func withLocalCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, Idempotency-Key")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func withRequestLog(logger *log.Logger, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		startedAt := time.Now()
		next.ServeHTTP(w, r)
		logger.Printf("%s %s %s", r.Method, r.URL.Path, time.Since(startedAt).Round(time.Millisecond))
	})
}

func newID(prefix string) string {
	return fmt.Sprintf("%s_%d", prefix, time.Now().UnixNano())
}
