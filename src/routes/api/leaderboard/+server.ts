import * as cheerio from "cheerio";
import { type LeaderboardData, type LeaderboardStudent } from "$lib/types";
import { fetchWithSession, upstreamUrl } from "$lib/server/upstream";

export async function GET({ request, cookies }) {
	const startTime = Date.now();

	const sessionId = cookies.get("sessionId");
	if (!sessionId) {
		console.debug(`[/api/leaderboard/] Received unauthenticated request`);
		return new Response(JSON.stringify({ error: "Missing sessionId" }), {
			status: 400,
		});
	}

	console.debug(
		`[/api/leaderboard/] Received request for session: ${sessionId}`
	);

	const response = await fetchWithSession(
		sessionId,
		upstreamUrl("/Student/leaderBoard.php")
	);
	const data = await response.text();

	const $ = cheerio.load(data);
	// find the titleNode and figure out if it contains ehour
	//var titleNode = doc.DocumentNode.SelectSingleNode("//h1[contains(text(), 'EHour')]");
	var titleNode = $("h1").first();
	if (!titleNode || titleNode.length === 0) {
		const endTime = Date.now();
		const elapsed = endTime - startTime;
		return new Response(
			JSON.stringify({ elapsed, error: "No title found", raw: data }),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			}
		);
	}

	const rows = $("table tr").has("td");
	const result: LeaderboardStudent[] = [];
	let rankIndex = 0;
	for (let i = 0; i < rows.length; i++) {
		const row = rows.eq(i);
		const cells = row.find("td");
		if (cells.length < 3) continue;
		const name = cells.eq(1).text().trim();
		if (!name) continue;
		const hours = cells.eq(2).text().trim();
		result.push({
			Rank: ++rankIndex,
			Name: name,
			Hours: hours,
		});
	}

	return new Response(
		JSON.stringify({
			elapsed: Date.now() - startTime,
			leaderboard: result,
		}),
		{ status: 200, headers: { "Content-Type": "application/json" } }
	);
}

export async function POST() {
	return new Response(null, { status: 405 });
}

function decodeHTMLEntities(text: string): string {
	return cheerio.load(`<div>${text}</div>`)("div").text();
}
