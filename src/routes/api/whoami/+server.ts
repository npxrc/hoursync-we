import * as cheerio from "cheerio";
import ParseHtmlToRequestList from "../parseHtmlToRequestList.js";
import { fetchWithSession, upstreamUrl } from "$lib/server/upstream";

export async function GET({ request, cookies }) {
	const startTime = performance.now();

	const sessionId = cookies.get("sessionId");
	if (!sessionId) {
		console.debug(`[/api/user/] Received unauthenticated request`);
		return new Response(JSON.stringify({ error: "Missing sessionId" }), {
			status: 400,
		});
	}

	console.debug(`[/api/user/] Received request for session: ${sessionId}`);
	const response = await fetchWithSession(
		sessionId,
		upstreamUrl("/Student/studentHome.php")
	);
	const data = await response.text();
	const $ = cheerio.load(data);

	const academy = ExtractBetween(data, ">Welcome to your", " Endorsement");
	const name = ExtractBetween(data, "Tracking, ", "</");

	return new Response(
		JSON.stringify({
			academy: academy,
			name: name,
		}),
		{
			status: 200,
			headers: {
				"Content-Type": "application/json",
			},
		}
	);
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
