CREATE TABLE IF NOT EXISTS sessions (
	sessionId TEXT PRIMARY KEY,
	username TEXT NOT NULL,
	createdAt INTEGER NOT NULL,
	lastSeenAt INTEGER NOT NULL,
	FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS sessions_username_idx ON sessions (username);

INSERT OR IGNORE INTO sessions (sessionId, username, createdAt, lastSeenAt)
SELECT sessionId, username, createdAt, createdAt
FROM users
WHERE sessionId IS NOT NULL;
