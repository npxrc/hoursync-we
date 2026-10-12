CREATE TABLE "users" (
	"username"	TEXT,
	"sessionId"	TEXT UNIQUE,
	"academy"	TEXT,
	"name"	TEXT,
	"studentID"	TEXT,
	"createdAt"	INTEGER NOT NULL,
	"optIns"	TEXT,
	"requestsHash"	TEXT,
	"requestsJson"	TEXT,
	"recentChangesJson"	TEXT,
	PRIMARY KEY("username")
);

CREATE TABLE "sessions" (
	"sessionId" TEXT PRIMARY KEY,
	"username" TEXT NOT NULL,
	"createdAt" INTEGER NOT NULL,
	"lastSeenAt" INTEGER NOT NULL,
	FOREIGN KEY("username") REFERENCES "users"("username") ON DELETE CASCADE
);

CREATE INDEX "sessions_username_idx" ON "sessions" ("username");

CREATE TABLE IF NOT EXISTS "request_chain_limits" (
	"chainId" TEXT NOT NULL,
	"route" TEXT NOT NULL,
	"method" TEXT NOT NULL,
	"count" INTEGER NOT NULL,
	"expiresAt" INTEGER NOT NULL,
	PRIMARY KEY ("chainId", "route", "method")
);

CREATE INDEX IF NOT EXISTS "request_chain_limits_expiry_idx"
	ON "request_chain_limits" ("expiresAt");
