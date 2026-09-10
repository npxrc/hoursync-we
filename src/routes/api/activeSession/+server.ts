import { fetchWithSession, upstreamUrl } from "$lib/server/upstream";

export async function GET() {
	return new Response(null, { status: 405 });
}

export async function POST({ request }) {
	const startTime = Date.now();

	const data = await request.json();
	if (!data) {
		const endTime = Date.now();
		const elapsed = endTime - startTime;
		console.debug(
			`[/api/activeSession/] Received request with missing data`
		);
		return new Response(
			JSON.stringify({ elapsed, error: "No data provided" }),
			{
				status: 400,
			}
		);
	}

	const sessionId = data.sessionId;
	if (!sessionId) {
		console.debug(
			`[/api/activeSession/] Received request with missing data`
		);
		return new Response(
			JSON.stringify({ error: "No sessionId provided" }),
			{ status: 400 }
		);
	}

	console.debug(
		`[/api/activeSession/] Received request for session: ${sessionId}`
	);

	const res = await fetchWithSession(
		sessionId,
		upstreamUrl("/Student/studentHome.php")
	);
	const responseText = await res.text();

	const endTime = Date.now();
	const elapsed = endTime - startTime;

	if (responseText.includes("Welcome to your")) {
		return new Response(JSON.stringify({ active: true, elapsed }), {
			status: 200,
		});
	} else {
		return new Response(JSON.stringify({ active: false, elapsed }), {
			status: 200,
		});
	}
}
