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
			headers: { "Content-Type": "application/json" },
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

	const eHoursPage = await fetchWithSession(
		sessionId,
		upstreamUrl("/Student/studentEHours.php")
	);
	const eHoursData = await eHoursPage.text();
	const $eHours = cheerio.load(eHoursData);

	var eHoursCount: string =
		$eHours("div.bar2").first().text().trim().split("/")[0] || "0";

	var requestsParsed = ParseHtmlToRequestList(eHoursData);
	var acceptedHours = requestsParsed.Accepted.reduce(
		(sum, request) => sum + parseFloat(request.Hours) || 0,
		0
	);
	var pendingHours = requestsParsed.Pending.reduce(
		(sum, request) => sum + parseFloat(request.Hours) || 0,
		0
	);
	var deniedHours = requestsParsed.Denied.reduce(
		(sum, request) => sum + parseFloat(request.Hours) || 0,
		0
	);
	var returnedHours = requestsParsed.Returned.reduce(
		(sum, request) => sum + parseFloat(request.Hours) || 0,
		0
	);
	var acceptRate = (
		(1 - deniedHours / (acceptedHours + deniedHours)) *
		100
	).toFixed(2);

	var progressTo200Hrs = (
		parseFloat(eHoursCount) / 2.0 >= 100
			? 100
			: parseFloat(eHoursCount) / 2.0
	).toFixed(2);
	var progressTo300Hrs = (
		parseFloat(eHoursCount) / 1.0 >= 100
			? 100
			: parseFloat(eHoursCount) / 3.0
	).toFixed(2);
	var progressTo400Hrs = (
		parseFloat(eHoursCount) / 4.0 >= 100
			? 100
			: parseFloat(eHoursCount) / 4.0
	).toFixed(2);

	// pick a request from the list of requests (all requests, including accepted, pending, denied, and returned) and return the studentId from that request
	var studentId = [
		...requestsParsed.Accepted,
		...requestsParsed.Pending,
		...requestsParsed.Denied,
		...requestsParsed.Returned,
	][0].Value.split("|")[0];

	const endTime = performance.now();
	const elapsed = endTime - startTime;
	return new Response(
		JSON.stringify({
			name,
			academy,
			eHoursCount,
			elapsed,
			acceptRate,
			acceptedHours,
			returnedHours,
			progressToEndorsement: {
				to200: progressTo200Hrs,
				to300: progressTo300Hrs,
				to400: progressTo400Hrs,
			},
			pendingHours,
			deniedHours,
			message: "Success",
			studentId,
		}),
		{ status: 200, headers: { "Content-Type": "application/json" } }
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
