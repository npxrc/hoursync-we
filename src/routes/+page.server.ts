import { redirect } from "@sveltejs/kit";

export async function load({ cookies, fetch }) {
	const sessionId = cookies.get("sessionId");

	if (!sessionId) {
		return {};
	}

	const response = await fetch("/api/activeSession", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ sessionId }),
	});

	if (response.ok && (await response.json()).active) {
		throw redirect(303, "/home");
	}

	return {};
}
