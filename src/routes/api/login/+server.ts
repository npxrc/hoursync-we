import type { D1Database } from "@cloudflare/workers-types";

export async function GET() {
	return new Response(null, { status: 405 });
}

export async function POST({ request, cookies, platform }) {
	// ============================================================
	// VERBOSE DEBUG TRACE
	// ============================================================

	const startTime = Date.now();

	// Capture the stack immediately when this route starts.
	const initialStack = new Error("POST /api/login initial stack").stack;

	let debugTrace = "";
	let step = "route-start";

	const trace = (message: string, data?: unknown) => {
		const elapsed = Date.now() - startTime;

		let dataString = "";

		if (data !== undefined) {
			try {
				dataString =
					"\n" +
					JSON.stringify(
						data,
						(key, value) => {
							// Never accidentally log secrets.
							if (
								key.toLowerCase().includes("password") ||
								key.toLowerCase().includes("pass") ||
								key.toLowerCase().includes("sessionid") ||
								key.toLowerCase().includes("cookie") ||
								key.toLowerCase().includes("authorization")
							) {
								return "[REDACTED]";
							}

							return value;
						},
						2
					);
			} catch (e) {
				dataString = ` [Could not stringify debug data: ${String(e)}]`;
			}
		}

		const line = `[${elapsed}ms] [${step}] ${message}${dataString}`;

		debugTrace += line + "\n";

		// console.log(line);
	};

	trace("========== LOGIN REQUEST START ==========");
	trace("Initial stacktrace:", initialStack);

	trace("Runtime information", {
		nodeVersion:
			typeof process !== "undefined"
				? process.version
				: "process unavailable",
		userAgent: request.headers.get("user-agent"),
		host: request.headers.get("host"),
		origin: request.headers.get("origin"),
		referer: request.headers.get("referer"),
		contentType: request.headers.get("content-type"),
	});

	trace("Request URL", request.url);

	trace("Platform exists", !!platform);
	trace("Platform.env exists", !!platform?.env);
	trace("Platform.env.userDB exists", !!platform?.env?.userDB);

	try {
		// ============================================================
		// PARSE REQUEST
		// ============================================================

		step = "parse-request";

		trace("About to parse request.json()");

		const body = await request.json();

		trace("request.json() succeeded", {
			bodyType: typeof body,
			bodyKeys: body && typeof body === "object" ? Object.keys(body) : [],
		});

		const { username, password } = body as {
			username?: string;
			password?: string;
		};

		trace("Parsed credentials", {
			usernameProvided: !!username,
			usernameLength: username?.length ?? 0,
			passwordProvided: !!password,
			passwordLength: password?.length ?? 0,
		});

		// ============================================================
		// VALIDATE CREDENTIALS
		// ============================================================

		step = "validate-credentials";

		if (!username || !password) {
			trace("FAILED: Missing username or password");

			return new Response(
				JSON.stringify({
					error: "Missing username or password",
					// debugTrace,
					// initialStack,
				}),
				{
					status: 400,
					headers: {
						"Content-Type": "application/json",
					},
				}
			);
		}

		trace("Credentials passed validation");

		// ============================================================
		// CHECK CLOUDFLARE PLATFORM / D1
		// ============================================================

		step = "check-platform";

		trace("Checking platform and D1 binding");

		if (!platform || !platform.env || !platform.env.userDB) {
			trace("FAILED: Platform or userDB is unavailable", {
				hasPlatform: !!platform,
				hasEnv: !!platform?.env,
				hasUserDB: !!platform?.env?.userDB,
			});

			return new Response(
				JSON.stringify({
					error: "Internal server error: userDB not available",
					debugTrace,
					initialStack,
				}),
				{
					status: 500,
					headers: {
						"Content-Type": "application/json",
					},
				}
			);
		}

		trace("D1 userDB binding is available");

		// ============================================================
		// CREATE FORM DATA
		// ============================================================

		step = "create-login-request";

		const params = new URLSearchParams();

		params.append("uName", username);
		params.append("uPass", password);

		trace("Created URLSearchParams", {
			usernameLength: username.length,
			passwordLength: password.length,
			encodedLength: params.toString().length,
		});

		// ============================================================
		// CALL EXTERNAL LOGIN SERVER
		// ============================================================

		step = "external-login-request";

		const externalUrl =
			"https://academyendorsement.olatheschools.com/loginuserstudent.php";

		trace("About to POST to external login server", {
			url: externalUrl,
			method: "POST",
			contentType: "application/x-www-form-urlencoded",
			withCredentials: true,
		});

		const externalRequestStart = Date.now();

		let externalResult;

		try {
			externalResult = await fetchExternalLogin(
				externalUrl,
				params.toString()
			);
		} catch (error: any) {
			step = "external-login-request-error";

			trace("EXTERNAL LOGIN REQUEST THREW AN EXCEPTION", {
				errorName: error?.name,
				errorMessage: error?.message,
				errorStack: error?.stack,
			});

			throw error;
		}

		const { response, cookies: upstreamCookies } = externalResult;
		const responseData = await response.text();

		trace("External login request completed", {
			elapsed: Date.now() - externalRequestStart,
			status: response.status,
			statusText: response.statusText,
			dataType: typeof responseData,
			dataLength: responseData.length,
			responseHeaders: Object.fromEntries(response.headers.entries()),
			upstreamCookieNames: Object.keys(upstreamCookies),
		});

		// ============================================================
		// INSPECT RESPONSE
		// ============================================================

		step = "inspect-external-response";

		const html = responseData.replace(/\n/g, "");
		const hasWelcomeMarker = html.includes(">Welcome to your");

		trace("Processed external response HTML", {
			length: html.length,
			start: html.substring(0, 300),
			end: html.substring(Math.max(0, html.length - 300)),
		});

		trace("Checking response for expected login markers", {
			hasWelcomeMarker,
			hasEndorsementMarker: html.includes(" Endorsement"),
			hasTrackingMarker: html.includes("Tracking, "),
			hasClosingTag: html.includes("</"),
			hasPhpSessionText: html.includes("PHPSESSID"),
		});

		// ============================================================
		// EXTRACT ACADEMY / NAME
		// ============================================================

		step = "extract-user-data";

		trace("Calling ExtractBetween() for academy");

		const academy = ExtractBetween(
			html,
			">Welcome to your",
			" Endorsement"
		);

		trace("Academy extraction completed", {
			found: academy !== null,
			length: academy?.length ?? 0,
			value: academy,
		});

		trace("Calling ExtractBetween() for name");

		const name = ExtractBetween(html, "Tracking, ", "</");

		trace("Name extraction completed", {
			found: name !== null,
			length: name?.length ?? 0,
			value: name,
		});

		// ============================================================
		// INSPECT UPSTREAM COOKIES
		// ============================================================

		step = "inspect-upstream-cookies";

		trace("Inspecting cookies captured from upstream responses", {
			count: Object.keys(upstreamCookies).length,
			cookies: Object.entries(upstreamCookies).map(([key, value]) => ({
				key,
				valueLength: value.length,
			})),
		});

		const sessionId = upstreamCookies.PHPSESSID;

		trace("PHPSESSID lookup completed", {
			found: !!sessionId,
			valueLength: sessionId?.length ?? 0,
		});

		if (!sessionId || !hasWelcomeMarker) {
			step = !sessionId
				? "missing-session-cookie"
				: "upstream-authentication-failed";

			trace(
				"FAILED: External server did not return an authenticated student page",
				{
					upstreamStatus: response.status,
					hasWelcomeMarker,
					cookieNames: Object.keys(upstreamCookies),
				}
			);

			return new Response(
				JSON.stringify({
					error: "Upstream login did not return an authenticated session",
					// debugTrace,
					html,
					// initialStack,

					// Don't return the full HTML in production.
					// Include a small diagnostic section instead.
					htmlLength: html.length,
					htmlStart: html.substring(0, 1000),
				}),
				{
					status: 401,
					headers: {
						"Content-Type": "application/json",
					},
				}
			);
		}

		// ============================================================
		// SET CLOUDFLARE / SVELTEKIT COOKIE
		// ============================================================

		step = "set-session-cookie";

		trace("About to set SvelteKit sessionId cookie", {
			httpOnly: true,
			secure: true,
			sameSite: "lax",
			path: "/",
			maxAge: 60 * 60 * 24,
			sessionIdLength: sessionId.length,
		});

		cookies.set("sessionId", sessionId, {
			httpOnly: true,
			secure: true,
			sameSite: "lax",
			path: "/",
			maxAge: 60 * 60 * 24,
		});

		trace("SvelteKit sessionId cookie set successfully");

		// ============================================================
		// CHECK D1 AGAIN
		// ============================================================

		step = "check-d1";

		const db: D1Database | undefined = platform?.env?.userDB;

		trace("Retrieved D1 database binding", {
			available: !!db,
		});

		if (!db) {
			trace("FAILED: userDB disappeared/unavailable");

			return new Response(
				JSON.stringify({
					error: "userDB not available",
					// debugTrace,
					// initialStack,
				}),
				{
					status: 500,
					headers: {
						"Content-Type": "application/json",
					},
				}
			);
		}

		// ============================================================
		// WRITE USER TO D1
		// ============================================================

		step = "d1-insert";

		const createdAt = Date.now();

		trace("About to execute D1 INSERT/UPDATE", {
			username,
			academy,
			name,
			createdAt,
		});

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
			step = "d1-insert-error";

			trace("D1 QUERY THREW AN EXCEPTION", {
				errorName: error?.name,
				errorMessage: error?.message,
				errorStack: error?.stack,
				errorCode: error?.code,
			});

			throw error;
		}

		trace("D1 query completed", {
			success: result?.success,
			meta: result?.meta,
			error: result?.error,
		});

		if (!result.success) {
			step = "d1-insert-failed";

			trace("FAILED: D1 reported unsuccessful result");

			return new Response(
				JSON.stringify({
					error: "Failed to save session",
					// debugTrace,
					// initialStack,
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

		// ============================================================
		// SUCCESS
		// ============================================================

		step = "success";

		const endTime = Date.now();
		const elapsed = endTime - startTime;

		trace("========== LOGIN SUCCESS ==========", {
			elapsed,
			username,
		});

		return Response.json({
			success: true,
			message: "Login successful",

			elapsed,

			// Full accumulated diagnostic trace.
			// debugTrace,
			html,

			// Stack from the very beginning of the route.
			// initialStack,
		});
	} catch (error: any) {
		// ============================================================
		// GLOBAL ERROR HANDLER
		// ============================================================

		step = "GLOBAL-CATCH";

		trace("========== UNHANDLED LOGIN ERROR ==========");

		trace("Exception information", {
			errorName: error?.name,
			errorMessage: error?.message,
			errorCode: error?.code,
			errorStatus: error?.status,
			errorStatusText: error?.statusText,
			stack: error?.stack,
		});

		if (error?.cause) {
			trace("Error cause", {
				name: error.cause?.name,
				message: error.cause?.message,
				code: error.cause?.code,
				stack: error.cause?.stack,
			});
		}

		if (error?.response) {
			trace("Error contained HTTP response", {
				status: error.response.status,
				statusText: error.response.statusText,
				headers: error.response.headers,
				dataType: typeof error.response.data,
				dataLength:
					typeof error.response.data === "string"
						? error.response.data.length
						: undefined,
			});
		}

		trace("========== END LOGIN ERROR ==========");

		return Response.json(
			{
				success: false,
				error: error?.message ?? String(error),

				// Where the route was when it failed.
				failedAtStep: step,

				// The complete accumulated trace.
				// debugTrace,

				// Stack captured at the beginning.
				// initialStack,

				// Stack for the actual exception.
				errorStack: error?.stack,
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
