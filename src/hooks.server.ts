import type { Handle } from "@sveltejs/kit";
import {
	enforceRequestChainLimit,
	REQUEST_CHAIN_COOKIE,
	REQUEST_CHAIN_TTL_SECONDS,
} from "$lib/server/requestChain.js";

export const handle: Handle = async ({ event, resolve }) => {
	let chainId = event.cookies.get(REQUEST_CHAIN_COOKIE);
	if (!chainId) {
		chainId = crypto.randomUUID();
		event.cookies.set(REQUEST_CHAIN_COOKIE, chainId, {
			httpOnly: true,
			secure: true,
			sameSite: "lax",
			path: "/",
			maxAge: REQUEST_CHAIN_TTL_SECONDS,
		});
	}

	const path = event.url.pathname;
	const isStaticAsset =
		path.startsWith("/_app/") ||
		path.startsWith("/assets/") ||
		path === "/favicon.ico" ||
		path === "/robots.txt";
	const isTrackableRequest = !isStaticAsset;

	if (isTrackableRequest) {
		const blocked = await enforceRequestChainLimit({
			db: event.platform?.env?.userDB,
			chainId,
			request: event.request,
		});
		if (blocked) return blocked;
	}

	return resolve(event);
};
