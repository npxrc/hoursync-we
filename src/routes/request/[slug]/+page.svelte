<script lang="ts">
	import { onMount } from "svelte";
	import { goto } from "$app/navigation";
	import { Status } from "$lib/types.js";

	const { data } = $props();
	let title = $state("");
	let status = $state(0);
	let loaded = $state(false);
	onMount(() => {
		const requestId = data.request?.Value;
		title = requestId;
		console.log("requestId: ", requestId);
		if (requestId) {
			const requestDescription = localStorage.getItem(requestId);
			if (requestDescription) {
				var requestData = JSON.parse(requestDescription);
				title = requestData.body;
				status = requestData.state;
				loaded = true;
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
			return `${diffHours} hours ago`;
		} else if (diffDays < 30) {
			return `${diffDays} days ago`;
		} else if (diffMonths < 12) {
			return `${diffMonths} months ago`;
		} else {
			return `${diffYears} years ago`;
		}
	}
</script>

<svelte:head>
	<title>HourSync - {title ? title : "View Request"}</title>
</svelte:head>

<div id="app">
	<div id="left">
		<h1 class="serif italic">{title || "Loading Request..."}</h1>
		{#if loaded}
			<div class="left-card about-this-request">
				<b class="head">About This Request</b>
				<p>Status: {status}</p>
				<p>
					Submitted on {dateToReadable(data.request?.Date || "")} ({relativeDate(
						data.request.Date || ""
					)})
				</p>
				<p>Requested Hours: {data.request.RequestedHours}</p>
				<p>Attached Images: {data.request.Images.length}</p>
			</div>
			<div class="left-card quick-actions">
				<b class="head">Quick Actions</b>
				<p>
					<button onclick={() => goto("/home")}>Back to Home</button>
				</p>
				<p><button disabled>Copy Request</button></p>
				<p>
					<button disabled={status != Status.Pending}
						>Edit Request</button
					>
				</p>
				<p>
					<button disabled={status != Status.Pending}
						>Delete Request</button
					>
				</p>
			</div>
		{/if}
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
	h1 {
		font-size: 4rem;
		margin: 0.5rem 0 1.3rem 0;
	}
	h2 {
		font-size: 2.5rem;
		margin: 0.5rem 0 1.3rem 0;
	}
	.serif {
		font-family: "Instrument Serif", serif;
	}
	.serif.italic {
		font-style: italic;
		font-weight: 400;
	}

	.left-card {
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid rgba(255, 255, 255, 0.2);
		padding: 1rem;
		padding-right: 2rem;
		border-radius: 8px;
		margin-bottom: 1rem;
		margin-left: -10px;
		font-weight: 500;
		box-sizing: border-box;
	}
	.left-card .head {
		font-size: 1.5rem;
		font-weight: 700;
		margin-bottom: 0.3rem;
		padding-bottom: 0.2rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.2);
		width: 100%;
		display: block;
	}
	.left-card p {
		margin: 0.5rem 0;
	}
	.quick-actions button {
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		color: white;
		padding: 0.5rem 1rem;
		border-radius: 5px;
		cursor: pointer;
		font-size: 1rem;
		font-weight: 500;
		margin-top: 0.25rem;
		width: 100%;
		text-align: left;
	}

	.quick-actions button:disabled {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		color: rgba(255, 255, 255, 0.5);
		cursor: not-allowed;
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
		#left h1 {
			width: 90%;
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
