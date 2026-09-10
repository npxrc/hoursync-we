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
	PRIMARY KEY("username")
)