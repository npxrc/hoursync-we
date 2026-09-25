import type { D1Database } from "@cloudflare/workers-types";

export async function GET() {
	return new Response(null, { status: 405 });
}

export async function POST({ request, cookies, platform }) {
	try {
		const body = await request.json();

		const { username, password } = body as {
			username?: string;
			password?: string;
		};

		if (!username || !password) {
			return new Response(
				JSON.stringify({
					error: "Missing username or password",
				}),
				{
					status: 400,
					headers: {
						"Content-Type": "application/json",
					},
				}
			);
		}

		if (!platform || !platform.env || !platform.env.userDB) {
			return new Response(
				JSON.stringify({
					error: "Internal server error: userDB not available",
				}),
				{
					status: 500,
					headers: {
						"Content-Type": "application/json",
					},
				}
			);
		}

		const params = new URLSearchParams();

		params.append("uName", username);
		params.append("uPass", password);

		const externalUrl =
			"https://academyendorsement.olatheschools.com/loginuserstudent.php";

		let externalResult;

		try {
			externalResult = await fetchExternalLogin(
				externalUrl,
				params.toString()
			);
		} catch (error: any) {
			throw error;
		}

		const { response, cookies: upstreamCookies } = externalResult;
		const responseData = await response.text();

		const html = responseData.replace(/\n/g, "");
		const hasWelcomeMarker = html.includes(">Welcome to your");

		const academy = ExtractBetween(
			html,
			">Welcome to your",
			" Endorsement"
		);

		const name = ExtractBetween(html, "Tracking, ", "</");

		const sessionId = upstreamCookies.PHPSESSID;

		if (!sessionId || !hasWelcomeMarker) {
			return new Response(
				JSON.stringify({
					error: "Upstream login did not return an authenticated session",
				}),
				{
					status: 401,
					headers: {
						"Content-Type": "application/json",
					},
				}
			);
		}

		cookies.set("sessionId", sessionId, {
			httpOnly: true,
			secure: true,
			sameSite: "lax",
			path: "/",
			maxAge: 60 * 60 * 24,
		});

		const db: D1Database | undefined = platform?.env?.userDB;

		if (!db) {
			return new Response(
				JSON.stringify({
					error: "userDB not available",
				}),
				{
					status: 500,
					headers: {
						"Content-Type": "application/json",
					},
				}
			);
		}

		const createdAt = Date.now();

		let result;

		try {
			result = await db
				.prepare(
					`INSERT INTO users (
						username,
						sessionId,
						academy,
						name,
						createdAt
					)
					VALUES (?, ?, ?, ?, ?)
					ON CONFLICT(username) DO UPDATE SET
						sessionId = excluded.sessionId,
						academy = excluded.academy,
						name = excluded.name,
						createdAt = excluded.createdAt`
				)
				.bind(username, sessionId, academy, name, createdAt)
				.run();
		} catch (error: any) {
			throw error;
		}

		if (!result.success) {
			return new Response(
				JSON.stringify({
					error: "Failed to save session",
					d1Result: {
						success: result.success,
						error: result.error,
					},
				}),
				{
					status: 500,
					headers: {
						"Content-Type": "application/json",
					},
				}
			);
		}

		return Response.json({
			success: true,
			message: "Login successful",
		});
	} catch (error: any) {
		return Response.json(
			{
				success: false,
				error: error?.message ?? String(error),
			},
			{
				status: 500,
			}
		);
	}
}

type UpstreamLoginResult = {
	response: Response;
	cookies: Record<string, string>;
};

async function fetchExternalLogin(
	initialUrl: string,
	body: string
): Promise<UpstreamLoginResult> {
	const cookies: Record<string, string> = {};
	let url = initialUrl;
	let method = "POST";
	let requestBody: string | undefined = body;

	for (let redirectCount = 0; redirectCount <= 5; redirectCount += 1) {
		const requestHeaders = new Headers({
			Accept: "text/html,application/xhtml+xml",
			"User-Agent":
				"Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:142.0) Gecko/20100101 Firefox/142.0",
		});

		if (method === "POST") {
			requestHeaders.set(
				"Content-Type",
				"application/x-www-form-urlencoded"
			);
		}

		const cookieHeader = Object.entries(cookies)
			.map(([name, value]) => `${name}=${value}`)
			.join("; ");

		if (cookieHeader) {
			requestHeaders.set("Cookie", cookieHeader);
		}

		const response = await fetch(url, {
			method,
			headers: requestHeaders,
			body: requestBody,
			redirect: "manual",
		});

		for (const setCookie of getSetCookieValues(response.headers)) {
			const parsedCookie = parseSetCookieValue(setCookie);
			if (parsedCookie) {
				cookies[parsedCookie.name] = parsedCookie.value;
			}
		}

		const location = response.headers.get("location");
		const isRedirect = response.status >= 300 && response.status < 400;

		if (!isRedirect || !location) {
			return { response, cookies };
		}

		if (redirectCount === 5) {
			throw new Error("External login exceeded the redirect limit");
		}

		url = new URL(location, url).toString();
		if (
			response.status === 301 ||
			response.status === 302 ||
			response.status === 303
		) {
			method = "GET";
			requestBody = undefined;
		}
	}

	throw new Error("External login did not return a response");
}

function getSetCookieValues(headers: Headers): string[] {
	const workersHeaders = headers as Headers & {
		getSetCookie?: () => string[];
	};

	if (typeof workersHeaders.getSetCookie === "function") {
		return workersHeaders.getSetCookie();
	}

	const combined = headers.get("set-cookie");
	return combined ? [combined] : [];
}

function parseSetCookieValue(
	setCookie: string
): { name: string; value: string } | null {
	const firstPart = setCookie.split(";", 1)[0];
	const separator = firstPart.indexOf("=");

	if (separator <= 0) {
		return null;
	}

	return {
		name: firstPart.slice(0, separator).trim(),
		value: firstPart.slice(separator + 1).trim(),
	};
}

function ExtractBetween(
	source: string,
	start: string,
	end: string
): string | null {
	const startIndex = source.indexOf(start);

	if (startIndex === -1) {
		return null;
	}

	const actualStartIndex = startIndex + start.length;

	const endIndex = source.indexOf(end, actualStartIndex);

	if (endIndex === -1) {
		return null;
	}

	return source.slice(actualStartIndex, endIndex).trim();
}
