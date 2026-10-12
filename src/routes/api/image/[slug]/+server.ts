export async function GET({ params }) {
	const { slug } = params;
	// relay https://academyendorsement.olatheschools.com/eHourPictures/[slug]
	const imageUrl = `https://academyendorsement.olatheschools.com/eHourPictures/${slug}`;
	return await fetch(imageUrl, { method: "GET" }).then((response) => {
		if (!response.ok) {
			throw new Error(`Image not found: ${imageUrl}`);
		}
		return new Response(response.body, {
			status: response.status,
			headers: {
				"Content-Type":
					response.headers.get("Content-Type") || "image/jpeg",
			},
		});
	});
}
