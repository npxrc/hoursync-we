import { json } from "@sveltejs/kit";
import type { D1Database } from "@cloudflare/workers-types";

export async function GET({ request, cookies, platform }) {
	const sessionId = cookies.get("sessionId");
	if (!sessionId) {
		console.debug("[GET /api/settings/] Received unauthenticated request");

		return new Response(JSON.stringify({ error: "Missing sessionId" }), {
			status: 401,
			headers: {
				"Content-Type": "application/json",
			},
		});
	}

	const userDb: D1Database | undefined = platform?.env?.userDB;

	if (!userDb) {
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
			SELECT *
			FROM users
			WHERE sessionId = ?
		`
		)
		.bind(sessionId)
		.first<{
			username: string;
			sessionId: string;
			academy: string;
			name: string;
			studentId: string | null;
			createdAt: number;
			optIns: string;
		}>();

	if (!user) {
		return new Response(JSON.stringify({ error: "User not found" }), {
			status: 404,
			headers: {
				"Content-Type": "application/json",
			},
		});
	}

	let optins: { [key: string]: boolean } = {};
	if (user?.optIns) {
		try {
			optins = JSON.parse(user.optIns);
		} catch (e) {
			console.error("Failed to parse optIns:", e);
		}
	}

	return json({
		username: user?.username,
		sessionId: user?.sessionId,
		optIns: optins,
		success: true,
	});
}
export async function POST({ request, cookies, platform }) {
	const sessionId = cookies.get("sessionId");
	if (!sessionId) {
		console.debug("[POST /api/settings/] Received unauthenticated request");

		return new Response(JSON.stringify({ error: "Missing sessionId" }), {
			status: 401,
			headers: {
				"Content-Type": "application/json",
			},
		});
	}

	const userDb: D1Database | undefined = platform?.env?.userDB;

	if (!userDb) {
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
			SELECT *
			FROM users
			WHERE sessionId = ?
		`
		)
		.bind(sessionId)
		.first<{
			username: string;
			sessionId: string;
			academy: string;
			name: string;
			studentId: string | null;
			createdAt: number;
			optIns: string;
		}>();

	let optins: { [key: string]: boolean } = {};
	let data = await request.json();
	if (data.optIns) {
		optins = data.optIns;
	}
	let stringOptins = JSON.stringify(optins);

	await userDb
		.prepare(
			`
            UPDATE users
            SET optIns = ?
            WHERE sessionId = ?
        `
		)
		.bind(stringOptins, sessionId)
		.run();
	return json({
		success: true,
	});
}
