import { redirect } from "@sveltejs/kit";
import { type FetchedEHourRequest } from "$lib/types.js";

export async function load({ cookies, fetch, params }) {
	const sessionId = cookies.get("sessionId");

	if (!sessionId) {
		throw redirect(303, "/");
	}

	const request = params.slug;
	if (!request) {
		throw redirect(303, "/home");
	}

	const response = await fetch("/api/request/" + request);
	if (!response.ok) {
		throw redirect(303, "/home");
	}
	const requestData = (await response.json()) as FetchedEHourRequest;
	return {
		request: requestData,
	};
}
