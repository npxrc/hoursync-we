import { error, redirect } from "@sveltejs/kit";
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
	if (response.status === 400 || response.status === 401) {
		throw redirect(303, "/home");
	}
	if (!response.ok) {
		throw error(response.status >= 500 ? 500 : response.status, "Unable to load this request. Please try again.");
	}
	const requestData = (await response.json()) as FetchedEHourRequest;
	return {
		request: requestData,
	};
}
