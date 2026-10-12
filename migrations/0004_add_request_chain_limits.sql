CREATE TABLE IF NOT EXISTS request_chain_limits (
	"chainId" TEXT NOT NULL,
	"route" TEXT NOT NULL,
	"method" TEXT NOT NULL,
	"count" INTEGER NOT NULL,
	"expiresAt" INTEGER NOT NULL,
	PRIMARY KEY ("chainId", "route", "method")
);

CREATE INDEX IF NOT EXISTS request_chain_limits_expiry_idx
	ON request_chain_limits ("expiresAt");
