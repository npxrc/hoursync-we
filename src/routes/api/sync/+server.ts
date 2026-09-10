import { json } from "@sveltejs/kit";
import type { D1Database } from "@cloudflare/workers-types";

export async function GET({ request, cookies, platform }) {
	const sessionId = cookies.get("sessionId");
	if (!sessionId) {
		console.debug("[GET /api/sync/] Received unauthenticated request");

		return new Response(JSON.stringify({ error: "Missing sessionId" }), {
			status: 401,
			headers: {
				"Content-Type": "application/json",
			},
		});
	}

	const userDb: D1Database | undefined = platform?.env?.userDB;
	const draftDb: D1Database | undefined = platform?.env?.draftDB;

	if (!userDb || !draftDb) {
		return new Response(
			JSON.stringify({ error: "Database not available" }),
			{
				status: 500,
				headers: {
					"Content-Type": "application/json",
				},
			}
		);
	}

	const user = await userDb
		.prepare(
			`
			SELECT username, studentID
			FROM users
			WHERE sessionId = ?
		`
		)
		.bind(sessionId)
		.first<{ username: string; studentID: string | null }>();

	if (!user?.studentID) {
		return new Response(
			JSON.stringify({ error: "Student ID not synced yet" }),
			{
				status: 409,
				headers: {
					"Content-Type": "application/json",
				},
			}
		);
	}

	const result = await draftDb
		.prepare("SELECT * FROM drafts WHERE studentID = ?")
		.bind(user.studentID)
		.all();

	return json(result.results);
}
export async function POST({ request, cookies, platform }) {
	const startTime = performance.now();

	const sessionId = cookies.get("sessionId");

	if (!sessionId) {
		console.debug("[POST /api/sync/] Received unauthenticated request");

		return new Response(JSON.stringify({ error: "Missing sessionId" }), {
			status: 401,
			headers: {
				"Content-Type": "application/json",
			},
		});
	}

	const userDb: D1Database | undefined = platform?.env?.userDB;
	const draftDb: D1Database | undefined = platform?.env?.draftDB;
	if (!userDb || !draftDb) {
		console.error(
			"[POST /api/sync/] Database not available in platform.env"
		);
		return new Response(
			JSON.stringify({ error: "Database not available" }),
			{
				status: 500,
				headers: {
					"Content-Type": "application/json",
				},
			}
		);
	}

	const origin = request.headers.get("Origin");

	const expectedOrigins = [
		"http://localhost:5173",
		"https://web.hoursync.net",
		"https://hoursync.net",
	];
	if (!origin || !expectedOrigins.includes(origin)) {
		return new Response(null, { status: 403 });
	}

	const user = await userDb
		.prepare(
			`
		SELECT username, studentID
		FROM users
		WHERE sessionId = ?
		`
		)
		.bind(sessionId)
		.first<{ username: string; studentID: string | null }>();

	if (!user?.studentID) {
		return new Response(null, { status: 401 });
	}

	const data = await request.json();
	if (!data) {
		console.debug("[POST /api/sync/] Received empty request body");
		return new Response(JSON.stringify({ error: "Missing request body" }), {
			status: 400,
			headers: {
				"Content-Type": "application/json",
			},
		});
	}

	if (!data.title || !data.activityDate || !data.hours || !data.description) {
		console.debug(
			"[POST /api/sync/] Received incomplete request body:",
			data
		);
		const missingFields = [];
		if (!data.title) missingFields.push("title");
		if (!data.activityDate) missingFields.push("activityDate");
		if (!data.hours) missingFields.push("hours");
		if (!data.description) missingFields.push("description");
		return new Response(
			JSON.stringify({
				error: "Missing required fields: " + missingFields.join(", "),
			}),
			{
				status: 400,
				headers: {
					"Content-Type": "application/json",
				},
			}
		);
	}

	const { title, activityDate, hours, description } = data;
	const result = await draftDb
		.prepare(
			`INSERT INTO drafts (
				studentID,
				title,
				hours,
				date,
				description,
				updatedAt
			)
			VALUES (?, ?, ?, ?, ?, ?)
			ON CONFLICT(studentID)
			DO UPDATE SET
				title = excluded.title,
				hours = excluded.hours,
				date = excluded.date,
				description = excluded.description,
				updatedAt = excluded.updatedAt;`
		)
		.bind(
			user.studentID,
			title,
			hours,
			activityDate,
			description,
			Date.now()
		)
		.run();

	if (!result.success) {
		console.error("[POST /api/sync/] Failed to save draft:", result);
		return new Response(
			JSON.stringify({
				error: "Failed to save draft",
				elapsed: performance.now() - startTime,
			}),
			{
				status: 500,
				headers: {
					"Content-Type": "application/json",
				},
			}
		);
	}

	console.debug(
		`[POST /api/sync/] Request processed in ${performance.now() - startTime} ms`
	);
	return new Response(
		JSON.stringify({
			success: true,
			message: "Draft saved successfully",
			elapsed: performance.now() - startTime,
		}),
		{
			status: 200,
			headers: {
				"Content-Type": "application/json",
			},
		}
	);
}
