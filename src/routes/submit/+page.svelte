<script lang="ts">
	import { page } from "$app/state";
	import { onMount } from "svelte";
	import ParseHtmlToRequestList from "../api/parseHtmlToRequestList";
	import { goto } from "$app/navigation";

	let studentId = $state("");
	let title = $state("");
	let activityDate = $state("");
	let hours = $state("");
	let description = $state("");
	let files: FileList | null = $state(null);

	let submitting = $state(false);
	let error = $state("");
	let success = $state("");

	async function submitForm(event: SubmitEvent) {
		event.preventDefault();

		submitting = true;
		error = "";
		success = "";

		const form = event.currentTarget as HTMLFormElement;
		const formData = new FormData(form);

		try {
			const response = await fetch("/api/submit", {
				method: "POST",
				body: formData,
			});

			const result = await response.json();

			if (!response.ok || !result.success) {
				error =
					result.message ??
					result.error ??
					"Failed to submit request.";
				return;
			}

			success = "Request submitted successfully.";

			// Optional: reset the form
			form.reset();
			title = "";
			activityDate = "";
			hours = "";
			description = "";
			files = null;
		} catch (err) {
			error =
				err instanceof Error
					? err.message
					: "Failed to submit request.";
		} finally {
			submitting = false;
		}
	}
	let timeout: string | number | NodeJS.Timeout | null | undefined = null;
	async function changeEvent(event: Event) {
		if (timeout) {
			clearTimeout(timeout);
		}
		timeout = setTimeout(async () => {
			// post to /api/sync
			const response = await fetch("/api/sync", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					title,
					activityDate,
					hours,
					description,
				}),
			});

			if (!response.ok) {
				console.error("Failed to sync data:", response.statusText);
				error = "Failed to sync data: " + response.statusText;
			} else {
				const result = await response.json();
				console.log("Sync result:", result);
			}
		}, 5000); // Adjust the delay as needed
	}
	let fetchedStudentIdFromServer = false;
	onMount(() => {
		//@ts-ignore
		studentId = page.state.studentId;

		if (studentId) {
			console.debug("Student Id Received:", studentId);
		} else {
			console.debug("Fetching student ID...");
			if (fetchedStudentIdFromServer) {
				throw new Error(
					"Student ID not found in state and already fetched from server."
				);
			}
			fetchedStudentIdFromServer = true;
			fetch("/api/requests", {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
				},
			}).then(async (response) => {
				if (!response.ok) {
					console.error(
						"Failed to fetch student ID:",
						response.statusText
					);
					error =
						"Failed to fetch student ID: " + response.statusText;
					return;
				}
				const result = await response.json();
				let parsedData = ParseHtmlToRequestList(result.html);
				studentId =
					[
						...parsedData.Accepted,
						...parsedData.Pending,
						...parsedData.Denied,
						...parsedData.Returned,
					][0].Value.split("|")[0] || "";
				console.debug("Fetched student ID from server:", studentId);

				var syncResult = await fetch("/api/sync", {
					method: "GET",
				});
				if (!syncResult.ok) {
					console.error(
						"Failed to sync data from server:",
						syncResult.statusText
					);
					error =
						"Failed to sync data from server: " +
						syncResult.statusText;
					return;
				}
				var syncData = await syncResult.json();
				if (syncData.length > 0) {
					console.debug("Syncing data from server:", syncData);
					title = syncData[0].title || "";
					activityDate = syncData[0].activityDate || "";
					hours = syncData[0].hours || "";
					description = syncData[0].description || "";

					success = "Data synced from server successfully.";
				}
			});
		}
	});
	let enabled = false;
</script>

<div id="app">
	{#if enabled}
		<form method="POST" enctype="multipart/form-data" onsubmit={submitForm}>
			<label>
				Title
				<input
					name="title"
					bind:value={title}
					onkeydown={changeEvent}
					required
				/>
			</label>

			<label>
				Activity Date
				<input
					type="date"
					name="activityDate"
					bind:value={activityDate}
					onchange={changeEvent}
					required
				/>
			</label>

			<label>
				Hours
				<input
					type="number"
					name="hours"
					bind:value={hours}
					onchange={changeEvent}
					min="0"
					max="99.75"
					step="0.25"
					required
				/>
			</label>

			<label>
				Description
				<textarea
					name="description"
					bind:value={description}
					onkeyup={changeEvent}
					required
				></textarea>
			</label>

			<label>
				Images
				<input
					type="file"
					name="files[]"
					accept="image/*"
					multiple
					bind:files
				/>
			</label>

			<button type="submit" disabled={submitting}>
				{submitting ? "Submitting..." : "Submit Request"}
			</button>
		</form>

		{#if error}
			<p>{error}</p>
		{/if}

		{#if success}
			<p>{success}</p>
		{/if}
	{:else}
		<div class="content">
			<p>This page is not ready yet. Please try again later.</p>
			<button onclick={() => goto("/home")}>Back to Home</button>
		</div>
	{/if}
</div>

<style>
	#app {
		display: block;
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
	.content {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
	}
</style>
