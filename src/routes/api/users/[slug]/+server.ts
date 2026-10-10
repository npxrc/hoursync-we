import { json } from "@sveltejs/kit";
import type { D1Database } from "@cloudflare/workers-types";
import type { EHourRequestList } from "$lib/types.js";

export async function GET({ request, cookies, platform, params }) {
	let slug = params.slug;
	let start = performance.now();
	if (!slug) {
		return new Response(JSON.stringify({ error: "Missing slug" }), {
			status: 400,
			headers: {
				"Content-Type": "application/json",
			},
		});
	}

	console.debug(
		"[GET /api/users/[slug]/] Received request for user: " + slug
	);
	const userDb: D1Database | undefined = platform?.env?.userDB;
	if (!userDb) {
		console.error("[GET /api/users/[slug]/] Database not available");
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
	console.debug(
		"[GET /api/users/[slug]/] Querying database for user: " + slug
	);
	//slug will be like john.appleseed or taylor.swift, where before dot should be a space
	//"name" column in sql will be like John Appleseed or Taylor Swift
	//case insensitive search for name in sql, replace dot with space and capitalize first letter of each word
	const name = slug
		.split(".")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
	// select their username, academy, name, bio and requestsJson
	// will not send back the requestJson but will send a count of hours accepted
	const result = await userDb
		.prepare(
			"SELECT username, academy, name, bio, requestsJson, colors, isPublic FROM users WHERE LOWER(name) = LOWER(?)"
		)
		.bind(name)
		.all<{
			username: string;
			academy: string;
			name: string;
			bio: string;
			colors: string;
			requestsJson: string;
			isPublic: number;
		}>();

	if (result.results.length === 0) {
		console.debug("[GET /api/users/[slug]/] User not found: " + slug);
		return new Response(
			JSON.stringify({
				error: "The user either does not exist or is private",
				username: slug,
			}),
			{
				status: 404,
				headers: {
					"Content-Type": "application/json",
				},
			}
		);
	}

	const sessionId = cookies.get("sessionId");
	if (result.results[0].isPublic === 0 && !sessionId) {
		console.debug(
			"[GET /api/users/[slug]/] Received request for private user: " +
				slug
		);
		return new Response(
			JSON.stringify({
				error: "The user either does not exist or is private",
				username: slug,
			}),
			{
				status: 404,
				headers: {
					"Content-Type": "application/json",
				},
			}
		);
	}

	// since we have the entire requestsJson we want to actually only send a count of hours, so parse requestsJson as json and sum each of the request.Hours (parse float) and return that instead
	let hoursCount = 0;
	if (result.results.length > 0) {
		const requests = JSON.parse(
			result.results[0].requestsJson
		) as EHourRequestList;
		hoursCount = requests.Accepted.reduce((acc: number, request: any) => {
			return acc + parseFloat(request.Hours || "0");
		}, 0);
	}

	return new Response(
		JSON.stringify({
			username: result.results[0]?.username || null,
			academy: result.results[0]?.academy || null,
			name: result.results[0]?.name || null,
			bio: result.results[0]?.bio || null,
			colors: result.results[0]?.colors || null,
			hoursCount: hoursCount,
			elapsed: performance.now() - start,
		}),
		{
			status: 200,
			headers: {
				"Content-Type": "application/json",
			},
		}
	);
}
