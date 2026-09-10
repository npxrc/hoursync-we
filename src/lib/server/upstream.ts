const UPSTREAM_BASE_URL = "https://academyendorsement.olatheschools.com";

export function upstreamUrl(path: string): string {
	return new URL(path, UPSTREAM_BASE_URL).toString();
}

/**
 * Make an authenticated request to the upstream PHP application.
 *
 * The browser/Node cookie-jar approach is intentionally avoided here:
 * Cloudflare Workers does not share a Node cookie jar with fetch. The
 * upstream PHP session is already represented by our application cookie, so
 * forwarding it explicitly is both simpler and runtime-independent.
 */
export function fetchWithSession(
	sessionId: string,
	input: string,
	init: RequestInit = {}
): Promise<Response> {
	const headers = new Headers(init.headers);

	if (!headers.has("Cookie")) {
		headers.set("Cookie", `PHPSESSID=${sessionId}`);
	}

	if (!headers.has("User-Agent")) {
		headers.set(
			"User-Agent",
			"Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:142.0) Gecko/20100101 Firefox/142.0"
		);
	}

	return fetch(input, {
		...init,
		headers,
		redirect: init.redirect ?? "follow",
	});
}
