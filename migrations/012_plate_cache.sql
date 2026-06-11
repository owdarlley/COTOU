CREATE TABLE IF NOT EXISTS plate_cache (
  plate       TEXT PRIMARY KEY,
  data_json   TEXT NOT NULL,
  cached_at   DATETIME DEFAULT (datetime('now'))
);
