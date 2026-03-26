package main

import (
	"context"
	"database/sql"
	"errors"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	_ "modernc.org/sqlite"
)

type serverConfig struct {
	addr   string
	dbPath string
}

func main() {
	logger := log.New(os.Stdout, "[watch-ecg-api] ", log.LstdFlags|log.Lmsgprefix)

	if err := runServer(logger); err != nil {
		logger.Fatalf("serve: %v", err)
	}
}

func runServer(logger *log.Logger) error {
	config := loadServerConfig()

	db, absoluteDBPath, err := openSQLiteDatabase(config.dbPath)
	if err != nil {
		return err
	}
	defer db.Close()

	store := newWatchEcgStore(db)
	if err := store.initSchema(context.Background()); err != nil {
		return err
	}

	aiClient := newWatchEcgAIClientFromEnv()
	handler := newHTTPHandler(store, logger, aiClient)
	server := newHTTPServer(config.addr, handler)

	logStartup(logger, config.addr, absoluteDBPath, aiClient)

	if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		return err
	}

	return nil
}

func loadServerConfig() serverConfig {
	dbPath := strings.TrimSpace(os.Getenv("WATCH_ECG_DB_PATH"))
	if dbPath == "" {
		dbPath = defaultDBPath
	}

	addr := strings.TrimSpace(os.Getenv("WATCH_ECG_ADDR"))
	if addr == "" {
		addr = defaultAddr
	}

	return serverConfig{
		addr:   addr,
		dbPath: dbPath,
	}
}

func openSQLiteDatabase(dbPath string) (*sql.DB, string, error) {
	absoluteDBPath, err := ensureDBPath(dbPath)
	if err != nil {
		return nil, "", err
	}

	db, err := sql.Open("sqlite", absoluteDBPath)
	if err != nil {
		return nil, "", err
	}

	if err := applySQLitePragmas(db); err != nil {
		_ = db.Close()
		return nil, "", err
	}

	return db, absoluteDBPath, nil
}

func newHTTPServer(addr string, handler http.Handler) *http.Server {
	return &http.Server{
		Addr:              addr,
		Handler:           handler,
		ReadHeaderTimeout: 5 * time.Second,
	}
}

func logStartup(logger *log.Logger, addr, absoluteDBPath string, aiClient watchEcgAIClient) {
	logger.Printf("listening on http://%s", addr)
	logger.Printf("sqlite database: %s", absoluteDBPath)

	if aiClient.isConfigured() {
		logger.Printf("ai gateway: provider=%s model=%s", aiClient.provider, aiClient.model)
		return
	}

	logger.Printf("ai gateway: disabled (set WATCH_ECG_AI_BASE_URL / WATCH_ECG_AI_API_KEY / WATCH_ECG_AI_MODEL to enable)")
}
