package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"
)

type apiServer struct {
	store    *watchEcgStore
	aiClient watchEcgAIClient
}

func newHTTPHandler(store *watchEcgStore, logger *log.Logger, aiClient watchEcgAIClient) http.Handler {
	server := &apiServer{
		store:    store,
		aiClient: aiClient,
	}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", server.handleHealthz)
	mux.HandleFunc("POST /api/v1/watch-ecg/records", server.handleCreateRecord)
	mux.HandleFunc("GET /api/v1/watch-ecg/records/latest", server.handleGetLatestRecord)
	mux.HandleFunc("GET /api/watch-ecg/latest", server.handleGetLatestRecord)
	mux.HandleFunc("GET /api/v1/watch-ecg/records", server.handleListRecords)
	mux.HandleFunc("GET /api/watch-ecg/records", server.handleListRecords)
	mux.HandleFunc("GET /api/v1/watch-ecg/records/{id}", server.handleGetRecordByID)
	mux.HandleFunc("GET /api/watch-ecg/records/{id}", server.handleGetRecordByID)
	mux.HandleFunc("DELETE /api/v1/watch-ecg/records/{id}", server.handleDeleteRecord)
	mux.HandleFunc("DELETE /api/watch-ecg/records/{id}", server.handleDeleteRecord)
	mux.HandleFunc("POST /api/v1/watch-ecg/records/{id}/ai-analysis", server.handleAIAnalysis)
	mux.HandleFunc("POST /api/watch-ecg/records/{id}/ai-analysis", server.handleAIAnalysis)

	return withLocalCORS(withRequestLog(logger, mux))
}

func (s *apiServer) handleHealthz(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{
		"status": "ok",
	})
}

func (s *apiServer) handleCreateRecord(w http.ResponseWriter, r *http.Request) {
	requestID := newID("req")

	var input createWatchEcgRecordRequest
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeAPIError(w, http.StatusBadRequest, requestID, "watch_ecg_validation_failed", "请求体不是合法 JSON。")
		return
	}

	record, created, err := s.store.createRecord(r.Context(), input)
	if err != nil {
		statusCode := http.StatusInternalServerError
		errorCode := "watch_ecg_internal_error"
		message := "存储 Apple Watch ECG 记录失败。"

		if errors.Is(err, errValidationFailed) {
			statusCode = http.StatusBadRequest
			errorCode = "watch_ecg_validation_failed"
			message = err.Error()
		}

		writeAPIError(w, statusCode, requestID, errorCode, message)
		return
	}

	if created {
		writeJSON(w, http.StatusCreated, record)
		return
	}

	writeJSON(w, http.StatusOK, record)
}

func (s *apiServer) handleGetLatestRecord(w http.ResponseWriter, r *http.Request) {
	requestID := newID("req")
	patientID := strings.TrimSpace(r.URL.Query().Get("patientId"))

	record, err := s.store.getLatestRecord(r.Context(), patientID)
	if err != nil {
		if errors.Is(err, errNotFound) {
			message := "未找到 Apple Watch ECG 记录。"
			if patientID != "" {
				message = fmt.Sprintf("未找到 patientId=%s 的 Apple Watch ECG 记录。", patientID)
			}
			writeAPIError(w, http.StatusNotFound, requestID, "watch_ecg_not_found", message)
			return
		}

		writeAPIError(w, http.StatusInternalServerError, requestID, "watch_ecg_internal_error", "查询最新 Apple Watch ECG 记录失败。")
		return
	}

	writeJSON(w, http.StatusOK, record)
}

func (s *apiServer) handleListRecords(w http.ResponseWriter, r *http.Request) {
	requestID := newID("req")
	patientID := strings.TrimSpace(r.URL.Query().Get("patientId"))
	page := parsePositiveInt(r.URL.Query().Get("page"), defaultHistoryPage, 1, 100000)
	pageSize := resolveHistoryPageSize(r.URL.Query().Get("pageSize"), r.URL.Query().Get("limit"))

	total, err := s.store.countRecords(r.Context(), patientID)
	if err != nil {
		writeAPIError(w, http.StatusInternalServerError, requestID, "watch_ecg_internal_error", "统计 Apple Watch ECG 历史记录失败。")
		return
	}

	totalPages := calculateTotalPages(total, pageSize)
	if totalPages > 0 && page > totalPages {
		page = totalPages
	}

	offset := 0
	if total > 0 {
		offset = (page - 1) * pageSize
	}

	records, err := s.store.listRecordSummaries(r.Context(), patientID, offset, pageSize)
	if err != nil {
		writeAPIError(w, http.StatusInternalServerError, requestID, "watch_ecg_internal_error", "查询 Apple Watch ECG 历史记录失败。")
		return
	}

	writeJSON(w, http.StatusOK, watchEcgRecordListResponse{
		Items:    records,
		Page:     page,
		PageSize: pageSize,
		Total:    total,
	})
}

func (s *apiServer) handleGetRecordByID(w http.ResponseWriter, r *http.Request) {
	requestID := newID("req")
	recordID := strings.TrimSpace(r.PathValue("id"))

	record, err := s.store.getRecordByID(r.Context(), recordID)
	if err != nil {
		if errors.Is(err, errNotFound) {
			writeAPIError(w, http.StatusNotFound, requestID, "watch_ecg_not_found", "未找到指定的 Apple Watch ECG 记录。")
			return
		}

		writeAPIError(w, http.StatusInternalServerError, requestID, "watch_ecg_internal_error", "查询 Apple Watch ECG 记录失败。")
		return
	}

	writeJSON(w, http.StatusOK, record)
}

func (s *apiServer) handleDeleteRecord(w http.ResponseWriter, r *http.Request) {
	requestID := newID("req")
	recordID := strings.TrimSpace(r.PathValue("id"))

	deleted, err := s.store.deleteRecordByID(r.Context(), recordID)
	if err != nil {
		writeAPIError(w, http.StatusInternalServerError, requestID, "watch_ecg_internal_error", "删除 Apple Watch ECG 记录失败。")
		return
	}
	if !deleted {
		writeAPIError(w, http.StatusNotFound, requestID, "watch_ecg_not_found", "未找到指定的 Apple Watch ECG 记录。")
		return
	}

	writeJSON(w, http.StatusOK, watchEcgDeleteResponse{
		ID:        recordID,
		Status:    "deleted",
		DeletedAt: time.Now().UTC().Format(time.RFC3339),
	})
}

func (s *apiServer) handleAIAnalysis(w http.ResponseWriter, r *http.Request) {
	requestID := newID("req")
	recordID := strings.TrimSpace(r.PathValue("id"))

	record, err := s.store.getRecordByID(r.Context(), recordID)
	if err != nil {
		if errors.Is(err, errNotFound) {
			writeAPIError(w, http.StatusNotFound, requestID, "watch_ecg_not_found", "未找到指定的 Apple Watch ECG 记录。")
			return
		}

		writeAPIError(w, http.StatusInternalServerError, requestID, "watch_ecg_internal_error", "读取 Apple Watch ECG 记录失败。")
		return
	}

	response, err := s.aiClient.analyzeRecord(r.Context(), record)
	if err != nil {
		statusCode := http.StatusBadGateway
		errorCode := "watch_ecg_ai_failed"
		message := fmt.Sprintf("AI 分析失败：%v", err)

		if errors.Is(err, errAIUnavailable) {
			statusCode = http.StatusServiceUnavailable
			errorCode = "watch_ecg_ai_unavailable"
			message = "未配置 AI 网关，请设置 WATCH_ECG_AI_BASE_URL / WATCH_ECG_AI_API_KEY / WATCH_ECG_AI_MODEL。"
		}

		writeAPIError(w, statusCode, requestID, errorCode, message)
		return
	}

	writeJSON(w, http.StatusOK, response)
}
