<script lang="ts">
	import {
		Status,
		type EHourRequest,
		type EHourRequestList,
	} from "$lib/types.js";
	import { goto } from "$app/navigation";
	import { onMount } from "svelte";
	import ParseHtmlToRequestList from "../api/parseHtmlToRequestList";
	import * as cheerio from "cheerio";
	import Navbar from "../Navbar.svelte";

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
		const defaultOrder: Array<keyof EHourRequestList> = [
			"Accepted",
			"Pending",
			"Denied",
			"Returned",
		];

		return requests.Pending.length > 0
			? ["Pending", "Accepted", "Denied", "Returned"]
			: defaultOrder;
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

		navbarCards = [
			{
				head: "Statistics",
				content: `
					<p>Accepted Hours: ${acceptedHours}</p>
					<p>Pending Hours: ${pendingHours}</p>
					<p>Acceptance Rate: ${acceptRate}% (${acceptedHours}/${
						acceptedHours + deniedHours
					})</p>
					<p>Progress to endorsement: ${progressTo200Hrs}%</p>
					<progress value="${progressTo200Hrs}" max="100"></progress>
				`,
				rawHtml: true,
			},
		];
		navbarQuickActions = [
			{
				label: "Submit Request",
				onclick: toSubmit,
			},
			{
				label: "Leaderboard",
				onclick: toLeaderboard,
			},
			{
				label: "Sign Out",
				onclick: signOut,
			},
		];
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
			[...requests]
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

	type RequestGroup = {
		description: string;
		requests: EHourRequest[];
		totalHours: number;
		latestDate: number;
	};

	function findGroups(
		requests: EHourRequest[],
		sortDirection: string
	): RequestGroup[] {
		// use the same regex from the c# app
		// var regex = new System.Text.RegularExpressions.Regex(@"(?i)\s*(?:\[\d+\]|(?:Submission|Part|Pt\.?|Request)\s*\d+|\d{1,2}/\d{1,2}|\d+)\s*$");
		const regex =
			/\s*(?:\[\d+\]|(?:Submission|Part|Pt\.?|Request)\s*\d+|\d{1,2}\/\d{1,2}|\d+)\s*$/i;
		const groups = new Map<string, EHourRequest[]>();

		for (const request of requests) {
			const baseDescription = request.Description.replace(
				regex,
				""
			).trim();
			const group = groups.get(baseDescription) ?? [];
			group.push(request);
			groups.set(baseDescription, group);
		}

		return [...groups.entries()]
			.map(([description, groupedRequests]) => ({
				description,
				requests: groupedRequests,
				totalHours: groupedRequests.reduce(
					(total, request) =>
						total + (parseFloat(request.Hours) || 0),
					0
				),
				latestDate: Math.max(
					...groupedRequests.map((request) =>
						new Date(request.Date).getTime()
					)
				),
			}))
			.sort((a, b) => {
				switch (sortDirection) {
					case "dateNewOld":
						return b.latestDate - a.latestDate;
					case "dateOldNew":
						return a.latestDate - b.latestDate;
					case "hoursHighLow":
						return b.totalHours - a.totalHours;
					case "hoursLowHigh":
						return a.totalHours - b.totalHours;
					case "titleAZ":
						return a.description.localeCompare(b.description);
					case "titleZA":
						return b.description.localeCompare(a.description);
					default:
						return 0;
				}
			});
	}

	import type { Snippet } from "svelte";
	import GroupRequest from "./GroupRequest.svelte";

	type Card = {
		head: string;
		content: string;
		rawHtml: boolean;
	};

	type QuickAction = {
		label: string;
		onclick: () => void;
	};

	type Props = {
		title?: string;
		titleOptions?: {
			italic: boolean;
			rawHtml: boolean;
		};
		cards?: Card[];
		quickActions?: QuickAction[];
		version?: string | null;
		children?: Snippet;
	};

	let navbarCards: Card[] = $state([]);
	let navbarQuickActions: QuickAction[] = $state([]);
</script>

<svelte:head>
	<title>HourSync - Home</title>
</svelte:head>

<div id="app">
	<div id="left">
		<Navbar
			title={`${greeting},<br /><b class="greeting-name">${studentName.split(" ")[0]}</b>`}
			titleOptions={{ italic: true, rawHtml: true }}
			cards={navbarCards}
			quickActions={navbarQuickActions}
			version="1.0.3"
		>
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
		</Navbar>
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
			{#each findGroups(filteredRequests[status], sortOption) as group (group.description)}
				<GroupRequest
					description={group.description}
					requests={group.requests}
				/>
			{/each}
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

	:global(h1),
	:global(h1 .greeting-name) {
		font-family: "Instrument Serif", serif;
		font-weight: 700;
		font-style: italic;
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

	select#sort {
		padding: 0.5rem;
		border-radius: 5px;
		border: 1px solid rgba(255, 255, 255, 0.2);
		background-color: rgba(255, 255, 255, 0.1);
		color: white;
		cursor: pointer;
	}
	select#sort option {
		color: black;
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
		#left :global(h1) {
			width: 90%;
		}
		#left :global(.cards) {
			height: 100%;
			width: 100%;
			overflow: auto;
		}
		.left-card {
			margin-left: 0;
		}
		#right {
			padding-top: 0;
			border-radius: 0 0 20px 20px;
		}
		#right h2:first-of-type {
			margin-top: 0;
		}
		.top-controls {
			margin-bottom: 10px;
			position: sticky;
			top: 0;
			z-index: 10;
			backdrop-filter: blur(5px);
			padding: 0.5rem;
			margin: 10px -5px;
		}
		.top-controls input,
		.top-controls select,
		.top-controls button {
			border-radius: 100px;
		}
	}
	@media screen and (max-width: 900px) {
		#app {
			height: 100vh;
			width: 100vw;
			margin: 0;
			border-radius: 0;
		}
	}
</style>
