import * as cheerio from "cheerio";
import type { RequestHandler } from "./$types";
import type { FetchedEHourRequest } from "$lib/types.js";
import { fetchWithSession } from "$lib/server/upstream";

const BASE_URL = "https://academyendorsement.olatheschools.com";
const REQUEST_URL = `${BASE_URL}/Student/eHourDescription.php`;

export const GET: RequestHandler = async ({ cookies, params }) => {
	const sessionId = cookies.get("sessionId");
	const requestId = params.slug;

	if (!sessionId) {
		console.debug(
			`[/api/request/${requestId ? requestId : "unknown"}/] Received unauthenticated request`
		);
		return new Response(JSON.stringify({ error: "Missing sessionId" }), {
			status: 400,
			headers: {
				"Content-Type": "application/json",
			},
		});
	}

	if (!requestId) {
		console.debug(
			`[/api/request/${requestId ? requestId : "unknown"}/] Received request with missing slug`
		);
		return new Response(JSON.stringify({ error: "Missing request" }), {
			status: 400,
			headers: {
				"Content-Type": "application/json",
			},
		});
	}

	console.debug(
		`[/api/request/${requestId ? requestId : "unknown"}/] Received request for session "${sessionId}" and request "${requestId}"`
	);

	try {
		const formData = new URLSearchParams();
		formData.set("ehours_request_descr", requestId);

		const response = await fetchWithSession(sessionId, REQUEST_URL, {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: formData.toString(),
		});

		const responseText = decodeResponse(
			await response.arrayBuffer(),
			response.headers.get("content-type") ?? undefined
		);

		if (!responseText.includes("Requested Number of Hours")) {
			const result: FetchedEHourRequest = {
				Value: requestId,
				Body: null,
				Date: new Date().toISOString(),
				RequestedHours: null,
				Comments: null,
				Images: [],
				Success: false,
				LoggedIn: false,
				Error: "Not logged in.",
				Html: responseText,
			};

			return jsonResponse(result, 401);
		}

		const $ = cheerio.load(responseText);

		const whiteTextNodes = $(".whitetext");

		if (whiteTextNodes.length < 2) {
			return jsonResponse(
				{
					error: "Could not find the expected whitetext nodes.",
				},
				500
			);
		}
		const requestedHoursText = whiteTextNodes.eq(0).text().trim();

		const requestedHours = parseRequestedHours(requestedHoursText);

		const dateSubmittedText = whiteTextNodes.eq(1).text().trim();

		const dateText = dateSubmittedText
			.substring(dateSubmittedText.indexOf(":") + 1)
			.trim();

		const date = parseEHourDate(dateText);

		let description = $("textarea#description").text() || null;

		let comments = $("textarea#comments").text() || null;

		description = fixMojibake(description);

		comments = fixMojibake(comments);

		const imagePaths: string[] = [];

		$("img").each((_, element) => {
			const src = $(element).attr("src");

			if (!src) {
				return;
			}

			try {
				imagePaths.push(new URL(src, BASE_URL).href);
			} catch {
				// Ignore malformed image URLs.
			}
		});

		const requestData: FetchedEHourRequest = {
			Value: requestId,
			Body: description,
			RequestedHours: requestedHours,
			Comments: comments,
			Images: imagePaths,
			Date: date,
			Success: true,
			LoggedIn: true,
			Html: responseText,
		};

		return jsonResponse(requestData, 200);
	} catch (error) {
		console.error("Failed to fetch eHour request:", error);

		return jsonResponse(
			{
				error: "Failed to fetch request",
				details: error instanceof Error ? error.message : String(error),
			},
			500
		);
	}
};

function decodeResponse(data: ArrayBuffer, contentType?: string): string {
	const charsetMatch = contentType?.match(/charset\s*=\s*["']?([^;"'\s]+)/i);

	const charset = charsetMatch?.[1]?.toLowerCase() ?? "utf-8";

	let encoding: string;

	switch (charset) {
		case "iso-8859-1":
		case "latin1":
		case "windows-1252":
			encoding = "windows-1252";
			break;

		default:
			encoding = "utf-8";
			break;
	}

	return new TextDecoder(encoding).decode(data);
}

function parseRequestedHours(text: string): string {
	const match = text.match(/Requested\s+Number\s+of\s+Hours\s*:\s*([\d.]+)/);

	if (!match) {
		throw new Error(`Could not parse requested hours from: ${text}`);
	}

	return match[1];
}

function parseEHourDate(text: string): string {
	const match = text.match(
		/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})(?:\.(\d{3}))?$/
	);

	if (!match) {
		throw new Error(`Could not parse date: ${text}`);
	}

	const [, year, month, day, hour, minute, second, millisecond] = match;

	const date = new Date(
		Number(year),
		Number(month) - 1,
		Number(day),
		Number(hour),
		Number(minute),
		Number(second),
		Number(millisecond ?? 0)
	);

	if (Number.isNaN(date.getTime())) {
		throw new Error(`Invalid date: ${text}`);
	}

	return date.toISOString();
}

function fixMojibake(text: string | null): string {
	return text == null
		? ""
		: text
				.replaceAll("â??", "'")
				.replaceAll("â€™", "'")
				.replaceAll("â€œ", '"')
				.replaceAll("â€\u009d", '"')
				.replaceAll('â€"', "–")
				.replaceAll("â€”", "—");
}

function jsonResponse(data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			"Content-Type": "application/json",
		},
	});
}
