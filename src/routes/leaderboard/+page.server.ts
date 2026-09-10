import { redirect } from "@sveltejs/kit";
import { type LeaderboardData, type LeaderboardStudent } from "$lib/types.js";

export async function load({ cookies, fetch }) {
	const sessionId = cookies.get("sessionId");

	if (!sessionId) {
		throw redirect(303, "/");
	}

	const leaderboardResp = await fetch("/api/leaderboard");

	if (!leaderboardResp.ok) {
		throw redirect(303, "/");
	}

	const leaderboard = await leaderboardResp.json();
	return {
		...(leaderboard as LeaderboardData),
	};
}
