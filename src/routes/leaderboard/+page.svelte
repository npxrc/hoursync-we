<script lang="ts">
	import {
		type EHourRequestList,
		type LeaderboardStudent,
	} from "$lib/types.js";
	import { goto } from "$app/navigation";
	import { onMount } from "svelte";
	import Navbar from "../Navbar.svelte";

	let { data }: { data: { leaderboard: LeaderboardStudent[] } } = $props();
	let leaderboard: LeaderboardStudent[] = $state([]);
	function toHome() {
		goto("/home");
	}

	let studentAcademy = $state("");
	//cutoff date for the semester is July 1 of each year. Before = spring, after = fall
	let currentSemester = $state(new Date().getMonth() < 6 ? "spring" : "fall");
	let wasAdded = $state(false);
	let userLeaderName = $state("");
	onMount(() => {
		leaderboard = data.leaderboard;
		const userData = localStorage.getItem("userData");
		if (userData) {
			const parsedUserData = JSON.parse(userData);
			studentAcademy = parsedUserData.academy;

			// Convert the stored name from "Jane Smith" to "Smith, Jane".
			const nameParts = String(parsedUserData.name ?? "")
				.trim()
				.split(/\s+/)
				.filter(Boolean);
			userLeaderName =
				nameParts.length > 1
					? `${nameParts.slice(1).join(" ")}, ${nameParts[0]}`
					: (nameParts[0] ?? "");

			// find out if the leaderboard matches the current user
			const userLeaderboardEntry = leaderboard.find(
				(entry) => entry.Name === userLeaderName
			);
			if (!userLeaderboardEntry) {
				wasAdded = true;
				// manually figure out where the student should be by fetching requests and totalling hours for the semester
				// check if localstorage has requestsData, if so, use that instead of fetching
				const requestsData = localStorage.getItem("requestsData");
				if (requestsData) {
					console.debug(
						"Using requestsData from localStorage for leaderboard calculation"
					);
					const requests = JSON.parse(
						requestsData
					) as EHourRequestList;
					addStudent(userLeaderName, requests);
					// clear the requestsData from localStorage after using it
					localStorage.removeItem("requestsData");
				} else {
					console.debug(
						"Fetching requests from API for leaderboard calculation"
					);
					fetch("/api/requests")
						.then(async (response) => {
							if (!response.ok) {
								throw new Error(
									`Request fetch failed: ${response.status}`
								);
							}
							return (await response.json()) as {
								requests: EHourRequestList;
							};
						})
						.then(({ requests }) => {
							addStudent(userLeaderName, requests);
						})
						.catch((error) => {
							console.error("Error fetching requests:", error);
						});
				}
			}
		}
	});
	function addStudent(leaderName: string, requests: EHourRequestList) {
		let totalHours = 0;
		const semesterStart = new Date(
			new Date().getFullYear(),
			currentSemester === "spring" ? 0 : 6,
			1
		);
		for (const request of requests.Accepted) {
			const requestDate = new Date(request.Date);
			if (requestDate >= semesterStart) {
				totalHours += parseFloat(request.Hours) || 0;
			}
		}

		const updatedLeaderboard = [
			...leaderboard,
			{
				Name: leaderName,
				Hours: String(totalHours),
				Rank: 0,
			},
		].sort(
			(a, b) => parseFloat(String(b.Hours)) - parseFloat(String(a.Hours))
		);
		leaderboard = updatedLeaderboard.map((entry, index) => ({
			...entry,
			Rank: index + 1,
		}));
	}
	function convertStudentName(name: string): string {
		// Convert "Smith, Jane" to "Jane Smith"
		const parts = name.split(",").map((part) => part.trim());
		if (parts.length === 2) {
			return `${parts[1]} ${parts[0]}`;
		}
		return name; // Return the original name if it doesn't match the expected format
	}
	function compareNames(name1: string, name2: string): boolean {
		return name1.trim() === name2.trim();
	}
</script>

<svelte:head>
	<title>HourSync - Leaderboard</title>
	<meta name="description" content="View the leaderboard for your academy" />
</svelte:head>

<div id="app">
	<div id="left">
		<Navbar
			title={`Leaderboard for ${studentAcademy ? "the " : ""}${studentAcademy || "your academy"}`}
			titleOptions={{ italic: true, rawHtml: false }}
			quickActions={[
				{ label: "Back to Home", onclick: () => goto("/home") },
				{
					label: "Submit a new request",
					onclick: () => goto("/submit"),
				},
			]}
		>
			{#if wasAdded}
				<section class="left-card about-this-request">
					<b class="head">Automatically Added</b>
					<p>
						Your user was not found in the leaderboard data, so
						HourSync automatically added you so you can see your
						rank compared to your peers. This data does not reflect
						what the official portal shows and is meant for
						reference only.
					</p>
				</section>
			{/if}
		</Navbar>
	</div>
	<div id="right">
		<h2>Leaderboard</h2>
		<p>Showing leaderboard data for the {currentSemester} semester</p>
		<ul>
			{#each leaderboard as student}
				<li
					class={compareNames(student.Name, userLeaderName)
						? "self"
						: ""}
				>
					<span class="rank"><b>{student.Rank}</b></span>
					<span class="data">
						<p>{convertStudentName(student.Name)}</p>
						<p>
							{student.Hours} eHour{student.Hours === "1"
								? ""
								: "s"}
						</p>
					</span>
				</li>
			{/each}
		</ul>
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
	#right ul {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	#right li {
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid rgba(255, 255, 255, 0.2);
		padding: 0.1rem 1rem;
		border-radius: 8px;
		margin-bottom: 0.5rem;
		font-weight: 500;
		box-sizing: border-box;

		box-sizing: border-box;
		display: grid;
		grid-template-columns: min-content auto;
		align-items: center;
		text-align: left;
		gap: 30px;
	}
	#right .data p {
		margin: 6px 0;
	}
	li.self {
		color: var(--gradient-4);
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
