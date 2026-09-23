import ParseHtmlToRequestList from "../parseHtmlToRequestList.js";
import { fetchWithSession, upstreamUrl } from "$lib/server/upstream";

const MAX_EHOURS = 99.75;

export async function GET() {
	return new Response(null, { status: 405, headers: { Allow: "POST" } });
}

export async function POST({ request, cookies }) {
	const startTime = performance.now();

	const sessionId = cookies.get("sessionId");

	if (!sessionId) {
		console.debug("[/api/submit/] Received unauthenticated request");

		return new Response(JSON.stringify({ error: "Missing sessionId" }), {
			status: 401,
			headers: {
				"Content-Type": "application/json",
			},
		});
	}

	console.debug("[/api/submit/] Received request for session:", sessionId);

	const formData = await request.formData();

	const title = formData.get("title");
	const activityDate = formData.get("activityDate");
	const hours = formData.get("hours");
	const description = formData.get("description");

	if (
		typeof title !== "string" ||
		typeof activityDate !== "string" ||
		typeof hours !== "string" ||
		typeof description !== "string"
	) {
		return new Response(
			JSON.stringify({ error: "Missing or invalid form fields" }),
			{
				status: 400,
				headers: {
					"Content-Type": "application/json",
				},
			}
		);
	}

	const requestedHours = Number(hours);

	if (!Number.isFinite(requestedHours)) {
		return new Response(
			JSON.stringify({ error: "Hours must be a valid number" }),
			{
				status: 400,
				headers: {
					"Content-Type": "application/json",
				},
			}
		);
	}

	if (requestedHours > MAX_EHOURS) {
		return new Response(
			JSON.stringify({
				error: `Requests over ${MAX_EHOURS} eHours are not allowed`,
			}),
			{
				status: 400,
				headers: {
					"Content-Type": "application/json",
				},
			}
		);
	}

	const images = formData.getAll("files[]");

	const upstreamFormData = new FormData();

	upstreamFormData.append("title", title);
	console.debug(
		"[/api/submit/] Submitting eHours request with title:",
		title
	);
	upstreamFormData.append("activityDate", activityDate);
	console.debug(
		"[/api/submit/] Submitting eHours request with activityDate:",
		activityDate
	);
	upstreamFormData.append("hours", hours);
	console.debug(
		"[/api/submit/] Submitting eHours request with hours:",
		hours
	);
	upstreamFormData.append("description", description);
	console.debug(
		"[/api/submit/] Submitting eHours request with description:",
		description.slice(0, 30) + "..."
	);

	for (const image of images) {
		if (image instanceof File) {
			upstreamFormData.append("files[]", image, image.name);
			console.debug(
				"[/api/submit/] Submitting eHours request with image:",
				image.name
			);
		}
	}

	try {
		const response = await fetchWithSession(
			sessionId,
			upstreamUrl("/Student/makeRequest.php"),
			{
				method: "POST",
				body: upstreamFormData,
			}
		);

		const responseString = await response.text();

		console.debug(
			`[/api/submit/] Upstream request completed in ${performance.now() - startTime}ms`
		);
		let parsedRequests:
			| ReturnType<typeof ParseHtmlToRequestList>
			| undefined;
		try {
			parsedRequests = ParseHtmlToRequestList(responseString);
		} catch (parseError) {
			console.warn(
				"[/api/submit/] Could not parse upstream response:",
				parseError
			);
			if (responseString?.includes("See your current eHours")) {
				return new Response(
					JSON.stringify({
						success: true,
						message:
							"The request was submitted but HourSync was unable to confirm it was added. Please check your eHours requests to confirm.",
						response: responseString,
						error:
							parseError instanceof Error
								? parseError.message
								: String(parseError),
					}),
					{
						status: 200,
						headers: {
							"Content-Type": "application/json",
						},
					}
				);
			}
			return new Response(
				JSON.stringify({
					success: false,
					message:
						"The request was uploaded but HourSync is unable to confirm it was accepted by the server. Please check your eHours requests to confirm.",
					elapsed: performance.now() - startTime,
					response: responseString,
					error:
						parseError instanceof Error
							? parseError.message
							: String(parseError),
				}),
				{
					status: 200,
					headers: {
						"Content-Type": "application/json",
					},
				}
			);
		}
		const createdRequest = parsedRequests?.Pending.find(
			(req) => req.Description === title
		);
		if (createdRequest) {
			return new Response(
				JSON.stringify({
					success: true,
					response: responseString,
					elapsed: performance.now() - startTime,
				}),
				{
					status: 200,
					headers: {
						"Content-Type": "application/json",
					},
				}
			);
		}
		console.debug("[/api/submit/] Upstream request did not succeed");
		return new Response(
			JSON.stringify({
				success: false,
				message: "The server did not accept the request",
				response: responseString,
				elapsed: performance.now() - startTime,
			}),
			{
				status: 500,
				headers: {
					"Content-Type": "application/json",
				},
			}
		);
	} catch (error) {
		console.error("[/api/submit/] Request submission failed:", error);

		return new Response(
			JSON.stringify({
				success: false,
				message: "Failed to submit request",
				elapsed: performance.now() - startTime,
				response: null,
				error: error instanceof Error ? error.message : String(error),
			}),
			{
				status: 500,
				headers: {
					"Content-Type": "application/json",
				},
			}
		);
	}
}
