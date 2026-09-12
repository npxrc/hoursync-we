<script lang="ts">
	import { Status, type EHourRequestList } from "$lib/types.js";
	import { goto } from "$app/navigation";
	import { onMount } from "svelte";
	import ParseHtmlToRequestList from "../api/parseHtmlToRequestList";
	import * as cheerio from "cheerio";

	let {
		data,
	}: {
		data: {
			requests: EHourRequestList;
			html: string;
			changes: any;
		};
	} = $props();

	let studentId = "";

	function getStatuses(
		requests: EHourRequestList
	): Array<keyof EHourRequestList> {
		return Object.keys(requests) as Array<keyof EHourRequestList>;
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
	function toLeaderboard() {
		localStorage.setItem("requestsData", JSON.stringify(data.requests));
		goto("/leaderboard");
	}
	function toSubmit() {
		goto("/submit", { state: { studentId } });
	}
	function signOut() {
		goto("/logout");
	}
	function toRequest(
		requestId: string,
		requestDescription: string,
		requestState: Status
	) {
		localStorage.setItem(
			requestId,
			JSON.stringify({
				body: requestDescription,
				state: convertStatusToString(requestState),
			})
		);
		goto(`/request/${requestId}`);
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
	var eHoursCount: string = $state("0");
	var acceptedHours: number = $state(0);
	var pendingHours: number = $state(0);
	var deniedHours: number = $state(0);
	var acceptRate: string = $state("0");
	var progressTo200Hrs: string = $state("0");

	var studentName: string = $state("");
	var studentAcademy: string = $state("");

	// 0-11am = morning, 12-5pm = afternoon, 6pm-23:59 = evening,
	var greeting: string = $state("");
	if (new Date().getHours() < 12) {
		greeting = "Good morning";
	} else if (new Date().getHours() < 18) {
		greeting = "Good afternoon";
	} else {
		greeting = "Good evening";
	}
	onMount(() => {
		const hash = window.location.hash.slice(1);

		const regex =
			/^\d{5,6}\|[A-Za-z]{2,4}\|\d{4}-\d{2}-\d{2},\d{2}:\d{2}:\d{2}\.\d{3}$/;

		if (regex.test(hash)) {
			// still add the request data to localstorage like in toRequest
			// first find the request in data.requests
			const allRequests = [
				...data.requests.Accepted,
				...data.requests.Pending,
				...data.requests.Denied,
				...data.requests.Returned,
			];
			let requestData = allRequests.find(
				(request) => request.Value === hash
			);
			localStorage.setItem(
				hash,
				JSON.stringify({
					body: requestData?.Description || "",
					state: convertStatusToString(requestData?.State),
				})
			);
			goto(`/request/${hash}`);
		}

		studentName = localStorage.getItem("userData")
			? JSON.parse(localStorage.getItem("userData") || "{}").name
			: "";
		studentAcademy = localStorage.getItem("userData")
			? JSON.parse(localStorage.getItem("userData") || "{}").academy
			: "";

		if (!studentName || !studentAcademy) {
			console.warn(
				"Student name or academy not found in localStorage. Fetching from server..."
			);
			fetch("/api/whoami")
				.then((response) => response.json())
				.then((userData) => {
					studentName = userData.name;
					studentAcademy = userData.academy;
					localStorage.setItem("userData", JSON.stringify(userData));
				});
		}
		const eHoursData = data.html;
		const eHourHtml = cheerio.load(eHoursData);

		eHoursCount =
			eHourHtml("div.bar2").first().text().trim().split("/")[0] || "0";

		var requestsParsed = ParseHtmlToRequestList(eHoursData);
		acceptedHours = requestsParsed.Accepted.reduce(
			(sum, request) => sum + parseFloat(request.Hours) || 0,
			0
		);
		pendingHours = requestsParsed.Pending.reduce(
			(sum, request) => sum + parseFloat(request.Hours) || 0,
			0
		);
		deniedHours = requestsParsed.Denied.reduce(
			(sum, request) => sum + parseFloat(request.Hours) || 0,
			0
		);
		acceptRate = (
			(1 - deniedHours / (acceptedHours + deniedHours)) *
			100
		).toFixed(2);

		progressTo200Hrs = (
			parseFloat(eHoursCount) / 2.0 >= 100
				? 100
				: parseFloat(eHoursCount) / 2.0
		).toFixed(2);

		studentId = [
			...requestsParsed.Accepted,
			...requestsParsed.Pending,
			...requestsParsed.Denied,
			...requestsParsed.Returned,
		][0].Value.split("|")[0];

		let lsSortVal = localStorage.getItem("sortDirection");
		if (lsSortVal && validSortOptions.includes(lsSortVal)) {
			sortOption = lsSortVal;
		} else {
			localStorage.setItem("sortDirection", sortOption);
		}
	});
	let searchTerm = $state("");
	let sortOption = $state("dateNewOld");
	let validSortOptions = [
		"dateNewOld",
		"dateOldNew",
		"hoursHighLow",
		"hoursLowHigh",
		"titleAZ",
		"titleZA",
	];
	let filteredRequests: EHourRequestList = $derived.by(() => {
		const query = searchTerm.trim().toLowerCase();
		const sortRequests = (
			requests: EHourRequestList[keyof EHourRequestList]
		) =>
			requests
				.filter((request) =>
					request.Description.toLowerCase().includes(query)
				)
				.sort((a, b) => {
					switch (sortOption) {
						case "dateNewOld":
							return (
								new Date(b.Date).getTime() -
								new Date(a.Date).getTime()
							);
						case "dateOldNew":
							return (
								new Date(a.Date).getTime() -
								new Date(b.Date).getTime()
							);
						case "hoursHighLow":
							return parseFloat(b.Hours) - parseFloat(a.Hours);
						case "hoursLowHigh":
							return parseFloat(a.Hours) - parseFloat(b.Hours);
						case "titleAZ":
							return a.Description.localeCompare(b.Description);
						case "titleZA":
							return b.Description.localeCompare(a.Description);
						default:
							return 0;
					}
				});

		return {
			Accepted: sortRequests(data.requests.Accepted),
			Pending: sortRequests(data.requests.Pending),
			Denied: sortRequests(data.requests.Denied),
			Returned: sortRequests(data.requests.Returned),
		};
	});

	let reloadActive = $state(false);
	function reloadRequests() {
		reloadActive = true;
		fetch("/api/requests", {
			method: "GET",
		})
			.then((response) => response.json())
			.then((newData) => {
				data = {
					requests: newData.requests as EHourRequestList,
					html: newData.html as string,
					changes: newData.changes as any,
				};
				reloadActive = false;
			})
			.catch((error) => {
				console.error("Error reloading requests:", error);
			});
	}
</script>

<svelte:head>
	<title>HourSync - Home</title>
</svelte:head>

<div id="app">
	<div id="left">
		<h1 class="serif italic">
			{greeting},<br /><b>{studentName.split(" ")[0]}</b>
		</h1>
		<div class="cards">
			<section class="left-card quick-actions">
				<b class="head">Quick Actions</b>
				<p><button onclick={toSubmit}>Submit Request</button></p>
				<p><button onclick={toLeaderboard}>Leaderboard</button></p>
				<p><button onclick={signOut}>Sign Out</button></p>
			</section>
			<section class="left-card recent-changes">
				<b class="head">Recent Changes</b>
				{#if data.changes?.length}
					{#each data.changes as change}
						<article>
							{#if change.type === "statusChanged"}
								<strong>{change.current.Description}</strong>
								<p>
									{change.previousStatus} → {change.currentStatus}
								</p>
							{:else if change.type === "added"}
								<strong>{change.current.Description}</strong>
								<p>New request submitted</p>
							{:else if change.type === "removed"}
								<strong>{change.previous.Description}</strong>
								<p>Request removed</p>
							{:else}
								<strong>{change.current.Description}</strong>
								<p>Request details updated</p>
							{/if}
						</article>
					{/each}
				{:else}
					<p>No recent changes.</p>
				{/if}
			</section>
			<section class="left-card stats">
				<b class="head">Statistics</b>
				<p>Accepted Hours: {acceptedHours}</p>
				<p>Pending Hours: {pendingHours}</p>
				<p>
					Acceptance Rate: {acceptRate}% ({acceptedHours}/{acceptedHours +
						deniedHours})
				</p>
				<p>Progress to endorsement: {progressTo200Hrs}%</p>
				<progress value={progressTo200Hrs} max="100"></progress>
			</section>
		</div>
		<div class="versionInfo">
			<a
				href="https://github.com/npxrc/hoursync-we"
				target="_blank"
				rel="noopener noreferrer">Version: 1.0.1</a
			>
		</div>
	</div>
	<div id="right">
		<div class="top-controls">
			<input
				type="text"
				placeholder="Search requests..."
				class="search-bar"
				bind:value={searchTerm}
			/>

			<select
				id="sort"
				placeholder="Sort by"
				bind:value={sortOption}
				onchange={() =>
					localStorage.setItem("sortDirection", sortOption)}
			>
				<option value="dateNewOld">Date ↓</option>
				<option value="dateOldNew">Date ↑</option>
				<option value="hoursHighLow">Hours ↓</option>
				<option value="hoursLowHigh">Hours ↑</option>
				<option value="titleAZ">Title (A-Z)</option>
				<option value="titleZA">Title (Z-A)</option>
			</select>

			<button
				class="reload-button"
				onclick={reloadRequests}
				disabled={reloadActive}
			>
				Reload{reloadActive ? "ing..." : ""}
			</button>
		</div>
		{#each getStatuses(filteredRequests) as status}
			<h2>{status} ({filteredRequests[status].length})</h2>
			<ul>
				{#each filteredRequests[status] as request}
					<button
						onclick={() =>
							toRequest(
								request.Value,
								request.Description,
								request.State
							)}
						onkeyup={(e) => {
							if (e.key === "Enter")
								toRequest(
									request.Value,
									request.Description,
									request.State
								);
						}}
						tabindex="0"
					>
						<p>
							{request.Description}<br />
							{dateToReadable(request.Date)}<br />
							{request.Hours} eHour{parseFloat(request.Hours) !==
							1
								? "s"
								: ""}
						</p>
					</button>
				{/each}
			</ul>
		{/each}
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
	h1.serif.italic b {
		font-family: "Instrument Serif";
		font-style: italic;
		font-weight: 1000;
	}
	.serif {
		font-family: "Instrument Serif", serif;
	}
	.serif.italic {
		font-style: italic;
		font-weight: 400;
	}

	#left .versionInfo {
		width: 100%;
		text-align: center;
	}
	.versionInfo a {
		color: rgba(255, 255, 255, 0.7);
		text-decoration: underline;
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
	.left-card progress {
		width: 100%;
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
		transition: all 250ms ease;
	}
	.quick-actions button:hover {
		background: rgba(255, 255, 255, 0.07);
	}

	.top-controls {
		display: grid;
		grid-template-columns: 5fr 1fr 1fr;
		gap: 10px;
	}

	.search-bar {
		padding: 0.5rem;
		border-radius: 5px;
		border: 1px solid rgba(255, 255, 255, 0.2);
		background-color: rgba(255, 255, 255, 0.1);
		color: white;
	}

	#right ul {
		list-style: none;
		padding: 0;
		margin: 0;
	}
	#right button {
		display: block;
		width: 100%;
		color: white;
		text-align: left;
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid rgba(255, 255, 255, 0.2);
		padding: 0.1rem 1rem;
		border-radius: 8px;
		margin-bottom: 0.5rem;
		font-weight: 500;
		box-sizing: border-box;

		cursor: pointer;
	}

	button.reload-button {
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		color: white;
		padding: 0.5rem 1rem;
		border-radius: 5px;
		cursor: pointer;
		font-weight: 500;
		margin-bottom: 0 !important;
		height: auto;
		text-align: center;
	}

	button.reload-button[disabled] {
		opacity: 0.7;
		cursor: not-allowed;
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
		#left .cards {
			height: 100%;
			width: 100%;
			overflow: auto;
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
		#left .cards {
			overflow: visible;
		}
	}
</style>
