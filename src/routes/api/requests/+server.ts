import * as cheerio from "cheerio";
import ParseHtmlToRequestList from "../parseHtmlToRequestList.js";
import type { D1Database } from "@cloudflare/workers-types";
import type { EHourRequest, EHourRequestList } from "$lib/types.js";
import { fetchWithSession, upstreamUrl } from "$lib/server/upstream";

export async function GET({ request, platform, cookies }) {
	// return new Response(null, { status: 405 }); // testing
	const startTime = Date.now();

	const sessionId = cookies.get("sessionId");
	if (!sessionId) {
		console.debug("[/api/requests/] Received unauthenticated request");
		return new Response(JSON.stringify({ error: "Missing sessionId" }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

	console.debug("[/api/requests/] Received request for session:", sessionId);

	const response = await fetchWithSession(
		sessionId,
		upstreamUrl("/Student/studentEHours.php")
	);
	const data = await response.text();

	const $ = cheerio.load(data);
	const table = $("table#eHourRequests").first();
	if (!table || table.length === 0) {
		const endTime = Date.now();
		const elapsed = endTime - startTime;
		return new Response(
			JSON.stringify({ elapsed, error: "No table found" }),
			{
				status: 500,
			}
		);
	}
	try {
		const requestList = ParseHtmlToRequestList(data) as EHourRequestList;
		const fetchedHash = await generateHash(requestList);
		let changes: RequestChange[] = [];

		const db: D1Database | undefined = platform?.env?.userDB;
		let user = null;
		if (db) {
			user = await db
				.prepare(
					`
					SELECT requestsJson
					FROM users
					WHERE sessionId = ?
					`
				)
				.bind(sessionId)
				.first<{
					requestsJson: string | null;
				}>();

			const previousRequests = user?.requestsJson
				? (JSON.parse(user.requestsJson) as EHourRequestList)
				: null;

			// An initial snapshot is the baseline, not a list of recent changes.
			if (previousRequests) {
				changes = diffRequests(previousRequests, requestList);
			}

			let studentId: string | null = null;
			if (request.url.includes("sync=true")) {
				studentId =
					[
						...requestList.Accepted,
						...requestList.Denied,
						...requestList.Pending,
						...requestList.Returned,
					][0]?.Value.split("|")[0] || null;
			}

			await db
				.prepare(
					`
					UPDATE users
					SET studentID = COALESCE(?, studentID),
						requestsHash = ?,
						requestsJson = ?
					WHERE sessionId = ?
					`
				)
				.bind(
					studentId,
					fetchedHash,
					JSON.stringify(requestList),
					sessionId
				)
				.run();
		}

		const hasChanged = changes.length > 0;
		const endTime = Date.now();
		const elapsed = endTime - startTime;
		return new Response(
			JSON.stringify({
				requests: requestList,
				elapsed,
				message: "Success",
				html: data,
				hash: fetchedHash,
				hasChanged,
				changes,
			}),
			{ status: 200, headers: { "Content-Type": "application/json" } }
		);
	} catch (error) {
		const endTime = Date.now();
		const elapsed = endTime - startTime;

		const details =
			error instanceof Error
				? {
						name: error.name,
						message: error.message,
						stack: error.stack,
					}
				: String(error);

		console.error("Error parsing table:", error);

		return new Response(
			JSON.stringify({
				elapsed,
				error: "Error parsing table",
				details,
			}),
			{
				status: 500,
				headers: {
					"Content-Type": "application/json",
				},
			}
		);
	}
}
export async function POST() {
	return new Response(null, { status: 405 });
}

async function generateHash(requestList: any) {
	const encoder = new TextEncoder();
	const data = encoder.encode(JSON.stringify(requestList));
	const hashBuffer = await crypto.subtle.digest("SHA-256", data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	const hashHex = hashArray
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("");
	return hashHex;
}

type RequestStatus = keyof EHourRequestList;

type RequestChange = {
	type: "added" | "removed" | "statusChanged" | "updated";
	requestId: string;
	previous: EHourRequest | null;
	current: EHourRequest | null;
	previousStatus: RequestStatus | null;
	currentStatus: RequestStatus | null;
};

function indexRequests(requests: EHourRequestList) {
	const indexed = new Map<
		string,
		{ request: EHourRequest; status: RequestStatus }
	>();

	for (const status of Object.keys(requests) as RequestStatus[]) {
		for (const request of requests[status]) {
			indexed.set(request.Value, { request, status });
		}
	}

	return indexed;
}

function requestFieldsChanged(previous: EHourRequest, current: EHourRequest) {
	return (
		previous.Description !== current.Description ||
		previous.Hours !== current.Hours ||
		previous.Date !== current.Date ||
		previous.State !== current.State
	);
}

function diffRequests(
	previous: EHourRequestList,
	current: EHourRequestList
): RequestChange[] {
	const previousById = indexRequests(previous);
	const currentById = indexRequests(current);
	const requestIds = new Set([...previousById.keys(), ...currentById.keys()]);
	const changes: RequestChange[] = [];

	for (const requestId of requestIds) {
		const previousEntry = previousById.get(requestId);
		const currentEntry = currentById.get(requestId);

		if (!previousEntry && currentEntry) {
			changes.push({
				type: "added",
				requestId,
				previous: null,
				current: currentEntry.request,
				previousStatus: null,
				currentStatus: currentEntry.status,
			});
			continue;
		}

		if (previousEntry && !currentEntry) {
			changes.push({
				type: "removed",
				requestId,
				previous: previousEntry.request,
				current: null,
				previousStatus: previousEntry.status,
				currentStatus: null,
			});
			continue;
		}

		if (!previousEntry || !currentEntry) continue;

		if (previousEntry.status !== currentEntry.status) {
			changes.push({
				type: "statusChanged",
				requestId,
				previous: previousEntry.request,
				current: currentEntry.request,
				previousStatus: previousEntry.status,
				currentStatus: currentEntry.status,
			});
			continue;
		}

		if (requestFieldsChanged(previousEntry.request, currentEntry.request)) {
			changes.push({
				type: "updated",
				requestId,
				previous: previousEntry.request,
				current: currentEntry.request,
				previousStatus: previousEntry.status,
				currentStatus: currentEntry.status,
			});
		}
	}

	return changes;
}
