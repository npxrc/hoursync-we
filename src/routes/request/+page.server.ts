import { redirect } from "@sveltejs/kit";

export async function load({ cookies, fetch }) {
	const sessionId = cookies.get("sessionId");
	if (!sessionId) {
		throw redirect(303, "/");
	} else {
		throw redirect(303, "/home");
	}
}
