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