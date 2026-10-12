import { error, redirect } from "@sveltejs/kit";
import { type LeaderboardData, type LeaderboardStudent } from "$lib/types.js";

export async function load({ cookies, fetch }) {
	const sessionId = cookies.get("sessionId");

	if (!sessionId) {
		throw redirect(303, "/");
	}

	const leaderboardResp = await fetch("/api/leaderboard");

	if (leaderboardResp.status === 400 || leaderboardResp.status === 401) {
		throw redirect(303, "/");
	}
	if (!leaderboardResp.ok) {
		throw error(leaderboardResp.status >= 500 ? 500 : leaderboardResp.status, "Unable to load the leaderboard. Please try again.");
	}

	const leaderboard = await leaderboardResp.json();
	return {
		...(leaderboard as LeaderboardData),
	};
}
