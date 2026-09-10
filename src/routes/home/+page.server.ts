import { redirect } from "@sveltejs/kit";
import { type EHourRequestList, type EHourRequest } from "$lib/types.js";

export async function load({ cookies, fetch }) {
	const sessionId = cookies.get("sessionId");

	if (!sessionId) {
		throw redirect(303, "/");
	}

	const response = await fetch("/api/requests?sync=true");

	if (!response.ok) {
		throw redirect(303, "/");
	}

	const requests = await response.json();
	return {
		requests: requests.requests as EHourRequestList,
		html: requests.html as string,
		changes: requests.changes as any,
		sortDirection: requests.sortDirection as string,
	};
}
