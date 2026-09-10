import { CookieJar } from "tough-cookie";
import { wrapper } from "axios-cookiejar-support";
import axios from "axios";

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

	const httpClient = CreateHttpClient(sessionId);
	// @ts-ignore
	const res = await httpClient.get(
		"https://academyendorsement.olatheschools.com/Student/studentHome.php"
	);

	const endTime = Date.now();
	const elapsed = endTime - startTime;

	if (typeof res.data === "string" && res.data.includes("Welcome to your")) {
		return new Response(JSON.stringify({ active: true, elapsed }), {
			status: 200,
		});
	} else {
		return new Response(JSON.stringify({ active: false, elapsed }), {
			status: 200,
		});
	}
}
function CreateHttpClient(sessionId: string) {
	const jar = new CookieJar();

	jar.setCookieSync(
		`PHPSESSID=${sessionId}; Path=/; HttpOnly; Secure; SameSite=Lax`,
		"https://academyendorsement.olatheschools.com"
	);

	const httpClient = wrapper(
		axios.create({
			jar,
			withCredentials: true,
		})
	);

	return httpClient;
}
