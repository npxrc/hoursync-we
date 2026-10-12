import type { D1Database } from "@cloudflare/workers-types";

export const REQUEST_CHAIN_COOKIE = "requestChainId";
export const REQUEST_CHAIN_TTL_SECONDS = 15;
export const MAX_REQUESTS_PER_ROUTE = 3;

export function canonicalRoute(url: URL): string {
	const route = url.pathname.replace(/\/$/, "") || "/";
	return route.endsWith("/__data.json")
		? route.slice(0, -"/__data.json".length) || "/"
		: route;
}

type RequestChainLimitRow = {
	count: number;
};

export async function enforceRequestChainLimit({
	db,
	chainId,
	request,
}: {
	db: D1Database | undefined;
	chainId: string;
	request: Request;
}): Promise<Response | null> {
	if (!db) {
		// Local development may not have bindings. Production should always have userDB.
		return null;
	}

	const url = new URL(request.url);
	const route = canonicalRoute(url);
	const method = request.method.toUpperCase();
	const now = Date.now();
	const expiresAt = now + REQUEST_CHAIN_TTL_SECONDS * 1000;

	const result = await db
		.prepare(
			`INSERT INTO request_chain_limits (chainId, route, method, count, expiresAt)
			 VALUES (?, ?, ?, 1, ?)
			 ON CONFLICT(chainId, route, method) DO UPDATE SET
				 count = CASE
					 WHEN request_chain_limits.expiresAt < ? THEN 1
					 ELSE request_chain_limits.count + 1
				 END,
				 expiresAt = excluded.expiresAt
			 RETURNING count`
		)
		.bind(chainId, route, method, expiresAt, now)
		.first<RequestChainLimitRow>();

	const count = result?.count ?? 0;
	if (count <= MAX_REQUESTS_PER_ROUTE) {
		return null;
	}

	return new Response(
		JSON.stringify({
			error: "Request chain exceeded the maximum number of requests for this route",
			code: "REQUEST_CHAIN_LIMIT",
		}),
		{
			status: 500,
			headers: {
				"Content-Type": "application/json",
				"Cache-Control": "no-store",
				"Retry-After": String(REQUEST_CHAIN_TTL_SECONDS),
			},
		}
	);
}
