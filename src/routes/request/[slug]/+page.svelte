<script lang="ts">
	import { onMount } from "svelte";
	import { goto } from "$app/navigation";
	import { Status } from "$lib/types.js";
	import Navbar from "../../Navbar.svelte";

	const { data } = $props();
	let title = $state("");
	let status = $state(convertStatusToString(Status.Pending));
	let loaded = $state(false);
	onMount(() => {
		const requestId = data.request?.Value;
		title = requestId;
		console.log("requestId: ", requestId);
		if (requestId) {
			const requestDescription = localStorage.getItem(requestId);
			if (requestDescription) {
				console.log(
					"Found request description in localStorage:",
					requestDescription
				);
				var requestData = JSON.parse(requestDescription);
				title = requestData.body;
				status = requestData.state;
				loaded = true;
			} else {
				// fetch from server
				console.log(
					"Request description not found in localStorage, fetching from server..."
				);
				fetch("/api/requests")
					.then((response) => response.json())
					.then((requests) => {
						const request = [
							...requests.requests.Accepted,
							...requests.requests.Denied,
							...requests.requests.Pending,
							...requests.requests.Returned,
						].find((r: any) => r.Value === requestId);
						if (request) {
							console.log(
								"Found request in server response:",
								request
							);
							title = request.Description;

							status = convertStatusToString(request.State);
							loaded = true;
							localStorage.setItem(
								requestId,
								JSON.stringify({ body: title, state: status })
							);
						} else {
							console.warn(
								"Request not found in server response:",
								requests,
								requestId
							);
							title = requestId;
							status = convertStatusToString(Status.Pending);
							loaded = true;
						}
					})
					.catch((error) => {
						console.error("Error fetching requests:", error);
						goto("/home");
					});
			}
		}
	});

	function fixMojibake(text: string | null): string {
		return text == null
			? ""
			: text
					.replaceAll("â??", "'")
					.replaceAll("â€™", "'")
					.replaceAll("â€œ", '"')
					.replaceAll("â€\u009d", '"')
					.replaceAll('â€"', "–")
					.replaceAll("â€”", "—");
	}
	function dateToReadable(dateString: string): string {
		// basically convert 2023-06-11 12:46:10.000 to June 11, 2023 at 12:46 PM
		const date = new Date(dateString);
		return (
			date.toLocaleDateString(undefined, {
				year: "numeric",
				month: "long",
				day: "numeric",
			}) +
			" at " +
			date.toLocaleTimeString(undefined, {
				hour: "2-digit",
				minute: "2-digit",
			})
		);
	}
	function convertStatusToString(status: any): string {
		switch (status) {
			case Status.Accepted:
				return "Accepted";
			case Status.Pending:
				return "Pending";
			case Status.Denied:
				return "Denied";
			case Status.Returned:
				return "Returned";
			default:
				return "Unknown";
		}
	}

	function relativeDate(dateString: string): string {
		// hours ago, days ago, months ago, years ago, whichever is most appropriate
		const date = new Date(dateString);
		const now = new Date();
		const diff = now.getTime() - date.getTime();
		const diffHours = Math.floor(diff / (1000 * 60 * 60));
		const diffDays = Math.floor(diff / (1000 * 60 * 60 * 24));
		const diffMonths = Math.floor(diff / (1000 * 60 * 60 * 24 * 30));
		const diffYears = Math.floor(diff / (1000 * 60 * 60 * 24 * 365));

		if (diffHours < 1) {
			return "Just now";
		} else if (diffHours < 24) {
			return `${diffHours} hour${addS(diffHours)} ago`;
		} else if (diffDays < 30) {
			return `${diffDays} day${addS(diffDays)} ago`;
		} else if (diffMonths < 12) {
			return `${diffMonths} month${addS(diffMonths)} ago`;
		} else {
			return `${diffYears} year${addS(diffYears)} ago`;
		}
	}
	function addS(num: number): string {
		return num == 1 ? "" : "s";
	}

	function copyRequest() {
		let url = `/submit?createTemplate=true&title=${encodeURIComponent(title)}&hours=${encodeURIComponent(data.request?.RequestedHours || "")}&description=${encodeURIComponent(data.request?.Body || "")}`;
		goto(url);
	}
</script>

<svelte:head>
	<title>HourSync - {title ? title : "View Request"}</title>
</svelte:head>

<div id="app">
	<div id="left">
		<Navbar
			title={title || "Loading Request..."}
			titleOptions={{ italic: true, rawHtml: false }}
			quickActions={[
				{ label: "Back to Home", onclick: () => goto("/home") },
				{ label: "Copy Request", onclick: copyRequest },
				{ label: "Edit Request", onclick: () => {}, disabled: true },
				{ label: "Delete Request", onclick: () => {}, disabled: true },
			]}
		>
			{#if loaded}
				<section class="left-card about-this-request">
					<b class="head">About This Request</b>
					<p>Status: {status}</p>
					<p>
						Submitted on {dateToReadable(data.request?.Date || "")} ({relativeDate(
							data.request.Date || ""
						)})
					</p>
					<p>Requested Hours: {data.request.RequestedHours}</p>
					<p>
						Attached Images: {data.request.Images.length == 0
							? "None"
							: data.request.Images.length}
					</p>
				</section>
			{/if}
		</Navbar>
	</div>
	<div id="right">
		{#if data.request}
			<div class="request">
				<h2>Request Description</h2>
				<p>{fixMojibake(data.request.Body)}</p>
				{#if data.request.Comments}
					<p>Comments: {fixMojibake(data.request.Comments)}</p>
				{/if}
				{#if data.request.Images.length > 0}
					<div class="images">
						{#each data.request.Images as image}
							<img
								src={image}
								alt={"Attached image for " + title}
								loading="lazy"
							/>
						{/each}
					</div>
				{/if}
			</div>
		{:else}
			<p>Loading...</p>
		{/if}
	</div>
</div>

<style>
	#app {
		display: grid;
		grid-template-columns: 35fr 65fr;
		gap: 2rem;
		color: white;
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		height: calc(100vh - 30px);
		width: calc(100vw - 30px);
		box-sizing: border-box;
		background: linear-gradient(
			to top,
			rgba(0, 0, 0, 0.1),
			rgba(255, 255, 255, 0.1)
		);
		border-radius: 20px;
	}
	#left,
	#right {
		padding: 2rem;
		border-radius: 8px;
		box-sizing: border-box;
		height: 100%;
		overflow-y: auto;
	}
	#right {
		background: rgba(255, 255, 255, 0.08);
		border-radius: 0 20px 20px 0;
	}
	h2 {
		font-size: 2.5rem;
		margin: 0.5rem 0 1.3rem 0;
	}

	#right .images img {
		margin-top: 1rem;
		max-width: 100%;
		border-radius: 8px;
	}

	@media screen and (max-width: 1200px) {
		#app {
			grid-template-columns: 1fr;
			grid-template-rows: auto auto;
			height: calc(100vh - 2rem);
			overflow-y: auto;
			gap: 0;
			margin: 1rem 0;
		}
		#left,
		#right {
			height: auto;
			padding: 1.5rem;
			box-sizing: border-box;
		}
		#left {
			display: grid;
			grid-template-columns: 1fr 2fr;
		}
		.left-card {
			margin-left: 0;
		}
		#right {
			border-radius: 0 0 20px 20px;
		}
		#right h2:first-of-type {
			margin-top: 0;
		}
	}

	@media screen and (max-width: 800px) {
		#left {
			grid-template-columns: 2fr 3fr;
		}
	}
	@media screen and (max-width: 700px) {
		#left {
			grid-template-columns: 1fr;
		}
	}
</style>
