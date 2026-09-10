import axios from "axios";
import { CookieJar } from "tough-cookie";
import { wrapper } from "axios-cookiejar-support";
import type { D1Database } from "@cloudflare/workers-types";

export async function GET() {
	return new Response(null, { status: 405 });
}
//@ts-ignore
export async function POST({ request, cookies, platform }) {
	//testing
	const startTime = Date.now();
	const { username, password } = await request.json();
	if (!username || !password) {
		console.debug(
			`[/api/login/] Received request with missing username or password`
		);
		return new Response(
			JSON.stringify({ error: "Missing username or password" }),
			{ status: 400 }
		);
	}

	if (!platform || !platform.env || !platform.env.userDB) {
		console.error(
			"[/api/login/] Platform or userDB is not available in the request context."
		);
		return new Response(
			JSON.stringify({
				error: "Internal server error: userDB not available",
			}),
			{ status: 500 }
		);
	}

	console.debug(
		`[/api/login/] Received login request for username: ${username}`
	);

	const jar = new CookieJar();

	const client = wrapper(
		axios.create({
			jar,
			withCredentials: true,
		})
	);

	const params = new URLSearchParams();
	params.append("uName", username);
	params.append("uPass", password);

	const response = await client.post(
		"https://academyendorsement.olatheschools.com/loginuserstudent.php",
		params,
		{
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
				"User-Agent":
					"Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:142.0) Gecko/20100101 Firefox/142.0",
			},
		}
	);

	const html = response.data.replace(/\n/g, "");

	const academy = ExtractBetween(html, ">Welcome to your", " Endorsement");
	const name = ExtractBetween(html, "Tracking, ", "</");

	const sessionCookies = await jar.getCookies(
		"https://academyendorsement.olatheschools.com"
	);

	const sessionId = sessionCookies.find((c) => c.key === "PHPSESSID")?.value;
	if (!sessionId) {
		console.error("[/api/login/] Server did not return a session cookie");
		return new Response(
			JSON.stringify({ error: "Incorrect username or password", html }),
			{
				status: 401,
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
		console.error("[/api/login/] userDB is not available");
		return new Response(JSON.stringify({ error: "userDB not available" }), {
			status: 500,
		});
	}

	const createdAt = Date.now();
	const result = await db
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

	if (!result.success) {
		console.error(
			`[/api/login/] Failed to persist user session: ${result.error}`
		);
		return new Response(
			JSON.stringify({ error: "Failed to save session" }),
			{
				status: 500,
			}
		);
	}

	const endTime = Date.now();
	const elapsed = endTime - startTime;
	return Response.json({
		success: true,
		message: result?.success
			? "Login successful"
			: "Login successful, but failed to update database",
		html,
		elapsed,
	});
}

function ExtractBetween(
	source: string,
	start: string,
	end: string
): string | null {
	var startIndex = source.indexOf(start);
	if (startIndex === -1) {
		return null;
	}
	startIndex += start.length;

	var endIndex = source.indexOf(end, startIndex);
	if (endIndex === -1) {
		return null;
	}
	return source.slice(startIndex, endIndex).trim();
}
