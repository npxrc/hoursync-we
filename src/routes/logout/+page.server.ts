import { redirect } from "@sveltejs/kit";

export async function load({ cookies, fetch }) {
	// Clear the sessionId cookie
	cookies.delete("sessionId", { path: "/" });

	// Redirect to the home page
	throw redirect(303, "/");
}
