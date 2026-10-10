<script lang="ts">
	import { goto } from "$app/navigation";
	import { onMount } from "svelte";
	import Navbar from "../../Navbar.svelte";

	let { data } = $props<{ user: any }>();
	let navbarQuickActions: QuickAction[] = $state([
		{
			label: "Back to Home",
			onclick: toHome,
		},
		{
			label: "Leaderboard",
			onclick: toLeaderboard,
		},
	]);
	function toLeaderboard() {
		goto("/leaderboard");
	}
	function toHome() {
		goto("/home");
	}
	type Card = {
		head: string;
		content: string;
		rawHtml: boolean;
	};

	type QuickAction = {
		label: string;
		onclick: () => void;
	};
	let user = $state(data.user.name || "Unknown User");
	onMount(() => {
		user = location.pathname.split("/").pop() ?? "";
	});

	// server response for /api/users/[slug]/
	// return new Response(
	// 	JSON.stringify({
	// 		username: result.results[0]?.username || null,
	// 		academy: result.results[0]?.academy || null,
	// 		name: result.results[0]?.name || null,
	// 		bio: result.results[0]?.bio || null,
	// 		colors: result.results[0]?.colors || null,
	// 		hoursCount: hoursCount,
	// 		elapsed: performance.now() - start,
	// 	}),
	// 	{
	// 		status: 200,
	// 		headers: {
	// 			"Content-Type": "application/json",
	// 		},
	// 	}
	// );
</script>

<svelte:head>
	<title>HourSync - {user}</title>
	<meta name="description" content="View the profile for {user}" />
</svelte:head>
<div id="app">
	<div id="left">
		<Navbar
			title={`About ${user}`}
			titleOptions={{ italic: true, rawHtml: true }}
			quickActions={navbarQuickActions}
			summaryText={``}
			version="1.0.3"
		></Navbar>
	</div>
	<div id="right">
		{#if data.user.error}
			<!-- the user is private or does not exist -->
			<h1>Error</h1>
			<p>{data.user.error}</p>
		{:else}
			<!-- the user exists and is public -->
			<h1>About {data.user.name}</h1>
			<p><b>Username:</b> {data.user.username}</p>
			<p><b>Academy:</b> {data.user.academy}</p>
			<p><b>Bio:</b> {data.user.bio || "The user has not set a bio."}</p>
			<p><b>Total Hours:</b> {data.user.hoursCount}</p>
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

	@media screen and (max-width: 1200px) {
		#app {
			display: grid;
			grid-template-columns: 1fr;
			grid-template-rows: 2fr 3fr;
		}
		#left,
		#right {
			height: auto;
			padding: 1.5rem;
			box-sizing: border-box;
		}
		#left :global(h1) {
			width: 90%;
		}
		#left :global(.cards) {
			height: 100%;
			width: 100%;
			overflow: auto;
		}
	}
	@media screen and (max-width: 900px) {
		#app {
			height: 100vh;
			width: 100vw;
			margin: 0;
			border-radius: 0;
			display: block;
			overflow-y: auto;
		}
	}
</style>
