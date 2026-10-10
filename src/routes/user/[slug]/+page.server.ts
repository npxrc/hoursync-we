import { redirect } from "@sveltejs/kit";

export async function load({ cookies, fetch, params }) {
	const user = params.slug;
	if (!user) {
		throw redirect(303, "/home");
	}

	const response = await fetch("/api/users/" + user);
	return {
		user: await response.json(),
	};
}
