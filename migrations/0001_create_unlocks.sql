CREATE TABLE unlocks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL,
  method TEXT NOT NULL,
  device TEXT,
  ip TEXT,
  user_agent TEXT,
  city TEXT,
  region TEXT,
  postal_code TEXT,
  country TEXT,
  timezone TEXT,
  latitude REAL,
  longitude REAL,
  asn INTEGER,
  as_organization TEXT
);

CREATE INDEX unlocks_created_at ON unlocks (created_at);
CREATE INDEX unlocks_method ON unlocks (method);
